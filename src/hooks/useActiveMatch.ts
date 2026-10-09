"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { log, short } from "@/lib/logger";
import { buildMatchInfo, fetchLatestMatch } from "@/lib/rides";
import { getSupabase } from "@/lib/supabaseClient";
import type { MatchInfo, RideRow } from "@/types";

const DISMISSED_KEY = "rs:dismissed";

function readDismissed(): string[] {
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

/** Remember a finished match so a reload doesn't bring the matched screen back. */
export function markDismissed(rideId: string) {
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify([rideId, ...readDismissed()].slice(0, 20)));
  } catch {
    /* storage unavailable */
  }
}

/**
 * The rider's current match, for BOTH sides (whoever posted and whoever joined).
 *  - restored from the database on load, so a reload or a second tab shows the same screen;
 *  - updated live: a partner completing or cancelling flips the screen to its ended state;
 *  - stays until this rider closes it (after completing/cancelling, or seeing it ended).
 */
export function useActiveMatch(uid: string | null, onChange?: () => void) {
  const [match, setMatchState] = useState<MatchInfo | null>(null);
  const matchRef = useRef<MatchInfo | null>(null);
  const changed = useRef(onChange);
  changed.current = onChange;

  const setMatch = useCallback((next: MatchInfo | null) => {
    matchRef.current = next;
    setMatchState(next);
  }, []);

  const apply = useCallback(
    async (row: RideRow) => {
      // Only rides that actually have two people in them (not waiting/expired/withdrawn posts).
      if (!uid || !row.matched_with || readDismissed().includes(row.id)) return;
      const current = matchRef.current;
      // Already showing this ride in the same state: nothing to do.
      const nextStatus = row.status === "completed" ? "completed" : row.status === "cancelled" ? "cancelled" : "active";
      if (current?.rideId === row.id && current.status === nextStatus) return;
      // A different ride is on screen: don't replace it under the user's thumb.
      if (current && current.rideId !== row.id) return;
      try {
        const info = await buildMatchInfo(row, uid);
        if (!info) return;
        if (matchRef.current && matchRef.current.rideId !== info.rideId) return;
        log.success("match", `Match ${short(row.id)} is ${info.status} (you are the ${info.role})`);
        setMatch(info);
      } catch (e) {
        log.error("match", `Could not load match details: ${(e as Error).message}`);
      }
    },
    [uid, setMatch],
  );

  const recheck = useCallback(async () => {
    if (!uid) return;
    try {
      const row = await fetchLatestMatch(uid);
      if (row && ["matched", "completed", "cancelled"].includes(row.status)) await apply(row);
    } catch {
      /* the next event or reconnect retries */
    }
  }, [uid, apply]);

  useEffect(() => {
    if (!uid) {
      setMatch(null);
      return;
    }
    const sb = getSupabase();
    const suffix = Math.random().toString(36).slice(2, 8);
    const onRow = (row: RideRow) => {
      changed.current?.();
      void apply(row);
    };
    const channel = sb
      .channel(`match:${uid}:${suffix}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "ride_requests", filter: `owner_id=eq.${uid}` },
        (p) => onRow(p.new as RideRow),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "ride_requests", filter: `matched_with=eq.${uid}` },
        (p) => onRow(p.new as RideRow),
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          log.success("realtime", "Listening for match updates on your rides");
          void recheck();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          log.error("realtime", `Match listener ${status}. Re-checking every 15 s instead.`);
        }
      });

    void recheck();
    // Same safety net as the feed: a missed socket message must not leave one side without the screen.
    const poll = window.setInterval(() => document.visibilityState === "visible" && void recheck(), 15_000);
    const onVisible = () => document.visibilityState === "visible" && void recheck();
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
      void sb.removeChannel(channel);
    };
  }, [uid, apply, recheck, setMatch]);

  return { match, setMatch, recheck };
}
