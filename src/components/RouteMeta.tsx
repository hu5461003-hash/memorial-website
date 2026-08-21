import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useSiteMeta } from "@/hooks/useSiteMeta";

/** 静态路径 → 页面标识（其余路径取第一段作为自定义页面名） */
const PAGE_BY_PATH: Record<string, string> = {
  "/": "home",
  "/map": "map",
  "/messages": "messages",
  "/gallery": "gallery",
};

function setMetaTag(selector: string, attr: string, value: string) {
  let el = document.head.querySelector(selector) as HTMLElement | null;
  if (!el) {
    el = document.createElement("meta");
    const [, attrName, attrVal] = selector.match(/\[([\w-]+)="(.+?)"\]/) ?? [];
    if (attrName && attrVal) el.setAttribute(attrName, attrVal);
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
}

/**
 * 路由级 SEO：根据当前页面应用标题 / 描述 / 关键词 / 分享卡片。
 * - 全站默认值取 site_meta（site_title / site_description / og_* …）
 * - 每页可覆盖：site_meta 中 seo.<页面>.title / .description / .keywords / .canonical / .og_image
 *   （后台「SEO · 每页 SEO」编辑）
 */
export default function RouteMeta() {
  const { meta } = useSiteMeta();
  const { pathname } = useLocation();

  useEffect(() => {
    const seg = pathname.split("/").filter(Boolean)[0] ?? "";
    const page = seg ? (PAGE_BY_PATH[`/${seg}`] ?? seg) : "home";
    const p = (field: string) => meta[`seo.${page}.${field}`] || "";

    // 标题：每页 > 全站
    document.title = p("title") || meta.site_title || document.title;

    // 描述
    const desc = p("description") || meta.site_description;
    if (desc) setMetaTag('meta[name="description"]', "content", desc);

    // 关键词
    const kw = p("keywords") || meta.keywords;
    if (kw) setMetaTag('meta[name="keywords"]', "content", kw);
    else {
      document.head.querySelector('meta[name="keywords"]')?.remove();
    }

    // 作者 / robots
    if (meta.author !== undefined) setMetaTag('meta[name="author"]', "content", meta.author);
    if (meta.robots) setMetaTag('meta[name="robots"]', "content", meta.robots);

    // favicon
    if (meta.favicon_url) {
      let link = document.head.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = meta.favicon_url;
    }

    // Open Graph（每页标题/描述/封面优先）
    const ogTitle = p("title") || meta.og_title || meta.site_title;
    const ogDesc = p("description") || meta.og_description || meta.site_description;
    const ogImage = p("og_image") || meta.og_image;
    if (ogTitle) setMetaTag('meta[property="og:title"]', "content", ogTitle);
    if (ogDesc) setMetaTag('meta[property="og:description"]', "content", ogDesc);
    if (ogImage) setMetaTag('meta[property="og:image"]', "content", ogImage);
    setMetaTag('meta[property="og:type"]', "content", "website");

    // 规范链接（每页可设置）
    const canonical = p("canonical");
    let link = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (canonical) {
      if (!link) {
        link = document.createElement("link");
        link.rel = "canonical";
        document.head.appendChild(link);
      }
      link.href = canonical;
    } else {
      link?.remove();
    }

    // 语言 / theme-color
    if (meta.lang) document.documentElement.lang = meta.lang;
    setMetaTag('meta[name="theme-color"]', "content", meta.bg_color || "#FFF5F7");
  }, [meta, pathname]);

  return null;
}
