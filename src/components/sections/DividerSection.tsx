/**
 * 分割线组件
 * - 可设置样式、颜色、粗细、间距
 * - data: { style, color, thickness, spacing }
 */
export default function DividerSection({ data }: { data: Record<string, unknown> }) {
  const style = (data.style as string) ?? "solid"; // solid / dashed / dotted / gradient
  const color = (data.color as string) ?? "#E5E5E5";
  const thickness = (data.thickness as number) ?? 1;
  const spacing = (data.spacing as number) ?? 24;

  if (style === "gradient") {
    return (
      <section
        className="my-0"
        style={{
          margin: `${spacing}px 0`,
          height: `${thickness}px`,
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
        }}
        aria-hidden="true"
      />
    );
  }

  return (
    <section
      className="my-0"
      style={{
        margin: `${spacing}px 0`,
        borderTop: `${thickness}px ${style} ${color}`,
      }}
      aria-hidden="true"
    />
  );
}
