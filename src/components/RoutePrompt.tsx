"use client";

import { MapPinned } from "lucide-react";
import { useLang } from "@/components/LangProvider";

/** Shown until both "From" and "To" are chosen. */
export function RoutePrompt({ hasOrigin }: { hasOrigin: boolean }) {
  const { t } = useLang();
  return (
    <div className="flex flex-col items-center px-8 py-16 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-navy-900 ring-1 ring-indigo-400/30">
        <MapPinned className="h-10 w-10 text-indigo-300" aria-hidden />
      </div>
      <h2 className="mt-6 text-xl font-extrabold text-fg">{t("routePromptTitle")}</h2>
      <p className="mt-2 text-base leading-relaxed text-slate-300">
        {hasOrigin ? t("routePromptDest") : t("routePromptBody")}
      </p>
    </div>
  );
}
