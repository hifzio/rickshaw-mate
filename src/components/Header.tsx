"use client";

import { Moon, Sun } from "lucide-react";
import { AccountButton } from "@/components/AccountButton";
import { useLang } from "@/components/LangProvider";
import { useTheme } from "@/components/ThemeProvider";

interface HeaderProps {
  onSignIn: () => void;
  onProfile: () => void;
  onHistory: () => void;
  onHome: () => void;
}

export function Header({ onSignIn, onProfile, onHistory, onHome }: HeaderProps) {
  const { t, toggleLang } = useLang();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 border-b border-line/10 bg-navy-950/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between gap-3 px-4">
        <button type="button" onClick={onHome} className="flex min-w-0 items-center gap-2.5 text-left active:opacity-80">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo-mark-96.png"
            srcSet="/brand/logo-mark-96.png 1x, /brand/logo-mark-192.png 2x"
            width={40}
            height={40}
            alt=""
            className="h-10 w-10 shrink-0 rounded-xl shadow-md shadow-black/25 ring-1 ring-line/10"
          />
          <span className="min-w-0">
            <span className="block truncate text-[17px] font-extrabold leading-tight tracking-tight text-fg">
              {t("appName")}
            </span>
            <span className="block truncate text-[11px] font-medium text-slate-400">{t("tagline")}</span>
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={toggleLang}
            aria-label="Toggle language / ভাষা পরিবর্তন"
            className="flex h-10 items-center rounded-xl bg-line/5 px-3 text-sm font-bold text-fg ring-1 ring-line/10 transition active:scale-95"
          >
            {t("langToggle")}
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={t(theme === "dark" ? "switchToLight" : "switchToDark")}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-line/5 text-indigo-300 ring-1 ring-line/10 transition active:scale-95"
          >
            {theme === "dark" ? <Sun className="h-[18px] w-[18px]" aria-hidden /> : <Moon className="h-[18px] w-[18px]" aria-hidden />}
          </button>
          <AccountButton onSignIn={onSignIn} onHistory={onHistory} onProfile={onProfile} />
        </div>
      </div>
    </header>
  );
}
