"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { localizeDigits, translate } from "@/lib/i18n";
import type { Lang } from "@/types";

interface LangContextValue {
  lang: Lang;
  toggleLang: () => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  num: (n: number | string) => string;
}

const LANG_KEY = "rs:lang";

const LangContext = createContext<LangContextValue | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  // Remembered per device. The server renders "en"; only client-only UI reads this during
  // hydration, so starting from the saved value avoids an English→Bengali flash on reload.
  const [lang, setLang] = useState<Lang>(() => {
    try {
      return typeof window !== "undefined" && localStorage.getItem(LANG_KEY) === "bn" ? "bn" : "en";
    } catch {
      return "en";
    }
  });

  const toggleLang = useCallback(
    () =>
      setLang((l) => {
        const next: Lang = l === "en" ? "bn" : "en";
        try {
          localStorage.setItem(LANG_KEY, next);
        } catch {
          /* storage unavailable */
        }
        return next;
      }),
    [],
  );
  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => translate(lang, key, vars),
    [lang],
  );
  const num = useCallback((n: number | string) => localizeDigits(n, lang), [lang]);

  const value = useMemo(() => ({ lang, toggleLang, t, num }), [lang, toggleLang, t, num]);

  return (
    <LangContext.Provider value={value}>
      <div lang={lang} className="contents" suppressHydrationWarning>
        {children}
      </div>
    </LangContext.Provider>
  );
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used inside <LangProvider>");
  return ctx;
}
