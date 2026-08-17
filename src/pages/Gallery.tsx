import { useEffect, useState } from "react";
import { Lock, KeyRound, X, AlertCircle, CameraOff, Video as VideoIcon, Play } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import Layout from "@/components/Layout";
import Loading from "@/components/Loading";
import { supabase, supabaseReady } from "@/lib/supabase";
import { GALLERY_PASSWORD } from "@/lib/config";
import { useStore } from "@/store/useStore";
import { useContent } from "@/hooks/useContent";
import type { Photo, Video } from "@/lib/types";
import { cn } from "@/lib/utils";

const ROTATE = ["-rotate-3", "rotate-2", "-rotate-2", "rotate-3"];

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
          <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-gold/40 bg-gold/10 text-gold animate-soft-pulse">
            <Lock className="h-8 w-8" strokeWidth={1.5} />
          </div>
          <p className="mt-5 font-hand text-lg text-ink">这里收着一些瞬间</p>
          <p className="mt-1 text-xs text-ink-mute">输入密码，推开这扇门</p>

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

  // 解锁后：照片 + 视频
  return (
    <Layout>
      <PageHeader title="私密相册" subtitle={gallerySubtitle} showBack={false} />

      {loading ? (
        <Loading tip="正在冲洗照片…" />
      ) : (
        <>
          {/* 照片区 */}
          <section>
            <h2 className="mb-3 flex items-center gap-1.5 font-hand text-base text-ink-soft">
              <CameraOff className="hidden" />
              照片 · {photos.length}
            </h2>
            {photos.length === 0 ? (
              <div className="rounded-card border border-dashed border-coffee-line/70 bg-cream-200/40 py-10 text-center">
                <p className="font-hand text-sm text-ink-soft">还没有照片</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {photos.map((p, idx) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setActive(p)}
                    className={cn(
                      "group flex flex-col bg-cream-50 p-2 pb-5 shadow-polaroid transition-transform hover:scale-[1.03] active:scale-[0.98]",
                      ROTATE[idx % ROTATE.length],
                    )}
                  >
                    <div className="aspect-square overflow-hidden bg-cream-200">
                      <img
                        src={p.public_url}
                        alt={p.title}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <p className="mt-2 px-1 text-center font-hand text-xs text-ink-soft">
                      {p.title}
                    </p>
                    {p.photo_date && (
                      <p className="text-center text-[10px] text-ink-mute">
                        {p.photo_date}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* 视频区 */}
          {videos.length > 0 && (
            <section className="mt-8">
              <h2 className="mb-3 flex items-center gap-1.5 font-hand text-base text-ink-soft">
                <VideoIcon className="h-4 w-4 text-gold" strokeWidth={1.8} />
                影像 · {videos.length}
              </h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {videos.map((v, idx) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setActiveVideo(v)}
                    className={cn(
                      "group relative flex flex-col overflow-hidden bg-cream-50 p-1.5 pb-3 shadow-polaroid transition-transform hover:scale-[1.03] active:scale-[0.98]",
                      ROTATE[idx % ROTATE.length],
                    )}
                  >
                    <div className="relative aspect-square overflow-hidden bg-ink">
                      {/* 封面或视频首帧 */}
                      <video
                        src={v.public_url}
                        poster={v.cover_url ?? undefined}
                        preload="metadata"
                        muted
                        className="h-full w-full object-cover"
                      />
                      {/* 播放按钮蒙层 */}
                      <div className="absolute inset-0 flex items-center justify-center bg-ink/30 transition-colors group-hover:bg-ink/20">
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-cream-50/90 text-coffee">
                          <Play className="h-4 w-4 translate-x-[1px]" strokeWidth={1.8} />
                        </span>
                      </div>
                      {v.duration && (
                        <span className="absolute bottom-1 right-1 rounded bg-ink/70 px-1 text-[9px] text-cream-50">
                          {v.duration}
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 px-1 text-center font-hand text-xs text-ink-soft">
                      {v.title}
                    </p>
                    {v.video_date && (
                      <p className="text-center text-[10px] text-ink-mute">
                        {v.video_date}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </section>
          )}

          {photos.length === 0 && videos.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-coffee-line/70 bg-cream-200/40 py-14 text-center">
              <CameraOff className="h-7 w-7 text-ink-mute" strokeWidth={1.4} />
              <p className="mt-3 font-hand text-base text-ink-soft">相册里还没有内容</p>
              <p className="mt-1 text-xs text-ink-mute">管理员可以在后台添加</p>
            </div>
          )}
        </>
      )}

      {/* 全屏查看照片 */}
      {active && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-5 backdrop-blur-sm animate-fade-in"
          onClick={() => setActive(null)}
        >
          <button
            type="button"
            aria-label="关闭"
            className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-cream-50/20 text-cream-50 transition-colors hover:bg-cream-50/30"
          >
            <X className="h-5 w-5" strokeWidth={1.8} />
          </button>
          <figure
            className="max-h-[85vh] max-w-[90vw] bg-cream-50 p-3 pb-6 shadow-polaroid"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={active.public_url}
              alt={active.title}
              className="max-h-[70vh] max-w-full object-contain"
            />
            <figcaption className="mt-3 text-center font-hand text-sm text-ink-soft">
              {active.title}
              {active.photo_date && (
                <span className="ml-2 text-xs text-ink-mute">
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
          className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/85 p-5 backdrop-blur-sm animate-fade-in"
          onClick={() => setActiveVideo(null)}
        >
          <button
            type="button"
            aria-label="关闭"
            className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-cream-50/20 text-cream-50 transition-colors hover:bg-cream-50/30"
          >
            <X className="h-5 w-5" strokeWidth={1.8} />
          </button>
          <figure
            className="max-h-[88vh] max-w-[92vw] bg-cream-50 p-3 pb-5 shadow-polaroid"
            onClick={(e) => e.stopPropagation()}
          >
            <video
              src={activeVideo.public_url}
              poster={activeVideo.cover_url ?? undefined}
              controls
              autoPlay
              className="max-h-[72vh] max-w-full"
            />
            <figcaption className="mt-3 flex items-center justify-center gap-2 font-hand text-sm text-ink-soft">
              {activeVideo.city && (
                <span className="text-gold">{activeVideo.city}</span>
              )}
              <span>{activeVideo.title}</span>
              {activeVideo.video_date && (
                <span className="text-xs text-ink-mute">· {activeVideo.video_date}</span>
              )}
            </figcaption>
          </figure>
        </div>
      )}
    </Layout>
  );
}
