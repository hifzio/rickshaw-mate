"use client";

import { useEffect, useRef } from "react";
import { log, short } from "@/lib/logger";
import { fetchContact, fetchMyLatestRide } from "@/lib/rides";
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

/** Remember a finished match so a refresh doesn't resurrect the matched screen. */
export function markDismissed(rideId: string) {
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify([rideId, ...readDismissed()].slice(0, 20)));
  } catch {
    /* storage unavailable */
  }
}

/**
 * Tells the person who was *waiting* that someone claimed their post. Subscribes by owner_id
 * (not by route) so it still fires if they switched the route filter after posting, and
 * re-checks on every (re)subscribe to catch a match that landed while offline.
 */
export function useMyMatch(uid: string | null, onMatch: (info: MatchInfo) => void, onChange?: () => void) {
  const handler = useRef(onMatch);
  handler.current = onMatch;
  const changed = useRef(onChange);
  changed.current = onChange;
  const handled = useRef(new Set<string>());

  useEffect(() => {
    if (!uid) return;
    const sb = getSupabase();
    let alive = true;

    const announce = async (ride: RideRow) => {
      if (ride.status !== "matched" || handled.current.has(ride.id)) return;
      if (readDismissed().includes(ride.id)) return;
      handled.current.add(ride.id);
      log.success("match", `Someone accepted your ride ${short(ride.id)}, loading their contact…`);
      try {
        const contact = await fetchContact(ride.id);
        if (!alive || !contact?.claimer_phone) {
          handled.current.delete(ride.id);
          return;
        }
        handler.current({
          rideId: ride.id,
          role: "owner",
          partnerId: ride.matched_with,
          partnerName: contact.claimer_name ?? "",
          partnerPhone: contact.claimer_phone,
          partnerVerified: false,
          note: ride.standing_note,
          originId: ride.origin_id,
          destinationId: ride.destination_id,
        });
      } catch {
        handled.current.delete(ride.id);
      }
    };

    const recheck = async () => {
      try {
        const latest = await fetchMyLatestRide(uid);
        if (alive && latest) await announce(latest);
      } catch {
        /* next event or reconnect will retry */
      }
    };

    const channel = sb
      .channel(`mine:${uid}:${Math.random().toString(36).slice(2, 8)}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "ride_requests", filter: `owner_id=eq.${uid}` },
        (payload) => {
          changed.current?.();
          void announce(payload.new as RideRow);
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          log.success("realtime", "Listening for matches on your own posts");
          void recheck();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          log.error("realtime", `Match listener ${status}`);
        }
      });

    return () => {
      alive = false;
      void sb.removeChannel(channel);
    };
  }, [uid]);
}
