-- RickshawMate Dhaka — match lifecycle, trust statistics, live-route overview.
-- Run AFTER migrations 1-5, once. Idempotent.
--   * a match now ends explicitly: 'completed' or 'cancelled' (by either rider)
--   * public profiles expose trust numbers (completed, cancelled, posted, joined, rate)
--   * get_live_routes(): which routes have people waiting right now (home screen)

-- ============================================================================
-- 1. Lifecycle columns + the new 'completed' status
-- ============================================================================
alter table public.ride_requests
  add column if not exists completed_at timestamptz,
  add column if not exists completed_by uuid references auth.users (id) on delete set null,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by uuid references auth.users (id) on delete set null;

alter table public.ride_requests drop constraint if exists ride_requests_status_check;
alter table public.ride_requests
  add constraint ride_requests_status_check
  check (status in ('waiting', 'matched', 'completed', 'expired', 'cancelled'));

-- ============================================================================
-- 2. Helper: is this person in the middle of a match?
-- ============================================================================
-- Time-boxed (3 h) so an abandoned match can never lock someone out for good.
create or replace function public.has_active_match(p_user_id uuid)
returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.ride_requests
     where status = 'matched'
       and (owner_id = p_user_id or matched_with = p_user_id)
       and matched_at > now() - interval '3 hours'
  );
$$;
revoke execute on function public.has_active_match(uuid) from public, anon, authenticated;

-- ============================================================================
-- 3. create_ride / claim_ride / cancel_ride: stamp cancellations, block double-booking
-- ============================================================================
create or replace function public.create_ride(
  p_user_name      text,
  p_user_phone     text,
  p_standing_note  text,
  p_origin_id      text,
  p_destination_id text,
  p_photo_url      text default null
)
returns public.ride_requests
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid   uuid := auth.uid();
  v_phone text := public.normalize_bd_phone(p_user_phone);
  v_name  text := btrim(coalesce(p_user_name, ''));
  v_note  text := btrim(coalesce(p_standing_note, ''));
  v_ride  public.ride_requests;
begin
  perform public.require_real_user();
  if v_phone is null then raise exception 'invalid_phone' using errcode = '22023'; end if;
  if char_length(v_name) not between 2 and 60 then raise exception 'invalid_name' using errcode = '22023'; end if;
  if char_length(v_note) not between 3 and 140 then raise exception 'invalid_note' using errcode = '22023'; end if;

  if not exists (
    select 1
    from public.hub_routes r
    join public.hubs o on o.id = r.origin_id      and o.is_active
    join public.hubs d on d.id = r.destination_id and d.is_active
    where r.origin_id = p_origin_id
      and r.destination_id = p_destination_id
      and r.is_active
  ) then
    raise exception 'invalid_route' using errcode = '22023';
  end if;

  if p_photo_url is null then raise exception 'photo_required' using errcode = '22023'; end if;
  if position('/storage/v1/object/public/commuter-photos/' in p_photo_url) = 0 then
    raise exception 'invalid_photo' using errcode = '22023';
  end if;

  if public.has_active_match(v_uid) then raise exception 'already_matched' using errcode = '23505'; end if;

  update public.ride_requests set status = 'expired'
   where owner_id = v_uid and status = 'waiting' and expires_at <= now();

  if exists (select 1 from public.ride_requests where owner_id = v_uid and status = 'waiting') then
    raise exception 'already_waiting' using errcode = '23505';
  end if;

  begin
    insert into public.ride_requests
      (owner_id, user_name, photo_url, standing_note, origin_id, destination_id)
    values
      (v_uid, v_name, p_photo_url, v_note, p_origin_id, p_destination_id)
    returning * into v_ride;
  exception when unique_violation then
    raise exception 'already_waiting' using errcode = '23505';
  end;

  insert into public.ride_contacts (ride_id, owner_phone) values (v_ride.id, v_phone);
  return v_ride;
end;
$$;

create or replace function public.claim_ride(
  p_ride_id       uuid,
  p_claimer_name  text,
  p_claimer_phone text
)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid   uuid := auth.uid();
  v_phone text := public.normalize_bd_phone(p_claimer_phone);
  v_name  text := btrim(coalesce(p_claimer_name, ''));
  v_ride  public.ride_requests;
  v_owner_phone text;
begin
  perform public.require_real_user();
  if v_phone is null then raise exception 'invalid_phone' using errcode = '22023'; end if;
  if char_length(v_name) not between 2 and 60 then raise exception 'invalid_name' using errcode = '22023'; end if;
  if public.has_active_match(v_uid) then raise exception 'already_matched' using errcode = '23505'; end if;

  -- Race-safe: the row lock on this UPDATE means only one concurrent claimer can win.
  update public.ride_requests
     set status = 'matched', matched_with = v_uid, matched_at = now()
   where id = p_ride_id
     and status = 'waiting'
     and expires_at > now()
     and owner_id <> v_uid
  returning * into v_ride;

  if not found then
    select * into v_ride from public.ride_requests where id = p_ride_id;
    return jsonb_build_object('ok', false, 'reason',
      case
        when not found                 then 'not_found'
        when v_ride.owner_id = v_uid   then 'own_ride'
        when v_ride.status = 'matched' then 'already_taken'
        else 'unavailable'
      end);
  end if;

  update public.ride_contacts
     set claimer_name = v_name, claimer_phone = v_phone
   where ride_id = v_ride.id
  returning owner_phone into v_owner_phone;

  -- The claimer found a partner, so withdraw their own waiting post (if any).
  update public.ride_requests
     set status = 'cancelled', cancelled_at = now(), cancelled_by = v_uid
   where owner_id = v_uid and status = 'waiting';

  return jsonb_build_object('ok', true, 'ride', to_jsonb(v_ride), 'owner_phone', v_owner_phone);
