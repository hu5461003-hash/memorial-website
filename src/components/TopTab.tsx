import { NavLink } from "react-router-dom";
import { Home, Map, Mail, Image, BookOpen, PenSquare } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/", label: "首页", Icon: Home },
  { to: "/map", label: "足迹", Icon: Map },
  { to: "/letter", label: "长信", Icon: BookOpen },
  { to: "/messages", label: "留言", Icon: Mail },
  { to: "/posts", label: "帖子", Icon: PenSquare },
  { to: "/gallery", label: "相册", Icon: Image },
] as const;

/**
 * 顶部固定 Tab 栏（Ins 风）
 * - 替代原 BottomNav
 * - 白底+底部浅灰边框+毛玻璃
 * - 移动端：左 logo + 5 icon 平分右半
 * - 桌面端：左 logo + 5 个文字 Tab
 */
export default function TopTab() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-cream-300 bg-cream-200/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[470px] items-center justify-between px-4 md:max-w-[935px]">
        {/* 左侧 Logo：Ins 渐变文字 */}
        <NavLink to="/" className="flex-none">
          <span className="ins-gradient-text text-xl font-bold tracking-tight">
            记录
          </span>
        </NavLink>

        {/* 右侧导航 */}
        <nav className="flex items-center gap-1 sm:gap-2">
          {NAV_ITEMS.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex items-center justify-center rounded-soft px-3 py-1.5 transition-all",
                  isActive
                    ? "text-gold"
                    : "text-ink-soft hover:text-ink hover:bg-cream-100",
                )
              }
            >
              {({ isActive }) => (
                <span className="flex items-center gap-1.5">
                  <Icon
                    className="h-5 w-5"
                    strokeWidth={isActive ? 2.4 : 1.6}
                  />
                  {/* 桌面端显示文字 */}
                  <span
                    className={cn(
                      "hidden text-xs sm:inline",
                      isActive && "font-semibold",
                    )}
                  >
                    {label}
                  </span>
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
