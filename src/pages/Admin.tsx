import { useEffect, useState, useCallback } from "react";
import {
  LogOut,
  Lock,
  Mail,
  AlertCircle,
  MapPinned,
  Image as ImageIcon,
  FileText,
  Film,
  LayoutGrid,
  Palette,
  Search,
  LayoutDashboard,
  Loader2,
  FolderOpen,
  Contact,
  PenSquare,
  Menu,
  X,
  ExternalLink,
  LogIn,
  StickyNote,
  Newspaper,
} from "lucide-react";
import Loading from "@/components/Loading";
import FootprintManager from "@/components/admin/FootprintManager";
import PhotoManager from "@/components/admin/PhotoManager";
import ContentManager from "@/components/admin/ContentManager";
import VideoManager from "@/components/admin/VideoManager";
import SectionManager from "@/components/admin/SectionManager";
import ThemeManager from "@/components/admin/ThemeManager";
import SeoManager from "@/components/admin/SeoManager";
import MediaLibrary from "@/components/admin/MediaLibrary";
import ContactManager from "@/components/admin/ContactManager";
import PostManager from "@/components/admin/PostManager";
import MessageManager from "@/components/admin/MessageManager";
import BlogManager from "@/components/admin/BlogManager";
import NavLinkManager from "@/components/admin/NavLinkManager";
import { supabase, supabaseReady } from "@/lib/supabase";
import { useStore } from "@/store/useStore";
import { cn } from "@/lib/utils";

type Tab =
  | "dashboard"
  | "footprint"
  | "photo"
  | "content"
  | "video"
  | "sections"
  | "theme"
  | "seo"
  | "media"
  | "contact"
  | "post"
  | "message"
  | "blog"
  | "nav";

type NavItemDef = {
  key: Exclude<Tab, "dashboard">;
  label: string;
  desc: string;
  Icon: typeof MapPinned;
};

/** Shopify 风分组导航 */
const NAV_GROUPS: { title: string; items: NavItemDef[] }[] = [
  {
    title: "内容",
    items: [
      { key: "content", label: "内容", desc: "各页面文字、图片与 Logo", Icon: FileText },
      { key: "sections", label: "排版", desc: "页面组件显隐与排序", Icon: LayoutGrid },
      { key: "post", label: "帖子", desc: "帖子管理与推荐到首页", Icon: PenSquare },
      { key: "blog", label: "博客", desc: "撰写与管理博客文章", Icon: Newspaper },
      { key: "message", label: "留言", desc: "访客留言查看与管理", Icon: StickyNote },
    ],
  },
  {
    title: "媒体",
    items: [
      { key: "photo", label: "相册", desc: "照片上传与文件夹管理", Icon: ImageIcon },
      { key: "video", label: "视频", desc: "视频上传与文件夹管理", Icon: Film },
      { key: "media", label: "素材库", desc: "通用照片视频素材与链接", Icon: FolderOpen },
      { key: "footprint", label: "足迹", desc: "地图节点与故事", Icon: MapPinned },
    ],
  },
  {
    title: "配置",
    items: [
      { key: "theme", label: "主题", desc: "全站配色与字体", Icon: Palette },
      { key: "seo", label: "SEO", desc: "网站标题与搜索引擎", Icon: Search },
      { key: "nav", label: "导航", desc: "页头侧边栏菜单项管理", Icon: Menu },
      { key: "contact", label: "联系方式", desc: "管理员 QQ/微信/头像", Icon: Contact },
    ],
  },
];

const ALL_NAV_ITEMS: NavItemDef[] = NAV_GROUPS.flatMap((g) => g.items);

/** 后台固定主题变量：不受前台 ThemeManager 影响，保证后台始终清爽可读 */
const ADMIN_THEME_VARS: React.CSSProperties = {
  "--theme-bg": "#FAFAFA",
  "--theme-text": "#1A1A1A",
  "--theme-primary": "#1A1A1A",
  "--theme-card": "#FFFFFF",
  "--theme-border": "#E5E5E5",
  "--theme-nav-bg": "#FFFFFF",
  "--theme-nav-text": "#666666",
  "--theme-nav-active": "#1A1A1A",
  "--theme-logo-text": "#1A1A1A",
  "--theme-btn-bg": "#1A1A1A",
  "--theme-btn-text": "#FFFFFF",
} as React.CSSProperties;

