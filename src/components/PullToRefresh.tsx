"use client";

import { useRef, useState } from "react";
import type { ReactNode, TouchEvent } from "react";
import { ArrowDown, Loader2 } from "lucide-react";
import { useLang } from "@/components/LangProvider";

const THRESHOLD = 64;
const MAX_PULL = 96;

interface PullToRefreshProps {
  onRefresh: () => Promise<unknown>;
  children: ReactNode;
}

/**
 * In-app pull-to-refresh. The browser's own gesture does a full page reload (white flash, state
 * lost), so it is disabled in globals.css and replaced with this silent refetch.
 * Wrap only the scrolling content: `transform` would break `position: fixed` children.
 */
export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const { t } = useLang();
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);

  const onTouchStart = (e: TouchEvent) => {
    startY.current = window.scrollY <= 0 && !refreshing ? e.touches[0].clientY : null;
  };

  const onTouchMove = (e: TouchEvent) => {
    if (startY.current === null) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy <= 0 || window.scrollY > 0) {
      if (pull !== 0) setPull(0);
      return;
    }
    setPull(Math.min(MAX_PULL, dy * 0.5)); // rubber-band resistance
  };

  const onTouchEnd = async () => {
    const released = pull;
    startY.current = null;
    if (released < THRESHOLD) {
      setPull(0);
      return;
    }
    setRefreshing(true);
    setPull(THRESHOLD * 0.75);
    // Keep the spinner up long enough to read as feedback, even when the fetch is instant.
    await Promise.all([onRefresh().catch(() => {}), new Promise((r) => setTimeout(r, 600))]);
    setRefreshing(false);
    setPull(0);
  };

  const dragging = startY.current !== null && !refreshing;
  const ready = pull >= THRESHOLD;

  return (
    <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} onTouchCancel={onTouchEnd}>
      <div
        style={{
          transform: pull > 0 ? `translateY(${pull}px)` : undefined,
          transition: dragging ? "none" : "transform 0.25s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
        className="relative"
      >
        {(pull > 0 || refreshing) && (
          <div
              className="pointer-events-none absolute inset-x-0 -top-14 flex h-14 items-center justify-center"
            style={{ opacity: Math.min(1, pull / THRESHOLD) }}
          >
            <span className="flex items-center gap-2 rounded-full bg-zinc-900 px-3.5 py-2 text-xs font-bold text-indigo-300 shadow-lg ring-1 ring-line/10">
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <ArrowDown
                  className="h-4 w-4 transition-transform duration-200"
                  style={{ transform: ready ? "rotate(180deg)" : "none" }}
                  aria-hidden
                />
              )}
              {refreshing ? t("refreshing") : ready ? t("releaseToRefresh") : t("pullToRefresh")}
            </span>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
