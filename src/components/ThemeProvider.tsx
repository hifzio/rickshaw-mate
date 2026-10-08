"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

export type Theme = "dark" | "light";

const KEY = "rs:theme";
const THEME_COLORS: Record<Theme, string> = { dark: "#0a0f2e", light: "#ffffff" };

/** Runs before first paint (see layout.tsx) so there is no dark→light flash. */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem("${KEY}");document.documentElement.dataset.theme=t==="light"?"light":"dark"}catch(e){document.documentElement.dataset.theme="dark"}`;

interface ThemeValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");

  // Pick up whatever the init script applied.
  useEffect(() => {
    const applied: Theme = document.documentElement.dataset.theme === "light" ? "light" : "dark";
    setTheme(applied);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLORS[applied]);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((cur) => {
      const next: Theme = cur === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLORS[next]);
      try {
        localStorage.setItem(KEY, next);
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  }, []);

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
