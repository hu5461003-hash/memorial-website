import { useEffect, type ReactNode } from "react";
import { useTheme } from "@/hooks/useTheme";

/**
 * 全局主题 Provider
 * 挂载时拉取 theme_settings 并写入 :root CSS 变量。
 * SEO meta 标签由 RouteMeta 按路由统一应用。
 */
export default function ThemeProvider({ children }: { children: ReactNode }) {
  const { theme } = useTheme();

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--theme-bg", theme.bg_color);
    root.style.setProperty("--theme-text", theme.text_color);
    root.style.setProperty("--theme-primary", theme.primary_color);
    root.style.setProperty("--theme-card", theme.card_color);
    root.style.setProperty("--theme-border", theme.border_color);
    root.style.setProperty("--theme-nav-bg", theme.nav_bg_color);
    root.style.setProperty("--theme-nav-text", theme.nav_text_color);
    root.style.setProperty("--theme-nav-active", theme.nav_active_color);
    root.style.setProperty("--theme-logo-text", theme.logo_text_color);
    root.style.setProperty("--theme-btn-bg", theme.button_bg_color);
    root.style.setProperty("--theme-btn-text", theme.button_text_color);
    document.body.style.backgroundColor = theme.bg_color;
    document.body.style.color = theme.text_color;
    document.body.style.fontFamily = theme.font_family;
    document.body.style.fontSize = theme.base_font_size;
  }, [theme]);

  return <>{children}</>;
}
