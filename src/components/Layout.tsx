import type { ReactNode } from "react";
import BottomNav from "./BottomNav";

/**
 * 页面外壳布局
 * - 移动优先：最大宽度 480px 居中
 * - 底部留白避开导航栏
 */
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="page-shell animate-fade-in">
      {children}
      <BottomNav />
    </div>
  );
}
