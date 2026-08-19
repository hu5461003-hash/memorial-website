import { NavLink } from "react-router-dom";
import { Home, Map, Mail, Image, BookOpen, PenSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useContent } from "@/hooks/useContent";
import { useTheme } from "@/hooks/useTheme";

const NAV_ITEMS = [
  { to: "/", label: "首页", Icon: Home },
  { to: "/map", label: "足迹", Icon: Map },
  { to: "/posts", label: "帖子", Icon: PenSquare },
  { to: "/letter", label: "长信", Icon: BookOpen },
  { to: "/messages", label: "留言", Icon: Mail },
  { to: "/gallery", label: "相册", Icon: Image },
] as const;

/**
 * 底部固定导航栏（纯图标 + 居中 Logo）
 * - 6 个导航项纯图标显示
 * - 居中 Logo：图片优先，文字兜底
 * - 安全区域适配
 * - 颜色跟随全局主题
 */
export default function BottomTab() {
  const { getValue, getImage } = useContent();
  const { theme } = useTheme();
  const logoImage = getImage("global.logo_image");
  const logoText = getValue("global.logo_text") || "记录";

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
        {NAV_ITEMS.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "flex h-10 w-10 flex-none items-center justify-center rounded-soft transition-all",
              )
            }
            style={({ isActive }) => ({
              backgroundColor: isActive ? theme.nav_active_color : "transparent",
              color: isActive ? (theme.button_text_color || "#fff") : theme.nav_text_color,
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

      {/* 居中 Logo（绝对定位浮在导航栏上方） */}
      <div className="pointer-events-none absolute inset-x-0 -top-5 flex justify-center">
        <NavLink to="/" className="pointer-events-auto">
          {logoImage ? (
            <img
              src={logoImage}
              alt="Logo"
              className="h-12 w-12 rounded-full border-2 object-cover shadow-polaroid"
              style={{ borderColor: theme.card_color || "#fff" }}
            />
          ) : (
            <span
              className="flex h-12 w-12 items-center justify-center rounded-full border-2 text-sm font-bold shadow-polaroid"
              style={{
                backgroundColor: theme.card_color,
                borderColor: theme.border_color,
                color: theme.logo_text_color || theme.text_color,
              }}
            >
              {logoText}
            </span>
          )}
        </NavLink>
      </div>
    </nav>
  );
}
