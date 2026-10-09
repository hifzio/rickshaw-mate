"use client";

import { useEffect, useState } from "react";
import { Ban, CheckCircle2, Loader2, MapPin, Phone, ShieldAlert, UserRound } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { useHubs } from "@/components/HubsProvider";
import { useLang } from "@/components/LangProvider";
import { TrustChips } from "@/components/TrustStats";
import { fetchPublicProfile } from "@/lib/rides";
import type { MatchInfo, PublicProfile } from "@/types";

interface MatchedScreenProps {
  match: MatchInfo;
  busy: boolean;
  onComplete: () => void;
  onCancel: () => void;
  /** Close the screen (only offered once the ride has ended). */
  onClose: () => void;
  onViewProfile: (userId: string, name: string, photoUrl?: string) => void;
}

/**
 * Shown to BOTH riders from the moment of the match until the ride is completed or cancelled
 * (by either of them), and restored after a reload.
 */
export function MatchedScreen({ match, busy, onComplete, onCancel, onClose, onViewProfile }: MatchedScreenProps) {
  const { t, lang } = useLang();
  const { find } = useHubs();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const isOwner = match.role === "owner";
  const ended = match.status !== "active";

  useEffect(() => {
    if (!match.partnerId) return;
    let alive = true;
    fetchPublicProfile(match.partnerId)
      .then((p) => alive && setProfile(p))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [match.partnerId]);

  const route = `${find(match.originId)?.name[lang]} → ${find(match.destinationId)?.name[lang]}`;
  const partner = match.partnerName || t("commuter");

  const banner = (() => {
    if (match.status === "completed") {
      return {
        cls: "from-emerald-500 to-emerald-600",
        icon: <CheckCircle2 className="h-10 w-10 shrink-0" strokeWidth={2.5} aria-hidden />,
        title: t("endedCompletedTitle"),
        body: match.endedBy === "me" ? t("endedCompletedMe") : t("endedCompletedPartner", { name: partner }),
      };
    }
    if (match.status === "cancelled") {
      return {
        cls: "from-amber-400 to-amber-500",
        icon: <Ban className="h-10 w-10 shrink-0" strokeWidth={2.5} aria-hidden />,
        title: t("endedCancelledTitle"),
        body: match.endedBy === "me" ? t("endedCancelledMe") : t("endedCancelledPartner", { name: partner }),
      };
    }
    return {
      cls: "from-emerald-500 to-emerald-600",
      icon: <CheckCircle2 className="h-10 w-10 shrink-0" strokeWidth={2.5} aria-hidden />,
      title: t("matchedTitle"),
      body: route,
    };
  })();

  return (
    <div className="fixed inset-0 z-[60] flex justify-center bg-zinc-950">
      <main className="flex h-dvh w-full max-w-[430px] animate-fade-in flex-col overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
        <div
          role="status"
          className={`flex animate-pop-in items-center gap-3 rounded-3xl bg-gradient-to-br ${banner.cls} p-4 text-ink shadow-lg shadow-emerald-500/20`}
        >
          {banner.icon}
          <div className="min-w-0">
            <h1 className="text-xl font-extrabold leading-tight">{banner.title}</h1>
            <p className="text-sm font-semibold opacity-85">{banner.body}</p>
          </div>
        </div>

        {/* Partner */}
        <section className="mt-4 rounded-3xl border border-line/10 bg-zinc-900 p-5 shadow-lg shadow-black/10">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {t(isOwner ? "ownerMatchedBody" : "matchedBody")}
          </p>
          <div className="mt-3 flex items-center gap-4">
            <Avatar name={partner} photoUrl={match.partnerPhotoUrl} className="h-20 w-20 rounded-2xl" textClassName="text-2xl" />
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-xl font-extrabold text-fg">{partner}</h2>
              {(match.partnerVerified || profile?.verified) && (
                <span className="mt-1 inline-block rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-300 ring-1 ring-emerald-400/30">
                  {t("verified")}
                </span>
              )}
            </div>
          </div>

          <div className="mt-4">
            <TrustChips profile={profile} />
          </div>

          {match.partnerId && (
            <button
              type="button"
              onClick={() => onViewProfile(match.partnerId as string, partner, match.partnerPhotoUrl)}
              className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-line/5 text-sm font-bold text-fg ring-1 ring-line/10 active:scale-[0.99]"
            >
              <UserRound className="h-4 w-4 text-indigo-300" aria-hidden />
              {t("viewFullProfile")}
            </button>
          )}

          <div className="mt-4 rounded-2xl bg-navy-900/70 p-4 ring-1 ring-indigo-400/20">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-indigo-300">
              <MapPin className="h-3.5 w-3.5" aria-hidden />
              {t(isOwner ? "yourSpot" : "meetAt")}
            </p>
            <p className="mt-1.5 text-lg font-bold leading-snug text-fg">{match.note}</p>
            <p className="mt-1 text-xs text-slate-400">{route}</p>
          </div>
        </section>

        {!ended && (
          <>
            <aside className="mt-4 rounded-2xl bg-amber-500/10 p-4 ring-1 ring-amber-400/30">
              <p className="flex items-center gap-2 text-sm font-bold text-amber-200">
                <ShieldAlert className="h-5 w-5 shrink-0 text-amber-300" aria-hidden />
                {t("safetyTitle")}
              </p>
              <p className="mt-1 text-[15px] font-medium leading-snug text-amber-50">{t("safetyTip")}</p>
            </aside>

            <ol className="mt-4 space-y-2 text-sm text-slate-300">
              <li className="sr-only">{t("whatsNext")}</li>
              {["matchNext1", "matchNext2", "matchNext3"].map((k, i) => (
                <li key={k} className="flex items-center gap-2.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-extrabold text-indigo-300">
                    {i + 1}
                  </span>
                  {t(k)}
                </li>
              ))}
            </ol>
          </>
        )}

        {/* Actions */}
        <div className="mt-auto flex flex-col gap-3 pt-6">
          {ended ? (
            <button
              type="button"
              onClick={onClose}
              className="flex h-14 items-center justify-center rounded-2xl bg-indigo-600 text-lg font-extrabold text-white shadow-lg shadow-indigo-600/30 active:scale-[0.98]"
            >
              {t("done")}
            </button>
          ) : confirmCancel ? (
            <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4">
              <p className="text-base font-bold text-fg">{t("cancelConfirmTitle")}</p>
              <p className="mt-1 text-sm text-slate-300">{t("cancelConfirmBody")}</p>
              <div className="mt-3 flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setConfirmCancel(false)}
                  disabled={busy}
                  className="h-12 flex-1 rounded-xl bg-line/10 text-sm font-bold text-fg active:scale-95"
                >
                  {t("cancelConfirmNo")}
                </button>
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={busy}
                  className="flex h-12 flex-1 items-center justify-center rounded-xl bg-rose-500 text-sm font-extrabold text-white active:scale-95 disabled:opacity-70"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : t("cancelConfirmYes")}
                </button>
              </div>
            </div>
          ) : (
            <>
              <a
                href={`tel:${match.partnerPhone.replace(/[^\d+]/g, "")}`}
                className="flex h-14 items-center justify-center gap-2.5 rounded-2xl bg-indigo-600 text-lg font-extrabold text-white shadow-lg shadow-indigo-600/30 transition active:scale-[0.98] active:bg-indigo-500"
              >
                <Phone className="h-5 w-5" aria-hidden />
                {t("callCommuter")}
              </a>
              <button
                type="button"
                onClick={onComplete}
                disabled={busy}
                className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-emerald-500 text-base font-extrabold text-ink shadow-lg shadow-emerald-500/25 transition active:scale-[0.98] disabled:opacity-70"
              >
                {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <CheckCircle2 className="h-5 w-5" aria-hidden />}
                {t("completeRide")}
              </button>
              <button
                type="button"
                onClick={() => setConfirmCancel(true)}
                className="h-11 rounded-xl text-sm font-bold text-slate-400 active:text-fg"
              >
                {t("cancelMatch")}
              </button>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
