"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { X } from "lucide-react";
import { useLang } from "@/components/LangProvider";
import { ProfileFields } from "@/components/ProfileFields";
import { normalizePhone } from "@/lib/phone";
import type { Profile } from "@/types";

interface ProfileSheetProps {
  onClose: () => void;
  onSave: (profile: Profile) => void;
  /** e.g. the name from the Google account. */
  initialName?: string;
}

/** Shown the first time someone taps "Share This Rickshaw" without having saved details. */
export function ProfileSheet({ onClose, onSave, initialName = "" }: ProfileSheetProps) {
  const { t } = useLang();
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState("");
  const [tried, setTried] = useState(false);

  const nameOk = name.trim().length >= 2;
  const normalized = normalizePhone(phone);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (nameOk && normalized) onSave({ name: name.trim(), phone: normalized });
  };

  return (
    <div className="fixed inset-0 z-[55] flex items-end justify-center">
      <button
        type="button"
        aria-label={t("close")}
        onClick={onClose}
        className="absolute inset-0 animate-fade-in bg-black/70"
      />
      <form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-title"
        className="relative w-full max-w-[430px] animate-sheet-up rounded-t-[28px] border-t border-indigo-400/30 bg-zinc-950 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-2xl"
      >
        <div className="mx-auto h-1.5 w-12 rounded-full bg-line/20" aria-hidden />
        <div className="flex items-center justify-between pb-4 pt-3">
          <h2 id="profile-title" className="text-xl font-extrabold text-fg">
            {t("yourDetails")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-900 text-slate-300 active:scale-95"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <ProfileFields
          name={name}
          phone={phone}
          onName={setName}
          onPhone={setPhone}
          nameError={tried && !nameOk}
          phoneError={tried && !normalized}
        />
        <button
          type="submit"
          className="mt-6 flex h-16 w-full items-center justify-center rounded-2xl bg-emerald-500 text-lg font-extrabold text-ink shadow-lg shadow-emerald-500/25 transition active:scale-[0.98]"
        >
          {t("saveContinue")}
        </button>
      </form>
    </div>
  );
}
