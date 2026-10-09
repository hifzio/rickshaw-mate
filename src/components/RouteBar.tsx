"use client";

import { ArrowLeft, Share2 } from "lucide-react";
import { useHubs } from "@/components/HubsProvider";
import { useLang } from "@/components/LangProvider";
import type { RouteFilter } from "@/types";

interface RouteBarProps {
  route: RouteFilter;
  onBack: () => void;
  onShare: () => void;
}

/** Context for the feed: which route am I looking at, how do I go back, how do I invite people. */
export function RouteBar({ route, onBack, onShare }: RouteBarProps) {
  const { t, lang } = useLang();
  const { find } = useHubs();

  return (
    <div className="px-4 pt-3">
      <div className="flex items-center gap-2 rounded-2xl bg-zinc-900 p-2 ring-1 ring-line/10">
        <button
          type="button"
          onClick={onBack}
          aria-label={t("backToLive")}
          className="flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-line/5 px-3 text-sm font-bold text-indigo-300 active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          <span className="hidden min-[390px]:inline">{t("navFind")}</span>
        </button>
        <div className="min-w-0 flex-1 px-1">
          <p className="truncate text-sm font-bold text-fg">{find(route.originId)?.name[lang]}</p>
          <p className="truncate text-xs text-slate-400">→ {find(route.destinationId)?.name[lang]}</p>
        </div>
        <button
          type="button"
          onClick={onShare}
          aria-label={t("shareRoute")}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-line/5 text-indigo-300 active:scale-95"
        >
          <Share2 className="h-[18px] w-[18px]" aria-hidden />
        </button>
      </div>
    </div>
  );
}
