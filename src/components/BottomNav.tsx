"use client";

import { ClipboardList, Plus, Search, Timer } from "lucide-react";
import { useLang } from "@/components/LangProvider";

interface BottomNavProps {
  active: "find" | "rides" | null;
  /** The user already has a live post: the centre button takes them to it instead. */
  hasLivePost: boolean;
  onFind: () => void;
  onPost: () => void;
  onRides: () => void;
}

export function BottomNav({ active, hasLivePost, onFind, onPost, onRides }: BottomNavProps) {
  const { t } = useLang();
  const side = (isActive: boolean) =>
    `flex flex-1 flex-col items-center justify-end gap-1 pb-2 text-[11px] font-bold transition active:scale-95 ${
      isActive ? "text-emerald-400" : "text-slate-400"
    }`;

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-[430px] border-t border-line/10 bg-navy-950/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl"
    >
      <div className="flex h-[68px] items-end px-2">
        <button type="button" onClick={onFind} aria-current={active === "find" ? "page" : undefined} className={`${side(active === "find")} h-full`}>
          <Search className="h-5 w-5" aria-hidden />
          {t("navFind")}
        </button>

        <button
          type="button"
          onClick={onPost}
          className="flex h-full flex-1 flex-col items-center justify-end gap-1 pb-2 text-[11px] font-bold text-slate-300 transition active:scale-95"
        >
          <span
            className={`-mt-8 flex h-14 w-14 items-center justify-center rounded-full text-ink shadow-xl ring-4 ring-zinc-950 ${
              hasLivePost
                ? "bg-gradient-to-br from-amber-300 to-amber-500 shadow-amber-500/30"
                : "bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-emerald-500/30"
            }`}
          >
            {hasLivePost ? <Timer className="h-6 w-6" strokeWidth={2.5} aria-hidden /> : <Plus className="h-7 w-7" strokeWidth={3} aria-hidden />}
          </span>
          {hasLivePost ? t("navMyPost") : t("navPost")}
        </button>

        <button type="button" onClick={onRides} aria-current={active === "rides" ? "page" : undefined} className={`${side(active === "rides")} h-full`}>
          <ClipboardList className="h-5 w-5" aria-hidden />
          {t("navRides")}
        </button>
      </div>
    </nav>
  );
}
