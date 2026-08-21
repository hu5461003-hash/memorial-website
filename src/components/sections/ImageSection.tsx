/**
 * 图片块组件
 * - 单张图片展示，可设置宽度、对齐、圆角、点击跳转链接
 * - data: { url, alt, width, align, rounded, link, open_in_new }
 */
export default function ImageSection({ data }: { data: Record<string, unknown> }) {
  const url = (data.url as string) ?? "";
  const alt = (data.alt as string) ?? "";
  const width = ((data.width as number) ?? 100); // 百分比
  const align = (data.align as string) ?? "center";
  const rounded = (data.rounded as boolean) ?? true;
  const link = (data.link as string) ?? "";
  const openInNew = (data.open_in_new as boolean) ?? true;

  if (!url) return null;

  const img = (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      className={`mx-auto block max-w-full object-cover ${rounded ? "rounded-card" : ""}`}
      style={{ width: `${width}%` }}
    />
  );

  return (
    <section className="my-4" style={{ textAlign: align as "left" | "center" | "right" }}>
      {link ? (
        <a
          href={link}
          target={openInNew ? "_blank" : undefined}
          rel={openInNew ? "noreferrer" : undefined}
          className="inline-block"
        >
          {img}
        </a>
      ) : (
        img
      )}
      {alt && (
        <p className="mt-2 text-center text-[11px] text-ink-mute">{alt}</p>
      )}
    </section>
  );
}
