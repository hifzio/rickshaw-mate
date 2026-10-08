"use client";

import { CheckCircle2, MapPin, Phone, ShieldAlert, UserRound } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { useLang } from "@/components/LangProvider";
import { useHubs } from "@/components/HubsProvider";
import type { MatchInfo } from "@/types";

interface MatchedScreenProps {
  match: MatchInfo;
  onDismiss: () => void;
  onViewProfile: (userId: string, name: string, photoUrl?: string) => void;
}

export function MatchedScreen({ match, onDismiss, onViewProfile }: MatchedScreenProps) {
  const { t, lang } = useLang();
  const { find } = useHubs();
  const origin = find(match.originId);
  const destination = find(match.destinationId);
  const isOwner = match.role === "owner";

  return (
    <div className="fixed inset-0 z-[60] flex justify-center bg-zinc-950">
      <main className="flex h-dvh w-full max-w-[430px] animate-fade-in flex-col overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
        {/* Success banner */}
        <div
          role="status"
          className="flex animate-pop-in items-center gap-3 rounded-3xl bg-emerald-500 p-4 text-ink shadow-lg shadow-emerald-500/25"
        >
          <CheckCircle2 className="h-10 w-10 shrink-0" strokeWidth={2.5} aria-hidden />
          <div>
            <h1 className="text-xl font-extrabold leading-tight">{t("matchedTitle")}</h1>
            <p className="text-sm font-semibold opacity-80">
              {origin?.name[lang]} → {destination?.name[lang]}
            </p>
          </div>
        </div>

        {/* Partner card */}
        <section className="mt-4 rounded-3xl border border-emerald-500/40 bg-zinc-900 p-5 shadow-lg shadow-black/30">
          <p className="text-sm font-semibold text-slate-400">{t(isOwner ? "ownerMatchedBody" : "matchedBody")}</p>

          <div className="mt-4 flex flex-col items-center text-center">
            <Avatar
              name={match.partnerName}
              photoUrl={match.partnerPhotoUrl}
              className="h-36 w-36 rounded-[28px]"
              textClassName="text-5xl"
            />
            <h2 className="mt-4 text-2xl font-extrabold text-fg">{match.partnerName}</h2>
            {match.partnerVerified && (
              <span className="mt-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-300 ring-1 ring-emerald-400/30">
                {t("verified")}
              </span>
            )}
          </div>

          {match.partnerId && (
            <button
              type="button"
              onClick={() => onViewProfile(match.partnerId as string, match.partnerName, match.partnerPhotoUrl)}
              className="mx-auto mt-4 flex h-11 items-center gap-2 rounded-xl bg-navy-900/70 px-4 text-sm font-bold text-fg ring-1 ring-indigo-400/20 active:scale-95"
            >
              <UserRound className="h-4 w-4 text-indigo-300" aria-hidden />
              {t("viewProfile")}
            </button>
          )}

          <div className="mt-5 rounded-2xl bg-navy-900 p-4 ring-1 ring-indigo-400/20">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-indigo-300">
              <MapPin className="h-3.5 w-3.5" aria-hidden />
              {t(isOwner ? "yourSpot" : "meetAt")}
            </p>
            <p className="mt-1.5 text-lg font-bold leading-snug text-fg">{match.note}</p>
          </div>
        </section>

        {/* Safety tip */}
        <aside className="mt-4 flex items-start gap-3 rounded-2xl bg-amber-500/10 p-4 ring-1 ring-amber-400/30">
          <ShieldAlert className="mt-0.5 h-6 w-6 shrink-0 text-amber-300" aria-hidden />
          <div>
            <p className="text-sm font-bold text-amber-200">{t("safetyTitle")}</p>
            <p className="mt-0.5 text-[15px] font-medium leading-snug text-amber-50">
              {t("safetyTip")}
            </p>
          </div>
        </aside>

        {/* Actions */}
        <div className="mt-auto flex flex-col gap-3 pt-6">
          <a
            href={`tel:${match.partnerPhone.replace(/[^\d+]/g, "")}`}
            className="flex h-16 items-center justify-center gap-2.5 rounded-2xl bg-indigo-600 text-lg font-extrabold text-white shadow-lg shadow-indigo-600/30 transition active:scale-[0.98] active:bg-indigo-500"
          >
            <Phone className="h-6 w-6" aria-hidden />
            {t("callCommuter")}
          </a>
          <button
            type="button"
            onClick={onDismiss}
            className="flex h-14 items-center justify-center rounded-2xl border border-line/15 bg-zinc-900 text-base font-bold text-slate-200 transition active:scale-[0.98] active:bg-zinc-800"
          >
            {t("rideCompleted")}
          </button>
        </div>
      </main>
    </div>
  );
}
