"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { useLang } from "@/components/LangProvider";

interface PhotoViewerProps {
  src: string;
  alt: string;
  onClose: () => void;
}

/** Full-screen photo so a commuter can study the landmark / clothing detail. */
export function PhotoViewer({ src, alt, onClose }: PhotoViewerProps) {
  const { t } = useLang();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      onClick={onClose}
      className="fixed inset-0 z-[65] flex animate-fade-in items-center justify-center bg-black/90 p-4"
    >
      <button
        type="button"
        aria-label={t("close")}
        onClick={onClose}
        className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800 text-fg active:scale-95"
      >
        <X className="h-6 w-6" aria-hidden />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="max-h-[85dvh] max-w-full rounded-2xl object-contain" />
    </div>
  );
}
