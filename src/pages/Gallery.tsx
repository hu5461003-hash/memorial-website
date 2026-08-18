import { useEffect, useState } from "react";
import { Lock, KeyRound, X, AlertCircle, CameraOff, Video as VideoIcon, Play } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import Layout from "@/components/Layout";
import Loading from "@/components/Loading";
import { supabase, supabaseReady } from "@/lib/supabase";
import { GALLERY_PASSWORD } from "@/lib/config";
import { useStore } from "@/store/useStore";
import { useContent } from "@/hooks/useContent";
import SectionRenderer from "@/components/SectionRenderer";
import type { Photo, Video } from "@/lib/types";

export default function Gallery() {
  const { galleryUnlocked, unlockGallery } = useStore();
  const { getValue } = useContent();
  const gallerySubtitle = getValue("gallery.subtitle");

  const [pwd, setPwd] = useState("");
  const [error, setError] = useState(false);

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Photo | null>(null);
  const [activeVideo, setActiveVideo] = useState<Video | null>(null);

  async function loadAll() {
    setLoading(true);
    if (!supabaseReady || !supabase) {
      setPhotos([]);
      setVideos([]);
      setLoading(false);
      return;
    }
    const [photoRes, videoRes] = await Promise.all([
      supabase.from("photos").select("*").order("photo_date", { ascending: false }),
      supabase.from("videos").select("*").order("video_date", { ascending: false }),
    ]);
    setPhotos((photoRes.data as Photo[]) ?? []);
    setVideos((videoRes.data as Video[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    if (galleryUnlocked) loadAll();
  }, [galleryUnlocked]);

  function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    if (pwd === GALLERY_PASSWORD) {
      setError(false);
      unlockGallery();
    } else {
      setError(true);
    }
  }

  // 密码门
  if (!galleryUnlocked) {
    return (
      <Layout>
        <PageHeader title="私密相册" subtitle="需要一把小钥匙" showBack={false} />
        <div className="flex flex-col items-center justify-center py-16">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-gold/30 bg-gold/5 text-gold animate-soft-pulse">
            <Lock className="h-8 w-8" strokeWidth={1.5} />
          </div>
          <p className="mt-5 text-base font-semibold text-ink">这里收着一些瞬间</p>
          <p className="mt-1 text-xs text-ink-soft">输入密码，推开这扇门</p>

          <form onSubmit={handleUnlock} className="mt-7 w-full max-w-[260px]">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-gold" strokeWidth={1.6} />
              <input
                type="password"
                inputMode="numeric"
                value={pwd}
                onChange={(e) => {
                  setPwd(e.target.value);
                  setError(false);
                }}
                placeholder="密码"
                autoFocus
                className="input-line text-center tracking-[0.4em]"
              />
            </div>
            {error && (
              <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-rust">
                <AlertCircle className="h-3.5 w-3.5" strokeWidth={1.8} />
                密码不对哦，再试一次
              </div>
            )}
            <button type="submit" className="btn-gold mt-5 w-full">
              推开门
            </button>
          </form>
        </div>
      </Layout>
    );
  }

  // 解锁后：Ins 风 3 列方格 Feed
  return (
    <Layout>
      <PageHeader title="私密相册" subtitle={gallerySubtitle} showBack={false} />

      {loading ? (
        <Loading tip="正在加载…" />
      ) : photos.length === 0 && videos.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-cream-300 bg-cream-200 py-16 text-center">
          <CameraOff className="h-8 w-8 text-ink-mute" strokeWidth={1.4} />
          <p className="mt-3 text-sm font-medium text-ink-soft">还没有内容</p>
          <p className="mt-1 text-xs text-ink-mute">管理员可以在后台添加</p>
        </div>
      ) : (
        <>
          {/* 统计信息条 */}
          <div className="mb-3 flex items-center gap-4 border-b border-cream-300 pb-3 text-xs text-ink-soft">
            <span><strong className="text-ink">{photos.length}</strong> 照片</span>
            {videos.length > 0 && (
              <span><strong className="text-ink">{videos.length}</strong> 视频</span>
            )}
          </div>

          {/* Ins 风 3 列方格 Feed */}
          <section className="grid grid-cols-3 gap-0.5 sm:gap-1">
            {/* 照片方格 */}
            {photos.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setActive(p)}
                className="group relative aspect-square overflow-hidden bg-cream-100"
              >
                <img
                  src={p.public_url}
                  alt={p.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                {/* Hover 信息层 */}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-ink/0 opacity-0 transition-all duration-200 group-hover:bg-ink/40 group-hover:opacity-100">
                  <p className="px-2 text-center text-[11px] font-semibold text-cream-50 line-clamp-2">
                    {p.title}
                  </p>
                  {p.photo_date && (
                    <p className="text-[9px] text-cream-50/80">{p.photo_date}</p>
                  )}
                </div>
              </button>
            ))}

            {/* 视频方格 */}
            {videos.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setActiveVideo(v)}
                className="group relative aspect-square overflow-hidden bg-ink"
              >
                <video
                  src={v.public_url}
                  poster={v.cover_url ?? undefined}
                  preload="metadata"
                  muted
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                {/* 播放按钮 */}
                <div className="absolute inset-0 flex items-center justify-center bg-ink/20 transition-colors group-hover:bg-ink/30">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-cream-50/85 text-gold">
                    <Play className="h-4 w-4 translate-x-[1px]" strokeWidth={2.2} fill="currentColor" />
                  </span>
                </div>
                {/* 时长 */}
                {v.duration && (
                  <span className="absolute bottom-1 right-1 rounded bg-ink/70 px-1 text-[9px] font-medium text-cream-50">
                    {v.duration}
                  </span>
                )}
              </button>
            ))}
          </section>

          {/* 动态组件区 */}
          <div className="mt-6">
            <SectionRenderer pageName="gallery" />
          </div>
        </>
      )}

      {/* 全屏查看照片 */}
      {active && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/90 p-4 backdrop-blur-sm animate-fade-in"
          onClick={() => setActive(null)}
        >
          <button
            type="button"
            aria-label="关闭"
            className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-cream-50/10 text-cream-50 transition-colors hover:bg-cream-50/20"
          >
            <X className="h-5 w-5" strokeWidth={1.8} />
          </button>
          <figure
            className="max-h-[88vh] max-w-[92vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={active.public_url}
              alt={active.title}
              className="max-h-[80vh] max-w-full rounded-soft"
            />
            <figcaption className="mt-3 text-center text-sm font-medium text-cream-50">
              {active.title}
              {active.photo_date && (
                <span className="ml-2 text-xs text-cream-50/70">
                  · {active.photo_date}
                </span>
              )}
            </figcaption>
          </figure>
        </div>
      )}

      {/* 全屏播放视频 */}
      {activeVideo && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/95 p-4 backdrop-blur-sm animate-fade-in"
          onClick={() => setActiveVideo(null)}
        >
          <button
            type="button"
            aria-label="关闭"
            className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-cream-50/10 text-cream-50 transition-colors hover:bg-cream-50/20"
          >
            <X className="h-5 w-5" strokeWidth={1.8} />
          </button>
          <figure
            className="max-h-[90vh] max-w-[94vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <video
              src={activeVideo.public_url}
              poster={activeVideo.cover_url ?? undefined}
              controls
              autoPlay
              className="max-h-[80vh] max-w-full rounded-soft"
            />
            <figcaption className="mt-3 flex items-center justify-center gap-2 text-sm font-medium text-cream-50">
              {activeVideo.city && (
                <span className="text-gold-tint">{activeVideo.city}</span>
              )}
              <span>{activeVideo.title}</span>
              {activeVideo.video_date && (
                <span className="text-xs text-cream-50/70">· {activeVideo.video_date}</span>
              )}
            </figcaption>
          </figure>
        </div>
      )}
    </Layout>
  );
}
