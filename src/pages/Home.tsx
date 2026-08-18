import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Map, BookOpen, Mail, Image, Feather, Video } from "lucide-react";
import Layout from "@/components/Layout";
import StoriesBar from "@/components/StoriesBar";
import { useBanners } from "@/hooks/useBanners";
import { useContent } from "@/hooks/useContent";
import { cn } from "@/lib/utils";
import SectionRenderer from "@/components/SectionRenderer";
import ContactCard from "@/components/ContactCard";

const ENTRIES = [
  { to: "/map", title: "足迹地图", desc: "九座城市，一条暖色的河", Icon: Map },
  { to: "/letter", title: "纪念长信", desc: "写给那段时光", Icon: BookOpen },
  { to: "/messages", title: "温暖留言", desc: "留下一张便签", Icon: Mail },
  { to: "/gallery", title: "私密相册", desc: "需要一把小钥匙", Icon: Image },
] as const;

export default function Home() {
  const { banners } = useBanners();
  const { getValue } = useContent();
  const [activeIdx, setActiveIdx] = useState(0);
  const timerRef = useRef<number | null>(null);

  // Banner 自动轮播（5s）
  useEffect(() => {
    if (banners.length <= 1) return;
    timerRef.current = window.setInterval(() => {
      setActiveIdx((i) => (i + 1) % banners.length);
    }, 5000);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [banners.length]);

  const banner = banners[activeIdx] ?? banners[0];
  const bannerTitle = getValue("home.banner_title");
  const bannerSubtitle = getValue("home.banner_subtitle");
  const footerText = getValue("home.footer");

  return (
    <Layout>
      {/* Stories 横滚头像区（Ins 风） */}
      <StoriesBar />

      {/* Banner 区 */}
      <section className="relative overflow-hidden rounded-card border border-cream-300 shadow-paper">
        <div className="relative aspect-[16/10] w-full bg-cream-100">
          {banner && (
            <img
              src={banner.image_url}
              alt={banner.title ?? "banner"}
              className="absolute inset-0 h-full w-full object-cover transition-opacity duration-700"
            />
          )}
          {/* Ins 风渐变蒙层：底部黑色渐变 + 角落 ins 渐变叠加 */}
          <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/20 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-br from-gold/15 via-transparent to-coffee/15 mix-blend-overlay" />

          {/* 标题与副标题 */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
            <div className="mb-3 flex items-center gap-2 text-cream-50/90 animate-fade-up">
              <span className="h-px w-8 bg-cream-50/60" />
              <Feather className="h-4 w-4" strokeWidth={1.6} />
              <span className="h-px w-8 bg-cream-50/60" />
            </div>
            {bannerTitle && (
              <h1
                className="text-3xl font-bold text-cream-50 tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] animate-fade-up"
                style={{ animationDelay: "0.1s" }}
              >
                {bannerTitle}
              </h1>
            )}
            {bannerSubtitle && (
              <p
                className="mt-3 max-w-[16rem] text-sm leading-relaxed text-cream-50/95 drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)] animate-fade-up"
                style={{ animationDelay: "0.25s" }}
              >
                {bannerSubtitle}
              </p>
            )}
          </div>

          {/* 轮播指示点 */}
          {banners.length > 1 && (
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
              {banners.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`第 ${i + 1} 张`}
                  onClick={() => setActiveIdx(i)}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    i === activeIdx
                      ? "w-5 bg-cream-50"
                      : "w-1.5 bg-cream-50/50",
                  )}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 入口卡片网格 */}
      <section className="mt-6 grid grid-cols-2 gap-3 pb-8">
        {ENTRIES.map(({ to, title, desc, Icon }, idx) => (
          <Link
            key={to}
            to={to}
            className="group flex flex-col items-start gap-2 rounded-card border border-cream-300 bg-cream-200 p-4 shadow-paper transition-all hover:-translate-y-0.5 hover:border-gold/50 hover:shadow-ins active:scale-[0.98] animate-fade-up"
            style={{ animationDelay: `${0.2 + idx * 0.08}s` }}
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-soft ins-gradient-soft text-white transition-opacity group-hover:opacity-90">
              <Icon className="h-4 w-4" strokeWidth={2} />
            </span>
            <div>
              <h3 className="text-base font-bold text-ink">{title}</h3>
              <p className="mt-0.5 text-xs text-ink-soft">{desc}</p>
            </div>
          </Link>
        ))}
      </section>

      {/* 动态组件区 */}
      <SectionRenderer pageName="home" />

      {/* 管理员联系方式卡片 */}
      <ContactCard />

      {/* 底部留白与署名 */}
      {footerText && (
        <p className="pt-2 text-center text-[11px] tracking-widest text-ink-mute/70">
          {footerText}
        </p>
      )}
    </Layout>
  );
}
