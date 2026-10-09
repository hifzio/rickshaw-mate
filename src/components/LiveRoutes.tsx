"use client";

import { ChevronRight, Clock, Radio, RefreshCw, Users, WifiOff } from "lucide-react";
import { useHubs } from "@/components/HubsProvider";
import { useLang } from "@/components/LangProvider";
import { minutesAgo } from "@/lib/time";
import type { LiveRoute } from "@/types";

interface LiveRoutesProps {
  routes: LiveRoute[];
  loaded: boolean;
  error: boolean;
  onRetry: () => void;
  now: number;
  onOpen: (originId: string, destinationId: string) => void;
  onPost: () => void;
}

/** The answer to "where are the live requests?": every route with people waiting, one tap away. */
export function LiveRoutes({ routes, loaded, error, onRetry, now, onOpen, onPost }: LiveRoutesProps) {
  const { t, lang } = useLang();
  const { find } = useHubs();
  const live = routes.filter((r) => r.soonestExpiry > now);

  return (
    <section id="live-now" aria-labelledby="live-title" className="scroll-mt-20 px-4 pt-7">
      <div className="mb-3 flex items-end justify-between">
        <h2 id="live-title" className="text-xl font-extrabold tracking-tight text-fg">
          {t("liveNowTitle")}
        </h2>
        <span className="inline-flex items-center gap-1.5 pb-0.5 text-xs font-bold text-emerald-300">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          {t("liveNowLive")}
        </span>
      </div>

      {error && !loaded ? (
        <div className="rounded-3xl border border-amber-400/25 bg-amber-500/10 p-5 text-center">
          <WifiOff className="mx-auto h-7 w-7 text-amber-300" aria-hidden />
          <p className="mt-2 text-sm font-semibold text-amber-200">{t("errLiveRoutes")}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 inline-flex h-11 items-center gap-2 rounded-xl bg-line/10 px-4 text-sm font-bold text-fg active:scale-95"
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            {t("retry")}
          </button>
        </div>
      ) : !loaded ? (
        <div className="space-y-2.5" aria-hidden>
          {[0, 1].map((i) => (
            <div key={i} className="h-[76px] animate-pulse rounded-2xl bg-zinc-900 ring-1 ring-line/10" />
          ))}
        </div>
      ) : live.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line/15 bg-zinc-900/60 p-6 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-300">
            <Radio className="h-6 w-6" aria-hidden />
          </span>
          <p className="mt-3 text-base font-bold text-fg">{t("liveNowEmptyTitle")}</p>
          <p className="mx-auto mt-1 max-w-[260px] text-sm text-slate-400">{t("liveNowEmptyBody")}</p>
          <button
            type="button"
            onClick={onPost}
            className="mt-4 h-12 rounded-xl bg-emerald-500 px-6 text-sm font-extrabold text-ink shadow-lg shadow-emerald-500/20 active:scale-95"
          >
            {t("imWaiting")}
          </button>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {live.map((r) => {
            const ago = minutesAgo(r.latestPost, now);
            return (
              <li key={`${r.originId}>${r.destinationId}`}>
                <button
                  type="button"
                  onClick={() => onOpen(r.originId, r.destinationId)}
                  className="group flex w-full items-center gap-3 rounded-2xl border border-line/10 bg-zinc-900 p-3.5 text-left shadow-sm shadow-black/10 transition active:scale-[0.99] active:bg-zinc-800"
                >
                  <span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/25">
                    <Users className="h-4 w-4" aria-hidden />
                    <span className="text-base font-extrabold leading-none">{r.waiting}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-bold text-fg">{find(r.originId)?.name[lang]}</span>
                    <span className="block truncate text-sm text-slate-300">→ {find(r.destinationId)?.name[lang]}</span>
                    <span className="mt-0.5 flex items-center gap-1 text-xs font-medium text-slate-400">
                      <Clock className="h-3 w-3" aria-hidden />
                      {ago < 1 ? t("postedJustNow") : t("postedAgo", { n: ago })}
                    </span>
                  </span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-indigo-300 transition group-active:translate-x-0.5" aria-label={t("viewRoute")} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
