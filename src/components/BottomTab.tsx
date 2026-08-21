import { NavLink } from "react-router-dom";
import { Home, Map, Mail, Image, Newspaper } from "lucide-react";
import { cn } from "@/lib/utils";
import { useContent } from "@/hooks/useContent";
import { useTheme } from "@/hooks/useTheme";
import { usePageBlocks } from "@/hooks/usePageBlocks";

const NAV_ITEMS = [
  { to: "/", key: "home", Icon: Home, color: "#E1306C" },
  { to: "/map", key: "map", Icon: Map, color: "#F5853F" },
  { to: "/blog", key: "blog", Icon: Newspaper, color: "#833AB4" },
  { to: "/messages", key: "messages", Icon: Mail, color: "#C13584" },
  { to: "/gallery", key: "gallery", Icon: Image, color: "#F77737" },
] as const;

/**
 * 底部固定导航栏（彩色图标，仅移动端显示；桌面端由页头横向导航替代）
 * - 6 个导航项，每项对应一个 Ins 品牌色，激活时图标变彩色
 * - 标签文字可在后台「内容」修改（global.nav_*）
 * - 显隐由后台「排版 · 全局」的底部导航区块控制
 */
export default function BottomTab() {
  const { theme } = useTheme();
  const { getValue } = useContent();
  const { sections } = usePageBlocks("global");

  const navActive = sections.some(
    (s) =>
      s.section_type === "builtin" &&
      (s.content_data as Record<string, unknown>)?.block === "bottom_nav",
  );
  if (!navActive) return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur-md md:hidden"
      style={{
        backgroundColor: theme.nav_bg_color,
        borderColor: theme.border_color,
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="mx-auto flex h-14 max-w-[470px] items-center justify-between px-3">
        {NAV_ITEMS.map(({ to, key, Icon, color }) => {
          const label = getValue(`global.nav_${key}`);
          return (
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
                color: isActive ? color : "#111111",
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
          );
        })}
      </div>
    </nav>
  );
}
