# RickshawMate Dhaka (বনশ্রী-রামপুরা রিকশা পুল)

A mobile-first PWA that matches commuters at fixed landmarks along the Rampura–Banasree–Meradia–Aftab Nagar corridor so they can share a rickshaw. Phase 2 runs on Supabase (Postgres, Storage, Realtime, anonymous auth).

**Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 3, Lucide React, Supabase.

## Prerequisites

- Node.js 18.18 or newer (developed on Node 22)
- npm 9+

## Supabase setup (one time)

1. Create a project at [supabase.com](https://supabase.com).
2. Set up sign-in (see **Sign-in setup** below).
3. **SQL Editor →** run these six files **in order, once each**:
   1. [20261008000000_init.sql](supabase/migrations/20261008000000_init.sql): tables, access rules, match/cancel functions, cron, Realtime, photo bucket
   2. [20261008010000_hub_routes.sql](supabase/migrations/20261008010000_hub_routes.sql): the `hub_routes` table and route enforcement
   3. [20261008020000_corridor_v2.sql](supabase/migrations/20261008020000_corridor_v2.sql): the final corridor, per-person fares, mandatory photos and the feed query
   4. [20261008030000_require_real_users.sql](supabase/migrations/20261008030000_require_real_users.sql): only signed-in Google/email users can post or share a ride
   5. [20261008040000_one_live_post_history_profiles.sql](supabase/migrations/20261008040000_one_live_post_history_profiles.sql): one live post per person, ride history access and public profiles
   6. [20261008050000_trust_and_match_lifecycle.sql](supabase/migrations/20261008050000_trust_and_match_lifecycle.sql): completed/cancelled matches, trust statistics and the live-routes overview

   If one prints a `pg_cron not scheduled` notice, enable **Database → Extensions → pg_cron** and re-run the cron block at the end of the first file.
4. Copy the env template and fill it in from **Project Settings → API**:
   ```bash
   cp .env.local.example .env.local
   ```
   Use the project URL and the anon (or publishable) key. Never use the `service_role` key.

Without `.env.local` the app shows a "Connect Supabase" screen.

## Sign-in setup

Browsing the feed needs no account. Tapping **I'm Waiting Here** or **Share This Rickshaw** asks the person to sign in with Google or an emailed 6-digit code.

**In Supabase → Authentication:**
1. **URL Configuration:** set **Site URL** to `http://localhost:3000` and add `http://localhost:3000/**` (and your production URL later) under **Redirect URLs**.
2. **Sign In / Providers → Email:** keep it enabled.
3. **Sign In / Providers → Google:** enable it and paste a Client ID and Secret (below).
4. **Sign In / Providers → Allow anonymous sign-ins:** turn this **off**. Migration 4 also rejects anonymous sessions.
5. **Email Templates → Magic Link:** make sure the body contains `{{ .Token }}` so the email shows the 6-digit code. For example: `<h2>Your code</h2><p>Enter this code in RickshawMate: <b>{{ .Token }}</b></p>`

**Google credentials:** in [Google Cloud Console](https://console.cloud.google.com/apis/credentials), create an **OAuth client ID** of type *Web application*. Add `https://<your-project-ref>.supabase.co/auth/v1/callback` under **Authorized redirect URIs**, then copy the Client ID and Secret into Supabase.

**Email limits:** Supabase's built-in email sender allows only a few emails per hour. That is fine for testing, but before launch configure your own SMTP under **Project Settings → Authentication → SMTP**.

## Run locally

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Best viewed as a phone

The layout is built for 360–430px screens. On desktop, open Chrome/Edge DevTools, press `Cmd+Shift+M` (macOS) or `Ctrl+Shift+M` (Windows/Linux) for device mode, and pick a device such as iPhone 14 or Pixel 7.

### Test on your real phone

1. Connect your phone to the same Wi-Fi as your computer.
2. Find your computer's local IP (macOS: `ipconfig getifaddr en0`).
3. Run `npm run dev -- -H 0.0.0.0`.
4. Open `http://<your-ip>:3000` on the phone.

The selfie button (`capture="user"`) opens the camera on phones. On desktop it opens a file picker. Open two browser profiles (or one normal and one incognito window) to play both sides of a match.

## The flow

1. **Home** is the landing page. It explains the three steps, then shows **Live right now**: every route with people waiting, with counts. Tap one to see its requests. Or use **Find by route** (the "To" list unlocks once you pick a "From").
2. **Route page** lists the people waiting there, each with a photo, exact spot and a live countdown. Tap a name to see their trust record. Tap **Share This Rickshaw** to match (sign-in needed).
3. **Post** (the green button in the bottom bar) lets you pick a route inside the form, add a photo and your spot, and go live for 15 minutes. You can only have one live post at a time.
4. **Match:** both people see the **Match confirmed** screen with each other's name, photo, trust record, meeting spot and phone number. It stays (even after a reload) until the ride is marked **completed** or **cancelled**. If one side ends it, the other sees how.
5. **Trust:** profiles show completed rides, cancelled matches, rides posted and joined, a completion rate and member-since date. Withdrawing a post before anyone joins is not counted against you. **My rides** (bottom bar) is a tab in the same page, not a separate screen: the header and bottom bar stay, and the phone's back button returns to Find.

Other things to try: a second post while one is live is refused. Use the sun/moon button for light or dark mode and **EN / বাংলা** for language. **Share this route link** sends people straight to a route.

## How it works

| Concern | Approach |
| --- | --- |
| Double-booking | `claim_ride()` does one atomic `UPDATE … WHERE status = 'waiting'`. The loser gets `already_taken`. |
| Routes | `hub_routes` lists the only valid origin → destination pairs, with a per-person fare range. `create_ride()` and a foreign key on `ride_requests` both reject any other pair. |
| Photo rule | `create_ride()` refuses a post without a photo. The client compresses and uploads it first, and a failed upload stops the post. |
| One live post | `create_ride()` refuses a new post while you have a waiting one (`already_waiting`). A partial unique index also stops two tabs racing. You can remove your own post early. |
| Match lifecycle | `complete_ride()` and `cancel_match()` end a match for both people. `claim_ride()` and `create_ride()` refuse a new match while you are in one (`already_matched`), time-boxed to 3 hours. |
| Trust profiles | `get_public_profile()` returns completed, cancelled-after-match, withdrawn, posted and joined counts plus a completion rate. It never includes phone or email. |
| Live overview | `get_live_routes()` powers the Home list. Any change to rides refreshes it, with a 12 s poll as a safety net. |
| History and profiles | Policies let you read your own rides at any age. `get_public_profile()` returns only name, photo, member-since, ride counts and verified. |
| Countdown | The clock follows the database time and ticks every second. Each card shows mm:ss in a ring that drains and turns amber under 5 min and red under 1 min. |
| Theme | Colours are CSS variables switched by `data-theme` on `<html>`. The choice is saved on the device, and dark is the default. |
| Expiry | `pg_cron` runs `expire_stale_rides()` every minute. The feed comes from `get_active_rides()`, which filters on `expires_at > now()` using the database clock. `claim_ride()` refuses stale rows too, so it stays correct without cron. |
| Phone privacy | Phones are in `ride_contacts`, readable only by the two riders. They are not in the publicly readable, Realtime-broadcast `ride_requests`. |
| Writes | Clients have no direct INSERT/UPDATE rights. They call `create_ride`, `claim_ride` and `cancel_ride`, which validate input. |
| Live updates | Realtime `postgres_changes` on `ride_requests`: one channel for the selected route and one for your own rides, so you still hear about a match after switching routes. The list refetches on reconnect and when the tab regains focus. |
| Photos | Compressed in the browser to at most 640px WebP (about 30–70 KB) and uploaded to the public `commuter-photos` bucket, into a folder named after your user id. |

## Project structure

```
src/
  app/          Next.js layout, page, global styles
  components/   UI (Header, Feed, CommuterCard, PostRideSheet, ProfileSheet, MatchedScreen, ...)
  hooks/        useRides, useLiveRoutes, useActiveMatch, useMyRides, useServerClock, useProfile
  lib/          supabaseClient, rides (queries + RPCs), compressImage, auth, i18n, phone, time
  types/        Shared TypeScript types
  mock/         Translations and the offline fallback landmark list
supabase/
  migrations/   SQL: tables, indexes, RLS, RPCs, cron, realtime, storage
public/         PWA manifest, app icons, favicon, logo mark and social-share image
brand/          Original logo file (the generated icons in public/ are cut from it)
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Production build |
| `npm start` | Serve the production build (run `npm run build` first) |
| `npm run lint` | Type-check with `tsc --noEmit` |

## Known limits

- **Photos are never deleted.** Expired posts leave their images in the public bucket. Add a scheduled Edge Function that deletes old objects through the Storage API. Deleting rows from `storage.objects` in SQL does not remove the files.
- **Spam and abuse.** Anyone with an email address can create an account. Before launch, enable CAPTCHA and rate limits under Authentication, and add moderation.
- **Fares are not shown in the app.** The per-person ranges stay in `hub_routes` for later, and they are placeholder guesses. Check them with local riders and update the table (`update hub_routes set est_fare_min = …`). Re-running migration 3 resets them.
- **"Verified Office Goer"** is a column only an admin can set (`is_verified`). Nothing in the app sets it yet.
- There is no service worker, so no offline mode.
