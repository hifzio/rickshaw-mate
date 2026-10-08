-- RickshawShare Dhaka — one live post at a time, ride history, public profiles.
-- Run AFTER migrations 1-4, once. Idempotent.

-- ============================================================================
-- 1. One live post per commuter
-- ============================================================================
-- Until now a new post silently cancelled the previous one. Now it is refused while a
-- post is still live (the owner can remove it explicitly with cancel_ride()).
-- The partial unique index ride_requests_one_waiting_per_owner is the hard guarantee
-- against two simultaneous posts from two tabs.
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

  -- A post that ran out of time but hasn't been swept by cron yet is not "live".
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

-- ============================================================================
-- 2. History: people can always read their own rides (posted or joined), however old
-- ============================================================================
-- (The public policy only exposes the last hour. Policies are OR-ed together.)
drop policy if exists "own rides are readable" on public.ride_requests;
create policy "own rides are readable" on public.ride_requests
  for select to authenticated
  using (owner_id = (select auth.uid()) or matched_with = (select auth.uid()));

create index if not exists ride_requests_matched_with_idx
  on public.ride_requests (matched_with, created_at desc) where matched_with is not null;

-- ============================================================================
-- 3. Basic public profile (no phone, no email)
-- ============================================================================
create or replace function public.get_public_profile(p_user_id uuid)
returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select case when exists (select 1 from auth.users u where u.id = p_user_id) then
    jsonb_build_object(
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
      'shares_completed', (select count(*) from public.ride_requests r
                            where r.status = 'matched'
                              and (r.owner_id = p_user_id or r.matched_with = p_user_id)),
      'rides_posted', (select count(*) from public.ride_requests r where r.owner_id = p_user_id),
      'verified', coalesce((select bool_or(r.is_verified) from public.ride_requests r
                             where r.owner_id = p_user_id), false)
    )
  end;
$$;

revoke execute on function public.get_public_profile(uuid) from public;
grant  execute on function public.get_public_profile(uuid) to anon, authenticated;
