"use client";

import { useState } from "react";
import { History, LogIn, LogOut, UserRound } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useLang } from "@/components/LangProvider";

export function AccountButton({
  onSignIn,
  onHistory,
  onProfile,
}: {
  onSignIn: () => void;
  onHistory: () => void;
  onProfile: () => void;
}) {
  const { t } = useLang();
  const { user, loading, displayName, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  if (loading) return <div className="h-11 w-11 shrink-0" aria-hidden />;

  if (!user) {
    return (
      <button
        type="button"
        onClick={onSignIn}
        aria-label={t("signIn")}
        title={t("signIn")}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-ink transition active:scale-95"
      >
        <LogIn className="h-5 w-5" aria-hidden />
      </button>
    );
  }

  const label = (displayName || user.email || "?").trim();
  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t("account")}
        aria-expanded={open}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-600 text-base font-extrabold uppercase text-white ring-2 ring-emerald-400/60 transition active:scale-95"
      >
        {label[0]}
      </button>
      {open && (
        <>
          <button type="button" aria-label={t("close")} onClick={() => setOpen(false)} className="fixed inset-0 z-40 cursor-default" />
          <div className="absolute right-0 top-14 z-50 w-64 animate-pop-in rounded-2xl border border-line/10 bg-zinc-900 p-3 shadow-2xl">
            <p className="truncate px-2 text-sm font-bold text-fg">{displayName || t("account")}</p>
            <p className="truncate px-2 pb-2 text-xs text-slate-400">{user.email}</p>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onProfile();
              }}
              className="flex h-12 w-full items-center gap-2 rounded-xl px-2 text-sm font-bold text-fg active:bg-zinc-800"
            >
              <UserRound className="h-4 w-4 text-indigo-300" aria-hidden />
              {t("myProfile")}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onHistory();
              }}
              className="flex h-12 w-full items-center gap-2 rounded-xl px-2 text-sm font-bold text-fg active:bg-zinc-800"
            >
              <History className="h-4 w-4 text-indigo-300" aria-hidden />
              {t("myRides")}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                void signOut();
              }}
              className="flex h-12 w-full items-center gap-2 rounded-xl px-2 text-sm font-bold text-rose-300 active:bg-zinc-800"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              {t("signOut")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
