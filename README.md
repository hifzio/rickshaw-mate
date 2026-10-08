# RickshawMate Dhaka (বনশ্রী-রামপুরা রিকশা পুল)

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

## Try the user journey

1. Open the app (no sign-in needed to browse). The "To" dropdown is locked ("Select pickup point first") until you choose a "From" hub. After that it lists only destinations reachable from that hub, and a pill shows the shared cost per person.
2. Tap **I'm Waiting Here**. Sign in with Google or an email code, then enter your name, mobile number and standing spot, add a photo (required), then **Post to Stand**. The post expires after 15 minutes.
3. In a second browser profile, pick the same route. The post appears without a refresh. Tap the photo to enlarge it, then **Share This Rickshaw**.
4. Both screens show the matched view with the other person's name and phone number.
5. If two people tap Share on the same post at once, one wins and the other sees "Someone just took this rickshaw."
6. Try posting a second time while your post is live. It is refused until the post expires or you remove it.
7. Tap a commuter's name to see their profile (name, photo, shared rides, member since; never a phone number). Open **My rides** from your account menu to see your history.
8. Use the **EN / বাংলা** toggle for language and the sun/moon button for light or dark mode.

## Deploy to Vercel

**1. Push the code.** `.env.local` is git-ignored, so your keys won't be uploaded.
```bash
git init && git add . && git commit -m "RickshawMate"
# create an empty repo on GitHub, then:
git remote add origin https://github.com/<you>/rickshawmate.git
git push -u origin main
```

**2. Import it.** In [vercel.com/new](https://vercel.com/new), pick the repo. Vercel detects Next.js, so leave the build settings alone. Set the **Project Name** to `rickshawmate`, which gives you `rickshawmate.vercel.app` if the name is free.

**3. Add environment variables** (Project → Settings → Environment Variables, for Production, Preview and Development):

| Name | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your anon / publishable key |
| `NEXT_PUBLIC_SITE_URL` | optional, your custom domain |
| `NEXT_PUBLIC_CONTACT_EMAIL` | optional, shown on the privacy and terms pages |

Redeploy after changing variables, because `NEXT_PUBLIC_*` values are baked in at build time.

**4. Tell Supabase and Google about the new domain.** Skipping this is the usual reason sign-in fails after deploying.
- **Supabase → Authentication → URL Configuration:** set **Site URL** to `https://rickshawmate.vercel.app` (or your domain). Under **Redirect URLs** add `https://rickshawmate.vercel.app/**` and `https://*.vercel.app/**` (the second covers preview deployments). Keep `http://localhost:3000/**` for local work.
- **Google Cloud → your OAuth client → Authorized JavaScript origins:** add `https://rickshawmate.vercel.app`. The redirect URI stays the Supabase callback.
- **Google consent screen:** add `https://rickshawmate.vercel.app/privacy` and `/terms` as the privacy policy and terms links.

**5. Custom domain (optional).** Project → Settings → Domains. Then update `NEXT_PUBLIC_SITE_URL`, the Supabase URLs and the Google origin to the new domain.

### Routes

| URL | What it is |
| --- | --- |
| `/` | The app. It accepts `?from=<hub-id>&to=<hub-id>`, e.g. `/?from=aftab-nagar-gate&to=rampura-bridge`. The address bar updates as you pick a route, and the **Share this route link** button shares it (for WhatsApp groups). Invalid pairs are ignored. |
| `/privacy`, `/terms` | Static legal pages (Google sign-in review asks for them). They are templates, so have them reviewed before launch. |
| `/robots.txt`, `/sitemap.xml` | Generated, using your production domain on Vercel. |
| `/manifest.webmanifest` | PWA manifest with 192/512 and maskable icons. |
| anything else | A friendly 404 page. Runtime errors show a "Try again" page. |

Responses carry security headers (`X-Frame-Options`, `nosniff`, `Referrer-Policy`, camera-only `Permissions-Policy`), set in [next.config.ts](next.config.ts). The app is fully static, so no server region needs choosing.

**Folder name:** the project folder is still called `riksha-share`. It doesn't affect the deploy, and you can rename it any time with `mv`.

## Live updates, refresh and troubleshooting

- **Three layers keep the feed correct:** Realtime pushes changes instantly, a silent refetch runs every 12 s (and on tab focus or reconnect) as a safety net, and the last result is cached per route so a reload paints instantly. Fetched data is merged with newer live changes, so a slow response can't hide a fresh post.
- **Pull down to refresh** refetches the feed in place. The browser's own pull-to-refresh (a full page reload) is disabled on purpose, because it caused a flash.
- **If a post still doesn't appear on another device**, open the console on that device and look for `[RickshawMate:realtime]` lines. A warning that live updates did not connect means `ride_requests` is missing from the Realtime publication. Fix it in the SQL editor:
  ```sql
  select * from pg_publication_tables where pubname = 'supabase_realtime';   -- ride_requests should be listed
  alter publication supabase_realtime add table public.ride_requests;        -- only if it is missing
  ```
  Even then the list heals itself within 12 s.
- Both people must have the **same From and To** selected. The address bar shows the current route, so you can compare.

## Reading the browser console

Open DevTools → Console. In development the app logs each step with a `[RickshawMate:<area>]` tag:

```
✅ [RickshawMate:auth]      Signed in anonymously (user 3f9a1c2e)
✅ [RickshawMate:database]  Database connected successfully: loaded 11 hubs and 16 routes
✅ [RickshawMate:realtime]  Live updates connected for aftab-nagar-gate → rampura-bridge
ℹ️ [RickshawMate:feed]      Loaded 2 active ride(s) for aftab-nagar-gate → rampura-bridge
ℹ️ [RickshawMate:photo]     Compressed 3201.4 KB → 48.2 KB (image/webp)
✅ [RickshawMate:post]      Ride posted (id 7d21b0aa), it expires in 15 minutes
ℹ️ [RickshawMate:realtime]  UPDATE on ride 7d21b0aa (status: matched)
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
public/         PWA manifest and icons
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
