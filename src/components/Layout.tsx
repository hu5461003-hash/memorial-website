import type { ReactNode } from "react";
import TopTab from "./TopTab";
import MusicButton from "./MusicButton";
import { cn } from "@/lib/utils";

/**
 * 页面外壳布局
 * - 默认移动优先（最大宽度 470px 居中，Ins Web 经典 935px 桌面端）
 * - wide 模式：桌面端展开宽屏（管理后台用）
 * - 顶部固定 Tab 栏替代原底部导航
 * - 全站右下角悬浮背景音乐按钮
 */
export default function Layout({
  children,
  wide = false,
}: {
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className={cn(
        "animate-fade-in",
        wide ? "page-shell-wide" : "page-shell",
      )}
    >
      <TopTab />
      {children}
      <MusicButton />
    </div>
  );
}
