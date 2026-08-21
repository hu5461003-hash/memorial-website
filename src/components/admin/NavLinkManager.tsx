import { useCallback, useEffect, useState } from "react";
import {
  Trash2, Plus, Loader2, Pencil, ChevronUp, ChevronDown,
  X, Menu, Eye, EyeOff, ExternalLink, Save, Link2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { NavLinkItem } from "@/lib/types";
import { NAV_ICON_OPTIONS, default as NavIcon } from "@/components/icons/NavIcons";
import { invalidateGlobalLinks } from "@/hooks/useGlobalLinks";
import { cn } from "@/lib/utils";

type NavDraft = {
  id: string | null;
  label: string;
  url: string;
  icon: string;
  group_name: string;
  open_in_new: boolean;
  active: boolean;
};

const EMPTY_DRAFT: NavDraft = {
  id: null,
  label: "",
  url: "",
  icon: "link",
  group_name: "",
  open_in_new: false,
  active: true,
};

/** 系统内置路由（快捷填充用） */
const QUICK_ROUTES: { label: string; url: string }[] = [
  { label: "首页", url: "/" },
  { label: "足迹地图", url: "/map" },
  { label: "纪念长信", url: "/letter" },
  { label: "留言板", url: "/messages" },
  { label: "博客", url: "/blog" },
  { label: "私密相册", url: "/gallery" },
  { label: "管理后台", url: "/admin" },
];

export default function NavLinkManager() {
  const [list, setList] = useState<NavLinkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  /** 编辑弹层草稿（null 时关闭） */
  const [draft, setDraft] = useState<NavDraft | null>(null);
  /** 自定义页面（后台「排版」新建的），快捷填充用 */
  const [customPages, setCustomPages] = useState<{ label: string; url: string }[]>([]);

  async function load() {
    setLoading(true);
    setLoadError(null);
    const { data, error } = await supabase
      .from("nav_links")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) setLoadError(error.message);
    setList((data as NavLinkItem[]) ?? []);
    setLoading(false);
  }

  /** 拉自定义页面列表（page_sections DISTINCT + site_content 显示名） */
  const loadCustomPages = useCallback(async () => {
    if (!supabase) return;
    const [sectionsRes, contentRes] = await Promise.all([
      supabase.from("page_sections").select("page_name"),
      supabase.from("site_content").select("content_key, content_value").like("content_key", "page.%"),
    ]);
    const system = new Set(["global", "home", "map", "letter", "messages", "gallery", "blog"]);
    const names = [...new Set((sectionsRes.data ?? []).map((d: { page_name: string }) => d.page_name))]
      .filter((n) => !system.has(n));
    const titles = new Map<string, string>();
    for (const row of (contentRes.data as { content_key: string; content_value: string | null }[] | null) ?? []) {
      const m = row.content_key.match(/^page\.(.+)\.title$/);
      if (m) titles.set(m[1], row.content_value ?? "");
    }
    setCustomPages(names.map((n) => ({ label: titles.get(n) || n, url: `/${n}` })));
  }, []);

  useEffect(() => {
    load();
    loadCustomPages();
  }, [loadCustomPages]);

  function set<K extends keyof NavDraft>(key: K, value: NavDraft[K]) {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
  }

  /** 保存草稿（新增或更新） */
  async function saveDraft() {
    if (!draft) return;
    if (!draft.label.trim() || !draft.url.trim()) {
      setHint("请填写导航名称和链接地址");
      return;
    }
    setBusy(true);
    setHint(null);
    const payload = {
      label: draft.label.trim(),
      url: draft.url.trim(),
      icon: draft.icon,
      group_name: draft.group_name.trim(),
      open_in_new: draft.open_in_new,
      active: draft.active,
    };
    const res = draft.id
      ? await supabase.from("nav_links").update(payload).eq("id", draft.id)
      : await supabase
          .from("nav_links")
          .insert({ ...payload, sort_order: list.reduce((m, r) => Math.max(m, r.sort_order), 0) + 1 });
    setBusy(false);
    if (res.error) {
      setHint(`保存失败：${res.error.message}`);
      return;
    }
    setDraft(null);
    setHint("✓ 已保存，前台侧边栏已更新");
    invalidateGlobalLinks();
    load();
  }

  async function remove(row: NavLinkItem) {
    if (!confirm(`确认删除导航「${row.label}」？`)) return;
    await supabase.from("nav_links").delete().eq("id", row.id);
    invalidateGlobalLinks();
    load();
  }

  async function toggleActive(row: NavLinkItem) {
    await supabase.from("nav_links").update({ active: !row.active }).eq("id", row.id);
    invalidateGlobalLinks();
    load();
  }

  /** 与上一条交换顺序 */
  async function move(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= list.length) return;
    const a = list[idx];
    const b = list[target];
    setBusy(true);
    await Promise.all([
      supabase.from("nav_links").update({ sort_order: b.sort_order }).eq("id", a.id),
      supabase.from("nav_links").update({ sort_order: a.sort_order }).eq("id", b.id),
    ]);
    setBusy(false);
    invalidateGlobalLinks();
    load();
  }

  const isInternal = (url: string) => url.startsWith("/") || url.startsWith("#/");

  return (
    <div className="space-y-5">
      {/* 顶部说明 + 新增 */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setDraft({ ...EMPTY_DRAFT })}
          className="btn-gold !px-4 !py-2 text-xs"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={1.8} />
          添加导航项
        </button>
        <p className="text-[11px] leading-relaxed text-ink-mute">
          这里管理页头汉堡菜单（侧边栏）里的导航项；站内页面填 /xxx，外部链接填完整网址，可用分组归拢。
        </p>
      </div>

      {hint && <p className="text-xs text-coffee">{hint}</p>}

      {/* 列表 */}
      <div className="rounded-card border border-cream-300 bg-cream-200 p-4">
        <h3 className="mb-3 flex items-center gap-1.5 text-base font-bold text-ink">
          <Menu className="h-4 w-4 text-gold" strokeWidth={1.8} />
          侧边栏导航（{list.length}）
        </h3>

        {loading && (
          <div className="flex items-center justify-center gap-2 py-8 text-xs text-ink-soft">
            <Loader2 className="h-4 w-4 animate-spin" />
            加载导航中…
          </div>
        )}

        {!loading && loadError && (
          <div className="rounded-soft border border-rose-200 bg-rose-50/80 px-3 py-3 text-xs text-rose-600">
            <div className="font-semibold">加载导航失败</div>
            <div className="mt-1 break-all opacity-90">
              {loadError}（请确认已执行 supabase/v6_blog_nav_social.sql）
            </div>
            <button type="button" onClick={() => load()} className="btn-gold mt-2 !py-1 text-[11px]">
              重试
            </button>
          </div>
        )}

        {!loading && !loadError && list.length === 0 && (
          <div className="flex flex-col items-center py-8 text-ink-mute">
            <Menu className="h-6 w-6" strokeWidth={1.4} />
            <p className="mt-2 text-xs">还没有导航项，点击上方「添加导航项」</p>
          </div>
        )}

        <div className="space-y-2">
          {list.map((row, idx) => (
            <div
              key={row.id}
              className={cn(
                "flex items-center gap-2 rounded-soft border border-cream-300 bg-cream-50 p-2.5",
                !row.active && "opacity-55",
              )}
            >
              <div className="flex flex-none flex-col">
                <button
                  type="button"
                  onClick={() => move(idx, -1)}
                  disabled={idx === 0 || busy}
                  aria-label="上移"
                  className="rounded p-0.5 text-ink-mute hover:bg-cream-100 hover:text-ink disabled:opacity-30"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => move(idx, 1)}
                  disabled={idx === list.length - 1 || busy}
                  aria-label="下移"
                  className="rounded p-0.5 text-ink-mute hover:bg-cream-100 hover:text-ink disabled:opacity-30"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>

              <NavIcon name={row.icon} className="h-4 w-4 flex-none text-ink-soft" />

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-medium text-ink">{row.label}</span>
                  {row.group_name && (
                    <span className="flex-none rounded bg-cream-200 px-1 text-[9px] text-ink-mute">
                      {row.group_name}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 flex items-center gap-1 font-mono text-[10px] text-coffee/70">
                  {isInternal(row.url) ? (
                    <span className="truncate">{row.url}</span>
                  ) : (
                    <a
                      href={row.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-0.5 truncate hover:text-gold hover:underline"
                    >
                      <ExternalLink className="h-2.5 w-2.5" />
                      {row.url}
                    </a>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => toggleActive(row)}
                title={row.active ? "显示中，点击隐藏" : "已隐藏，点击显示"}
                className="flex-none rounded p-1.5 text-ink-mute hover:bg-cream-100 hover:text-ink"
              >
                {row.active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              </button>
              <button
                type="button"
                onClick={() =>
                  setDraft({
                    id: row.id,
                    label: row.label,
                    url: row.url,
                    icon: row.icon,
                    group_name: row.group_name,
                    open_in_new: row.open_in_new,
                    active: row.active,
                  })
                }
                className="flex-none rounded p-1.5 text-ink-mute hover:bg-cream-100 hover:text-coffee"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => remove(row)}
                className="flex-none rounded p-1.5 text-rust/70 hover:bg-rust/10 hover:text-rust"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 编辑弹层 */}
      {draft && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
          onClick={() => setDraft(null)}
        >
          <div
            className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-card border border-cream-300 bg-cream-200 p-4 shadow-paper"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-bold text-ink">
                {draft.id ? "编辑导航项" : "添加导航项"}
              </h4>
              <button
                type="button"
                onClick={() => setDraft(null)}
                className="rounded p-1 text-ink-mute hover:bg-cream-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="field-label">名称 *</label>
                <input
                  value={draft.label}
                  onChange={(e) => set("label", e.target.value)}
                  placeholder="如 足迹地图"
                  className="input-line"
                />
              </div>

              <div>
                <label className="field-label">链接地址 *</label>
                <input
                  value={draft.url}
                  onChange={(e) => set("url", e.target.value)}
                  placeholder="站内填 /blog，外部填 https://…"
                  className="input-line font-mono text-xs"
                />
                {/* 快捷填充 */}
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {[...QUICK_ROUTES, ...customPages].map((r) => (
                    <button
                      key={r.url}
                      type="button"
                      onClick={() => set("url", r.url)}
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[10px] transition-colors",
                        draft.url === r.url
                          ? "border-gold bg-gold/15 text-coffee"
                          : "border-cream-300 text-ink-mute hover:text-ink",
                      )}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="field-label">分组（相同分组名会归到一起，留空不分组）</label>
                <input
                  value={draft.group_name}
                  onChange={(e) => set("group_name", e.target.value)}
                  placeholder="如 页面导航 / 社交媒体"
                  className="input-line"
                />
              </div>

              <div>
                <label className="field-label">图标</label>
                <div className="grid grid-cols-7 gap-1 rounded-soft border border-cream-300 bg-cream-50 p-2">
                  {NAV_ICON_OPTIONS.map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      title={label}
                      onClick={() => set("icon", key)}
                      className={cn(
                        "flex h-9 items-center justify-center rounded-soft transition-colors",
                        draft.icon === key
                          ? "bg-gold/20 text-coffee"
                          : "text-ink-mute hover:bg-cream-100 hover:text-ink",
                      )}
                    >
                      <NavIcon name={key} className="h-4 w-4" />
                    </button>
                  ))}
                </div>
                <p className="mt-1 flex items-center gap-1 text-[10px] text-ink-mute">
                  <Link2 className="h-3 w-3" />
                  当前：
                  <span className="inline-flex items-center gap-1 text-ink-soft">
                    <NavIcon name={draft.icon} className="h-3.5 w-3.5" />
                    {NAV_ICON_OPTIONS.find((o) => o.key === draft.icon)?.label ?? draft.icon}
                  </span>
                </p>
              </div>

              <div className="space-y-2 rounded-soft border border-cream-300 bg-cream-50 p-2.5">
                <label className="flex cursor-pointer items-center gap-2 text-[11px] text-ink-soft">
                  <input
                    type="checkbox"
                    checked={draft.open_in_new}
                    onChange={(e) => set("open_in_new", e.target.checked)}
                    className="h-3.5 w-3.5 accent-gold"
                  />
                  新窗口打开（站内链接建议不勾选）
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-[11px] text-ink-soft">
                  <input
                    type="checkbox"
                    checked={draft.active}
                    onChange={(e) => set("active", e.target.checked)}
                    className="h-3.5 w-3.5 accent-gold"
                  />
                  显示在侧边栏
                </label>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button type="button" onClick={saveDraft} disabled={busy} className="btn-gold flex-1 !py-2 text-xs">
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                保存
              </button>
              <button type="button" onClick={() => setDraft(null)} className="btn-ghost flex-1 !py-2 text-xs">
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
