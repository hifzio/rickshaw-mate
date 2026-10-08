import { DICTIONARY } from "@/mock/i18n";
import type { Bilingual, Lang } from "@/types";

const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

export function localizeDigits(value: string | number, lang: Lang): string {
  const s = String(value);
  return lang === "bn" ? s.replace(/\d/g, (d) => BN_DIGITS[Number(d)]) : s;
}

export function translate(
  lang: Lang,
  key: string,
  vars?: Record<string, string | number>,
): string {
  let out = DICTIONARY[lang][key] ?? DICTIONARY.en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      out = out.replace(`{${k}}`, localizeDigits(v, lang));
    }
  }
  return out;
}

export const pick = (b: Bilingual, lang: Lang): string => b[lang];

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}
