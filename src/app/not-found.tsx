import Link from "next/link";
import { MapPinOff } from "lucide-react";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[430px] flex-col items-center justify-center px-6 text-center">
      <MapPinOff className="h-14 w-14 text-indigo-300" aria-hidden />
      <h1 className="mt-5 text-2xl font-extrabold text-fg">Wrong turn!</h1>
      <p className="mt-2 text-base text-slate-300">
        We couldn&apos;t find that page. / এই পেজটি খুঁজে পাওয়া যায়নি।
      </p>
      <Link
        href="/"
        className="mt-6 flex h-14 items-center rounded-2xl bg-emerald-500 px-8 text-base font-extrabold text-ink active:scale-95"
      >
        Back to RickshawMate
      </Link>
    </main>
  );
}
