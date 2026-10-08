"use client";

import { Plus } from "lucide-react";
import { useLang } from "@/components/LangProvider";

export function EmptyState({ onPost }: { onPost: () => void }) {
  const { t } = useLang();

  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <svg viewBox="0 0 240 160" className="h-40 w-60" role="img" aria-label="Empty rickshaw stand">
        <ellipse cx="120" cy="140" rx="100" ry="8" fill="#1b2468" opacity="0.6" />
        <g fill="none" stroke="#818cf8" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="78" cy="112" r="22" />
          <circle cx="170" cy="112" r="22" />
          <path d="M78 112 L104 54 H150 L170 112" />
          <path d="M96 80 H156" />
        </g>
        <path d="M104 54 Q128 28 152 54 Z" fill="#34d399" opacity="0.9" />
        <g fill="#a5b4fc">
          <circle cx="36" cy="40" r="3" />
          <circle cx="204" cy="30" r="4" />
          <circle cx="214" cy="70" r="2.5" />
        </g>
        <g stroke="#34d399" strokeWidth="4" strokeLinecap="round">
          <path d="M20 90 H44" />
          <path d="M8 104 H34" />
        </g>
      </svg>

      <h2 className="mt-6 text-xl font-extrabold leading-snug text-fg">{t("emptyTitle")}</h2>
      <p className="mt-1 text-base font-medium text-emerald-300">{t("emptyBody")}</p>

      <button
        type="button"
        onClick={onPost}
        className="mt-6 flex h-14 w-full max-w-xs items-center justify-center gap-2 rounded-2xl bg-emerald-500 text-base font-extrabold text-ink shadow-lg shadow-emerald-500/25 transition active:scale-[0.98] active:bg-emerald-400"
      >
        <Plus className="h-5 w-5" strokeWidth={3} aria-hidden />
        {t("imWaiting")}
      </button>
    </div>
  );
}
