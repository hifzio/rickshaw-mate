"use client";

import { CheckCircle2, ChevronRight, Clock, Loader2, Timer, X, XCircle } from "lucide-react";
import { useHubs } from "@/components/HubsProvider";
import { useLang } from "@/components/LangProvider";
import type { HistoryItem, RideStatus } from "@/types";

interface HistorySheetProps {
  items: HistoryItem[];
  loading: boolean;
  now: number;
  onClose: () => void;
  onViewProfile: (userId: string, name: string) => void;
}

const STATUS_STYLE: Record<RideStatus | "live", { cls: string; key: string }> = {
  live: { cls: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30", key: "statusLive" },
  waiting: { cls: "bg-amber-500/10 text-amber-300 ring-amber-400/30", key: "statusExpired" },
  matched: { cls: "bg-indigo-500/20 text-indigo-200 ring-indigo-400/30", key: "statusMatched" },
  expired: { cls: "bg-line/10 text-slate-400 ring-line/10", key: "statusExpired" },
  cancelled: { cls: "bg-line/10 text-slate-400 ring-line/10", key: "statusCancelled" },
};

export function HistorySheet({ items, loading, now, onClose, onViewProfile }: HistorySheetProps) {
  const { t, lang, num } = useLang();
  const { find } = useHubs();
  const fmt = new Intl.DateTimeFormat(lang === "bn" ? "bn-BD" : "en-GB", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="fixed inset-0 z-[56] flex justify-center bg-zinc-950">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-title"
        className="flex h-dvh w-full max-w-[430px] animate-fade-in flex-col"
      >
        <header className="flex items-center justify-between border-b border-line/10 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <h2 id="history-title" className="text-xl font-extrabold text-fg">
            {t("myRides")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-900 text-slate-300 active:scale-95"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
          {loading && items.length === 0 ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-7 w-7 animate-spin text-indigo-300" aria-label={t("loading")} />
            </div>
          ) : items.length === 0 ? (
            <p className="px-6 py-16 text-center text-base text-slate-400">{t("historyEmpty")}</p>
          ) : (
            <ul className="space-y-3">
              {items.map((it) => {
                const live = it.status === "waiting" && it.expiresAt > now;
                const style = STATUS_STYLE[live ? "live" : it.status];
                const StatusIcon = it.status === "matched" ? CheckCircle2 : live ? Timer : it.status === "cancelled" ? XCircle : Clock;
                return (
                  <li key={it.id} className="rounded-2xl border border-line/10 bg-zinc-900 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-base font-bold text-fg">
                          {find(it.originId)?.name[lang]} → {find(it.destinationId)?.name[lang]}
                        </p>
                        <p className="mt-0.5 text-xs font-medium text-slate-400">
                          {it.role === "owner" ? t("rolePosted") : t("roleJoined")} · {num(fmt.format(new Date(it.createdAt)))}
                        </p>
                      </div>
                      <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${style.cls}`}>
                        <StatusIcon className="h-3.5 w-3.5" aria-hidden />
                        {t(style.key)}
                      </span>
                    </div>

                    <p className="mt-2.5 line-clamp-2 text-sm text-slate-300">{it.note}</p>

                    {it.status === "matched" && it.partnerId && (
                      <button
                        type="button"
                        onClick={() => onViewProfile(it.partnerId as string, it.partnerName ?? "")}
                        className="mt-3 flex h-11 w-full items-center justify-between rounded-xl bg-navy-900/70 px-3 text-sm font-semibold text-fg ring-1 ring-indigo-400/20 active:scale-[0.99]"
                      >
                        <span className="truncate">
                          {t("sharedWith")} <b>{it.partnerName ?? t("commuter")}</b>
                        </span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-indigo-300" aria-hidden />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