export default function Admin() {
  const { session, setSession } = useStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("dashboard");
  const [checking, setChecking] = useState(true);
  const [navOpen, setNavOpen] = useState(false);
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const t = setTimeout(() => setChecking(false), 400);
    return () => clearTimeout(t);
  }, []);

  const loadCounts = useCallback(async () => {
    if (!supabase) return;
    const [photos, footprints, videos, sections, content, media, posts, messages, blogs, navs] = await Promise.all([
      supabase.from("photos").select("id", { count: "exact", head: true }),
      supabase.from("footprints").select("id", { count: "exact", head: true }),
      supabase.from("videos").select("id", { count: "exact", head: true }),
      supabase.from("page_sections").select("id", { count: "exact", head: true }),
      supabase.from("site_content").select("id", { count: "exact", head: true }),
      supabase.from("media_library").select("id", { count: "exact", head: true }),
      supabase.from("posts").select("id", { count: "exact", head: true }),
      supabase.from("messages").select("id", { count: "exact", head: true }),
      supabase.from("blogs").select("id", { count: "exact", head: true }),
      supabase.from("nav_links").select("id", { count: "exact", head: true }),
    ]);
    setCounts({
      photo: photos.count ?? 0,
      footprint: footprints.count ?? 0,
      video: videos.count ?? 0,
      sections: sections.count ?? 0,
      content: content.count ?? 0,
      media: media.count ?? 0,
      post: posts.count ?? 0,
      message: messages.count ?? 0,
      blog: blogs.count ?? 0,
      nav: navs.count ?? 0,
    });
  }, []);

  useEffect(() => {
    if (session) loadCounts();
  }, [session, loadCounts]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!supabaseReady || !supabase) {
      setErr("Supabase 尚未配置，无法登录");
      return;
    }
    setBusy(true);
    setErr(null);
    const { error, data } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setSession(data.session);
  }

  async function handleLogout() {
    if (supabase) await supabase.auth.signOut();
    setSession(null);
    setTab("dashboard");
  }

  function switchTab(t: Tab) {
    setTab(t);
    setNavOpen(false);
    if (t === "dashboard") loadCounts();
  }

  /* ========== 未配置完成 / 校验中 ========== */
  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream-100" style={ADMIN_THEME_VARS}>
        <Loading tip="正在确认身份…" />
      </div>
    );
  }

  /* ========== 登录页 ========== */
  if (!session) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-cream-100 px-4"
        style={ADMIN_THEME_VARS}
      >
        <div className="w-full max-w-sm animate-fade-up rounded-card border border-cream-300 bg-cream-200 p-7 shadow-paper">
          <div className="mb-6 flex flex-col items-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-soft bg-cream-100">
              <span className="ins-gradient-text text-2xl font-bold">Z</span>
            </div>
            <h1 className="mt-3 text-lg font-bold text-ink">管理后台</h1>
            <p className="mt-1 text-xs text-ink-mute">仅限管理员登录</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="field-label">邮箱</label>
              <div className="flex items-center gap-2 rounded-soft border border-cream-300 bg-cream-50 px-3">
                <Mail className="h-4 w-4 flex-none text-ink-mute" strokeWidth={1.6} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  autoComplete="email"
                  className="w-full border-0 bg-transparent py-2.5 text-sm text-ink placeholder:text-ink-mute focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="field-label">密码</label>
              <div className="flex items-center gap-2 rounded-soft border border-cream-300 bg-cream-50 px-3">
                <Lock className="h-4 w-4 flex-none text-ink-mute" strokeWidth={1.6} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full border-0 bg-transparent py-2.5 text-sm text-ink placeholder:text-ink-mute focus:outline-none"
                />
              </div>
            </div>
            {err && (
              <div className="flex items-center gap-1.5 rounded-soft bg-rust/10 px-3 py-2 text-xs text-rust">
                <AlertCircle className="h-3.5 w-3.5 flex-none" strokeWidth={1.8} />
                {err}
              </div>
            )}
            <button type="submit" disabled={busy} className="btn-gold w-full">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" strokeWidth={1.8} />}
              {busy ? "登录中…" : "登录"}
            </button>
          </form>

          {!supabaseReady && (
            <p className="mt-5 text-center text-[11px] leading-relaxed text-ink-mute">
              提示：当前未配置 Supabase，登录功能不可用。请在仓库 Secrets 中配置
              VITE_SUPABASE_URL 与 VITE_SUPABASE_ANON_KEY。
            </p>
          )}
        </div>
      </div>
    );
  }

  const activeNav = ALL_NAV_ITEMS.find((i) => i.key === tab);
  const pageTitle = tab === "dashboard" ? "概览" : (activeNav?.label ?? "管理");
  const pageDesc = tab === "dashboard" ? "站点数据与快捷入口" : (activeNav?.desc ?? "");

  /* ========== 主框架：左侧边栏 + 右侧内容 ========== */
  return (
    <div className="min-h-screen bg-cream-100" style={ADMIN_THEME_VARS}>
      {/* 移动端遮罩 */}
      {navOpen && (
        <div
          className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-[2px] lg:hidden"
          onClick={() => setNavOpen(false)}
        />
      )}

      <div className="flex">
        {/* ========== 侧边栏 ========== */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-cream-300 bg-cream-200 transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
            navOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          {/* 品牌区 */}
          <div className="flex h-14 flex-none items-center gap-2.5 border-b border-cream-300 px-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-soft ins-gradient-soft">
              <span className="text-sm font-bold text-white">Z</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">管理后台</p>
              <p className="truncate text-[10px] text-ink-mute">Zap 站点控制台</p>
            </div>
            <button
              type="button"
              onClick={() => setNavOpen(false)}
              aria-label="关闭菜单"
              className="rounded-soft p-1.5 text-ink-soft hover:bg-cream-100 lg:hidden"
            >
              <X className="h-4 w-4" strokeWidth={1.8} />
            </button>
          </div>

          {/* 导航 */}
          <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
            <button
              type="button"
              onClick={() => switchTab("dashboard")}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-soft px-3 py-2 text-sm transition-colors",
                tab === "dashboard"
                  ? "bg-cream-100 font-semibold text-ink shadow-soft"
                  : "font-medium text-ink-soft hover:bg-cream-100/70 hover:text-ink",
              )}
            >
              <LayoutDashboard
                className={cn("h-4 w-4", tab === "dashboard" ? "text-gold" : "text-ink-mute")}
                strokeWidth={1.8}
              />
              概览
            </button>

            {NAV_GROUPS.map((group) => (
              <div key={group.title}>
                <p className="mb-1.5 px-3 text-[10px] font-semibold tracking-wider text-ink-mute">
                  {group.title}
                </p>
                <div className="space-y-0.5">
                  {group.items.map(({ key, label, Icon }) => {
                    const active = tab === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => switchTab(key)}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-soft px-3 py-2 text-sm transition-colors",
                          active
                            ? "bg-cream-100 font-semibold text-ink shadow-soft"
                            : "font-medium text-ink-soft hover:bg-cream-100/70 hover:text-ink",
                        )}
                      >
                        <Icon
                          className={cn("h-4 w-4 flex-none", active ? "text-gold" : "text-ink-mute")}
                          strokeWidth={1.8}
                        />
                        <span className="flex-1 text-left">{label}</span>
                        {counts[key] !== undefined && (
                          <span className="text-[10px] text-ink-mute">{counts[key]}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* 底部用户区 */}
          <div className="flex-none border-t border-cream-300 p-3">
            <div className="flex items-center gap-2.5 rounded-soft bg-cream-100 p-2.5">
              <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-ink text-xs font-semibold uppercase text-white">
                {session.user.email?.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-ink">{session.user.email}</p>
                <p className="text-[10px] text-ink-mute">管理员</p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                aria-label="退出登录"
                title="退出登录"
                className="flex-none rounded-soft p-1.5 text-ink-soft transition-colors hover:bg-rust/10 hover:text-rust"
              >
                <LogOut className="h-3.5 w-3.5" strokeWidth={1.8} />
              </button>
            </div>
          </div>
        </aside>

        {/* ========== 主内容区 ========== */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* 顶栏 */}
          <header className="sticky top-0 z-30 flex h-14 flex-none items-center gap-3 border-b border-cream-300 bg-cream-200/95 px-4 backdrop-blur sm:px-6">
            <button
              type="button"
              onClick={() => setNavOpen(true)}
              aria-label="打开菜单"
              className="rounded-soft p-1.5 text-ink-soft hover:bg-cream-100 lg:hidden"
            >
              <Menu className="h-5 w-5" strokeWidth={1.8} />
            </button>
            <h1 className="truncate text-base font-semibold text-ink">{pageTitle}</h1>
            <div className="ml-auto flex items-center gap-2">
              <a
                href="/#/"
                target="_blank"
                rel="noreferrer"
                className="btn-ghost !px-3 !py-1.5 text-xs"
              >
                <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.8} />
                <span className="hidden sm:inline">查看前台</span>
              </a>
              <button type="button" onClick={handleLogout} className="btn-ghost !px-3 !py-1.5 text-xs">
                <LogOut className="h-3.5 w-3.5" strokeWidth={1.8} />
                <span className="hidden sm:inline">退出</span>
              </button>
            </div>
          </header>

          {/* 内容 */}
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6">
            {tab === "dashboard" ? (
              <DashboardView
                email={session.user.email ?? ""}
                counts={counts}
                onGo={switchTab}
              />
            ) : (
              <div className="animate-fade-in">
                {pageDesc && (
                  <p className="mb-4 text-xs text-ink-mute">{pageDesc}</p>
                )}
                {tab === "content" && <ContentManager />}
                {tab === "sections" && <SectionManager />}
                {tab === "theme" && <ThemeManager />}
                {tab === "seo" && <SeoManager />}
                {tab === "footprint" && <FootprintManager />}
                {tab === "photo" && <PhotoManager />}
                {tab === "video" && <VideoManager />}
                {tab === "media" && <MediaLibrary />}
                {tab === "contact" && <ContactManager />}
                {tab === "post" && <PostManager />}
                {tab === "message" && <MessageManager />}
                {tab === "blog" && <BlogManager />}
                {tab === "nav" && <NavLinkManager />}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

/* ===================== 概览页 ===================== */
function DashboardView({
  email,
  counts,
  onGo,
}: {
  email: string;
  counts: Record<string, number>;
  onGo: (t: Tab) => void;
}) {
  const today = new Date().toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return (
    <div className="animate-fade-in space-y-5">
      {/* 欢迎卡片 */}
      <section className="rounded-card border border-cream-300 bg-cream-200 p-5 shadow-paper">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-ink">欢迎回来</h2>
            <p className="mt-1 text-xs text-ink-soft">{email} · {today}</p>
          </div>
          <div className="flex items-center gap-2">
            <a href="/#/" target="_blank" rel="noreferrer" className="btn-ghost !py-2 text-xs">
              <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.8} />
              查看前台
            </a>
            <button type="button" onClick={() => onGo("theme")} className="btn-gold !py-2 text-xs">
              <Palette className="h-3.5 w-3.5" strokeWidth={1.8} />
              快捷换肤
            </button>
          </div>
        </div>
      </section>

      {/* 统计网格 */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {ALL_NAV_ITEMS.map(({ key, label, desc, Icon }) => {
          const count = counts[key];
          return (
            <button
              key={key}
              type="button"
              onClick={() => onGo(key)}
              className="group rounded-card border border-cream-300 bg-cream-200 p-4 text-left shadow-paper transition-all hover:-translate-y-0.5 hover:shadow-polaroid"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-8 w-8 items-center justify-center rounded-soft bg-cream-100 text-ink-soft transition-colors group-hover:text-gold">
                  <Icon className="h-4 w-4" strokeWidth={1.8} />
                </div>
                {count !== undefined && (
                  <span className="text-xl font-bold text-ink">{count}</span>
                )}
              </div>
              <p className="mt-3 text-sm font-semibold text-ink">{label}</p>
              <p className="mt-0.5 text-[10px] leading-snug text-ink-mute">{desc}</p>
            </button>
          );
        })}
      </section>

      {/* 快捷操作 */}
      <section className="rounded-card border border-cream-300 bg-cream-200 p-5 shadow-paper">
        <h3 className="mb-3 text-sm font-semibold text-ink">快捷操作</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <button type="button" onClick={() => onGo("photo")} className="btn-ghost !py-2.5 text-xs">
            <ImageIcon className="h-3.5 w-3.5" strokeWidth={1.8} />
            上传照片
          </button>
          <button type="button" onClick={() => onGo("video")} className="btn-ghost !py-2.5 text-xs">
            <Film className="h-3.5 w-3.5" strokeWidth={1.8} />
            上传视频
          </button>
          <button type="button" onClick={() => onGo("content")} className="btn-ghost !py-2.5 text-xs">
            <FileText className="h-3.5 w-3.5" strokeWidth={1.8} />
            改页面文字
          </button>
          <button type="button" onClick={() => onGo("sections")} className="btn-ghost !py-2.5 text-xs">
            <LayoutGrid className="h-3.5 w-3.5" strokeWidth={1.8} />
            调整排版
          </button>
        </div>
      </section>
    </div>
  );
}