end;
$$;

create or replace function public.cancel_ride(p_ride_id uuid)
returns boolean
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  update public.ride_requests
     set status = 'cancelled', cancelled_at = now(), cancelled_by = auth.uid()
   where id = p_ride_id and owner_id = auth.uid() and status = 'waiting';
  return found;
end;
$$;

-- ============================================================================
-- 4. Ending a match: either rider can mark it completed or cancel it
-- ============================================================================
create or replace function public.complete_ride(p_ride_id uuid)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid  uuid := auth.uid();
  v_ride public.ride_requests;
begin
  perform public.require_real_user();
  update public.ride_requests
     set status = 'completed', completed_at = now(), completed_by = v_uid
   where id = p_ride_id and status = 'matched'
     and (owner_id = v_uid or matched_with = v_uid)
  returning * into v_ride;

  if not found then
    select * into v_ride from public.ride_requests
     where id = p_ride_id and (owner_id = v_uid or matched_with = v_uid);
    return jsonb_build_object('ok', false,
      'reason', case when not found then 'not_found' else 'already_' || v_ride.status end);
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.cancel_match(p_ride_id uuid)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid  uuid := auth.uid();
  v_ride public.ride_requests;
begin
  perform public.require_real_user();
  update public.ride_requests
     set status = 'cancelled', cancelled_at = now(), cancelled_by = v_uid
   where id = p_ride_id and status = 'matched'
     and (owner_id = v_uid or matched_with = v_uid)
  returning * into v_ride;

  if not found then
    select * into v_ride from public.ride_requests
     where id = p_ride_id and (owner_id = v_uid or matched_with = v_uid);
    return jsonb_build_object('ok', false,
      'reason', case when not found then 'not_found' else 'already_' || v_ride.status end);
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

revoke execute on function public.complete_ride(uuid) from public, anon;
revoke execute on function public.cancel_match(uuid)  from public, anon;
grant  execute on function public.complete_ride(uuid) to authenticated;
grant  execute on function public.cancel_match(uuid)  to authenticated;

-- ============================================================================
-- 5. Trust profile (no phone, no email)
-- ============================================================================
create or replace function public.get_public_profile(p_user_id uuid)
returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  with s as (
    select
      count(*) filter (where status = 'completed')                                        as completed,
      count(*) filter (where status = 'cancelled' and cancelled_by = p_user_id
                         and matched_with is not null)                                    as cancelled_after_match,
      count(*) filter (where status = 'cancelled' and owner_id = p_user_id
                         and matched_with is null)                                        as withdrawn,
      count(*) filter (where owner_id = p_user_id)                                        as posted,
      count(*) filter (where matched_with = p_user_id)                                    as joined,
      max(created_at)                                                                     as last_active
    from public.ride_requests
    where owner_id = p_user_id or matched_with = p_user_id
  )
  select jsonb_build_object(
    'id', p_user_id,
    'name', coalesce(
      (select r.user_name from public.ride_requests r
        where r.owner_id = p_user_id order by r.created_at desc limit 1),
      (select c.claimer_name from public.ride_contacts c
         join public.ride_requests r on r.id = c.ride_id
        where r.matched_with = p_user_id order by r.matched_at desc limit 1)
    ),
    'photo_url', (select r.photo_url from public.ride_requests r
                   where r.owner_id = p_user_id order by r.created_at desc limit 1),
    'member_since', (select u.created_at from auth.users u where u.id = p_user_id),
    'last_active', s.last_active,
    'completed', s.completed,
    'cancelled', s.cancelled_after_match,
    'withdrawn', s.withdrawn,
    'posted', s.posted,
    'joined', s.joined,
    'completion_rate', case when s.completed + s.cancelled_after_match = 0 then null
                            else round(100.0 * s.completed / (s.completed + s.cancelled_after_match)) end,
    'verified', coalesce((select bool_or(r.is_verified) from public.ride_requests r
                           where r.owner_id = p_user_id), false)
  )
  from s
  where exists (select 1 from auth.users u where u.id = p_user_id);
$$;

revoke execute on function public.get_public_profile(uuid) from public;
grant  execute on function public.get_public_profile(uuid) to anon, authenticated;

-- ============================================================================
-- 6. Home screen: which routes have people waiting right now?
-- ============================================================================
create or replace function public.get_live_routes()
returns table (origin_id text, destination_id text, waiting int, latest_post timestamptz, soonest_expiry timestamptz)
language sql stable security invoker set search_path = public, pg_temp as $$
  select origin_id, destination_id, count(*)::int, max(created_at), min(expires_at)
    from public.ride_requests
   where status = 'waiting' and expires_at > now()
   group by origin_id, destination_id
   order by max(created_at) desc
   limit 30;
$$;

revoke execute on function public.get_live_routes() from public;
grant  execute on function public.get_live_routes() to anon, authenticated;
