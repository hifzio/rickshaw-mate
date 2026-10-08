"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { log, short } from "@/lib/logger";
import { fetchWaitingRides } from "@/lib/rides";
import { getSupabase } from "@/lib/supabaseClient";
import type { RideRow, RouteFilter } from "@/types";

/** Safety net: if the Realtime socket drops a message, the list still heals within this window. */
const POLL_MS = 12_000;
/** Fetches must not overwrite live changes newer than the fetch. Keep edits this long for merging. */
const EDIT_TTL_MS = 60_000;

const cacheKey = (o: string, d: string) => `rs:feed:${o}:${d}`;

/**
 * Last known feed for a route, so a reload paints instantly instead of a skeleton.
 * `null` means "never fetched"; an empty array is a real (cached) "nobody is waiting".
 */
function readCache(o: string, d: string): RideRow[] | null {
  if (!o || !d) return null;
  try {
    const raw = sessionStorage.getItem(cacheKey(o, d));
    return raw ? (JSON.parse(raw) as RideRow[]) : null;
  } catch {
    return null;
  }
}
function writeCache(o: string, d: string, rows: RideRow[]) {
  try {
    sessionStorage.setItem(cacheKey(o, d), JSON.stringify(rows));
  } catch {
    /* storage unavailable */
  }
}

const byNewest = (a: RideRow, b: RideRow) => b.created_at.localeCompare(a.created_at);

interface Store {
  key: string;
  rows: RideRow[];
  loaded: boolean;
}

/**
 * Live list of `waiting` rides for one route.
 *
 * Three layers keep it correct and flicker-free:
 *  1. Realtime `postgres_changes` applies changes instantly.
 *  2. A silent refetch runs on (re)subscribe, tab focus, coming back online and every 12 s.
 *     Fetched results are merged with newer live edits, so a slow response can never wipe
 *     a post that just arrived (or resurrect one that was just claimed).
 *  3. The last result is cached per route in sessionStorage for an instant first paint.
 */
export function useRides(route: RouteFilter, enabled: boolean) {
  const { originId, destinationId } = route;
  const key = `${originId}>${destinationId}`;
  const active = enabled && Boolean(originId && destinationId);

  const [store, setStore] = useState<Store>(() => {
    const cached = typeof window === "undefined" ? null : readCache(originId, destinationId);
    return { key, rows: cached ?? [], loaded: cached !== null };
  });
  const [error, setError] = useState(false);
  const edits = useRef(new Map<string, { at: number; row: RideRow | null }>());
  const loadRef = useRef<() => Promise<void>>(() => Promise.resolve());

  // Rows for the current route only (never show another route's cards for a frame).
  const cachedForRoute = useMemo(
    () => (store.key === key || !active ? null : readCache(originId, destinationId)),
    [store.key, key, active, originId, destinationId],
  );
  const rows = store.key === key ? store.rows : (cachedForRoute ?? []);
  const loading = active && !(store.key === key ? store.loaded : cachedForRoute !== null);

  const commit = useCallback(
    (update: (prev: RideRow[]) => RideRow[], loaded?: boolean) => {
      setStore((prev) => {
        const cached = prev.key === key ? null : readCache(originId, destinationId);
        const base = prev.key === key ? prev.rows : (cached ?? []);
        const next = update(base).sort(byNewest);
        writeCache(originId, destinationId, next);
        return { key, rows: next, loaded: loaded ?? (prev.key === key ? prev.loaded : cached !== null) };
      });
    },
    [key, originId, destinationId],
  );

  const upsert = useCallback(
    (row: RideRow) => {
      if (row.origin_id !== originId || row.destination_id !== destinationId) return;
      edits.current.set(row.id, { at: Date.now(), row: row.status === "waiting" ? row : null });
      commit((prev) => {
        const rest = prev.filter((r) => r.id !== row.id);
        return row.status === "waiting" ? [row, ...rest] : rest;
      });
    },
    [originId, destinationId, commit],
  );

  const remove = useCallback(
    (id: string) => {
      edits.current.set(id, { at: Date.now(), row: null });
      commit((prev) => prev.filter((r) => r.id !== id));
    },
    [commit],
  );

  useEffect(() => {
    if (!active) return;
    const sb = getSupabase();
    let alive = true;

    // One request at a time: focus, visibility, polling and pull-to-refresh can fire together.
    let inflight: Promise<void> | null = null;
    const load = () => (inflight ??= run().finally(() => (inflight = null)));

    const run = async () => {
      const startedAt = Date.now();
      try {
        const server = await fetchWaitingRides(originId, destinationId);
        if (!alive) return;
        const merged = new Map(server.map((r) => [r.id, r]));
        for (const [id, edit] of edits.current) {
          if (edit.at >= startedAt) {
            // A live change landed while this request was in flight, so it is newer than `server`.
            if (edit.row) merged.set(id, edit.row);
            else merged.delete(id);
          } else if (Date.now() - edit.at > EDIT_TTL_MS) {
            edits.current.delete(id);
          }
        }
        commit(() => [...merged.values()], true);
        setError(false);
        log.info("feed", `Loaded ${merged.size} active ride(s) for ${originId} → ${destinationId}`);
      } catch (e) {
        log.error("feed", `Failed to load the feed: ${(e as Error).message}`);
        if (alive) setError(true);
      }
    };
    loadRef.current = load;

    // A unique topic per subscription: re-using one while the previous channel is still being
    // torn down (React StrictMode, fast route changes) makes supabase-js reject the new listeners.
    const topic = `feed:${originId}:${destinationId}:${Math.random().toString(36).slice(2, 8)}`;
    const watchdog = window.setTimeout(() => {
      log.warn(
        "realtime",
        "Live updates have not connected after 6 s. The list still refreshes every 12 s. " +
          "If this persists, check Supabase → Database → Publications: ride_requests must be under supabase_realtime.",
      );
    }, 6000);

    const channel = sb
      .channel(topic)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ride_requests", filter: `origin_id=eq.${originId}` },
        (payload) => {
          const row = payload.new as RideRow;
          log.info(
            "realtime",
            `${payload.eventType} on ride ${short(row?.id ?? (payload.old as { id?: string })?.id)}` +
              (row?.status ? ` (status: ${row.status})` : ""),
          );
          if (payload.eventType === "DELETE") {
            const id = (payload.old as { id?: string }).id;
            if (id) remove(id);
          } else {
            upsert(row);
          }
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          window.clearTimeout(watchdog);
          log.success("realtime", `Live updates connected for ${originId} → ${destinationId}`);
          void load();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          log.error("realtime", `Live updates ${status}. Falling back to refreshing every 12 s.`);
        } else if (status === "CLOSED") {
          log.warn("realtime", "Live updates channel closed");
        }
      });

    void load();
    const refetch = () => {
      if (document.visibilityState === "visible") void load();
    };
    const poll = window.setInterval(refetch, POLL_MS);
    document.addEventListener("visibilitychange", refetch);
    window.addEventListener("online", refetch);
    window.addEventListener("focus", refetch);

    return () => {
      alive = false;
      window.clearTimeout(watchdog);
      window.clearInterval(poll);
      document.removeEventListener("visibilitychange", refetch);
      window.removeEventListener("online", refetch);
      window.removeEventListener("focus", refetch);
      void sb.removeChannel(channel);
    };
  }, [originId, destinationId, active, commit, upsert, remove]);

  /** Silent refetch (used by pull-to-refresh). Never shows a skeleton. */
  const refresh = useCallback(() => loadRef.current(), []);

  return { rides: active ? rows : [], loading, error, addRide: upsert, removeRide: remove, refresh };
}
