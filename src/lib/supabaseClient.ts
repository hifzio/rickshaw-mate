import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { log } from "@/lib/logger";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && key);

if (!isSupabaseConfigured) {
  log.error(
    "config",
    "Supabase env vars are missing. Copy .env.local.example to .env.local, fill in the URL and anon key, then restart `npm run dev`.",
  );
}

// Catch the classic mistake of pasting the key into the URL (or vice versa).
if (url && !/^https:\/\/[a-z0-9]{15,30}\.supabase\.co\/?$/.test(url)) {
  log.error(
    "config",
    `NEXT_PUBLIC_SUPABASE_URL looks wrong: "${url.slice(0, 40)}…". It must look like https://<project-ref>.supabase.co ` +
      "(Supabase → Project Settings → API → Project URL). Keys go in NEXT_PUBLIC_SUPABASE_ANON_KEY, not here.",
  );
}

let client: SupabaseClient | null = null;

/** Lazy singleton so a missing .env.local shows a setup screen instead of crashing at import. */
export function getSupabase(): SupabaseClient {
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  if (!client) log.info("config", `Supabase client created for ${new URL(url).host}`);
  client ??= createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true },
    realtime: { params: { eventsPerSecond: 5 } },
  });
  return client;
}
