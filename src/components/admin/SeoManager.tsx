import { useState, useEffect, useRef, useCallback } from "react";
import { Loader2, Save, Search, Globe, Image as ImageIcon, Upload, X, FileText } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSiteMeta } from "@/hooks/useSiteMeta";
import { cn } from "@/lib/utils";

/** 支持本地上传的图片字段 */
const UPLOAD_KEYS = ["favicon_url", "og_image"];

/** 上传图片到 covers 桶，返回公开 URL */
async function uploadImage(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `seo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage
    .from("covers")
    .upload(path, file, { cacheControl: "3600", upsert: false });
  if (error) throw error;
  const { data: pub } = supabase.storage.from("covers").getPublicUrl(path);
  return pub.publicUrl;
}

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

/** 每页 SEO 字段（存 site_meta：seo.<页面>.<字段>） */
const PAGE_SEO_FIELDS: {
  field: string;
  label: string;
  type: "text" | "longtext" | "image";
  desc: string;
}[] = [
  { field: "title", label: "元标题", type: "text", desc: "该页浏览器标签标题（留空用全站标题）" },
  { field: "description", label: "元描述", type: "longtext", desc: "该页 SEO 描述（留空用全站描述）" },
  { field: "keywords", label: "关键词", type: "text", desc: "逗号分隔" },
  { field: "canonical", label: "规范链接 URL", type: "text", desc: "如 https://zap534.site/#/map" },
  { field: "og_image", label: "分享封面图", type: "image", desc: "该页分享卡片图（留空用全站封面）" },
];

const SYSTEM_PAGES: { key: string; label: string }[] = [
  { key: "home", label: "首页" },
  { key: "map", label: "足迹地图" },
  { key: "messages", label: "留言板" },
  { key: "blog", label: "博客" },
  { key: "gallery", label: "私密相册" },
];

export default function SeoManager() {
  const { meta, loading, saveAll } = useSiteMeta();
  const [form, setForm] = useState<Record<string, string>>(meta);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [uploadKey, setUploadKey] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pendingUploadKey = useRef<string | null>(null);

  // 每页 SEO
  const [seoPage, setSeoPage] = useState("home");
  const [customPages, setCustomPages] = useState<{ key: string; label: string }[]>([]);
  const [pageForm, setPageForm] = useState<Record<string, string>>({});
  const [pageBusy, setPageBusy] = useState(false);
  const pageFileInputRef = useRef<HTMLInputElement | null>(null);

  // hook 加载完成后同步表单
  useEffect(() => {
    if (!loading) setForm(meta);
  }, [meta, loading]);

  /** 拉取自定义页面列表（排版中创建的） */
  const loadCustomPages = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from("page_sections")
      .select("page_name")
      .order("page_name", { ascending: true });
    const names = [...new Set((data ?? []).map((d: { page_name: string }) => d.page_name))]
      .filter((n) => n !== "global" && !SYSTEM_PAGES.some((p) => p.key === n));
    setCustomPages(names.map((n) => ({ key: n, label: `自定义页 · ${n}` })));
  }, []);

  useEffect(() => {
    loadCustomPages();
  }, [loadCustomPages]);

  // 切换页面时载入该页 SEO
  useEffect(() => {
    const next: Record<string, string> = {};
    for (const { field } of PAGE_SEO_FIELDS) {
      next[field] = meta[`seo.${seoPage}.${field}`] ?? "";
    }
    setPageForm(next);
  }, [seoPage, meta]);

  function update(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function updatePageField(field: string, value: string) {
    setPageForm((f) => ({ ...f, [field]: value }));
  }

  /** 本地上传：先传存储，再把 URL 填入对应字段（需再点「保存」生效） */
  function handlePickFile(key: string, files: FileList | null) {
    const f = files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setHint("请选择图片文件");
      return;
    }
    setUploadKey(key);
    setHint(null);
    uploadImage(f)
      .then((url) => {
        update(key, url);
        setHint("✓ 上传成功，点「保存 SEO 设置」生效");
      })
      .catch((err) => {
        setHint(`上传失败：${(err as Error).message}`);
      })
      .finally(() => setUploadKey(null));
  }

  function handlePagePickFile(field: string, files: FileList | null) {
    const f = files?.[0];
    if (pageFileInputRef.current) pageFileInputRef.current.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setHint("请选择图片文件");
      return;
    }
    setUploadKey(`page.${field}`);
    setHint(null);
    uploadImage(f)
      .then((url) => {
        updatePageField(field, url);
        setHint("✓ 上传成功，点「保存该页 SEO」生效");
      })
      .catch((err) => {
        setHint(`上传失败：${(err as Error).message}`);
      })
      .finally(() => setUploadKey(null));
  }

  async function handleSave() {
    setBusy(true);
    setHint(null);
    const ok = await saveAll(form);
    setBusy(false);
    setHint(ok ? "SEO 设置已保存" : "保存失败");
  }

  async function handleSavePageSeo() {
    setPageBusy(true);
    setHint(null);
    const entries: Record<string, string> = {};
    for (const { field } of PAGE_SEO_FIELDS) {
      entries[`seo.${seoPage}.${field}`] = pageForm[field] ?? "";
    }
    const ok = await saveAll(entries);
    setPageBusy(false);
    setHint(ok ? `「${seoPage}」页 SEO 已保存` : "保存失败");
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-gold" strokeWidth={1.6} />
      </div>
    );
  }

  const allPages = [...SYSTEM_PAGES, ...customPages];

  return (
    <div className="space-y-5">
      {/* ============ 每页 SEO ============ */}
      <div className="rounded-card border border-gold/40 bg-cream-200 p-4 shadow-paper">
        <h3 className="mb-3 flex items-center gap-1.5 font-hand text-base text-ink">
          <FileText className="h-4 w-4 text-gold" strokeWidth={1.8} />
          每页 SEO
        </h3>

        {/* 页面选择 */}
        <div className="mb-3 flex flex-wrap gap-1.5">
          {allPages.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setSeoPage(key)}
              className={cn(
                "rounded-soft px-3 py-1.5 text-xs transition-colors",
                seoPage === key ? "bg-gold/20 text-coffee" : "text-ink-mute hover:text-ink-soft",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {PAGE_SEO_FIELDS.map(({ field, label, type, desc }) => (
            <div key={field}>
              <label className="field-label">{label}</label>
              {type === "image" ? (
                <div className="mt-1 flex items-center gap-1.5">
                  <input
                    value={pageForm[field] ?? ""}
                    onChange={(e) => updatePageField(field, e.target.value)}
                    placeholder="粘贴图片 URL，或点右侧上传"
                    className="input-line flex-1 !py-1.5 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => pageFileInputRef.current?.click()}
                    disabled={uploadKey === `page.${field}`}
                    className="btn-ghost flex-none !px-2.5 !py-1.5 text-[11px]"
                  >
                    {uploadKey === `page.${field}` ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" strokeWidth={1.8} />
                    )}
                    上传
                  </button>
                  {(pageForm[field] ?? "") !== "" && (
                    <button
                      type="button"
                      onClick={() => updatePageField(field, "")}
                      aria-label="清除"
                      className="flex-none rounded p-1.5 text-rust/70 hover:bg-rust/10 hover:text-rust"
                    >
                      <X className="h-3.5 w-3.5" strokeWidth={1.8} />
                    </button>
                  )}
                </div>
              ) : type === "longtext" ? (
                <textarea
                  value={pageForm[field] ?? ""}
                  onChange={(e) => updatePageField(field, e.target.value)}
                  rows={2}
                  placeholder={desc}
                  className="mt-1 w-full resize-none rounded-soft border border-coffee-line/70 bg-cream-50/60 px-3 py-2 text-xs focus:border-gold focus:outline-none"
                />
              ) : (
                <input
                  value={pageForm[field] ?? ""}
                  onChange={(e) => updatePageField(field, e.target.value)}
                  placeholder={desc}
                  className="input-line"
                />
              )}
              <p className="mt-0.5 text-[10px] text-ink-mute">{desc}</p>
            </div>
          ))}
        </div>

        <input
          ref={pageFileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handlePagePickFile("og_image", e.target.files)}
        />

        <button
          type="button"
          onClick={handleSavePageSeo}
          disabled={pageBusy}
          className="btn-gold mt-3 w-full"
        >
          {pageBusy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.8} />
          ) : (
            <Save className="h-3.5 w-3.5" strokeWidth={1.8} />
          )}
          保存该页 SEO
        </button>
      </div>

      {/* 基础 SEO */}
      <div className="rounded-card border border-coffee-line/70 bg-cream-200 p-4 shadow-paper">
        <h3 className="mb-3 flex items-center gap-1.5 font-hand text-base text-ink">
          <Search className="h-4 w-4 text-gold" strokeWidth={1.8} />
          SEO 与站点信息（全站默认）
        </h3>
        <div className="space-y-3">
          {FIELDS.map(({ key, label, type, desc }) => (
            <div key={key}>
              <label className="field-label">{label}</label>
              {UPLOAD_KEYS.includes(key) ? (
                <div className="mt-1 flex items-center gap-1.5">
                  <input
                    value={form[key] ?? ""}
                    onChange={(e) => update(key, e.target.value)}
                    placeholder="粘贴图片 URL，或点右侧上传"
                    className="input-line flex-1 !py-1.5 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setUploadKey(key);
                      pendingUploadKey.current = key;
                      fileInputRef.current?.click();
                    }}
                    disabled={uploadKey === key}
                    className="btn-ghost flex-none !px-2.5 !py-1.5 text-[11px]"
                  >
                    {uploadKey === key ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" strokeWidth={1.8} />
                    )}
                    上传
                  </button>
                  {(form[key] ?? "") !== "" && (
                    <button
                      type="button"
                      onClick={() => update(key, "")}
                      aria-label="清除"
                      className="flex-none rounded p-1.5 text-rust/70 hover:bg-rust/10 hover:text-rust"
                    >
                      <X className="h-3.5 w-3.5" strokeWidth={1.8} />
                    </button>
                  )}
                </div>
              ) : type === "longtext" ? (
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

        {/* 隐藏的文件选择（上传目标字段由 pendingUploadKey 记录） */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const target = pendingUploadKey.current;
            if (target) handlePickFile(target, e.target.files);
            pendingUploadKey.current = null;
          }}
        />
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
