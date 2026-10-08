import { CheckCircle2 } from "lucide-react";

export function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 top-24 z-[70] flex justify-center px-4"
    >
      <div className="flex animate-pop-in items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-ink shadow-2xl">
        <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden />
        {message}
      </div>
    </div>
  );
}
