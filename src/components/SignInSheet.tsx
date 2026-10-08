"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Loader2, Mail, X } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useLang } from "@/components/LangProvider";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function GoogleLogo() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.1 5.3-4.5 6.9l7.3 5.7c4.3-4 6.9-9.9 6.9-17.1z" />
      <path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-2.9-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.100 0 24s.9 7.600 2.600 10.800l7.900-6.100z" />
      <path fill="#34A853" d="M24 48c6.500 0 11.900-2.100 15.900-5.800l-7.300-5.700c-2 1.400-4.600 2.200-8.600 2.200-6.300 0-11.600-4.100-13.500-9.800l-7.900 6.100C6.500 42.600 14.600 48 24 48z" />
    </svg>
  );
}

interface SignInSheetProps {
  onClose: () => void;
}

export function SignInSheet({ onClose }: SignInSheetProps) {
  const { t } = useLang();
  const { signInWithGoogle, sendEmailCode, verifyEmailCode } = useAuth();
  const [step, setStep] = useState<"choose" | "code">("choose");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<"google" | "email" | "verify" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(id);
  }, [cooldown]);

  const google = async () => {
    setBusy("google");
    setError(null);
    const res = await signInWithGoogle();
    if (!res.ok) {
      setError(t("errSignIn"));
      setBusy(null);
    } // on success the browser is redirected to Google
  };

  const sendCode = async (e?: FormEvent) => {
    e?.preventDefault();
    const addr = email.trim().toLowerCase();
    if (!EMAIL_RE.test(addr)) return setError(t("errEmail"));
    setBusy("email");
    setError(null);
    const res = await sendEmailCode(addr);
    setBusy(null);
    if (!res.ok) return setError(/rate|limit|seconds/i.test(res.error) ? t("errEmailRate") : t("errSignIn"));
    setEmail(addr);
    setCode("");
    setCooldown(30);
    setStep("code");
  };

  const verify = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^\d{6,8}$/.test(code.trim())) return setError(t("errCode"));
    setBusy("verify");
    setError(null);
    const res = await verifyEmailCode(email, code.trim());
    if (!res.ok) {
      setError(t("errCode"));
      setBusy(null);
    } // on success AuthProvider updates `user` and the parent closes this sheet
  };

  return (
    <div className="fixed inset-0 z-[58] flex items-end justify-center">
      <button
        type="button"
        aria-label={t("close")}
        onClick={onClose}
        className="absolute inset-0 animate-fade-in bg-black/70"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="signin-title"
        className="relative w-full max-w-[430px] animate-sheet-up rounded-t-[28px] border-t border-indigo-400/30 bg-zinc-950 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-2xl"
      >
        <div className="mx-auto h-1.5 w-12 rounded-full bg-line/20" aria-hidden />
        <div className="flex items-start justify-between pb-4 pt-3">
          <div>
            <h2 id="signin-title" className="text-xl font-extrabold text-fg">
              {t("signInTitle")}
            </h2>
            <p className="mt-1 text-sm text-slate-400">{t("signInBody")}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-slate-300 active:scale-95"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        {step === "choose" ? (
          <div className="space-y-4">
            <button
              type="button"
              onClick={google}
              disabled={busy !== null}
              className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-white text-base font-bold text-ink transition active:scale-[0.98] disabled:opacity-70"
            >
              {busy === "google" ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <GoogleLogo />}
              {t("continueGoogle")}
            </button>

            <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <span className="h-px flex-1 bg-line/10" />
              {t("orEmail")}
              <span className="h-px flex-1 bg-line/10" />
            </div>

            <form onSubmit={sendCode} className="space-y-3">
              <label htmlFor="signin-email" className="sr-only">
                {t("emailLabel")}
              </label>
              <input
                id="signin-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="h-14 w-full rounded-2xl border border-line/10 bg-zinc-900 px-4 text-base text-fg placeholder:text-slate-500 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30"
              />
              <button
                type="submit"
                disabled={busy !== null}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 text-base font-extrabold text-white transition active:scale-[0.98] disabled:opacity-70"
              >
                {busy === "email" ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <Mail className="h-5 w-5" aria-hidden />}
                {t("sendCode")}
              </button>
            </form>
          </div>
        ) : (
          <form onSubmit={verify} className="space-y-3">
            <p className="text-sm text-slate-300">{t("codeSent", { email })}</p>
            <label htmlFor="signin-code" className="sr-only">
              {t("enterCode")}
            </label>
            <input
              id="signin-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={8}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="123456"
              autoFocus
              className="h-16 w-full rounded-2xl border border-line/10 bg-zinc-900 px-4 text-center text-2xl font-extrabold tracking-[0.4em] text-fg placeholder:text-slate-600 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30"
            />
            <button
              type="submit"
              disabled={busy !== null}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 text-base font-extrabold text-ink transition active:scale-[0.98] disabled:opacity-70"
            >
              {busy === "verify" && <Loader2 className="h-5 w-5 animate-spin" aria-hidden />}
              {t("verifyCode")}
            </button>
            <div className="flex items-center justify-between text-sm font-semibold">
              <button type="button" onClick={() => { setStep("choose"); setError(null); }} className="py-2 text-indigo-300">
                {t("changeEmail")}
              </button>
              <button
                type="button"
                onClick={() => void sendCode()}
                disabled={cooldown > 0 || busy !== null}
                className="py-2 text-indigo-300 disabled:text-slate-600"
              >
                {cooldown > 0 ? t("resendIn", { n: cooldown }) : t("resend")}
              </button>
            </div>
          </form>
        )}

        {error && (
          <p role="alert" className="mt-3 rounded-xl bg-rose-500/10 p-3 text-sm font-semibold text-rose-300 ring-1 ring-rose-400/25">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
