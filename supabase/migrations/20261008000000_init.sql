-- RickshawMate Dhaka — initial schema
-- Paste into the Supabase SQL editor and run once. It is idempotent (safe to re-run).
--
-- BEFORE RUNNING: Authentication → Sign In / Providers → enable "Allow anonymous sign-ins".
-- The app signs every device in anonymously so the database knows who owns / claimed a ride.

-- ============================================================================
-- 1. HUBS (landmarks)
-- ============================================================================
create table if not exists public.hubs (
  id         text primary key,                       -- stable slug, e.g. 'rampura-bridge'
  name_en    text not null,
  name_bn    text not null,
  type       text not null check (type in ('origin', 'destination')),
  is_active  boolean not null default true,
  sort_order int not null default 0
);

insert into public.hubs (id, name_en, name_bn, type, sort_order) values
  ('rampura-bridge',     'Rampura Bridge',        'রামপুরা ব্রিজ',                     'origin',      1),
  ('aftab-nagar-gate',   'Aftab Nagar Main Gate', 'আফতাব নগর মেইন গেট',               'origin',      2),
  ('ewu-gate',           'EWU Gate',              'ইস্ট ওয়েস্ট ইউনিভার্সিটি গেট',    'origin',      3),
  ('banasree-gate',      'Banasree Main Gate',    'বনশ্রী মেইন গেট',                  'origin',      4),
  ('meradia-bazar',      'Meradia Bazar',         'মেরাদিয়া বাজার',                  'origin',      5),
  ('gulshan-1',          'Gulshan-1 Circle',      'গুলশান-১ সার্কেল',                 'destination', 1),
  ('mohakhali-wireless', 'Mohakhali Wireless',    'মহাখালী ওয়্যারলেস',               'destination', 2),
  ('badda-link-road',    'Badda Link Road',       'বাড্ডা লিংক রোড',                  'destination', 3),
  ('malibagh-railgate',  'Malibagh Railgate',     'মালিবাগ রেলগেট',                   'destination', 4),
  ('tejgaon-link-road',  'Tejgaon Link Road',     'তেজগাঁও লিংক রোড',                 'destination', 5)
on conflict (id) do update set
  name_en = excluded.name_en, name_bn = excluded.name_bn,
  type = excluded.type, sort_order = excluded.sort_order;

-- ============================================================================
-- 2. RIDE REQUESTS
-- ============================================================================
-- NOTE: phone numbers are NOT stored here. This table is publicly readable (and
-- broadcast over Realtime), so phones live in `ride_contacts` behind stricter RLS.
create table if not exists public.ride_requests (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  user_name      text not null check (char_length(user_name) between 2 and 60),
  photo_url      text,
  standing_note  text not null check (char_length(standing_note) between 3 and 140),
  origin_id      text not null references public.hubs (id),
  destination_id text not null references public.hubs (id),
  status         text not null default 'waiting'
                   check (status in ('waiting', 'matched', 'expired', 'cancelled')),
  matched_with   uuid references auth.users (id) on delete set null,
  matched_at     timestamptz,
  is_verified    boolean not null default false,     -- only settable by an admin / service role
  created_at     timestamptz not null default now(),
  expires_at     timestamptz not null default now() + interval '15 minutes'
);

-- Feed query: WHERE origin/destination/status ORDER BY created_at DESC
create index if not exists ride_requests_feed_idx
  on public.ride_requests (origin_id, destination_id, status, created_at desc);
-- Expiry sweeper only ever looks at waiting rows.
create index if not exists ride_requests_expiry_idx
  on public.ride_requests (expires_at) where status = 'waiting';
-- "My latest ride" lookups + owner realtime filter.
create index if not exists ride_requests_owner_idx
  on public.ride_requests (owner_id, created_at desc);
-- A commuter can only be waiting in one place at a time.
create unique index if not exists ride_requests_one_waiting_per_owner
  on public.ride_requests (owner_id) where status = 'waiting';

-- Private contact details, visible only to the two people in a ride.
create table if not exists public.ride_contacts (
  ride_id       uuid primary key references public.ride_requests (id) on delete cascade,
  owner_phone   text not null,
  claimer_name  text,
  claimer_phone text
);

-- ============================================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================================
-- Supabase grants anon/authenticated full table rights by default; strip them and
-- re-grant only SELECT. All writes go through the SECURITY DEFINER functions below,
-- which validate input, so clients cannot forge status, owner, expiry or is_verified.
alter table public.hubs          enable row level security;
alter table public.ride_requests enable row level security;
alter table public.ride_contacts enable row level security;

revoke all on public.hubs, public.ride_requests, public.ride_contacts from anon, authenticated;
grant select on public.hubs, public.ride_requests to anon, authenticated;
grant select on public.ride_contacts to authenticated;

drop policy if exists "hubs are public" on public.hubs;
create policy "hubs are public" on public.hubs
  for select using (is_active);

-- Public read of the last hour of rides (no phone numbers in this table). Recently
-- matched/expired/cancelled rows stay readable on purpose: Realtime only delivers an
-- UPDATE to a subscriber who can SELECT the *new* row, so other commuters need to
-- see "waiting → matched" to drop the card instantly.
drop policy if exists "recent rides are public" on public.ride_requests;
create policy "recent rides are public" on public.ride_requests
  for select using (created_at > now() - interval '1 hour');

