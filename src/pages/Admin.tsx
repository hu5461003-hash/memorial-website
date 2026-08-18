import { useEffect, useState } from "react";
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
import { supabase, supabaseReady } from "@/lib/supabase";
import { useStore } from "@/store/useStore";
import { cn } from "@/lib/utils";

type Tab =
  | "footprint"
  | "photo"
  | "banner"
  | "content"
  | "video"
  | "sections"
  | "theme"
  | "seo";

const TABS: { key: Tab; label: string; Icon: typeof MapPinned }[] = [
  { key: "banner", label: "Banner", Icon: ImagePlus },
  { key: "content", label: "内容", Icon: FileText },
  { key: "sections", label: "排版", Icon: LayoutGrid },
  { key: "theme", label: "主题", Icon: Palette },
  { key: "seo", label: "SEO", Icon: Search },
  { key: "footprint", label: "足迹", Icon: MapPinned },
  { key: "photo", label: "相册", Icon: ImageIcon },
  { key: "video", label: "视频", Icon: Film },
];

export default function Admin() {
  const { session, setSession } = useStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("banner");
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setChecking(false), 400);
    return () => clearTimeout(t);
  }, []);

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
      <Layout>
        <PageHeader title="管理后台" showBack={false} />
        <Loading tip="正在确认身份…" />
      </Layout>
    );
  }

  if (!session) {
    return (
      <Layout>
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

  return (
    <Layout>
      <PageHeader title="管理后台" subtitle={session.user.email} showBack={false} />

      <div className="mb-5 flex items-center justify-between gap-2">
        {/* Tab 栏（横向滚动） */}
        <div className="flex-1 overflow-x-auto">
          <div className="inline-flex rounded-soft border border-coffee-line/70 bg-cream-200 p-0.5">
            {TABS.map(({ key, label, Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={cn(
                  "flex flex-none items-center gap-1.5 rounded-soft px-3 py-1.5 text-xs transition-colors",
                  tab === key
                    ? "bg-gold/20 text-coffee"
                    : "text-ink-mute hover:text-ink-soft",
                )}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
                {label}
              </button>
            ))}
          </div>
        </div>
        <button type="button" onClick={handleLogout} className="btn-ghost flex-none">
          <LogOut className="h-3.5 w-3.5" strokeWidth={1.8} />
          退出
        </button>
      </div>

      {tab === "banner" && <BannerManager />}
      {tab === "content" && <ContentManager />}
      {tab === "sections" && <SectionManager />}
      {tab === "theme" && <ThemeManager />}
      {tab === "seo" && <SeoManager />}
      {tab === "footprint" && <FootprintManager />}
      {tab === "photo" && <PhotoManager />}
      {tab === "video" && <VideoManager />}
    </Layout>
  );
}
