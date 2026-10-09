"use client";

import { CheckCircle2, ChevronRight, Clock, ClipboardList, Loader2, Timer, XCircle } from "lucide-react";
import { useHubs } from "@/components/HubsProvider";
import { useLang } from "@/components/LangProvider";
import type { HistoryItem, RideStatus } from "@/types";

interface RidesScreenProps {
  items: HistoryItem[];
  loading: boolean;
  now: number;
  onViewProfile: (userId: string, name: string) => void;
  onFind: () => void;
}

const STATUS_STYLE: Record<RideStatus | "live", { cls: string; key: string }> = {
  live: { cls: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30", key: "statusLive" },
  waiting: { cls: "bg-amber-500/10 text-amber-300 ring-amber-400/30", key: "statusExpired" },
  matched: { cls: "bg-indigo-500/20 text-indigo-200 ring-indigo-400/30", key: "statusMatched" },
  completed: { cls: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30", key: "statusCompleted" },
  expired: { cls: "bg-line/10 text-slate-400 ring-line/10", key: "statusExpired" },
  cancelled: { cls: "bg-line/10 text-slate-400 ring-line/10", key: "statusCancelled" },
};

/** "My rides" as an in-page tab (header and bottom bar stay put), not a separate window. */
export function RidesScreen({ items, loading, now, onViewProfile, onFind }: RidesScreenProps) {
  const { t, lang, num } = useLang();
  const { find } = useHubs();
  const fmt = new Intl.DateTimeFormat(lang === "bn" ? "bn-BD" : "en-GB", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });

  const completed = items.filter((i) => i.status === "completed").length;
  const cancelled = items.filter((i) => i.status === "cancelled" && i.partnerId).length;

  return (
    <section aria-labelledby="rides-title" className="animate-fade-in px-4 pb-36 pt-5">
      <h1 id="rides-title" className="text-2xl font-extrabold tracking-tight text-fg">
        {t("myRides")}
      </h1>

      {items.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Summary label={t("profilePosted")} value={num(items.filter((i) => i.role === "owner").length)} />
          <Summary label={t("trustCompleted")} value={num(completed)} />
          <Summary label={t("trustCancelled")} value={num(cancelled)} />
        </div>
      )}

      <div className="mt-4">
        {loading && items.length === 0 ? (
          <div className="space-y-3" aria-hidden>
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-zinc-900 ring-1 ring-line/10" />
            ))}
            <span className="sr-only">
              <Loader2 className="h-4 w-4 animate-spin" /> {t("loading")}
            </span>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-line/15 bg-zinc-900/60 p-8 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-300">
              <ClipboardList className="h-6 w-6" aria-hidden />
            </span>
            <p className="mx-auto mt-3 max-w-[260px] text-sm text-slate-400">{t("historyEmpty")}</p>
            <button
              type="button"
              onClick={onFind}
              className="mt-4 h-12 rounded-xl bg-emerald-500 px-6 text-sm font-extrabold text-ink active:scale-95"
            >
              {t("heroSeeLive")}
            </button>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((it) => {
              const live = it.status === "waiting" && it.expiresAt > now;
              const cancelledMatch = it.status === "cancelled" && Boolean(it.partnerId);
              const style = STATUS_STYLE[live ? "live" : it.status];
              const StatusIcon =
                it.status === "matched" || it.status === "completed"
                  ? CheckCircle2
                  : live
                    ? Timer
                    : it.status === "cancelled"
                      ? XCircle
                      : Clock;
              const partnered = (it.status === "matched" || it.status === "completed") && it.partnerId;
              return (
                <li key={it.id} className="rounded-2xl border border-line/10 bg-zinc-900 p-4 shadow-sm shadow-black/10">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-bold text-fg">{find(it.originId)?.name[lang]}</p>
                      <p className="truncate text-sm text-slate-300">→ {find(it.destinationId)?.name[lang]}</p>
                      <p className="mt-0.5 text-xs font-medium text-slate-400">
                        {it.role === "owner" ? t("rolePosted") : t("roleJoined")} · {num(fmt.format(new Date(it.createdAt)))}
                      </p>
                    </div>
                    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${style.cls}`}>
                      <StatusIcon className="h-3.5 w-3.5" aria-hidden />
                      {t(cancelledMatch ? "statusCancelledMatch" : style.key)}
                    </span>
                  </div>

                  <p className="mt-2.5 line-clamp-2 text-sm text-slate-300">{it.note}</p>

                  {partnered && (
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
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-zinc-900 p-3 ring-1 ring-line/10">
      <p className="text-xl font-extrabold leading-none text-fg">{value}</p>
      <p className="mt-1 truncate text-[11px] font-medium text-slate-400">{label}</p>
    </div>
  );
}
