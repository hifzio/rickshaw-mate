"use client";

import { useEffect, useRef, useState } from "react";
import { fetchServerOffset } from "@/lib/rides";

/** `now` in server time (epoch ms), ticking every second. Null until mounted. */
export function useServerClock(): number | null {
  const [now, setNow] = useState<number | null>(null);
  const offset = useRef(0);

  useEffect(() => {
    const tick = () => setNow(Date.now() + offset.current);
    tick();
    const id = window.setInterval(tick, 1_000);
    fetchServerOffset()
      .then((o) => {
        offset.current = o;
        tick();
      })
      .catch(() => {});
    return () => window.clearInterval(id);
  }, []);

  return now;
}
