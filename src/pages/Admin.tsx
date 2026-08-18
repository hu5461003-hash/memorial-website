import { useEffect, useState, useCallback } from "react";
import {
  LogOut,
  Lock,
  Mail,
  AlertCircle,
  MapPinned,
  Image as ImageIcon,
  ImagePlus,
  FileText,
  Film,
  LayoutGrid,
  Palette,
  Search,
  ChevronLeft,
  LayoutDashboard,
  Loader2,
  FolderOpen,
  Contact,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import Layout from "@/components/Layout";
import Loading from "@/components/Loading";
import FootprintManager from "@/components/admin/FootprintManager";
import PhotoManager from "@/components/admin/PhotoManager";
import BannerManager from "@/components/admin/BannerManager";
import ContentManager from "@/components/admin/ContentManager";
import VideoManager from "@/components/admin/VideoManager";
import SectionManager from "@/components/admin/SectionManager";
import ThemeManager from "@/components/admin/ThemeManager";
import SeoManager from "@/components/admin/SeoManager";
import MediaLibrary from "@/components/admin/MediaLibrary";
import ContactManager from "@/components/admin/ContactManager";
import { supabase, supabaseReady } from "@/lib/supabase";
import { useStore } from "@/store/useStore";
import { cn } from "@/lib/utils";

type Tab =
  | "dashboard"
  | "footprint"
  | "photo"
  | "banner"
  | "content"
  | "video"
  | "sections"
  | "theme"
  | "seo"
  | "media"
  | "contact";

type CardDef = {
  key: Exclude<Tab, "dashboard">;
  label: string;
  desc: string;
  Icon: typeof MapPinned;
  gradient: string;
  iconBg: string;
};

const CARDS: CardDef[] = [
  {
    key: "banner",
    label: "Banner",
    desc: "首页轮播图管理",
    Icon: ImagePlus,
    gradient: "from-rose-50 to-pink-100",
    iconBg: "bg-rose-100 text-rose-500",
  },
  {
    key: "content",
    label: "内容",
    desc: "各页面文字与图片",
    Icon: FileText,
    gradient: "from-amber-50 to-orange-100",
    iconBg: "bg-amber-100 text-amber-600",
  },
  {
    key: "sections",
    label: "排版",
    desc: "动态组件与自由排版",
    Icon: LayoutGrid,
    gradient: "from-violet-50 to-purple-100",
    iconBg: "bg-violet-100 text-violet-500",
  },
  {
    key: "theme",
    label: "主题",
    desc: "全站配色与字体",
    Icon: Palette,
    gradient: "from-fuchsia-50 to-pink-100",
    iconBg: "bg-fuchsia-100 text-fuchsia-500",
  },
  {
    key: "seo",
    label: "SEO",
    desc: "网站标题与搜索引擎",
    Icon: Search,
    gradient: "from-sky-50 to-blue-100",
    iconBg: "bg-sky-100 text-sky-500",
  },
  {
    key: "footprint",
    label: "足迹",
    desc: "地图节点与故事",
    Icon: MapPinned,
    gradient: "from-emerald-50 to-teal-100",
    iconBg: "bg-emerald-100 text-emerald-600",
  },
  {
    key: "photo",
    label: "相册",
    desc: "照片上传与管理",
    Icon: ImageIcon,
    gradient: "from-orange-50 to-amber-100",
    iconBg: "bg-orange-100 text-orange-500",
  },
  {
    key: "video",
    label: "视频",
    desc: "视频上传与管理",
    Icon: Film,
    gradient: "from-indigo-50 to-blue-100",
    iconBg: "bg-indigo-100 text-indigo-500",
  },
  {
    key: "media",
    label: "素材库",
    desc: "照片视频素材与链接",
    Icon: FolderOpen,
    gradient: "from-teal-50 to-cyan-100",
    iconBg: "bg-teal-100 text-teal-600",
  },
  {
    key: "contact",
    label: "联系方式",
    desc: "管理员QQ/微信/头像",
    Icon: Contact,
    gradient: "from-lime-50 to-emerald-100",
    iconBg: "bg-lime-100 text-lime-600",
  },
];

export default function Admin() {
  const { session, setSession } = useStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("dashboard");
  const [checking, setChecking] = useState(true);
  // 统计数据
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const t = setTimeout(() => setChecking(false), 400);
    return () => clearTimeout(t);
  }, []);

  const loadCounts = useCallback(async () => {
    if (!supabase) return;
    const [banners, photos, footprints, videos, sections, content, media] = await Promise.all([
      supabase.from("banners").select("id", { count: "exact", head: true }),
      supabase.from("photos").select("id", { count: "exact", head: true }),
      supabase.from("footprints").select("id", { count: "exact", head: true }),
      supabase.from("videos").select("id", { count: "exact", head: true }),
      supabase.from("page_sections").select("id", { count: "exact", head: true }),
      supabase.from("site_content").select("id", { count: "exact", head: true }),
      supabase.from("media_library").select("id", { count: "exact", head: true }),
    ]);
    setCounts({
      banner: banners.count ?? 0,
      photo: photos.count ?? 0,
      footprint: footprints.count ?? 0,
      video: videos.count ?? 0,
      sections: sections.count ?? 0,
      content: content.count ?? 0,
      media: media.count ?? 0,
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
  }

  if (checking) {
    return (
      <Layout wide>
        <PageHeader title="管理后台" showBack={false} />
        <Loading tip="正在确认身份…" />
      </Layout>
    );
  }

  if (!session) {
    return (
      <Layout wide>
        <PageHeader title="管理后台" subtitle="仅限管理员" showBack={false} />
        <div className="flex flex-col items-center justify-center py-12">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-gold/40 bg-gold/10 text-gold">
            <Lock className="h-6 w-6" strokeWidth={1.5} />
          </div>
          <p className="mt-4 font-hand text-base text-ink">管理员登录</p>

          <form onSubmit={handleLogin} className="mt-6 w-full max-w-[280px] space-y-4">
            <div>
              <label className="field-label">邮箱</label>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gold" strokeWidth={1.6} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  autoComplete="email"
                  className="input-line"
                />
              </div>
            </div>
            <div>
              <label className="field-label">密码</label>
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-gold" strokeWidth={1.6} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="input-line"
                />
              </div>
            </div>
            {err && (
              <div className="flex items-center gap-1.5 rounded-soft bg-rust/10 px-3 py-2 text-xs text-rust">
                <AlertCircle className="h-3.5 w-3.5" strokeWidth={1.8} />
                {err}
              </div>
            )}
            <button type="submit" disabled={busy} className="btn-gold w-full">
              {busy ? "登录中…" : "登录"}
            </button>
          </form>

          {!supabaseReady && (
            <p className="mt-5 max-w-[280px] text-center text-[11px] leading-relaxed text-ink-mute">
              提示：当前未配置 Supabase，登录功能不可用。请在仓库 Secrets 中配置
              VITE_SUPABASE_URL 与 VITE_SUPABASE_ANON_KEY。
            </p>
          )}
        </div>
      </Layout>
    );
  }

  const activeCard = CARDS.find((c) => c.key === tab);

  return (
    <Layout wide>
      {tab === "dashboard" ? (
        <>
          <PageHeader title="管理后台" subtitle={session.user.email} showBack={false} />

          {/* 仪表盘头部 */}
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-soft bg-gold/15 text-gold">
                <LayoutDashboard className="h-4 w-4" strokeWidth={1.8} />
              </div>
              <div>
                <p className="font-hand text-sm text-ink">控制台</p>
                <p className="text-[10px] text-ink-mute">{session.user.email}</p>
              </div>
            </div>
            <button type="button" onClick={handleLogout} className="btn-ghost flex-none !px-3 !py-1.5 text-xs">
              <LogOut className="h-3.5 w-3.5" strokeWidth={1.8} />
              退出
            </button>
          </div>

          {/* 卡片网格 */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {CARDS.map(({ key, label, desc, Icon, iconBg }) => {
              const count = counts[key] ?? null;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className="group relative overflow-hidden rounded-card border border-coffee-line/70 bg-cream-200 p-3.5 text-left shadow-paper transition-all hover:shadow-polaroid hover:-translate-y-0.5 active:translate-y-0 animate-fade-up"
                >
                  {/* 图标 */}
                  <div className={cn("mb-2.5 inline-flex h-9 w-9 items-center justify-center rounded-soft", iconBg)}>
                    <Icon className="h-4 w-4" strokeWidth={1.8} />
                  </div>
                  {/* 文字 */}
                  <p className="font-hand text-sm text-ink">{label}</p>
                  <p className="mt-0.5 text-[10px] leading-snug text-ink-mute">{desc}</p>
                  {/* 数量徽章 */}
                  {count !== null && (
                    <span className="absolute right-2 top-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gold/15 px-1.5 text-[10px] font-medium text-coffee">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* 快捷操作 */}
          <div className="mt-4 flex items-center gap-2">
            <a href="/#/" className="btn-ghost flex-1 !py-2 text-xs">
              <ImageIcon className="h-3.5 w-3.5" strokeWidth={1.8} />
              查看前台
            </a>
            <button
              type="button"
              onClick={() => setTab("theme")}
              className="btn-gold flex-1 !py-2 text-xs"
            >
              <Palette className="h-3.5 w-3.5" strokeWidth={1.8} />
              快捷换肤
            </button>
          </div>
        </>
      ) : (
        <div className="mx-auto w-full max-w-3xl">
          {/* 子页面顶栏 */}
          <div className="mb-4 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                setTab("dashboard");
                loadCounts();
              }}
              className="flex items-center gap-1.5 rounded-soft px-2 py-1.5 text-xs text-ink-soft transition-colors hover:bg-cream-200 hover:text-ink"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={1.8} />
              返回
            </button>
            <div className="flex items-center gap-1.5">
              {activeCard && (
                <div className={cn("inline-flex h-6 w-6 items-center justify-center rounded-soft", activeCard.iconBg)}>
                  <activeCard.Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
                </div>
              )}
              <span className="font-hand text-sm text-ink">{activeCard?.label}</span>
            </div>
          </div>

          {tab === "banner" && <BannerManager />}
          {tab === "content" && <ContentManager />}
          {tab === "sections" && <SectionManager />}
          {tab === "theme" && <ThemeManager />}
          {tab === "seo" && <SeoManager />}
          {tab === "footprint" && <FootprintManager />}
          {tab === "photo" && <PhotoManager />}
          {tab === "video" && <VideoManager />}
          {tab === "media" && <MediaLibrary />}
          {tab === "contact" && <ContactManager />}
        </div>
      )}
    </Layout>
  );
}
