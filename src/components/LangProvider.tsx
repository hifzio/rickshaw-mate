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

const LangContext = createContext<LangContextValue | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");

  const toggleLang = useCallback(() => setLang((l) => (l === "en" ? "bn" : "en")), []);
  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => translate(lang, key, vars),
    [lang],
  );
  const num = useCallback((n: number | string) => localizeDigits(n, lang), [lang]);

  const value = useMemo(() => ({ lang, toggleLang, t, num }), [lang, toggleLang, t, num]);

  return (
    <LangContext.Provider value={value}>
      <div lang={lang} className="contents">
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
