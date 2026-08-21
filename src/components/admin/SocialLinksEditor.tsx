import { useEffect, useState } from "react";
import {
  Trash2, Plus, Loader2, Pencil, ChevronUp, ChevronDown,
  Eye, EyeOff, Share2, Save,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { SocialLink } from "@/lib/types";
import { SOCIAL_ICON_OPTIONS, default as SocialIcon } from "@/components/icons/SocialIcons";
import { invalidateGlobalLinks } from "@/hooks/useGlobalLinks";
import MediaPicker from "@/components/admin/MediaPicker";
import { cn } from "@/lib/utils";

type SocialDraft = {
  id: string | null;
  label: string;
  url: string;
  icon: string;
  icon_url: string;
  active: boolean;
};

const EMPTY_DRAFT: SocialDraft = {
  id: null,
  label: "",
  url: "",
  icon: "link",
  icon_url: "",
  active: true,
};

/**
 * 页脚社媒图标管理（嵌入「排版 · 全局」页）
 * - 数据存 social_links 表，前台 SiteFooter 渲染
 * - 内置图标按 key 选择；icon_url 有值时优先显示自定义图片
 */
export default function SocialLinksEditor() {
  const [list, setList] = useState<SocialLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [draft, setDraft] = useState<SocialDraft | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("social_links")
      .select("*")
      .order("sort_order", { ascending: true });
    setList((data as SocialLink[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function set<K extends keyof SocialDraft>(key: K, value: SocialDraft[K]) {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
  }

  async function saveDraft() {
    if (!draft) return;
    if (!draft.label.trim() || !draft.url.trim()) {
      setHint("社媒：请填写名称和链接地址");
      return;
    }
    setBusy(true);
    setHint(null);
    const payload = {
      label: draft.label.trim(),
      url: draft.url.trim(),
      icon: draft.icon,
      icon_url: draft.icon_url || null,
      active: draft.active,
    };
    const res = draft.id
      ? await supabase.from("social_links").update(payload).eq("id", draft.id)
      : await supabase
          .from("social_links")
          .insert({ ...payload, sort_order: list.reduce((m, r) => Math.max(m, r.sort_order), 0) + 1 });
    setBusy(false);
    if (res.error) {
      setHint(`社媒保存失败：${res.error.message}`);
      return;
    }
    setDraft(null);
    setHint("✓ 社媒图标已保存，前台页脚已更新");
    invalidateGlobalLinks();
    load();
  }

  async function remove(row: SocialLink) {
    if (!confirm(`确认删除社媒「${row.label}」？`)) return;
    await supabase.from("social_links").delete().eq("id", row.id);
    invalidateGlobalLinks();
    load();
  }

  async function toggleActive(row: SocialLink) {
    await supabase.from("social_links").update({ active: !row.active }).eq("id", row.id);
    invalidateGlobalLinks();
    load();
  }

  async function move(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= list.length) return;
    const a = list[idx];
    const b = list[target];
    setBusy(true);
    await Promise.all([
      supabase.from("social_links").update({ sort_order: b.sort_order }).eq("id", a.id),
      supabase.from("social_links").update({ sort_order: a.sort_order }).eq("id", b.id),
    ]);
    setBusy(false);
    invalidateGlobalLinks();
    load();
  }

  return (
    <div className="rounded-card border border-cream-300 bg-cream-200 p-4 shadow-paper">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-base font-bold text-ink">
          <Share2 className="h-4 w-4 text-gold" strokeWidth={1.8} />
          页脚社媒图标
        </h3>
        <button
          type="button"
          onClick={() => setDraft({ ...EMPTY_DRAFT })}
          className="btn-ghost !px-2.5 !py-1 text-[11px]"
        >
          <Plus className="h-3 w-3" strokeWidth={1.8} />
          添加社媒
        </button>
      </div>
      <p className="mb-3 text-[11px] leading-relaxed text-ink-mute">
        图标显示在页脚署名文字上方，点击跳转对应社媒主页；拖动箭头调整排列顺序。
      </p>

      {hint && <p className="mb-2 text-xs text-coffee">{hint}</p>}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-6 text-xs text-ink-soft">
          <Loader2 className="h-4 w-4 animate-spin" />
          加载社媒中…
        </div>
      ) : list.length === 0 ? (
        <div className="flex flex-col items-center py-6 text-ink-mute">
          <Share2 className="h-6 w-6" strokeWidth={1.4} />
          <p className="mt-2 text-xs">还没有社媒图标，点击「添加社媒」</p>
        </div>
      ) : (
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

              <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-cream-200 text-ink-soft">
                {row.icon_url ? (
                  <img src={row.icon_url} alt="" className="h-5 w-5 object-contain" />
                ) : (
                  <SocialIcon icon={row.icon} size={17} />
                )}
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{row.label}</p>
                <a
                  href={row.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block truncate font-mono text-[10px] text-coffee/70 hover:text-gold hover:underline"
                >
                  {row.url}
                </a>
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
                    icon_url: row.icon_url ?? "",
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
      )}

      {/* 编辑表单（行内展开） */}
      {draft && (
        <div className="mt-3 space-y-3 rounded-soft border border-gold/30 bg-cream-50 p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-ink">{draft.id ? "编辑社媒" : "添加社媒"}</p>
            <button
              type="button"
              onClick={() => setDraft(null)}
              className="text-[10px] text-ink-mute hover:text-ink"
            >
              收起
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="field-label">名称 *</label>
              <input
                value={draft.label}
                onChange={(e) => set("label", e.target.value)}
                placeholder="如 微信公众号 / GitHub"
                className="input-line"
              />
            </div>
            <div>
              <label className="field-label">链接地址 *</label>
              <input
                value={draft.url}
                onChange={(e) => set("url", e.target.value)}
                placeholder="https://… 或 mailto:…"
                className="input-line font-mono text-xs"
              />
            </div>
          </div>

          <div>
            <label className="field-label">内置图标（点击选择）</label>
            <div className="grid grid-cols-8 gap-1 rounded-soft border border-cream-300 bg-white p-2">
              {SOCIAL_ICON_OPTIONS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  title={label}
                  onClick={() => set("icon", key)}
                  className={cn(
                    "flex h-9 items-center justify-center rounded-soft transition-colors",
                    draft.icon === key && !draft.icon_url
                      ? "bg-gold/20 text-coffee"
                      : "text-ink-mute hover:bg-cream-100 hover:text-ink",
                  )}
                >
                  <SocialIcon icon={key} size={17} />
                </button>
              ))}
            </div>
          </div>

          <MediaPicker
            value={draft.icon_url}
            onChange={(url) => set("icon_url", url)}
            label="自定义图标图片（可选，设置后优先显示）"
            accept="image/*"
            mediaType="image"
          />

          <label className="flex cursor-pointer items-center gap-2 text-[11px] text-ink-soft">
            <input
              type="checkbox"
              checked={draft.active}
              onChange={(e) => set("active", e.target.checked)}
              className="h-3.5 w-3.5 accent-gold"
            />
            显示在页脚
          </label>

          <div className="flex gap-2">
            <button type="button" onClick={saveDraft} disabled={busy} className="btn-gold flex-1 !py-1.5 text-xs">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              保存
            </button>
            <button type="button" onClick={() => setDraft(null)} className="btn-ghost flex-1 !py-1.5 text-xs">
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
