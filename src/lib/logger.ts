/**
 * Tiny console logger so you can follow what the app is doing in DevTools.
 * On in development; in production set NEXT_PUBLIC_DEBUG_LOGS=true to enable it.
 * Never pass names, phone numbers or photo URLs to it.
 */
const enabled =
  process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_DEBUG_LOGS === "true";

const STYLES = {
  success: "color:#34d399;font-weight:bold",
  info: "color:#818cf8;font-weight:bold",
  warn: "color:#fbbf24;font-weight:bold",
  error: "color:#f87171;font-weight:bold",
} as const;

const ICONS = { success: "✅", info: "ℹ️", warn: "⚠️", error: "❌" } as const;

type Level = keyof typeof STYLES;

function emit(level: Level, scope: string, message: string, detail?: unknown) {
  if (!enabled || typeof window === "undefined") return;
  const method = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  const args: unknown[] = [`%c${ICONS[level]} [RickshawMate:${scope}]%c ${message}`, STYLES[level], "color:inherit"];
  if (detail !== undefined) args.push(detail);
  method(...args);
}

export const log = {
  success: (scope: string, message: string, detail?: unknown) => emit("success", scope, message, detail),
  info: (scope: string, message: string, detail?: unknown) => emit("info", scope, message, detail),
  warn: (scope: string, message: string, detail?: unknown) => emit("warn", scope, message, detail),
  error: (scope: string, message: string, detail?: unknown) => emit("error", scope, message, detail),
};

/** First 8 chars of an id: enough to correlate log lines without dumping full ids. */
export const short = (id: string | null | undefined) => (id ? id.slice(0, 8) : "none");

export const kb = (bytes: number) => `${(bytes / 1024).toFixed(1)} KB`;
