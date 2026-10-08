import { Bike } from "lucide-react";

/**
 * What the server (and the first client render) shows. It has the same footprint as the real
 * header + feed, so when the live app takes over nothing jumps. It must stay free of any
 * client-only data (language, route, session) to keep hydration identical.
 */
export function AppShell() {
  return (
    <div className="mx-auto min-h-dvh w-full max-w-[430px] bg-zinc-950">
      <header className="border-b border-line/10 bg-navy-950 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-ink">
              <Bike className="h-6 w-6" strokeWidth={2.5} aria-hidden />
            </div>
            <div className="h-9 w-32 animate-pulse rounded-lg bg-line/10" />
          </div>
          <div className="flex gap-1.5">
            <div className="h-11 w-16 animate-pulse rounded-xl bg-line/10" />
            <div className="h-11 w-11 animate-pulse rounded-xl bg-line/10" />
            <div className="h-11 w-11 animate-pulse rounded-xl bg-line/10" />
          </div>
        </div>
        <div className="grid gap-2 px-4 pb-3">
          <div className="h-14 animate-pulse rounded-2xl bg-line/5" />
          <div className="h-14 animate-pulse rounded-2xl bg-line/5" />
        </div>
      </header>
      <div className="space-y-3.5 px-4 pt-4" aria-hidden>
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-56 animate-pulse rounded-3xl bg-zinc-900" />
        ))}
      </div>
    </div>
  );
}
