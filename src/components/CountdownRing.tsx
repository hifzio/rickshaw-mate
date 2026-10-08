"use client";

import { useLang } from "@/components/LangProvider";

interface CountdownRingProps {
  postedAt: number;
  expiresAt: number;
  now: number;
  /** Pixel size of the ring. */
  size?: number;
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Live mm:ss countdown inside a ring that drains smoothly (CSS transition on the dash offset).
 * emerald → amber under 5 min → rose and pulsing under 1 min.
 */
export function CountdownRing({ postedAt, expiresAt, now, size = 56 }: CountdownRingProps) {
  const { num } = useLang();
  const total = Math.max(1, expiresAt - postedAt);
  const left = Math.max(0, expiresAt - now);
  const fraction = Math.min(1, left / total);
  const secs = Math.ceil(left / 1000);
  const label = `${pad(Math.floor(secs / 60))}:${pad(secs % 60)}`;

  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const urgent = secs < 60;
  const warn = secs < 300;
  const color = urgent ? "text-rose-400" : warn ? "text-amber-300" : "text-emerald-400";

  return (
    <div
      role="timer"
      aria-label={label}
      className={`relative shrink-0 ${color} ${urgent ? "animate-pulse" : ""}`}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-line/10" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke="currentColor"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - fraction)}
          style={{ transition: "stroke-dashoffset 1s linear, stroke 0.4s" }}
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center font-mono text-[12px] font-extrabold tabular-nums text-fg"
        style={{ fontSize: size < 50 ? 10 : 12 }}
      >
        {num(label)}
      </span>
    </div>
  );
}
