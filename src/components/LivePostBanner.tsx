"use client";

import { Loader2, Trash2 } from "lucide-react";
import { CountdownRing } from "@/components/CountdownRing";
import { useHubs } from "@/components/HubsProvider";
import { useLang } from "@/components/LangProvider";
import type { HistoryItem } from "@/types";

interface LivePostBannerProps {
  item: HistoryItem;
  now: number;
  busy: boolean;
  onRemove: (item: HistoryItem) => void;
}

/** Shown on every route while the user has a live post, since only one is allowed at a time. */
export function LivePostBanner({ item, now, busy, onRemove }: LivePostBannerProps) {
  const { t, lang } = useLang();
  const { find } = useHubs();

  return (
    <div className="mx-4 mt-3 flex items-center gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-3">
      <CountdownRing postedAt={item.createdAt} expiresAt={item.expiresAt} now={now} size={52} />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-300">{t("yourLivePost")}</p>
        <p className="truncate text-sm font-bold text-fg">
          {find(item.originId)?.name[lang]} → {find(item.destinationId)?.name[lang]}
        </p>
        <p className="truncate text-xs text-slate-400">{t("onePostAtATime")}</p>
      </div>
      <button
        type="button"
        onClick={() => onRemove(item)}
        disabled={busy}
        aria-label={t("cancelPost")}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-slate-200 ring-1 ring-line/15 active:scale-95 disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <Trash2 className="h-5 w-5" aria-hidden />}
      </button>
    </div>
  );
}
