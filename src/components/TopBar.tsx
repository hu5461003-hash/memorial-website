import { NavLink } from "react-router-dom";
import { useContent } from "@/hooks/useContent";
import { useTheme } from "@/hooks/useTheme";

/**
 * 顶部居中 Logo 栏
 * - Logo 图片优先，文字兜底
 * - 无圆圈包裹，直接展示
 * - 居中显示
 */
export default function TopBar() {
  const { getValue, getImage } = useContent();
  const { theme } = useTheme();
  const logoImage = getImage("global.logo_image");
  const logoText = getValue("global.logo_text") || "记录";

  return (
    <header
      className="fixed inset-x-0 top-0 z-40 backdrop-blur-md"
      style={{
        backgroundColor: theme.nav_bg_color,
        borderBottom: `1px solid ${theme.border_color}`,
      }}
    >
      <div className="mx-auto flex h-12 max-w-[470px] items-center justify-center px-4">
        <NavLink to="/" className="flex items-center justify-center">
          {logoImage ? (
            <img
              src={logoImage}
              alt="Logo"
              className="h-8 object-contain"
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
