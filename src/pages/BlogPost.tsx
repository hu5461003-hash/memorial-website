import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ChevronLeft, Calendar, User, FileQuestion, Loader2 } from "lucide-react";
import Layout from "@/components/Layout";
import { supabase, supabaseReady } from "@/lib/supabase";
import { useContent } from "@/hooks/useContent";
import { useSiteMeta } from "@/hooks/useSiteMeta";
import type { Blog } from "@/lib/types";

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`;
}

function setMeta(selector: string, attr: string, value: string) {
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
 * 博客详情页 /#/blog/:slug
 * - 渲染后台发布的 HTML 正文（富文本/源码两种写法产出同一格式）
 * - SEO 优先用文章自身的 meta_title / meta_description / keywords / 封面
 */
export default function BlogPost() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { getValue } = useContent();
  const { meta } = useSiteMeta();
  const [state, setState] = useState<"loading" | "missing" | "ok">("loading");
  const [blog, setBlog] = useState<Blog | null>(null);

  useEffect(() => {
    if (!slug) {
      setState("missing");
      return;
    }
    if (!supabaseReady || !supabase) {
      setState("missing");
      return;
    }
    setState("loading");
    supabase
      .from("blogs")
      .select("*")
      .eq("slug", slug)
      .eq("published", true)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setBlog(data as Blog);
          setState("ok");
        } else {
          setBlog(null);
          setState("missing");
        }
      });
  }, [slug]);

  // 文章级 SEO：覆盖路由默认 meta
  useEffect(() => {
    if (state !== "ok" || !blog) return;
    document.title = blog.meta_title || blog.title || meta.site_title || document.title;
    const desc = blog.meta_description || blog.excerpt || meta.site_description;
    if (desc) setMeta('meta[name="description"]', "content", desc);
    if (blog.keywords) setMeta('meta[name="keywords"]', "content", blog.keywords);
    const ogTitle = blog.meta_title || blog.title || meta.og_title || meta.site_title;
    if (ogTitle) setMeta('meta[property="og:title"]', "content", ogTitle);
    if (desc) setMeta('meta[property="og:description"]', "content", desc);
    if (blog.cover_url) setMeta('meta[property="og:image"]', "content", blog.cover_url);
    setMeta('meta[property="og:type"]', "content", "article");
    let canonical = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = `${location.origin}${location.pathname}#/blog/${blog.slug}`;
    window.scrollTo(0, 0);
  }, [state, blog, meta.site_title, meta.site_description, meta.og_title]);

  if (state === "loading") {
    return (
      <Layout>
        <div className="flex items-center justify-center gap-2 py-20 text-xs text-ink-mute">
          <Loader2 className="h-4 w-4 animate-spin" />
          {getValue("blog.loading")}
        </div>
      </Layout>
    );
  }

  if (state === "missing" || !blog) {
    return (
      <Layout>
        <div className="flex flex-col items-center gap-3 py-20 text-ink-mute">
          <FileQuestion className="h-10 w-10" strokeWidth={1.4} />
          <p className="text-xs">{getValue("blog.not_found")}</p>
          <Link to="/blog" className="btn-gold mt-2 !py-1.5 text-xs">
            {getValue("blog.back_list")}
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <article className="mx-auto pb-4">
        <button
          type="button"
          onClick={() => navigate("/blog")}
          className="mb-4 inline-flex items-center gap-1 text-xs text-ink-soft transition-colors hover:text-coffee"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.8} />
          {getValue("blog.back_list")}
        </button>

        <header className="mb-5">
          <h1 className="font-hand text-2xl leading-snug text-ink">{blog.title}</h1>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ink-mute">
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3 w-3" strokeWidth={1.6} />
              {fmtDate(blog.published_at ?? blog.updated_at)}
            </span>
            {blog.author && (
              <span className="inline-flex items-center gap-1">
                <User className="h-3 w-3" strokeWidth={1.6} />
                {getValue("blog.author_prefix")}{blog.author}
              </span>
            )}
          </div>
        </header>

        {blog.cover_url && (
          <img
            src={blog.cover_url}
            alt={blog.title}
            className="mb-5 w-full rounded-card border border-cream-300 object-cover shadow-paper"
          />
        )}

        <div
          className="blog-content text-sm leading-[1.9] text-ink-soft"
          dangerouslySetInnerHTML={{ __html: blog.content }}
        />
      </article>
    </Layout>
  );
}
