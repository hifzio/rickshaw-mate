-- RickshawMate Dhaka — corridor v2
-- Run AFTER 20261008000000_init.sql and 20261008010000_hub_routes.sql, once.
--   * hubs become direction-agnostic (a hub can be both a pickup point and a destination)
--   * the curated corridor is replaced with the final mapping
--   * fares are PER PERSON (the shared-rickshaw split), not the solo total
--   * every ride must have a photo
--   * get_active_rides(): the feed query, filtered by the DATABASE clock (expires_at > now())

-- ============================================================================
-- 1. hubs: drop origin/destination typing, rename, add Merul Badda
-- ============================================================================
-- (Drop the route FK first; it is re-added below once the new routes are in.)
alter table public.ride_requests drop constraint if exists ride_requests_route_fk;
alter table public.hubs drop column if exists type;

insert into public.hubs (id, name_en, name_bn, sort_order) values
  ('rampura-bridge',     'Rampura Bridge',                'রামপুরা ব্রিজ',                      1),
  ('aftab-nagar-gate',   'Aftab Nagar Main Gate',         'আফতাব নগর মেইন গেট',                2),
  ('banasree-gate',      'Banasree Main Gate (Block B)',  'বনশ্রী মেইন গেট (ব্লক বি)',         3),
  ('meradia-bazar',      'Meradia Bazar Mor',             'মেরাদিয়া বাজার মোড়',               4),
  ('ewu-gate',           'East West University Gate',     'ইস্ট ওয়েস্ট ইউনিভার্সিটি গেট',     5),
  ('gulshan-1',          'Gulshan-1 Circle',              'গুলশান-১ সার্কেল',                  6),
  ('badda-link-road',    'Badda Link Road',               'বাড্ডা লিংক রোড',                   7),
  ('merul-badda',        'Merul Badda',                   'মেরুল বাড্ডা',                      8),
  ('mohakhali-wireless', 'Mohakhali Wireless',            'মহাখালী ওয়্যারলেস',                9),
  ('tejgaon-link-road',  'Tejgaon Link Road',             'তেজগাঁও লিংক রোড',                  10),
  ('malibagh-railgate',  'Malibagh Railgate',             'মালিবাগ রেলগেট',                    11)
on conflict (id) do update set
  name_en = excluded.name_en, name_bn = excluded.name_bn, sort_order = excluded.sort_order;

-- ============================================================================
-- 2. hub_routes: the final corridor. Fares are PLACEHOLDERS — verify with locals.
-- ============================================================================
comment on column public.hub_routes.est_fare_min is 'Estimated fair PER-PERSON share of a shared rickshaw, BDT (low end)';
comment on column public.hub_routes.est_fare_max is 'Estimated fair PER-PERSON share of a shared rickshaw, BDT (high end)';

-- One single statement (no temp table: the Supabase SQL editor may run statements on
-- different connections). It deletes pairs that left the corridor (the old placeholder
-- seed) and upserts the rest. Re-running resets fares to the values below.
with corridor (origin_id, destination_id, fmin, fmax) as (
  values
    ('rampura-bridge',   'gulshan-1',          40, 60),
    ('rampura-bridge',   'badda-link-road',    20, 35),
    ('rampura-bridge',   'mohakhali-wireless', 30, 50),
    ('rampura-bridge',   'tejgaon-link-road',  30, 45),

    ('aftab-nagar-gate', 'rampura-bridge',     15, 25),
    ('aftab-nagar-gate', 'merul-badda',        15, 25),
    ('aftab-nagar-gate', 'gulshan-1',          25, 40),

    ('banasree-gate',    'rampura-bridge',     15, 25),
    ('banasree-gate',    'malibagh-railgate',  20, 35),
    ('banasree-gate',    'merul-badda',        20, 30),

    ('meradia-bazar',    'banasree-gate',      10, 20),
    ('meradia-bazar',    'rampura-bridge',     20, 30),
    ('meradia-bazar',    'aftab-nagar-gate',   20, 30),

    ('ewu-gate',         'rampura-bridge',     10, 20),
    ('ewu-gate',         'meradia-bazar',      15, 25),
    ('ewu-gate',         'aftab-nagar-gate',   10, 20)
),
removed as (
  delete from public.hub_routes r
   where not exists (select 1 from corridor c
                     where c.origin_id = r.origin_id and c.destination_id = r.destination_id)
)
insert into public.hub_routes (origin_id, destination_id, est_fare_min, est_fare_max, is_active)
select origin_id, destination_id, fmin, fmax, true from corridor
on conflict (origin_id, destination_id) do update set
  est_fare_min = excluded.est_fare_min,
  est_fare_max = excluded.est_fare_max,
  is_active    = true;

-- Composite FK again: a ride can only reference a curated pair. NOT VALID = old rows exempt.
alter table public.ride_requests
  add constraint ride_requests_route_fk
  foreign key (origin_id, destination_id)
  references public.hub_routes (origin_id, destination_id)
  not valid;

-- ============================================================================
-- 3. A photo is mandatory (the "Photo & Note Rule")
-- ============================================================================
alter table public.ride_requests drop constraint if exists ride_requests_photo_required;
alter table public.ride_requests
  add constraint ride_requests_photo_required check (photo_url is not null) not valid;

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
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
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

-- ============================================================================
-- 4. Feed query: only people standing there RIGHT NOW (database clock, not the phone's)
-- ============================================================================
create or replace function public.get_active_rides(p_origin_id text, p_destination_id text)
returns setof public.ride_requests
language sql stable security invoker set search_path = public, pg_temp as $$
  select *
    from public.ride_requests
   where origin_id = p_origin_id
     and destination_id = p_destination_id
     and status = 'waiting'
     and expires_at > now()
   order by created_at desc
   limit 50;
$$;

revoke execute on function public.get_active_rides(text, text) from public;
grant  execute on function public.get_active_rides(text, text) to anon, authenticated;
