import { Fragment } from "react";
import { usePageBlocks } from "@/hooks/usePageBlocks";
import { SectionItem } from "@/components/SectionRenderer";

/**
 * 页面区块流渲染器：把页面原生组件（内置区块）与后台动态分区
 * 统一按后台「排版」的顺序渲染。
 * - blocks: 区块标识 → ReactNode（页面自己实现的内置组件）
 * - 未提供的区块标识会被跳过；动态分区交给 SectionItem
 */
export default function PageBlocks({
  pageName,
  blocks,
}: {
  pageName: string;
  blocks: Record<string, React.ReactNode>;
}) {
  const { sections } = usePageBlocks(pageName);

  return (
    <>
      {sections.map((s) => {
        if (s.section_type === "builtin") {
          const key = String((s.content_data as Record<string, unknown>)?.block ?? "");
          const node = blocks[key];
          if (!node) return null;
          return <Fragment key={s.id}>{node}</Fragment>;
        }
        return <SectionItem key={s.id} section={s} />;
      })}
    </>
  );
}
