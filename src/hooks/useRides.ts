"use client";

import { useCallback, useEffect, useState } from "react";
import { log, short } from "@/lib/logger";
import { fetchWaitingRides } from "@/lib/rides";
import { getSupabase } from "@/lib/supabaseClient";
import type { RideRow, RouteFilter } from "@/types";

/**
 * Live list of `waiting` rides for one route.
 *
 * Realtime allows a single filter per subscription, so we filter on origin server-side and
 * on destination in the handler. A full refetch runs after every (re)SUBSCRIBED and when the
 * tab becomes visible again, which closes any gap from a dropped socket (common on mobile data).
 */
export function useRides(route: RouteFilter, enabled: boolean) {
  const [rides, setRides] = useState<RideRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const { originId, destinationId } = route;

  useEffect(() => {
    if (!enabled || !originId || !destinationId) {
      setRides([]);
      setLoading(false);
      return;
    }
    const sb = getSupabase();
    let alive = true;
    setLoading(true);

    const load = async () => {
      try {
        const rows = await fetchWaitingRides(originId, destinationId);
        if (!alive) return;
        setRides(rows);
        setError(false);
        log.info("feed", `Loaded ${rows.length} active ride(s) for ${originId} → ${destinationId}`);
      } catch (e) {
        log.error("feed", `Failed to load the feed: ${(e as Error).message}`);
        if (alive) setError(true);
      } finally {
        if (alive) setLoading(false);
      }
    };

    const channel = sb
      .channel(`feed:${originId}:${destinationId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ride_requests", filter: `origin_id=eq.${originId}` },
        (payload) => {
          log.info(
            "realtime",
            `${payload.eventType} on ride ${short((payload.new as RideRow)?.id ?? (payload.old as { id?: string })?.id)}` +
              ((payload.new as RideRow)?.status ? ` (status: ${(payload.new as RideRow).status})` : ""),
          );
          if (payload.eventType === "DELETE") {
            const id = (payload.old as { id?: string }).id;
            if (id) setRides((prev) => prev.filter((r) => r.id !== id));
            return;
          }
          const row = payload.new as RideRow;
          if (row.destination_id !== destinationId) return;
          setRides((prev) => {
            const rest = prev.filter((r) => r.id !== row.id);
            if (row.status !== "waiting") return rest;
            return [row, ...rest].sort((a, b) => b.created_at.localeCompare(a.created_at));
          });
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          log.success("realtime", `Live updates connected for ${originId} → ${destinationId}`);
          void load();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          log.error(
            "realtime",
            `Live updates ${status}. Is ride_requests in the supabase_realtime publication? Will retry automatically.`,
          );
        } else if (status === "CLOSED") {
          log.warn("realtime", "Live updates channel closed");
        }
      });

    void load();
    const onVisible = () => document.visibilityState === "visible" && void load();
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      alive = false;
      document.removeEventListener("visibilitychange", onVisible);
      void sb.removeChannel(channel);
    };
  }, [originId, destinationId, enabled]);

  /** Optimistic helpers so the poster / claimer sees the change before the socket echoes it. */
  const addRide = useCallback(
    (row: RideRow) => {
      if (row.origin_id !== originId || row.destination_id !== destinationId) return;
      setRides((prev) => [row, ...prev.filter((r) => r.id !== row.id)]);
    },
    [originId, destinationId],
  );
  const removeRide = useCallback((id: string) => setRides((prev) => prev.filter((r) => r.id !== id)), []);

  return { rides, loading, error, addRide, removeRide };
}
