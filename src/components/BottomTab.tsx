import { NavLink } from "react-router-dom";
import { Home, Map, Mail, Image, BookOpen, PenSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useContent } from "@/hooks/useContent";
import { useTheme } from "@/hooks/useTheme";

const NAV_ITEMS = [
  { to: "/", label: "首页", Icon: Home, color: "#E1306C" },
  { to: "/map", label: "足迹", Icon: Map, color: "#F5853F" },
  { to: "/posts", label: "帖子", Icon: PenSquare, color: "#833AB4" },
  { to: "/letter", label: "长信", Icon: BookOpen, color: "#FCAF45" },
  { to: "/messages", label: "留言", Icon: Mail, color: "#C13584" },
  { to: "/gallery", label: "相册", Icon: Image, color: "#F77737" },
] as const;

/**
 * 底部固定导航栏（彩色图标）
 * - 6 个导航项，每项对应一个 Ins 品牌色
 * - 激活时图标变彩色，未激活时为灰色
 */
export default function BottomTab() {
  const { theme } = useTheme();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur-md"
      style={{
        backgroundColor: theme.nav_bg_color,
        borderColor: theme.border_color,
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="mx-auto flex h-14 max-w-[470px] items-center justify-between px-3">
        {NAV_ITEMS.map(({ to, label, Icon, color }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "flex h-10 w-10 flex-none items-center justify-center rounded-soft transition-all",
                isActive ? "scale-110" : "hover:scale-105",
              )
            }
            style={({ isActive }) => ({
              color: isActive ? color : theme.nav_text_color,
            })}
            aria-label={label}
            title={label}
          >
            {({ isActive }) => (
              <Icon
                className="h-5 w-5"
                strokeWidth={isActive ? 2.4 : 1.6}
              />
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
