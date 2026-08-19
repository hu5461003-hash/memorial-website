import { Link } from "react-router-dom";
import { Map, BookOpen, Mail, Image, PenSquare, ChevronRight } from "lucide-react";
import Layout from "@/components/Layout";
import { usePosts } from "@/hooks/usePosts";
import { useContent } from "@/hooks/useContent";
import PageBlocks from "@/components/PageBlocks";
import ContactCard from "@/components/ContactCard";
import Loading from "@/components/Loading";

const ENTRIES = [
  { to: "/map", titleKey: "home.entry_map_title", descKey: "home.entry_map_desc", Icon: Map },
  { to: "/letter", titleKey: "home.entry_letter_title", descKey: "home.entry_letter_desc", Icon: BookOpen },
  { to: "/messages", titleKey: "home.entry_messages_title", descKey: "home.entry_messages_desc", Icon: Mail },
  { to: "/gallery", titleKey: "home.entry_gallery_title", descKey: "home.entry_gallery_desc", Icon: Image },
] as const;

export default function Home() {
  const { getValue } = useContent();

  // 首页推荐帖子（仅 featured=true，不涉及私密相册任何数据）
  const { posts: featuredPosts, loading: featuredLoading, error: featuredError } = usePosts({
    onlyFeatured: true,
  });

  const featuredTitle = getValue("home.featured_title");
  const featuredMore = getValue("home.featured_more");
  const featuredEmpty = getValue("home.featured_empty");
  const footerText = getValue("home.footer");

  return (
    <Layout>
      <PageBlocks
        pageName="home"
        blocks={{
          featured_posts: (
            <section className="mb-5 mt-1">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-1.5 text-sm font-bold text-ink">
                  <PenSquare className="h-4 w-4" style={{ color: "#E1306C" }} strokeWidth={2} />
                  {featuredTitle}
                </h2>
                <Link
                  to="/posts"
                  className="inline-flex items-center gap-0.5 text-xs text-ink-soft transition-colors hover:text-coffee"
                >
                  {featuredMore}
                  <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
                </Link>
              </div>
              {featuredLoading ? (
                <div className="py-6">
                  <Loading tip="" />
                </div>
              ) : featuredError ? (
                <div className="rounded-card border border-rose-200 bg-rose-50/80 px-3 py-4 text-[11px] text-rose-600">
                  <div className="font-semibold">加载推荐帖子失败</div>
                  <div className="mt-1 break-all opacity-90">{featuredError}</div>
                </div>
              ) : featuredPosts.length === 0 ? (
                <div className="rounded-card border border-dashed border-cream-300 bg-cream-200/50 py-6 text-center text-xs text-ink-mute">
                  {featuredEmpty}
                </div>
              ) : (
                <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {featuredPosts.slice(0, 5).map((p) => (
                    <Link
                      key={p.id}
                      to={`/posts/${p.id}`}
                      className="group flex flex-none flex-col items-center gap-1.5"
                    >
                      <span
                        className="block h-[68px] w-[68px] overflow-hidden rounded-full bg-cream-100 ring-2 transition-all group-hover:ring-[#E1306C] group-active:scale-95"
                        style={{ boxShadow: "0 0 0 2px rgba(225,48,108,0.3)" }}
                      >
                        {p.cover_url ? (
                          <img
                            src={p.cover_url}
                            alt={p.title}
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-ink-mute">
                            <PenSquare className="h-5 w-5" strokeWidth={1.6} />
                          </span>
                        )}
                      </span>
                      <span className="block w-[72px] truncate text-center text-[10px] font-medium text-ink-soft group-hover:text-coffee">
                        {p.title || "(无标题)"}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          ),

          entry_cards: (
            <section className="mt-6 grid grid-cols-2 gap-3 pb-8">
              {ENTRIES.map(({ to, titleKey, descKey, Icon }, idx) => (
                <Link
                  key={to}
                  to={to}
                  className="group flex flex-col items-start gap-2 rounded-card border border-cream-300 bg-cream-200 p-4 shadow-paper transition-all hover:-translate-y-0.5 hover:shadow-ins active:scale-[0.98] animate-fade-up"
                  style={{ animationDelay: `${0.2 + idx * 0.08}s` }}
                >
                  <span
                    className="inline-flex h-9 w-9 items-center justify-center rounded-soft text-white shadow-sm transition-opacity group-hover:opacity-90"
                    style={{ background: "linear-gradient(135deg, #f09433, #dc2743, #bc1888)" }}
                  >
                    <Icon className="h-4 w-4" strokeWidth={2} />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-ink">{getValue(titleKey)}</h3>
                    <p className="mt-0.5 text-xs text-ink-soft">{getValue(descKey)}</p>
                  </div>
                </Link>
              ))}
            </section>
          ),

          contact_card: <ContactCard />,

          footer_text: footerText ? (
            <p className="pt-2 text-center text-[11px] tracking-widest text-ink-mute/70">
              {footerText}
            </p>
          ) : null,
        }}
      />
    </Layout>
  );
}
