/** 无限滚动相册：横向自动滚动的照片条 */
export default function MarqueeSection({ data }: { data: Record<string, unknown> }) {
  const images = (data.images as string[]) ?? [];
  const speed = (data.speed as number) ?? 30;

  if (images.length === 0) return null;

  // 复制一份以实现无缝循环
  const doubled = [...images, ...images];

  return (
    <section className="my-4 overflow-hidden">
      <style>{`
        @keyframes marquee-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
      <div
        className="flex gap-2 w-max"
        style={{
          animation: `marquee-scroll ${speed}s linear infinite`,
        }}
      >
        {doubled.map((src, i) => (
          <img
            key={i}
            src={src}
            alt=""
            loading="lazy"
            className="h-28 w-40 flex-none rounded-soft border border-coffee-line/50 object-cover shadow-paper"
          />
        ))}
      </div>
    </section>
  );
}
