-- RickshawMate Dhaka — require a real account (Google / email) to post or claim.
-- Run AFTER the first three migrations, once. Idempotent.
-- Browsing the feed stays public; only create_ride / claim_ride need a signed-in user.
-- Anonymous Supabase sessions (is_anonymous = true) are refused even if anonymous
-- sign-ins are still enabled in the dashboard.

create or replace function public.require_real_user()
returns void
language plpgsql stable set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'sign_in_required' using errcode = '28000';
  end if;
end;
$$;

revoke execute on function public.require_real_user() from public, anon;
grant  execute on function public.require_real_user() to authenticated;

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

  update public.ride_requests set status = 'cancelled'
   where owner_id = v_uid and status = 'waiting';

  insert into public.ride_requests
    (owner_id, user_name, photo_url, standing_note, origin_id, destination_id)
  values
    (v_uid, v_name, p_photo_url, v_note, p_origin_id, p_destination_id)
  returning * into v_ride;

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

  update public.ride_requests set status = 'cancelled'
   where owner_id = v_uid and status = 'waiting';

  return jsonb_build_object('ok', true, 'ride', to_jsonb(v_ride), 'owner_phone', v_owner_phone);
end;
$$;
