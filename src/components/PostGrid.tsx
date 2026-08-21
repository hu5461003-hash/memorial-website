import { useNavigate } from "react-router-dom";
import { Heart, MessageSquare, Share2, ImagePlus } from "lucide-react";
import type { Post } from "@/lib/types";
import { formatTime } from "@/hooks/usePosts";
import { useContent } from "@/hooks/useContent";
import { cn } from "@/lib/utils";

/**
 * 3 列帖子方格 Feed（首页/帖子列表复用）
 * - 一张图代表一个帖子（cover_url，或第一张图）
 * - 图片下方标题一行省略号
 * - onlyFeatured=true 时，过滤掉 featured=false 的
 */
export default function PostGrid({
  posts,
  limit,
  showEmpty = true,
  compact = false,
}: {
  posts: Post[];
  limit?: number;
  showEmpty?: boolean;
  compact?: boolean;
}) {
  const navigate = useNavigate();
  const { getValue } = useContent();
  const list = typeof limit === "number" ? posts.slice(0, limit) : posts;
  if (list.length === 0) {
    if (!showEmpty) return null;
    return (
      <div className="flex flex-col items-center justify-center py-10 text-ink-mute">
        <ImagePlus className="h-7 w-7" strokeWidth={1.4} />
        <p className="mt-2 text-xs">{getValue("posts.empty")}</p>
      </div>
    );
  }

  return (
    <section
      className={cn(
        "grid",
        compact
          ? "grid-cols-3 gap-0.5 sm:gap-1"
          : "grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2",
      )}
    >
      {list.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => navigate(`/posts/${p.id}`)}
          className="group relative flex flex-col overflow-hidden rounded-soft bg-cream-50 border border-cream-300 shadow-soft transition-all hover:shadow-ins active:scale-[0.99]"
        >
          {/* 图片区 */}
          <div className="relative aspect-square overflow-hidden bg-cream-100">
            {p.cover_url ? (
              <img
                src={p.cover_url}
                alt={p.title}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-ink-mute">
                <ImagePlus className="h-6 w-6" strokeWidth={1.4} />
              </div>
            )}
            {/* 数据蒙层（hover 才显示） */}
            <div className="absolute inset-0 flex items-center justify-center gap-3 bg-ink/0 text-cream-50 opacity-0 transition-all group-hover:bg-ink/45 group-hover:opacity-100">
              <span className="inline-flex items-center gap-1 text-xs font-semibold">
                <Heart className="h-3.5 w-3.5" strokeWidth={2} />
                {p.like_count}
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-semibold">
                <MessageSquare className="h-3.5 w-3.5" strokeWidth={2} />
                {p.comment_count}
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-semibold">
                <Share2 className="h-3.5 w-3.5" strokeWidth={2} />
                {p.share_count}
              </span>
            </div>
          </div>

          {/* 标题：一行省略 */}
          <div className="p-2 text-left">
            <p className="truncate text-[11px] font-semibold text-ink">
              {p.title || getValue("posts.no_title")}
            </p>
            <p className="mt-0.5 truncate text-[9px] text-ink-mute">
              {formatTime(p.created_at)}
            </p>
          </div>
        </button>
      ))}
    </section>
  );
}
