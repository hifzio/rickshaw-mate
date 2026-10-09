"use client";

import { useState } from "react";
import { ArrowRight, History, Plus, Radio, Route as RouteIcon, UsersRound } from "lucide-react";
import { useHubs } from "@/components/HubsProvider";
import { useLang } from "@/components/LangProvider";
import { LiveRoutes } from "@/components/LiveRoutes";
import { RouteSelector } from "@/components/RouteSelector";
import type { LiveRoute, RouteFilter } from "@/types";

interface HomeScreenProps {
  liveRoutes: LiveRoute[];
  liveLoaded: boolean;
  liveError: boolean;
  onRetryLive: () => void;
  now: number;
  recent: RouteFilter | null;
  onOpenRoute: (originId: string, destinationId: string) => void;
  onPost: () => void;
}

export function HomeScreen({ liveRoutes, liveLoaded, liveError, onRetryLive, now, recent, onOpenRoute, onPost }: HomeScreenProps) {
  const { t, lang } = useLang();
  const { find } = useHubs();
  const [finder, setFinder] = useState<RouteFilter>({ originId: "", destinationId: "" });

  const change = (next: RouteFilter) => {
    setFinder(next);
    if (next.originId && next.destinationId) onOpenRoute(next.originId, next.destinationId);
  };

  const steps = [
    { icon: RouteIcon, title: t("step1Title"), body: t("step1Body") },
    { icon: Radio, title: t("step2Title"), body: t("step2Body") },
    { icon: UsersRound, title: t("step3Title"), body: t("step3Body") },
  ];

  return (
    <div className="pb-36">
      {/* Hero */}
      <section className="px-4 pt-4">
        <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-indigo-600 via-indigo-700 to-[#1b2468] p-5 text-white shadow-xl shadow-indigo-900/30 ring-1 ring-white/10">
          <div className="pointer-events-none absolute -right-8 -top-10 h-44 w-44 rounded-full bg-emerald-400/25 blur-3xl" aria-hidden />
          <div className="pointer-events-none absolute -bottom-12 -left-6 h-36 w-36 rounded-full bg-indigo-300/20 blur-3xl" aria-hidden />
          <p className="relative text-[11px] font-bold uppercase tracking-[0.18em] text-[#6ee7b7]">{t("heroEyebrow")}</p>
          <h1 className="relative mt-2 text-[28px] font-extrabold leading-[1.1] tracking-tight">{t("heroTitle")}</h1>
          <p className="relative mt-2.5 max-w-[320px] text-[15px] leading-snug text-indigo-100/90">{t("heroBody")}</p>
          <div className="relative mt-5 flex gap-2.5">
            <button
              type="button"
              onClick={() => document.getElementById("live-now")?.scrollIntoView({ behavior: "smooth", block: "start" })}
              className="flex h-12 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-white text-sm font-extrabold text-ink shadow-lg active:scale-95"
            >
              {t("heroSeeLive")}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={onPost}
              className="flex h-12 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-emerald-500 px-5 text-sm font-extrabold text-ink shadow-lg shadow-emerald-500/30 active:scale-95"
            >
              <Plus className="h-4 w-4" strokeWidth={3} aria-hidden />
              {t("navPost")}
            </button>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section aria-labelledby="steps-title" className="px-4 pt-5">
        <h2 id="steps-title" className="sr-only">
          {t("stepsTitle")}
        </h2>
        <ol className="grid grid-cols-3 gap-2">
          {steps.map((s, i) => (
            <li key={s.title} className="rounded-2xl bg-zinc-900 p-3 ring-1 ring-line/10">
              <span className="flex items-center gap-1.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-extrabold text-indigo-300">
                  {i + 1}
                </span>
                <s.icon className="h-4 w-4 text-slate-400" aria-hidden />
              </span>
              <p className="mt-2 text-[13px] font-bold leading-tight text-fg">{s.title}</p>
              <p className="mt-1 text-[11px] leading-snug text-slate-400">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <LiveRoutes
        routes={liveRoutes}
        loaded={liveLoaded}
        error={liveError}
        onRetry={onRetryLive}
        now={now}
        onOpen={onOpenRoute}
        onPost={onPost}
      />

      {/* Find by route */}
      <section aria-labelledby="finder-title" className="px-4 pt-7">
        <div className="rounded-3xl border border-line/10 bg-zinc-900 p-4 shadow-sm shadow-black/10">
          <h2 id="finder-title" className="text-lg font-extrabold tracking-tight text-fg">
            {t("findByRouteTitle")}
          </h2>
          <p className="mb-3 mt-0.5 text-sm text-slate-400">{t("findByRouteHint")}</p>
          <RouteSelector route={finder} onChange={change} className="" idPrefix="finder" />
        </div>

        {recent && (
          <button
            type="button"
            onClick={() => onOpenRoute(recent.originId, recent.destinationId)}
            className="mt-3 flex w-full items-center gap-2.5 rounded-2xl bg-line/5 px-4 py-3 text-left ring-1 ring-line/10 active:scale-[0.99]"
          >
            <History className="h-4 w-4 shrink-0 text-indigo-300" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">{t("recentRoute")}</span>
              <span className="block truncate text-sm font-semibold text-fg">
                {find(recent.originId)?.name[lang]} → {find(recent.destinationId)?.name[lang]}
              </span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-indigo-300" aria-hidden />
          </button>
        )}
      </section>
    </div>
  );
}
