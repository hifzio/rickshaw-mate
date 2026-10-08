import type { Config } from "tailwindcss";

const v = (name: string) => `rgb(var(--c-${name}) / <alpha-value>)`;

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Theme-aware tokens: values live in globals.css (:root = dark, [data-theme=light]).
        fg: v("fg"),
        line: v("line"),
        ink: "#0a0f2e", // fixed dark text for use on bright (emerald / white) buttons
        navy: { 950: v("navy-950"), 900: v("navy-900"), 800: v("navy-800"), 700: v("navy-700") },
        zinc: { 950: v("zinc-950"), 900: v("zinc-900"), 800: v("zinc-800"), 700: v("zinc-700"), 600: v("zinc-600"), 500: v("zinc-500") },
        slate: { 100: v("slate-100"), 200: v("slate-200"), 300: v("slate-300"), 400: v("slate-400"), 500: v("slate-500"), 600: v("slate-600") },
        indigo: { 200: v("indigo-200"), 300: v("indigo-300"), 400: v("indigo-400") },
        emerald: { 300: v("emerald-300"), 400: v("emerald-400") },
        amber: { 50: v("amber-50"), 200: v("amber-200"), 300: v("amber-300") },
        rose: { 300: v("rose-300"), 400: v("rose-400") },
      },
      fontFamily: {
        sans: [
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Noto Sans Bengali",
          "Kalpurush",
          "Roboto",
          "sans-serif",
        ],
      },
      keyframes: {
        "sheet-up": {
          from: { transform: "translateY(100%)" },
          to: { transform: "translateY(0)" },
        },
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "pop-in": {
          from: { opacity: "0", transform: "scale(0.9)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "card-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "sheet-up": "sheet-up 0.28s cubic-bezier(0.22, 1, 0.36, 1)",
        "fade-in": "fade-in 0.2s ease-out",
        "pop-in": "pop-in 0.35s cubic-bezier(0.22, 1, 0.36, 1)",
        "card-in": "card-in 0.3s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
