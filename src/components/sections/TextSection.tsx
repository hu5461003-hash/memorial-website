/**
 * 文本段落块组件
 * - 富文本段落，支持换行、对齐、字号
 * - data: { text, align, font_size, font_weight, color }
 */
export default function TextSection({ data }: { data: Record<string, unknown> }) {
  const text = (data.text as string) ?? "";
  const align = (data.align as string) ?? "left";
  const fontSize = (data.font_size as string) ?? "14px";
  const fontWeight = (data.font_weight as string) ?? "normal";
  const color = (data.color as string) ?? "";

  if (!text) return null;

  return (
    <section className="my-4">
      <p
        className="whitespace-pre-wrap leading-relaxed text-ink"
        style={{
          textAlign: align as "left" | "center" | "right" | "justify",
          fontSize,
          fontWeight,
          color: color || undefined,
        }}
      >
        {text}
      </p>
    </section>
  );
}
