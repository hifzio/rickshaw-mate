"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, Loader2, X } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { useLang } from "@/components/LangProvider";
import { TrustGrid } from "@/components/TrustStats";
import { fetchPublicProfile } from "@/lib/rides";
import type { PublicProfile } from "@/types";

interface UserProfileSheetProps {
  userId: string;
  /** Shown while loading and as a fallback if the profile has no name. */
  fallbackName?: string;
  fallbackPhotoUrl?: string;
  onClose: () => void;
}

/** Basic public profile. Deliberately has no phone number or email. */
export function UserProfileSheet({ userId, fallbackName = "", fallbackPhotoUrl, onClose }: UserProfileSheetProps) {
  const { t } = useLang();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let alive = true;
    setState("loading");
    fetchPublicProfile(userId)
      .then((p) => {
        if (!alive) return;
        setProfile(p);
        setState(p ? "ready" : "error");
      })
      .catch(() => alive && setState("error"));
    return () => {
      alive = false;
    };
  }, [userId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const name = profile?.name || fallbackName || t("commuter");
  const photo = profile?.photo_url ?? fallbackPhotoUrl;
  return (
    <div className="fixed inset-0 z-[64] flex items-end justify-center">
      <button type="button" aria-label={t("close")} onClick={onClose} className="absolute inset-0 animate-fade-in bg-black/70" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={name}
        className="relative max-h-[92dvh] w-full max-w-[430px] animate-sheet-up overflow-y-auto rounded-t-[28px] border-t border-indigo-400/30 bg-zinc-950 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 shadow-2xl"
      >
        <div className="mx-auto h-1.5 w-12 rounded-full bg-line/20" aria-hidden />
        <button
          type="button"
          onClick={onClose}
          aria-label={t("close")}
          className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-zinc-900 text-slate-300 active:scale-95"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>

        <div className="flex flex-col items-center pt-4 text-center">
          <Avatar name={name} photoUrl={photo} className="h-28 w-28 rounded-[28px]" textClassName="text-4xl" />
          <h2 className="mt-4 text-2xl font-extrabold text-fg">{name}</h2>
          {profile?.verified && (
            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-300 ring-1 ring-emerald-400/30">
              <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
              {t("verified")}
            </span>
          )}
        </div>

        {state === "loading" && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-7 w-7 animate-spin text-indigo-300" aria-label={t("loading")} />
          </div>
        )}
        {state === "error" && <p className="py-8 text-center text-sm text-slate-400">{t("profileUnavailable")}</p>}

        {state === "ready" && profile && <TrustGrid profile={profile} />}
        <p className="mt-4 text-center text-xs text-slate-500">{t("profilePrivacy")}</p>
      </div>
    </div>
  );
}
