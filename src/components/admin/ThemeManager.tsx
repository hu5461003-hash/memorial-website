import { useState } from "react";
import { Loader2, Save, RotateCcw, Palette, Type as TypeIcon } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { DEFAULT_THEME } from "@/lib/types";
import type { ThemeSettings } from "@/lib/types";

const FONT_OPTIONS = [
  "Noto Serif SC",
  "LXGW WenKai TC",
  "Georgia",
  "Arial",
  "sans-serif",
];

const COLOR_FIELDS: { key: keyof ThemeSettings; label: string; desc: string }[] = [
  { key: "bg_color", label: "背景色", desc: "全站页面背景" },
  { key: "text_color", label: "文字颜色", desc: "正文文字" },
  { key: "primary_color", label: "主色 / 强调色", desc: "链接、强调" },
  { key: "card_color", label: "卡片背景色", desc: "卡片与区块底色" },
  { key: "border_color", label: "边框色", desc: "分隔线与边框" },
  { key: "nav_bg_color", label: "导航栏背景", desc: "底部导航栏底色" },
  { key: "nav_text_color", label: "导航文字", desc: "导航栏图标/文字" },
  { key: "nav_active_color", label: "导航激活", desc: "当前选中项颜色" },
  { key: "logo_text_color", label: "Logo 文字", desc: "Logo 文字颜色" },
  { key: "button_bg_color", label: "按钮背景", desc: "全站按钮底色" },
  { key: "button_text_color", label: "按钮文字", desc: "按钮文字颜色" },
];

export default function ThemeManager() {
  const { theme, loading, saveTheme } = useTheme();
  const [form, setForm] = useState<ThemeSettings>(theme);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  // 当 hook 加载完毕后同步 form
  if (loading && form !== theme) {
    // 仅初次同步
  }

  function update<K extends keyof ThemeSettings>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    setBusy(true);
    setHint(null);
    const ok = await saveTheme(form);
    setBusy(false);
    setHint(ok ? "主题已保存" : "保存失败");
  }

  function handleReset() {
    if (!confirm("确认重置为默认主题？")) return;
    setForm(DEFAULT_THEME);
  }

  return (
    <div className="space-y-5">
      {/* 颜色设置 */}
      <div className="rounded-card border border-coffee-line/70 bg-cream-200 p-4 shadow-paper">
        <h3 className="mb-3 flex items-center gap-1.5 font-hand text-base text-ink">
          <Palette className="h-4 w-4 text-gold" strokeWidth={1.8} />
          配色方案
        </h3>
        <div className="space-y-3">
          {COLOR_FIELDS.map(({ key, label, desc }) => (
            <div key={key} className="flex items-center gap-3">
              <label className="w-24 flex-none text-xs text-ink-soft">{label}</label>
              <input
                type="color"
                value={form[key]}
                onChange={(e) => update(key, e.target.value)}
                className="h-8 w-10 flex-none cursor-pointer rounded border border-coffee-line/50 bg-transparent"
              />
              <input
                type="text"
                value={form[key]}
                onChange={(e) => update(key, e.target.value)}
                className="input-line flex-1 font-mono text-xs"
              />
              <span className="flex-none text-[10px] text-ink-mute">{desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 字体设置 */}
      <div className="rounded-card border border-coffee-line/70 bg-cream-200 p-4 shadow-paper">
        <h3 className="mb-3 flex items-center gap-1.5 font-hand text-base text-ink">
          <TypeIcon className="h-4 w-4 text-gold" strokeWidth={1.8} />
          字体与字号
        </h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <label className="w-24 flex-none text-xs text-ink-soft">字体系列</label>
            <select
              value={form.font_family}
              onChange={(e) => update("font_family", e.target.value)}
              className="input-line flex-1"
            >
              {FONT_OPTIONS.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <label className="w-24 flex-none text-xs text-ink-soft">基础字号</label>
            <input
              type="text"
              value={form.base_font_size}
              onChange={(e) => update("base_font_size", e.target.value)}
              placeholder="如 16px"
              className="input-line flex-1 font-mono text-xs"
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="w-24 flex-none text-xs text-ink-soft">标题字号</label>
            <input
              type="text"
              value={form.heading_font_size}
              onChange={(e) => update("heading_font_size", e.target.value)}
              placeholder="如 24px"
              className="input-line flex-1 font-mono text-xs"
            />
          </div>
        </div>
      </div>

      {/* 实时预览 */}
      <div
        className="rounded-card border p-4"
        style={{
          backgroundColor: form.bg_color,
          borderColor: form.border_color,
          color: form.text_color,
          fontFamily: `"${form.font_family}", serif`,
          fontSize: form.base_font_size,
        }}
      >
        <h4 style={{ fontSize: form.heading_font_size, color: form.primary_color }}>
          预览标题
        </h4>
        <p className="mt-1 text-sm">这是一段正文预览文字。</p>
        <button
          className="mt-2 rounded px-3 py-1 text-xs text-white"
          style={{ backgroundColor: form.primary_color }}
        >
          示例按钮
        </button>
      </div>

      {hint && <p className="text-xs text-coffee">{hint}</p>}

      {/* 操作按钮 */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={busy}
          className="btn-gold flex-1"
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.8} />
          ) : (
            <Save className="h-3.5 w-3.5" strokeWidth={1.8} />
          )}
          保存主题
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="btn-ghost"
        >
          <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.8} />
          重置默认
        </button>
      </div>
    </div>
  );
}
