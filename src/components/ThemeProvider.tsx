import { useEffect, type ReactNode } from "react";
import { useTheme } from "@/hooks/useTheme";
import { useSiteMeta } from "@/hooks/useSiteMeta";
import type { ThemeSettings } from "@/lib/types";

/** 将 ThemeSettings 写入 :root 的 CSS 变量 */
function applyThemeCSS(t: ThemeSettings) {
  const root = document.documentElement;
  root.style.setProperty("--color-bg", t.bg_color);
  root.style.setProperty("--color-text", t.text_color);
  root.style.setProperty("--color-primary", t.primary_color);
  root.style.setProperty("--color-card", t.card_color);
  root.style.setProperty("--color-border", t.border_color);
  root.style.setProperty("--font-base-size", t.base_font_size);
  root.style.setProperty("--font-heading-size", t.heading_font_size);
  root.style.setProperty("--font-family-body", t.font_family);
  // 同步 body 背景
  document.body.style.backgroundColor = t.bg_color;
  document.body.style.color = t.text_color;
  document.body.style.fontFamily = `"${t.font_family}", Georgia, serif`;
  document.body.style.fontSize = t.base_font_size;
}

/** 更新 <head> 中的 SEO meta 标签 */
function applyMetaTags(meta: Record<string, string>) {
  const setMeta = (selector: string, attr: string, value: string) => {
    let el = document.head.querySelector(selector) as HTMLElement | null;
    if (!el) {
      el = document.createElement("meta");
      const [, attrName, attrVal] = selector.match(/\[([\w-]+)="(.+?)"\]/) ?? [];
      if (attrName && attrVal) el.setAttribute(attrName, attrVal);
      document.head.appendChild(el);
    }
    el.setAttribute(attr, value);
  };

  // 标题
  if (meta.site_title) document.title = meta.site_title;

  // description
  if (meta.site_description)
    setMeta('meta[name="description"]', "content", meta.site_description);

  // keywords
  if (meta.keywords)
    setMeta('meta[name="keywords"]', "content", meta.keywords);

  // author
  if (meta.author !== undefined)
    setMeta('meta[name="author"]', "content", meta.author);

  // robots
  if (meta.robots)
    setMeta('meta[name="robots"]', "content", meta.robots);

  // favicon
  if (meta.favicon_url) {
    let link = document.head.querySelector(
      'link[rel="icon"]',
    ) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = meta.favicon_url;
  }

  // Open Graph
  if (meta.og_title)
    setMeta('meta[property="og:title"]', "content", meta.og_title);
  if (meta.og_description)
    setMeta('meta[property="og:description"]', "content", meta.og_description);
  if (meta.og_image)
    setMeta('meta[property="og:image"]', "content", meta.og_image);

  // lang
  if (meta.lang) document.documentElement.lang = meta.lang;

  // theme-color
  setMeta('meta[name="theme-color"]', "content", meta.bg_color || "#FFF5F7");
}

/**
 * 全局主题与 SEO Provider
 * 挂载时拉取 theme_settings 与 site_meta，动态注入 CSS 变量和 meta 标签。
 */
export default function ThemeProvider({ children }: { children: ReactNode }) {
  const { theme } = useTheme();
  const { meta } = useSiteMeta();

  useEffect(() => {
    applyThemeCSS(theme);
  }, [theme]);

  useEffect(() => {
    applyMetaTags(meta);
  }, [meta]);

  return <>{children}</>;
}
