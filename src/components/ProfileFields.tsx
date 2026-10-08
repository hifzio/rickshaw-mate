"use client";

import { Phone, User } from "lucide-react";
import { useLang } from "@/components/LangProvider";

interface ProfileFieldsProps {
  name: string;
  phone: string;
  onName: (v: string) => void;
  onPhone: (v: string) => void;
  nameError?: boolean;
  phoneError?: boolean;
}

const inputClass =
  "h-14 w-full rounded-2xl border bg-zinc-900 px-4 text-base text-fg placeholder:text-slate-500 outline-none transition focus:ring-2";

export function ProfileFields({ name, phone, onName, onPhone, nameError, phoneError }: ProfileFieldsProps) {
  const { t } = useLang();
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="pf-name" className="mb-2 flex items-center gap-2 text-sm font-bold text-fg">
          <User className="h-4 w-4 text-emerald-400" aria-hidden />
          {t("yourName")}
        </label>
        <input
          id="pf-name"
          value={name}
          onChange={(e) => onName(e.target.value)}
          autoComplete="name"
          maxLength={60}
          className={`${inputClass} ${
            nameError ? "border-rose-400 focus:ring-rose-400/30" : "border-line/10 focus:border-emerald-400 focus:ring-emerald-400/30"
          }`}
        />
        {nameError && <p className="mt-1.5 text-xs font-semibold text-rose-300">{t("errName")}</p>}
      </div>
      <div>
        <label htmlFor="pf-phone" className="mb-2 flex items-center gap-2 text-sm font-bold text-fg">
          <Phone className="h-4 w-4 text-emerald-400" aria-hidden />
          {t("yourPhone")}
        </label>
        <input
          id="pf-phone"
          value={phone}
          onChange={(e) => onPhone(e.target.value)}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="01712345678"
          className={`${inputClass} ${
            phoneError ? "border-rose-400 focus:ring-rose-400/30" : "border-line/10 focus:border-emerald-400 focus:ring-emerald-400/30"
          }`}
        />
        {phoneError ? (
          <p className="mt-1.5 text-xs font-semibold text-rose-300">{t("errPhone")}</p>
        ) : (
          <p className="mt-1.5 text-xs text-slate-400">{t("phoneHint")}</p>
        )}
      </div>
    </div>
  );
}
