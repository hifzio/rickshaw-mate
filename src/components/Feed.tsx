"use client";

import { Radio } from "lucide-react";
import { CommuterCard } from "@/components/CommuterCard";
import { EmptyState } from "@/components/EmptyState";
import { useLang } from "@/components/LangProvider";
import type { RidePost } from "@/types";

interface FeedProps {
  posts: RidePost[];
  now: number;
  busyId: string | null;
  onShare: (post: RidePost) => void;
  onRemove: (post: RidePost) => void;
  onViewProfile: (post: RidePost) => void;
  onPost: () => void;
}

export function Feed({ posts, now, busyId, onShare, onRemove, onViewProfile, onPost }: FeedProps) {
  const { t } = useLang();

  if (posts.length === 0) return <EmptyState onPost={onPost} />;

  return (
    <section aria-label={t("liveNow")} className="px-4 pb-32 pt-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="inline-flex items-center gap-2 text-sm font-bold text-fg">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
          </span>
          {t("liveNow")}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900 px-3 py-1 text-xs font-bold text-indigo-200 ring-1 ring-line/10">
          <Radio className="h-3.5 w-3.5" aria-hidden />
          {t("waitingCount", { n: posts.length })}
        </span>
      </div>

      <div className="flex flex-col gap-3.5">
        {posts.map((post, i) => (
          <CommuterCard
            key={post.id}
            post={post}
            now={now}
            busy={busyId === post.id}
            index={i}
            onShare={onShare}
            onRemove={onRemove}
            onViewProfile={onViewProfile}
          />
        ))}
      </div>
    </section>
  );
}
