-- RickshawShare Dhaka — curated, dependent routes (Origin → reachable Destinations + fare).
-- Run AFTER 20261008000000_init.sql. Idempotent.

-- ============================================================================
-- 1. hub_routes: the only valid (origin, destination) pairs
-- ============================================================================
-- hubs.id is a text slug in this project, so the foreign keys are text (not INT).
create table if not exists public.hub_routes (
  id             serial primary key,
  origin_id      text not null references public.hubs (id) on delete cascade,
  destination_id text not null references public.hubs (id) on delete cascade,
  est_fare_min   int  not null check (est_fare_min > 0),   -- total solo-rickshaw fare, BDT
  est_fare_max   int  not null,
  is_active      boolean not null default true,
  unique (origin_id, destination_id),
  check (est_fare_max >= est_fare_min),
  check (origin_id <> destination_id)
);

alter table public.hub_routes enable row level security;
revoke all on public.hub_routes from anon, authenticated;
grant select on public.hub_routes to anon, authenticated;

drop policy if exists "active routes are public" on public.hub_routes;
create policy "active routes are public" on public.hub_routes
  for select using (is_active);

-- ============================================================================
-- 2. Seed — PLACEHOLDER pairings and fares. Verify with locals, then edit freely:
--    `do nothing` means re-running this script never overwrites your edits.
-- ============================================================================
insert into public.hub_routes (origin_id, destination_id, est_fare_min, est_fare_max) values
  ('rampura-bridge',   'malibagh-railgate',  30,  50),
  ('rampura-bridge',   'badda-link-road',    40,  70),
  ('rampura-bridge',   'tejgaon-link-road',  60,  90),
  ('rampura-bridge',   'mohakhali-wireless', 60, 100),
  ('rampura-bridge',   'gulshan-1',          80, 120),

  ('aftab-nagar-gate', 'badda-link-road',    30,  50),
  ('aftab-nagar-gate', 'gulshan-1',          50,  80),

  ('ewu-gate',         'badda-link-road',    30,  50),
  ('ewu-gate',         'malibagh-railgate',  30,  50),
  ('ewu-gate',         'gulshan-1',          60,  90),

  ('banasree-gate',    'malibagh-railgate',  40,  70),
  ('banasree-gate',    'badda-link-road',    50,  80),
  ('banasree-gate',    'gulshan-1',          90, 130),

  ('meradia-bazar',    'malibagh-railgate',  30,  50),
  ('meradia-bazar',    'tejgaon-link-road',  60,  90)
on conflict (origin_id, destination_id) do nothing;

-- ============================================================================
-- 3. Enforce it on ride_requests
-- ============================================================================
-- Composite FK = no ride can ever reference a pair that isn't in hub_routes, even if
-- someone bypasses the RPC. NOT VALID skips rows posted before this migration.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'ride_requests_route_fk') then
    alter table public.ride_requests
      add constraint ride_requests_route_fk
      foreign key (origin_id, destination_id)
      references public.hub_routes (origin_id, destination_id)
      not valid;
  end if;
end $$;

-- Same function as before, but the origin/destination checks are replaced by a single
-- "is this an active curated route?" check (the FK can't see is_active).
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

  if p_photo_url is not null
     and position('/storage/v1/object/public/commuter-photos/' in p_photo_url) = 0 then
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
