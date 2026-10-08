# RickshawShare Dhaka (বনশ্রী-রামপুরা রিকশা পুল)

A mobile-first PWA that matches commuters at fixed landmarks along the Rampura–Banasree–Meradia–Aftab Nagar corridor so they can share a rickshaw. Phase 2 runs on Supabase (Postgres, Storage, Realtime, anonymous auth).

**Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 3, Lucide React, Supabase.

## Prerequisites

- Node.js 18.18 or newer (developed on Node 22)
- npm 9+

## Supabase setup (one time)

1. Create a project at [supabase.com](https://supabase.com).
2. Set up sign-in (see **Sign-in setup** below).
3. **SQL Editor →** run these five files **in order, once each**:
   1. [20261008000000_init.sql](supabase/migrations/20261008000000_init.sql): tables, access rules, match/cancel functions, cron, Realtime, photo bucket
   2. [20261008010000_hub_routes.sql](supabase/migrations/20261008010000_hub_routes.sql): the `hub_routes` table and route enforcement
   3. [20261008020000_corridor_v2.sql](supabase/migrations/20261008020000_corridor_v2.sql): the final corridor, per-person fares, mandatory photos and the feed query
   4. [20261008030000_require_real_users.sql](supabase/migrations/20261008030000_require_real_users.sql): only signed-in Google/email users can post or share a ride
   5. [20261008040000_one_live_post_history_profiles.sql](supabase/migrations/20261008040000_one_live_post_history_profiles.sql): one live post per person, ride history access and public profiles

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
5. **Email Templates → Magic Link:** make sure the body contains `{{ .Token }}` so the email shows the 6-digit code. For example: `<h2>Your code</h2><p>Enter this code in RickshawShare: <b>{{ .Token }}</b></p>`

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

## Try the user journey

1. Open the app (no sign-in needed to browse). The "To" dropdown is locked ("Select pickup point first") until you choose a "From" hub. After that it lists only destinations reachable from that hub, and a pill shows the shared cost per person.
2. Tap **I'm Waiting Here**. Sign in with Google or an email code, then enter your name, mobile number and standing spot, add a photo (required), then **Post to Stand**. The post expires after 15 minutes.
3. In a second browser profile, pick the same route. The post appears without a refresh. Tap the photo to enlarge it, then **Share This Rickshaw**.
4. Both screens show the matched view with the other person's name and phone number.
5. If two people tap Share on the same post at once, one wins and the other sees "Someone just took this rickshaw."
6. Try posting a second time while your post is live. It is refused until the post expires or you remove it.
7. Tap a commuter's name to see their profile (name, photo, shared rides, member since; never a phone number). Open **My rides** from your account menu to see your history.
8. Use the **EN / বাংলা** toggle for language and the sun/moon button for light or dark mode.

## Reading the browser console

Open DevTools → Console. In development the app logs each step with a `[RickshawShare:<area>]` tag:

```
✅ [RickshawShare:auth]      Signed in anonymously (user 3f9a1c2e)
✅ [RickshawShare:database]  Database connected successfully: loaded 11 hubs and 16 routes
✅ [RickshawShare:realtime]  Live updates connected for aftab-nagar-gate → rampura-bridge
ℹ️ [RickshawShare:feed]      Loaded 2 active ride(s) for aftab-nagar-gate → rampura-bridge
ℹ️ [RickshawShare:photo]     Compressed 3201.4 KB → 48.2 KB (image/webp)
✅ [RickshawShare:post]      Ride posted (id 7d21b0aa), it expires in 15 minutes
ℹ️ [RickshawShare:realtime]  UPDATE on ride 7d21b0aa (status: matched)
```

Red ❌ lines explain what to fix (missing env vars, anonymous sign-ins off, migrations not run, Realtime not enabled). Logs never include names, phone numbers or photo URLs. They are off in production builds unless you set `NEXT_PUBLIC_DEBUG_LOGS=true`.

## How it works

| Concern | Approach |
| --- | --- |
| Double-booking | `claim_ride()` does one atomic `UPDATE … WHERE status = 'waiting'`. The loser gets `already_taken`. |
| Routes | `hub_routes` lists the only valid origin → destination pairs, with a per-person fare range. `create_ride()` and a foreign key on `ride_requests` both reject any other pair. |
| Photo rule | `create_ride()` refuses a post without a photo. The client compresses and uploads it first, and a failed upload stops the post. |
| One live post | `create_ride()` refuses a new post while you have a waiting one (`already_waiting`). A partial unique index also stops two tabs racing. You can remove your own post early. |
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
  hooks/        useRides (Realtime), useMyMatch, useMyRides, useServerClock, useProfile
  lib/          supabaseClient, rides (queries + RPCs), compressImage, auth, i18n, phone, time
  types/        Shared TypeScript types
  mock/         Translations and the offline fallback landmark list
supabase/
  migrations/   SQL: tables, indexes, RLS, RPCs, cron, realtime, storage
public/         PWA manifest and icon
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
