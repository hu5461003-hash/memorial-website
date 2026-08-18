/** 标题文字组件 */
export default function HeadingSection({ data }: { data: Record<string, unknown> }) {
  const text = (data.text as string) ?? "";
  const level = ((data.level as string) ?? "h3") as "h1" | "h2" | "h3";
  const align = (data.align as string) ?? "center";

  if (!text) return null;

  const Tag = level;
  return (
    <section className="my-4">
      <Tag
        className="font-hand text-ink"
        style={{ textAlign: align as "left" | "center" | "right" }}
      >
        {text}
      </Tag>
    </section>
  );
}
