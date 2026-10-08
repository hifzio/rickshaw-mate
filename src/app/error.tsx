"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[RickshawMate:error]", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-[430px] flex-col items-center justify-center px-6 text-center">
      <TriangleAlert className="h-14 w-14 text-amber-300" aria-hidden />
      <h1 className="mt-5 text-2xl font-extrabold text-fg">Something went wrong</h1>
      <p className="mt-2 text-base text-slate-300">কিছু ভুল হয়েছে। আবার চেষ্টা করুন।</p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 h-14 rounded-2xl bg-indigo-600 px-8 text-base font-extrabold text-white active:scale-95"
      >
        Try again
      </button>
    </main>
  );
}
