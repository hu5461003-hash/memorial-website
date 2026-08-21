import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, FileQuestion, Loader2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import Layout from "@/components/Layout";
import PageBlocks from "@/components/PageBlocks";
import { supabase, supabaseReady } from "@/lib/supabase";
import { useContent } from "@/hooks/useContent";
import type { Blog } from "@/lib/types";

/** 日期显示：2024-05-01 → 2024 年 5 月 1 日 */
function fmtDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`;
}

/**
 * 博客列表页 /#/blog
 * - 仅展示已发布（published=true）的文章，按发布时间倒序
 * - 标题/提示等文字在后台「内容 · blog」修改
 * - 排版区块在后台「排版 · 博客」管理
 */
export default function Blog() {
  const { getValue } = useContent();
  const [blogs, setBlogs] = useState<Blog[] | null>(null);

  useEffect(() => {
    if (!supabaseReady || !supabase) {
      setBlogs([]);
      return;
    }
    supabase
      .from("blogs")
      .select("id,title,slug,excerpt,cover_url,author,published,updated_at,published_at,created_at")
      .eq("published", true)
      .order("published_at", { ascending: false, nullsFirst: false })
      .then(({ data }) => setBlogs((data as Blog[]) ?? []));
  }, []);

  const subtitle =
    blogs === null
      ? ""
      : blogs.length > 0
        ? `${blogs.length} 篇文章`
        : getValue("blog.subtitle");

  return (
    <Layout>
      <PageHeader title={getValue("blog.title")} subtitle={subtitle} showBack={false} />
      <PageBlocks
        pageName="blog"
        blocks={{
          blog_list:
            blogs === null ? (
              <div className="flex items-center justify-center gap-2 py-16 text-xs text-ink-mute">
                <Loader2 className="h-4 w-4 animate-spin" />
                {getValue("blog.loading")}
              </div>
            ) : blogs.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-ink-mute">
                <FileQuestion className="h-10 w-10" strokeWidth={1.4} />
                <p className="text-xs">{getValue("blog.empty")}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {blogs.map((b) => (
                  <Link
                    key={b.id}
                    to={`/blog/${b.slug}`}
                    className="group flex flex-col overflow-hidden rounded-card border border-cream-300 bg-cream-200 shadow-paper transition-all hover:-translate-y-0.5 hover:shadow-polaroid"
                  >
                    {b.cover_url ? (
                      <div className="aspect-video w-full overflow-hidden bg-cream-100">
                        <img
                          src={b.cover_url}
                          alt={b.title}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>
                    ) : (
                      <div className="flex aspect-video w-full items-center justify-center bg-gradient-to-br from-cream-100 to-cream-200 text-ink-mute/40">
                        <FileQuestion className="h-8 w-8" strokeWidth={1.2} />
                      </div>
                    )}
                    <div className="flex flex-1 flex-col p-3.5">
                      <h2 className="line-clamp-2 font-hand text-base leading-snug text-ink group-hover:text-coffee">
                        {b.title}
                      </h2>
                      {b.excerpt && (
                        <p className="mt-1.5 line-clamp-3 flex-1 text-xs leading-relaxed text-ink-soft/90">
                          {b.excerpt}
                        </p>
                      )}
                      <div className="mt-2.5 flex items-center justify-between text-[10px] text-ink-mute">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3" strokeWidth={1.6} />
                          {fmtDate(b.published_at ?? b.updated_at ?? b.created_at)}
                        </span>
                        <span className="text-gold opacity-0 transition-opacity group-hover:opacity-100">
                          {getValue("blog.read_more")} →
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ),
        }}
      />
    </Layout>
  );
}
