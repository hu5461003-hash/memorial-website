import type { ReactNode } from "react";
import TopBar from "./TopBar";
import BottomTab from "./BottomTab";
import SiteFooter from "./SiteFooter";
import { SectionItem } from "./SectionRenderer";
import { cn } from "@/lib/utils";
import { usePageBlocks } from "@/hooks/usePageBlocks";

/**
 * 页面外壳布局
 * - 默认移动优先（最大宽度 470px 居中，Ins Web 经典 935px 桌面端）
 * - wide 模式：桌面端展开宽屏（管理后台用）
 * - 页头 / 页脚 / 底部导航由后台「排版 · 全局」统一控制显隐，
 *   隐藏后自动回收对应留白
 * - 「全局」页中添加的动态区块（跑马灯/自定义代码等）会在全站每页底部渲染
 */
export default function Layout({
  children,
  wide = false,
  hideNav = false,
  hideTopBar = false,
}: {
  children: ReactNode;
  wide?: boolean;
  hideNav?: boolean;
  hideTopBar?: boolean;
}) {
  const { sections } = usePageBlocks("global");
  const has = (block: string) =>
    sections.some(
      (s) =>
        s.section_type === "builtin" &&
        (s.content_data as Record<string, unknown>)?.block === block,
    );
  const headerActive = has("header");
  const navActive = has("bottom_nav");
  const footerActive = has("footer");
  const globalSections = sections.filter((s) => s.section_type !== "builtin");

  return (
    <div
      className={cn(
        "animate-fade-in",
        wide ? "page-shell-wide" : "page-shell",
        !headerActive && "!pt-0",
        !navActive && "!pb-8",
      )}
    >
      {!hideTopBar && <TopBar />}
      {children}
      {globalSections.map((s) => (
        <SectionItem key={s.id} section={s} />
      ))}
      {footerActive && <SiteFooter />}
      {!hideNav && <BottomTab />}
    </div>
  );
}
