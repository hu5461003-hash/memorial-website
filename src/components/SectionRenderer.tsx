import { useMemo } from "react";
import { usePageSections } from "@/hooks/usePageSections";
import { useTheme } from "@/hooks/useTheme";
import type { PageSection } from "@/lib/types";
import MarqueeSection from "@/components/sections/MarqueeSection";
import TimelineSection from "@/components/sections/TimelineSection";
import CustomHtmlSection from "@/components/sections/CustomHtmlSection";
import HeadingSection from "@/components/sections/HeadingSection";
import SpacerSection from "@/components/sections/SpacerSection";

/** 渲染单个动态分区（内置区块返回 null，由 PageBlocks 处理） */
export function SectionItem({ section }: { section: PageSection }) {
  const { theme } = useTheme();
  const s = section;

  if (s.section_type === "builtin") return null;

  // 计算分区颜色：分区覆盖 > 全局主题
  const bg = s.bg_color ?? theme.bg_color;
  const tc = s.text_color ?? theme.text_color;
  const bc = s.border_color ?? theme.border_color;
  const ac = s.accent_color ?? theme.primary_color;
  const sectionStyle: React.CSSProperties = {
    backgroundColor: bg,
    color: tc,
    borderColor: bc,
    ["--accent" as string]: ac,
  };

  let inner: React.ReactNode = null;
  switch (s.section_type) {
    case "marquee":
      inner = <MarqueeSection data={s.content_data} />;
      break;
    case "timeline":
      inner = <TimelineSection data={s.content_data} />;
      break;
    case "custom_html":
      inner = <CustomHtmlSection data={s.content_data} />;
      break;
    case "heading":
      inner = <HeadingSection data={s.content_data} />;
      break;
    case "spacer":
      inner = <SpacerSection data={s.content_data} />;
      break;
    default:
      return null;
  }

  // spacer 不需要包裹背景
  if (s.section_type === "spacer") return <>{inner}</>;

  return (
    <section className="mb-4 rounded-card border p-4" style={sectionStyle}>
      {inner}
    </section>
  );
}

/**
 * 动态组件渲染引擎（保持原行为：仅渲染动态分区）
 * 按 page_name 拉取 page_sections 列表，根据 sort_order 依次渲染对应组件。
 */
export default function SectionRenderer({ pageName }: { pageName: string }) {
  const { sections } = usePageSections(pageName);

  const rendered = useMemo(
    () => sections.filter((s) => s.section_type !== "builtin").map((s) => (
      <SectionItem key={s.id} section={s} />
    )),
    [sections],
  );

  if (rendered.length === 0) return null;
  return <div className="dynamic-sections">{rendered}</div>;
}
