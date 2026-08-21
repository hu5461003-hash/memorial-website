import { ExternalLink } from "lucide-react";

/**
 * 按钮块组件
 * - 可设置文字、链接、颜色、大小、对齐
 * - data: { text, link, open_in_new, bg_color, text_color, size, align, style }
 */
export default function ButtonSection({ data }: { data: Record<string, unknown> }) {
  const text = (data.text as string) ?? "点击按钮";
  const link = (data.link as string) ?? "";
  const openInNew = (data.open_in_new as boolean) ?? true;
  const bgColor = (data.bg_color as string) ?? "#1A1A1A";
  const textColor = (data.text_color as string) ?? "#FFFFFF";
  const size = (data.size as string) ?? "md"; // sm / md / lg
  const align = (data.align as string) ?? "center";
  const style = (data.style as string) ?? "solid"; // solid / outline / ghost

  if (!link) return null;

  const sizeClasses: Record<string, string> = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-5 py-2 text-sm",
    lg: "px-7 py-2.5 text-base",
  };

  const buttonStyle: React.CSSProperties =
    style === "solid"
      ? { backgroundColor: bgColor, color: textColor }
      : style === "outline"
        ? { backgroundColor: "transparent", color: bgColor, border: `2px solid ${bgColor}` }
        : { backgroundColor: "transparent", color: bgColor };

  return (
    <section className="my-4" style={{ textAlign: align as "left" | "center" | "right" }}>
      <a
        href={link}
        target={openInNew ? "_blank" : undefined}
        rel={openInNew ? "noreferrer" : undefined}
        className={`inline-flex items-center gap-1.5 rounded-full font-semibold transition-all hover:opacity-85 active:scale-95 ${sizeClasses[size] ?? sizeClasses.md}`}
        style={buttonStyle}
      >
        {text}
        {openInNew && <ExternalLink className="h-3 w-3" strokeWidth={2} />}
      </a>
    </section>
  );
}
