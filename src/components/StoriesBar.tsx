import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import type { Footprint, Photo } from "@/lib/types";

/**
 * Stories 横滚头像区（Ins 风）
 * - 一排圆形头像，外圈 Ins 渐变 ring
 * - 数据源：足迹城市封面 + 最新照片
 * - 横向滚动，隐藏滚动条
 * - 点击跳转到对应城市/相册
 */
type StoryItem = {
  id: string;
  label: string;
  cover_url: string | null;
  to: string;
};

export default function StoriesBar() {
  const [items, setItems] = useState<StoryItem[]>([]);

  useEffect(() => {
    async function load() {
      if (!supabase) return;
      // 足迹城市（带封面）+ 最近 6 张照片
      const [fpRes, phoRes] = await Promise.all([
        supabase
          .from("footprints")
          .select("id,name,cover_url,sort_order")
          .order("sort_order", { ascending: true }),
        supabase
          .from("photos")
          .select("id,title,public_url,city")
          .order("created_at", { ascending: false })
          .limit(6),
      ]);
      const footprints = (fpRes.data as Footprint[] | null) ?? [];
      const photos = (phoRes.data as Photo[] | null) ?? [];

      const stories: StoryItem[] = [];

      // 足迹 → /map
      footprints.forEach((f) => {
        if (f.cover_url) {
          stories.push({
            id: `fp-${f.id}`,
            label: f.name,
            cover_url: f.cover_url,
            to: "/map",
          });
        }
      });
      // 照片 → /gallery
      photos.forEach((p) => {
        stories.push({
          id: `ph-${p.id}`,
          label: p.city || p.title || "相册",
          cover_url: p.public_url,
          to: "/gallery",
        });
      });

      setItems(stories);
    }
    load();
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="mb-4 mt-4">
      <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
        {items.map((item) => (
          <Link
            key={item.id}
            to={item.to}
            className="flex flex-none flex-col items-center gap-1.5"
          >
            {/* 渐变 ring + 头像 */}
            <div className="ins-gradient rounded-full p-[2px]">
              <div className="rounded-full border-2 border-cream-200 bg-cream-200 p-0.5">
                {item.cover_url ? (
                  <img
                    src={item.cover_url}
                    alt={item.label}
                    className="h-14 w-14 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-cream-100 text-[10px] text-ink-mute">
                    无
                  </div>
                )}
              </div>
            </div>
            {/* 标签：单行截断 */}
            <span className="max-w-[64px] truncate text-[11px] text-ink-soft">
              {item.label}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
