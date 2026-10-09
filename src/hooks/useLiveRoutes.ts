"use client";

import { useEffect, useRef, useState } from "react";
import { log } from "@/lib/logger";
import { fetchLiveRoutes } from "@/lib/rides";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import type { LiveRoute } from "@/types";

const POLL_MS = 12_000;
const CACHE_KEY = "rs:live-routes";

function readCache(): LiveRoute[] | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as LiveRoute[]) : null;
  } catch {
    return null;
  }
}

/**
 * Every route with people waiting right now: the "where are the live requests?" overview.
 * Any change to ride_requests triggers a (debounced) refetch; polling is the safety net.
 */
export function useLiveRoutes(enabled: boolean) {
  const [routes, setRoutes] = useState<LiveRoute[]>(() => (typeof window === "undefined" ? [] : (readCache() ?? [])));
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(() => typeof window !== "undefined" && readCache() !== null);
  const loadRef = useRef<() => Promise<void>>(() => Promise.resolve());

  useEffect(() => {
    if (!enabled || !isSupabaseConfigured) return;
    const sb = getSupabase();
    let alive = true;
    let timer: number | undefined;

    const load = async () => {
      try {
        const rows = await fetchLiveRoutes();
        if (!alive) return;
        setRoutes(rows);
        setLoaded(true);
        setError(false);
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify(rows));
        } catch {
          /* storage unavailable */
        }
        log.info("home", `${rows.length} route(s) have people waiting right now`);
      } catch (e) {
        log.error(
          "home",
          `Could not load live routes: ${(e as Error).message}. If this says the function does not exist, run supabase/migrations/20261008050000_trust_and_match_lifecycle.sql.`,
        );
        if (alive) setError(true);
      }
    };
    loadRef.current = load;
    const soon = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void load(), 400);
    };

    const channel = sb
      .channel(`live-routes:${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "ride_requests" }, soon)
      .subscribe((status) => {
        if (status === "SUBSCRIBED") void load();
      });

    void load();
    const refetch = () => document.visibilityState === "visible" && void load();
    const poll = window.setInterval(refetch, POLL_MS);
    document.addEventListener("visibilitychange", refetch);
    window.addEventListener("online", refetch);

    return () => {
      alive = false;
      window.clearTimeout(timer);
      window.clearInterval(poll);
      document.removeEventListener("visibilitychange", refetch);
      window.removeEventListener("online", refetch);
      void sb.removeChannel(channel);
    };
  }, [enabled]);

  return { routes, loaded, error, refresh: () => loadRef.current() };
}
