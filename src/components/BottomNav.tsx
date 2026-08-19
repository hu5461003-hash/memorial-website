import { NavLink } from "react-router-dom";
import { Home, Map, Mail, Image, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/", label: "首页", Icon: Home, color: "#f09433" },
  { to: "/map", label: "足迹", Icon: Map, color: "#dc2743" },
  { to: "/letter", label: "长信", Icon: BookOpen, color: "#bc1888" },
  { to: "/messages", label: "留言", Icon: Mail, color: "#e1306c" },
  { to: "/gallery", label: "相册", Icon: Image, color: "#f77737" },
] as const;

/**
 * 底部固定导航栏
 * - 移动优先：固定底部，5 个入口等宽
 * - 暖金下边描线，米白半透磨砂底
 */
export default function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-coffee-line/70 bg-cream-50/85 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-[480px] items-stretch justify-around px-2">
        {NAV_ITEMS.map(({ to, label, Icon, color }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-0.5 py-2.5 text-[11px] tracking-wide transition-all",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className="h-5 w-5"
                    strokeWidth={isActive ? 2.2 : 1.6}
                    style={{ color: color, opacity: isActive ? 1 : 0.55 }}
                  />
                  <span
                    className={cn(isActive && "font-medium")}
                    style={{ color: isActive ? color : undefined }}
                  >
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
