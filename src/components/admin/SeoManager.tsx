import { useState, useEffect } from "react";
import { Loader2, Save, Search, Globe, Image as ImageIcon } from "lucide-react";
import { useSiteMeta } from "@/hooks/useSiteMeta";

const FIELDS: { key: string; label: string; type: "text" | "longtext"; desc: string }[] = [
  { key: "site_title", label: "网站标题", type: "text", desc: "浏览器标签页显示的标题" },
  { key: "site_description", label: "网站描述", type: "longtext", desc: "SEO meta description" },
  { key: "favicon_url", label: "网站图标 URL", type: "text", desc: "浏览器标签页图标" },
  { key: "og_title", label: "社交分享标题", type: "text", desc: "微信/Twitter 分享标题" },
  { key: "og_description", label: "社交分享描述", type: "longtext", desc: "分享卡片描述文字" },
  { key: "og_image", label: "社交分享封面图", type: "text", desc: "分享卡片图片 URL" },
  { key: "keywords", label: "SEO 关键词", type: "text", desc: "逗号分隔" },
  { key: "author", label: "作者", type: "text", desc: "meta author" },
  { key: "lang", label: "语言", type: "text", desc: "如 zh-CN" },
  { key: "robots", label: "搜索引擎索引", type: "text", desc: "如 index, follow" },
];

export default function SeoManager() {
  const { meta, loading, saveAll } = useSiteMeta();
  const [form, setForm] = useState<Record<string, string>>(meta);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  // hook 加载完成后同步表单
  useEffect(() => {
    if (!loading) setForm(meta);
  }, [meta, loading]);

  function update(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    setBusy(true);
    setHint(null);
    const ok = await saveAll(form);
    setBusy(false);
    setHint(ok ? "SEO 设置已保存" : "保存失败");
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-gold" strokeWidth={1.6} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* 基础 SEO */}
      <div className="rounded-card border border-coffee-line/70 bg-cream-200 p-4 shadow-paper">
        <h3 className="mb-3 flex items-center gap-1.5 font-hand text-base text-ink">
          <Search className="h-4 w-4 text-gold" strokeWidth={1.8} />
          SEO 与站点信息
        </h3>
        <div className="space-y-3">
          {FIELDS.map(({ key, label, type, desc }) => (
            <div key={key}>
              <label className="field-label">{label}</label>
              {type === "longtext" ? (
                <textarea
                  value={form[key] ?? ""}
                  onChange={(e) => update(key, e.target.value)}
                  rows={2}
                  placeholder={desc}
                  className="mt-1 w-full resize-none rounded-soft border border-coffee-line/70 bg-cream-50/60 px-3 py-2 text-xs focus:border-gold focus:outline-none"
                />
              ) : (
                <input
                  value={form[key] ?? ""}
                  onChange={(e) => update(key, e.target.value)}
                  placeholder={desc}
                  className="input-line"
                />
              )}
              <p className="mt-0.5 text-[10px] text-ink-mute">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 图标预览 */}
      <div className="rounded-card border border-coffee-line/70 bg-cream-200/60 p-4">
        <h3 className="mb-3 flex items-center gap-1.5 font-hand text-sm text-ink">
          <ImageIcon className="h-3.5 w-3.5 text-gold" strokeWidth={1.8} />
          图标预览
        </h3>
        <div className="flex items-center gap-3">
          {form.favicon_url ? (
            <img
              src={form.favicon_url}
              alt="favicon"
              className="h-10 w-10 rounded border border-coffee-line/50"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded border border-dashed border-coffee-line/50 text-[10px] text-ink-mute">
              无
            </div>
          )}
          <span className="text-xs text-ink-soft">
            当前图标 · {form.site_title || "无标题"}
          </span>
        </div>
      </div>

      {/* 社交分享预览 */}
      <div className="rounded-card border border-coffee-line/70 bg-cream-200/60 p-4">
        <h3 className="mb-3 flex items-center gap-1.5 font-hand text-sm text-ink">
          <Globe className="h-3.5 w-3.5 text-gold" strokeWidth={1.8} />
          分享卡片预览
        </h3>
        <div className="overflow-hidden rounded-soft border border-coffee-line/50">
          {form.og_image ? (
            <img
              src={form.og_image}
              alt="og"
              className="h-32 w-full object-cover"
            />
          ) : (
            <div className="flex h-32 items-center justify-center bg-cream-100 text-xs text-ink-mute">
              无封面图
            </div>
          )}
          <div className="bg-cream-50 p-2.5">
            <p className="truncate text-xs font-medium text-ink">
              {form.og_title || form.site_title || "无标题"}
            </p>
            <p className="mt-0.5 line-clamp-2 text-[10px] text-ink-mute">
              {form.og_description || form.site_description || "无描述"}
            </p>
            <p className="mt-1 text-[9px] text-ink-mute">zap534.site</p>
          </div>
        </div>
      </div>

      {hint && <p className="text-xs text-coffee">{hint}</p>}

      <button
        type="button"
        onClick={handleSave}
        disabled={busy}
        className="btn-gold w-full"
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.8} />
        ) : (
          <Save className="h-3.5 w-3.5" strokeWidth={1.8} />
        )}
        保存 SEO 设置
      </button>
    </div>
  );
}
