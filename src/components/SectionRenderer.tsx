import { useMemo } from "react";
import { usePageSections } from "@/hooks/usePageSections";
import { useTheme } from "@/hooks/useTheme";
import type { PageSection } from "@/lib/types";
import MarqueeSection from "@/components/sections/MarqueeSection";
import TimelineSection from "@/components/sections/TimelineSection";
import CustomHtmlSection from "@/components/sections/CustomHtmlSection";
import HeadingSection from "@/components/sections/HeadingSection";
import SpacerSection from "@/components/sections/SpacerSection";

/**
 * 动态组件渲染引擎
 * 按 page_name 拉取 page_sections 列表，根据 sort_order 依次渲染对应组件。
 * 支持每个分区覆盖全局颜色主题。
 */
export default function SectionRenderer({ pageName }: { pageName: string }) {
  const { sections } = usePageSections(pageName);
  const { theme } = useTheme();

  const rendered = useMemo(
    () =>
      sections.map((s: PageSection) => {
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
            inner = <MarqueeSection key={s.id} data={s.content_data} />;
            break;
          case "timeline":
            inner = <TimelineSection key={s.id} data={s.content_data} />;
            break;
          case "custom_html":
            inner = <CustomHtmlSection key={s.id} data={s.content_data} />;
            break;
          case "heading":
            inner = <HeadingSection key={s.id} data={s.content_data} />;
            break;
          case "spacer":
            inner = <SpacerSection key={s.id} data={s.content_data} />;
            break;
          default:
            return null;
        }

        // spacer 不需要包裹背景
        if (s.section_type === "spacer") return inner;

        return (
          <section
            key={s.id}
            className="mb-4 rounded-card border p-4"
            style={sectionStyle}
          >
            {inner}
          </section>
        );
      }),
    [sections, theme],
  );

  if (sections.length === 0) return null;
  return <div className="dynamic-sections">{rendered}</div>;
}
