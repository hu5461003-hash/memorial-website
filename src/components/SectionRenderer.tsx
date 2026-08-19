import { useMemo } from "react";
import { usePageSections } from "@/hooks/usePageSections";
import type { PageSection } from "@/lib/types";
import MarqueeSection from "@/components/sections/MarqueeSection";
import TimelineSection from "@/components/sections/TimelineSection";
import CustomHtmlSection from "@/components/sections/CustomHtmlSection";
import HeadingSection from "@/components/sections/HeadingSection";
import SpacerSection from "@/components/sections/SpacerSection";

/**
 * 动态组件渲染引擎
 * 按 page_name 拉取 page_sections 列表，根据 sort_order 依次渲染对应组件。
 */
export default function SectionRenderer({ pageName }: { pageName: string }) {
  const { sections } = usePageSections(pageName);

  const rendered = useMemo(
    () =>
      sections.map((s: PageSection) => {
        switch (s.section_type) {
          case "marquee":
            return <MarqueeSection key={s.id} data={s.content_data} />;
          case "timeline":
            return <TimelineSection key={s.id} data={s.content_data} />;
          case "custom_html":
            return <CustomHtmlSection key={s.id} data={s.content_data} />;
          case "heading":
            return <HeadingSection key={s.id} data={s.content_data} />;
          case "spacer":
            return <SpacerSection key={s.id} data={s.content_data} />;
          default:
            return null;
        }
      }),
    [sections],
  );

  if (sections.length === 0) return null;
  return <div className="dynamic-sections">{rendered}</div>;
}
