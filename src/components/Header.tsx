"use client";

import { Bike, Moon, Sun } from "lucide-react";
import { AccountButton } from "@/components/AccountButton";
import { RouteSelector } from "@/components/RouteSelector";
import { useLang } from "@/components/LangProvider";
import { useTheme } from "@/components/ThemeProvider";
import type { RouteFilter } from "@/types";

interface HeaderProps {
  route: RouteFilter;
  onRouteChange: (route: RouteFilter) => void;
  onSignIn: () => void;
  onHistory: () => void;
}

export function Header({ route, onRouteChange, onSignIn, onHistory }: HeaderProps) {
  const { t, toggleLang } = useLang();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 border-b border-line/10 bg-navy-950/95 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-ink shadow-lg shadow-emerald-500/20">
            <Bike className="h-6 w-6" strokeWidth={2.5} aria-hidden />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-[17px] font-extrabold leading-tight tracking-tight text-fg">
              {t("appName")}
            </h1>
            <p className="truncate text-xs font-medium text-indigo-300">{t("tagline")}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          onClick={toggleLang}
          aria-label="Toggle language / ভাষা পরিবর্তন"
          className="flex h-11 shrink-0 items-center rounded-xl border border-indigo-400/30 bg-navy-800 px-3 text-sm font-bold text-fg transition active:scale-95 active:bg-navy-700"
        >
          {t("langToggle")}
        </button>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={t(theme === "dark" ? "switchToLight" : "switchToDark")}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-indigo-400/30 bg-navy-800 text-indigo-300 transition active:scale-95"
        >
          {theme === "dark" ? <Sun className="h-5 w-5" aria-hidden /> : <Moon className="h-5 w-5" aria-hidden />}
        </button>
        <AccountButton onSignIn={onSignIn} onHistory={onHistory} />
        </div>
      </div>

      <RouteSelector route={route} onChange={onRouteChange} />
    </header>
  );
}
