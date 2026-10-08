"use client";

import { BadgeCheck, ChevronRight, Clock, Loader2, MapPin, Trash2, Users, ZoomIn } from "lucide-react";
import { useState } from "react";
import { Avatar } from "@/components/Avatar";
import { CountdownRing } from "@/components/CountdownRing";
import { PhotoViewer } from "@/components/PhotoViewer";
import { useLang } from "@/components/LangProvider";
import { minutesAgo } from "@/lib/time";
import type { RidePost } from "@/types";

interface CommuterCardProps {
  post: RidePost;
  now: number;
  index: number;
  busy: boolean;
  onShare: (post: RidePost) => void;
  onRemove: (post: RidePost) => void;
  onViewProfile: (post: RidePost) => void;
}

export function CommuterCard({ post, now, index, busy, onShare, onRemove, onViewProfile }: CommuterCardProps) {
  const { t } = useLang();
  const [zoom, setZoom] = useState(false);
  const ago = minutesAgo(post.postedAt, now);

  return (
    <article
      style={{ animationDelay: `${Math.min(index, 6) * 50}ms` }}
      className={`animate-card-in rounded-3xl border bg-zinc-900 p-4 shadow-lg shadow-black/30 ${
        post.isOwn ? "border-emerald-500/50" : "border-line/10"
      }`}
    >
      <div className="flex items-start gap-3.5">
        {post.photoUrl ? (
          <button
            type="button"
            onClick={() => setZoom(true)}
            aria-label={`${t("tapToZoom")}: ${post.name}`}
            className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl ring-1 ring-line/15 active:scale-95"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={post.photoUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
            <span className="absolute bottom-1 right-1 rounded-full bg-black/60 p-1" aria-hidden>
              <ZoomIn className="h-3.5 w-3.5 text-white" />
            </span>
          </button>
        ) : (
          <Avatar name={post.name} className="h-20 w-20 rounded-2xl" textClassName="text-2xl" />
        )}

        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => onViewProfile(post)}
            aria-label={`${t("viewProfile")}: ${post.name}`}
            className="group flex max-w-full items-center gap-0.5 text-left"
          >
            <h3 className="truncate text-lg font-bold leading-tight text-fg group-active:underline">{post.name}</h3>
            <ChevronRight className="h-4 w-4 shrink-0 text-indigo-300" aria-hidden />
          </button>

          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {post.verified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-bold text-emerald-300 ring-1 ring-emerald-400/30">
                <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
                {t("verified")}
              </span>
            )}
            {post.isOwn && (
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/20 px-2.5 py-1 text-xs font-bold text-indigo-200 ring-1 ring-indigo-400/30">
                <Users className="h-3.5 w-3.5" aria-hidden />
                {t("yourPost")}
              </span>
            )}
          </div>
        </div>

        <CountdownRing postedAt={post.postedAt} expiresAt={post.expiresAt} now={now} />
      </div>

      <p className="mt-3.5 flex items-start gap-2 rounded-2xl bg-navy-900/70 p-3 text-[15px] leading-snug text-slate-100 ring-1 ring-indigo-400/15">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
        <span>{post.note}</span>
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-slate-400">
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" aria-hidden />
          {ago < 1 ? t("postedJustNow") : t("postedAgo", { n: ago })}
        </span>
      </div>

      {post.isOwn ? (
        <button
          type="button"
          onClick={() => onRemove(post)}
          disabled={busy}
          className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-line/15 bg-zinc-800 text-base font-bold text-slate-200 transition active:scale-[0.98] active:bg-zinc-700"
        >
          <Trash2 className="h-5 w-5" aria-hidden />
          {t("cancelPost")}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => onShare(post)}
          disabled={busy}
          className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 text-base font-extrabold text-ink shadow-lg shadow-emerald-500/20 transition active:scale-[0.98] active:bg-emerald-400 disabled:opacity-70"
        >
          {busy ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          ) : (
            <Users className="h-5 w-5" strokeWidth={2.5} aria-hidden />
          )}
          {busy ? t("saving") : t("shareThis")}
        </button>
      )}
      {zoom && post.photoUrl && (
        <PhotoViewer src={post.photoUrl} alt={post.name} onClose={() => setZoom(false)} />
      )}
    </article>
  );
}
