/** Mirrors `normalize_bd_phone` in the SQL migration. Returns 01XXXXXXXXX or null. */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  return /^(88)?01[3-9]\d{8}$/.test(digits) ? digits.slice(-11) : null;
}
