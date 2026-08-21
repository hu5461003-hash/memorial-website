import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { useContent } from "@/hooks/useContent";
import { useTheme } from "@/hooks/useTheme";
import { usePageBlocks } from "@/hooks/usePageBlocks";

/**
 * 顶部居中 Logo 栏
 * - Logo 图片优先，文字兜底，居中显示
 * - 下滑（浏览内容）时自动收起，上滑（回看）时滑出
 * - 显隐可由后台「排版 · 全局」的页头区块控制
 */
export default function TopBar() {
  const { getValue, getImage } = useContent();
  const { theme } = useTheme();
  const { sections } = usePageBlocks("global");
  const logoImage = getImage("global.logo_image");
  const logoText = getValue("global.logo_text");
  const [hidden, setHidden] = useState(false);

  // 后台「排版 · 全局」隐藏页头区块时不渲染
  const headerActive = sections.some(
    (s) =>
      s.section_type === "builtin" &&
      (s.content_data as Record<string, unknown>)?.block === "header",
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
    <header
      className="fixed inset-x-0 top-0 z-40 backdrop-blur-md transition-transform duration-300 ease-out"
      style={{
        backgroundColor: theme.nav_bg_color,
        borderBottom: `1px solid ${theme.border_color}`,
        transform: hidden ? "translateY(-100%)" : "translateY(0)",
      }}
    >
      <div className="mx-auto flex h-12 max-w-[470px] items-center justify-center px-4">
        <NavLink to="/" className="flex items-center justify-center">
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
        </NavLink>
      </div>
    </header>
  );
}
