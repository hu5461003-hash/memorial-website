import { useState, useEffect, useRef } from "react";

type Slide = {
  image: string;
  title: string;
  subtitle: string;
};

/**
 * Banner 轮播图动态组件
 * 在排版中添加后，可配置多张幻灯片 + 轮播速度
 */
export default function BannerSection({ data }: { data: Record<string, unknown> }) {
  const slides = (data.slides as Slide[]) ?? [];
  const speed = (data.speed as number) ?? 5000;

  const [idx, setIdx] = useState(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => setIdx(0), [slides.length]);

  useEffect(() => {
    if (slides.length <= 1) return;
    timerRef.current = window.setInterval(() => {
      setIdx((i) => (i + 1) % slides.length);
    }, speed);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [slides.length, speed]);

  if (slides.length === 0) return null;

  const current = slides[idx] ?? slides[0];

  return (
    <section className="relative mb-4 overflow-hidden rounded-card border border-cream-300 shadow-paper">
      <div className="relative aspect-[16/10] w-full bg-cream-100">
        {current.image && (
          <img
            src={current.image}
            alt={current.title ?? "banner"}
            className="absolute inset-0 h-full w-full object-cover transition-opacity duration-700"
          />
        )}
        {/* 渐变蒙层 */}
        <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/20 to-transparent" />

        {/* 标题 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
          {current.title && (
            <h2 className="text-2xl font-bold text-cream-50 drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
              {current.title}
            </h2>
          )}
          {current.subtitle && (
            <p className="mt-2 max-w-[16rem] text-sm text-cream-50/95 drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]">
              {current.subtitle}
            </p>
          )}
        </div>

        {/* 指示点 */}
        {slides.length > 1 && (
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`第 ${i + 1} 张`}
                onClick={() => setIdx(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === idx ? "w-5 bg-cream-50" : "w-1.5 bg-cream-50/50"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
