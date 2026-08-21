import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { Menu, Home, Map, Mail, Image, Newspaper, Megaphone, ExternalLink } from "lucide-react";
import { useContent } from "@/hooks/useContent";
import { useTheme } from "@/hooks/useTheme";
import { usePageBlocks } from "@/hooks/usePageBlocks";
import { useStore } from "@/store/useStore";
import { cn } from "@/lib/utils";

/** 桌面端页头导航项（与底部导航同标签，可在后台「内容」改文字） */
const TOP_NAV = [
  { to: "/", key: "home", Icon: Home },
  { to: "/map", key: "map", Icon: Map },
  { to: "/blog", key: "blog", Icon: Newspaper },
  { to: "/messages", key: "messages", Icon: Mail },
  { to: "/gallery", key: "gallery", Icon: Image },
] as const;

/**
 * 顶部 Logo 栏
 * - 移动端：Logo 居中，左侧汉堡按钮打开侧边栏导航
 * - 桌面端：加宽容器，Logo 靠左，右侧横向导航（替代底部导航栏）
 * - Logo 图片优先，文字兜底
 * - 下滑（浏览内容）时自动收起，上滑（回看）时滑出
 * - 显隐可由后台「排版 · 全局」的页头区块控制
 */
export default function TopBar() {
  const { getValue, getImage } = useContent();
  const { theme } = useTheme();
  const { sections } = usePageBlocks("global");
  const { openSidenav } = useStore();
  const logoImage = getImage("global.logo_image");
  const logoText = getValue("global.logo_text");
  const headerSubtitle = getValue("global.header_subtitle");
  const headerBgImage = getImage("global.header_bg_image");
  const announcement = getValue("global.header_announcement");
  const headerBtnText = getValue("global.header_btn_text");
  const headerBtnUrl = getValue("global.header_btn_url");
  const [hidden, setHidden] = useState(false);

  // 后台「排版 · 全局」隐藏页头区块时不渲染
  const headerActive = sections.some(
    (s) =>
      s.section_type === "builtin" &&
      (s.content_data as Record<string, unknown>)?.block === "header",
  );

  // 桌面端横向导航与底部导航共用「底部导航」区块开关
  const navActive = sections.some(
    (s) =>
      s.section_type === "builtin" &&
      (s.content_data as Record<string, unknown>)?.block === "bottom_nav",
  );

  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        // 顶部附近始终显示；向下滚超过阈值收起，向上滚立即滑出
        if (y < 48) {
          setHidden(false);
        } else if (y > lastY + 6) {
          setHidden(true);
        } else if (y < lastY - 6) {
          setHidden(false);
        }
        lastY = y;
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!headerActive) return null;

  return (
    <>
      {/* 公告栏（页头上方） */}
      {announcement && (
        <div className="fixed inset-x-0 top-0 z-40 bg-gold/90 text-center text-[11px] font-medium text-white backdrop-blur-sm">
          <div className="mx-auto flex max-w-[470px] items-center justify-center gap-1.5 px-4 py-1 md:max-w-[760px]">
            <Megaphone className="h-3 w-3 flex-none" strokeWidth={1.8} />
            <span className="truncate">{announcement}</span>
          </div>
        </div>
      )}

      <header
        className={cn(
          "fixed inset-x-0 z-40 backdrop-blur-md transition-transform duration-300 ease-out",
          announcement ? "top-[24px]" : "top-0",
        )}
        style={{
          backgroundColor: headerBgImage ? "transparent" : theme.nav_bg_color,
          backgroundImage: headerBgImage ? `url(${headerBgImage})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
          borderBottom: `1px solid ${theme.border_color}`,
          transform: hidden ? "translateY(-100%)" : "translateY(0)",
        }}
      >
        <div className="relative mx-auto flex w-full max-w-[470px] items-center justify-center px-4 py-1.5 md:max-w-[760px] md:justify-start md:gap-4">
          {/* 汉堡按钮：打开侧边栏导航（移动端绝对定位居左） */}
          <button
            type="button"
            onClick={openSidenav}
            aria-label={getValue("global.a11y_menu")}
            className="absolute left-1.5 inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-black/5 md:static"
            style={{ color: theme.nav_text_color }}
          >
            <Menu className="h-5 w-5" strokeWidth={1.8} />
          </button>

          <NavLink
            to="/"
            className="flex flex-col items-center justify-center md:flex-none md:items-start"
          >
            {logoImage ? (
              <img
                src={logoImage}
                alt={getValue("global.a11y_logo")}
                className="h-9 w-9 rounded-full border border-cream-300 object-cover"
              />
            ) : (
              <span
                className="text-lg font-bold tracking-wide"
                style={{ color: theme.logo_text_color || theme.text_color }}
              >
                {logoText}
              </span>
            )}
            {headerSubtitle && (
              <span
                className="mt-0.5 text-[9px] tracking-wider opacity-70"
                style={{ color: theme.nav_text_color }}
              >
                {headerSubtitle}
              </span>
            )}
          </NavLink>

          {/* 桌面端横向导航（移动端隐藏，用底部导航） */}
          {navActive && (
            <nav className="ml-auto hidden items-center gap-0.5 md:flex" aria-label="主导航">
              {TOP_NAV.map(({ to, key, Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === "/"}
                  className={({ isActive }) =>
                    cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                      isActive ? "bg-black/5" : "hover:bg-black/5",
                    )
                  }
                  style={({ isActive }) => ({
                    color: isActive ? theme.nav_active_color : theme.nav_text_color,
                  })}
                >
                  <Icon className="h-4 w-4" strokeWidth={1.8} />
                  {getValue(`global.nav_${key}`)}
                </NavLink>
              ))}
              {/* 自定义按钮 */}
              {headerBtnText && headerBtnUrl && (
                <a
                  href={headerBtnUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-2 inline-flex items-center gap-1 rounded-full bg-gold px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-gold/90"
                >
                  {headerBtnText}
                  <ExternalLink className="h-3 w-3" strokeWidth={1.8} />
                </a>
              )}
            </nav>
          )}

          {/* 移动端自定义按钮 */}
          {headerBtnText && headerBtnUrl && (
            <a
              href={headerBtnUrl}
              target="_blank"
              rel="noreferrer"
              className="absolute right-1.5 inline-flex items-center gap-1 rounded-full bg-gold px-2.5 py-1 text-[10px] font-semibold text-white md:hidden"
            >
              {headerBtnText}
            </a>
          )}
        </div>
      </header>
    </>
  );
}
