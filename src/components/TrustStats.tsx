"use client";

import { Ban, BadgeCheck, CalendarDays, CheckCircle2, Clock, Route, UsersRound } from "lucide-react";
import { useLang } from "@/components/LangProvider";
import type { PublicProfile } from "@/types";

function monthYear(iso: string, lang: "en" | "bn") {
  return new Intl.DateTimeFormat(lang === "bn" ? "bn-BD" : "en-GB", { month: "long", year: "numeric" }).format(new Date(iso));
}

/** Compact record shown on the matched screen so both riders can judge each other at a glance. */
export function TrustChips({ profile }: { profile: PublicProfile | null }) {
  const { t, num, lang } = useLang();
  if (!profile) return <div className="h-14 animate-pulse rounded-2xl bg-line/5" aria-hidden />;

  const fresh = profile.completed + profile.cancelled === 0;
  return (
    <div className="rounded-2xl bg-line/5 p-3 ring-1 ring-line/10">
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{t("trustTitle")}</p>
      {fresh ? (
        <p className="mt-1 text-sm font-semibold text-fg">{t("trustNew")}</p>
      ) : (
        <div className="mt-2 flex flex-wrap gap-2">
          <Chip tone="good" icon={<CheckCircle2 className="h-3.5 w-3.5" aria-hidden />} text={`${num(profile.completed)} ${t("trustCompleted")}`} />
          <Chip tone={profile.cancelled > 0 ? "warn" : "muted"} icon={<Ban className="h-3.5 w-3.5" aria-hidden />} text={`${num(profile.cancelled)} ${t("trustCancelled")}`} />
          {profile.completion_rate !== null && (
            <Chip tone="info" icon={<BadgeCheck className="h-3.5 w-3.5" aria-hidden />} text={t("trustRate", { n: profile.completion_rate })} />
          )}
        </div>
      )}
      <p className="mt-2 text-xs text-slate-400">
        {t("memberSince")} {monthYear(profile.member_since, lang)}
      </p>
    </div>
  );
}

function Chip({ tone, icon, text }: { tone: "good" | "warn" | "info" | "muted"; icon: React.ReactNode; text: string }) {
  const cls = {
    good: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30",
    warn: "bg-amber-500/10 text-amber-300 ring-amber-400/30",
    info: "bg-indigo-500/20 text-indigo-200 ring-indigo-400/30",
    muted: "bg-line/5 text-slate-400 ring-line/10",
  }[tone];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${cls}`}>
      {icon}
      {text}
    </span>
  );
}

/** Full record for the profile sheet. */
export function TrustGrid({ profile }: { profile: PublicProfile }) {
  const { t, num, lang } = useLang();
  const rate = profile.completion_rate;
  const rateTone = rate === null ? "bg-line/20" : rate >= 80 ? "bg-emerald-500" : rate >= 50 ? "bg-amber-400" : "bg-rose-400";

  return (
    <div className="mt-6 space-y-3">
      <div className="rounded-2xl bg-zinc-900 p-4 ring-1 ring-line/10">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-semibold text-slate-300">{t("profileRate")}</span>
          <span className="text-2xl font-extrabold text-fg">{rate === null ? "-" : `${num(rate)}%`}</span>
        </div>
        <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-line/10" role="progressbar" aria-valuenow={rate ?? 0} aria-valuemin={0} aria-valuemax={100}>
          <div className={`h-full rounded-full transition-all duration-700 ${rateTone}`} style={{ width: `${rate ?? 0}%` }} />
        </div>
        {rate === null && <p className="mt-2 text-xs text-slate-400">{t("trustNew")}</p>}
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <Stat icon={<CheckCircle2 className="h-5 w-5 text-emerald-400" aria-hidden />} label={t("profileCompleted")} value={num(profile.completed)} />
        <Stat icon={<Ban className="h-5 w-5 text-amber-300" aria-hidden />} label={t("profileCancelled")} value={num(profile.cancelled)} />
        <Stat icon={<Route className="h-5 w-5 text-indigo-300" aria-hidden />} label={t("profilePosted")} value={num(profile.posted)} />
        <Stat icon={<UsersRound className="h-5 w-5 text-indigo-300" aria-hidden />} label={t("profileJoined")} value={num(profile.joined)} />
      </div>

      <div className="divide-y divide-line/10 rounded-2xl bg-zinc-900 ring-1 ring-line/10">
        <Row icon={<CalendarDays className="h-4 w-4" aria-hidden />} label={t("memberSince")} value={monthYear(profile.member_since, lang)} />
        {profile.last_active && (
          <Row icon={<Clock className="h-4 w-4" aria-hidden />} label={t("profileLastActive")} value={monthYear(profile.last_active, lang)} />
        )}
        {profile.withdrawn > 0 && (
          <Row icon={<Ban className="h-4 w-4" aria-hidden />} label={t("profileWithdrawn")} value={num(profile.withdrawn)} />
        )}
      </div>
      {profile.withdrawn > 0 && <p className="px-1 text-xs text-slate-500">{t("profileWithdrawnNote")}</p>}
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-zinc-900 p-3.5 ring-1 ring-line/10">
      {icon}
      <p className="mt-2 text-2xl font-extrabold leading-none text-fg">{value}</p>
      <p className="mt-1 text-xs font-medium text-slate-400">{label}</p>
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-3 text-sm">
      <span className="text-indigo-300">{icon}</span>
      <span className="flex-1 font-semibold text-slate-300">{label}</span>
      <span className="font-bold text-fg">{value}</span>
    </div>
  );
}
