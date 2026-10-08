"use client";

import { useCallback, useEffect, useState } from "react";
import { log } from "@/lib/logger";
import { fetchMyHistory } from "@/lib/rides";
import type { HistoryItem } from "@/types";

/** The signed-in user's own rides (posted + joined). Call `refresh()` after any change. */
export function useMyRides(uid: string | null) {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!uid) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const rows = await fetchMyHistory(uid);
      setItems(rows);
      log.info("history", `Loaded ${rows.length} of your rides`);
    } catch (e) {
      log.error("history", `Could not load your rides: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { items, loading, refresh };
}