drop policy if exists "contacts visible to the two riders" on public.ride_contacts;
create policy "contacts visible to the two riders" on public.ride_contacts
  for select to authenticated using (
    exists (
      select 1 from public.ride_requests r
      where r.id = ride_contacts.ride_id
        and (r.owner_id = (select auth.uid()) or r.matched_with = (select auth.uid()))
    )
  );

-- ============================================================================
-- 4. HELPERS
-- ============================================================================
-- Normalises +8801712345678 / 8801712-345678 / 01712 345678 → 01712345678, else NULL.
create or replace function public.normalize_bd_phone(p text)
returns text language sql immutable as $$
  select case when d ~ '^(88)?01[3-9][0-9]{8}$' then right(d, 11) else null end
  from (select regexp_replace(coalesce(p, ''), '[^0-9]', '', 'g') as d) s;
$$;

-- Lets clients correct for a wrong phone clock when showing "expires in N min".
create or replace function public.server_time()
returns timestamptz language sql stable as $$ select now(); $$;

-- ============================================================================
-- 5. RPCs
-- ============================================================================
-- create_ride: validated insert of a ride + its private contact row.
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
  if not exists (select 1 from public.hubs where id = p_origin_id and type = 'origin' and is_active) then
    raise exception 'invalid_origin' using errcode = '22023';
  end if;
  if not exists (select 1 from public.hubs where id = p_destination_id and type = 'destination' and is_active) then
    raise exception 'invalid_destination' using errcode = '22023';
  end if;
  -- Only accept photos that live in our own public bucket.
  if p_photo_url is not null
     and position('/storage/v1/object/public/commuter-photos/' in p_photo_url) = 0 then
    raise exception 'invalid_photo' using errcode = '22023';
  end if;

  -- Replace any previous waiting post by this commuter.
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

-- claim_ride: the race-safe match.
-- The single UPDATE ... WHERE status = 'waiting' takes a row lock. If two commuters
-- tap "Share" at the same instant, the second UPDATE blocks until the first commits,
-- re-evaluates the WHERE clause, sees status = 'matched', touches 0 rows, and gets
-- { ok: false, reason: 'already_taken' }. No double-booking is possible.
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
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if v_phone is null then raise exception 'invalid_phone' using errcode = '22023'; end if;
  if char_length(v_name) not between 2 and 60 then raise exception 'invalid_name' using errcode = '22023'; end if;

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

  -- Same transaction: contacts are committed together with the status change, so the
  -- owner's Realtime event can never arrive before the claimer's details exist.
  update public.ride_contacts
     set claimer_name = v_name, claimer_phone = v_phone
   where ride_id = v_ride.id
  returning owner_phone into v_owner_phone;

  -- The claimer found a partner, so drop their own waiting post (if any).
  update public.ride_requests set status = 'cancelled'
   where owner_id = v_uid and status = 'waiting';

  return jsonb_build_object('ok', true, 'ride', to_jsonb(v_ride), 'owner_phone', v_owner_phone);
end;
$$;

create or replace function public.cancel_ride(p_ride_id uuid)
returns boolean
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  update public.ride_requests set status = 'cancelled'
   where id = p_ride_id and owner_id = auth.uid() and status = 'waiting';
  return found;
end;
$$;

-- Sweeper: flips overdue waiting rides to 'expired' (fires a Realtime UPDATE for each).
create or replace function public.expire_stale_rides()
returns int
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_count int;
begin
  update public.ride_requests set status = 'expired'
   where status = 'waiting' and expires_at <= now();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Lock down who may call what (functions are executable by PUBLIC by default).
revoke execute on function public.create_ride(text, text, text, text, text, text) from public, anon;
revoke execute on function public.claim_ride(uuid, text, text)                    from public, anon;
revoke execute on function public.cancel_ride(uuid)                               from public, anon;
revoke execute on function public.expire_stale_rides()                            from public, anon, authenticated;
grant  execute on function public.create_ride(text, text, text, text, text, text) to authenticated;
grant  execute on function public.claim_ride(uuid, text, text)                    to authenticated;
grant  execute on function public.cancel_ride(uuid)                               to authenticated;
grant  execute on function public.server_time()                                   to anon, authenticated;

-- ============================================================================
-- 6. AUTO-EXPIRY (pg_cron, every minute)
-- ============================================================================
-- If this block prints a NOTICE, enable pg_cron in Dashboard → Database → Extensions
-- and re-run it. The app stays correct without cron: clients hide rows past
-- expires_at and claim_ride() refuses them; cron just makes the stored status honest.
do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule('expire-stale-rides', '* * * * *', 'select public.expire_stale_rides()');
exception when others then
  raise notice 'pg_cron not scheduled (%). Enable the extension and re-run this block.', sqlerrm;
end $$;

-- ============================================================================
-- 7. REALTIME
-- ============================================================================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'ride_requests'
  ) then
    alter publication supabase_realtime add table public.ride_requests;
  end if;
end $$;

-- ============================================================================
-- 8. STORAGE: public bucket for commuter selfies
-- ============================================================================
-- 512 KB hard cap + image-only; the client compresses to ~50 KB WebP before upload.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('commuter-photos', 'commuter-photos', true, 524288, array['image/webp', 'image/jpeg'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Upload only into your own folder: <auth.uid()>/<file>. No SELECT/UPDATE/DELETE
-- policies: public URLs work without one, and nobody can list or overwrite photos.
drop policy if exists "commuters upload to own folder" on storage.objects;
create policy "commuters upload to own folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'commuter-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
