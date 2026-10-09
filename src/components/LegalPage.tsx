import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <main lang="en" className="mx-auto min-h-dvh max-w-[430px] px-5 pb-16 pt-[max(1rem,env(safe-area-inset-top))]">
      <Link href="/" className="inline-flex h-11 items-center gap-1.5 text-sm font-bold text-indigo-300">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        RickshawMate
      </Link>
      <h1 className="mt-2 text-3xl font-extrabold text-fg">{title}</h1>
      <p className="mt-1 text-xs text-slate-500">Last updated {updated}</p>
      <div className="mt-6 space-y-6 text-[15px] leading-relaxed text-slate-300 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-fg [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1">
        {children}
      </div>
    </main>
  );
}

export function ContactLine() {
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
  if (!email) return null;
  return (
    <section>
      <h2>Contact</h2>
      <p>
        Questions or deletion requests:{" "}
        <a className="font-semibold text-indigo-300 underline" href={`mailto:${email}`}>
          {email}
        </a>
      </p>
    </section>
  );
}
