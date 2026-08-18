import type { ReactNode } from "react";
import BottomNav from "./BottomNav";
import MusicButton from "./MusicButton";
import { cn } from "@/lib/utils";

/**
 * 页面外壳布局
 * - 默认移动优先（最大宽度 480px 居中）
 * - wide 模式：桌面端自动展开宽屏（管理后台用）
 * - 底部留白避开导航栏
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
      {children}
      <BottomNav />
      <MusicButton />
    </div>
  );
}
