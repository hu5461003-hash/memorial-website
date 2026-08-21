import { useEffect, useRef, useState } from "react";
import {
  Trash2, Plus, Loader2, Pencil, Eye, EyeOff, X, Save, ArrowLeft,
  Bold, Italic, Underline, Heading2, Heading3, Quote, List, ListOrdered,
  Link2, Image as ImageIcon, Video, Code2, Undo2, Redo2, RemoveFormatting,
  Search, Newspaper, ExternalLink, FileText,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Blog } from "@/lib/types";
import MediaPicker from "@/components/admin/MediaPicker";
import { cn } from "@/lib/utils";

type EditMode = "rich" | "code";

type BlogForm = {
  id: string | null;
  title: string;
  slug: string;
  excerpt: string;
  cover_url: string;
  meta_title: string;
  meta_description: string;
  keywords: string;
  author: string;
  content: string;
  published: boolean;
  published_at: string | null;
};

const EMPTY_FORM: BlogForm = {
  id: null,
  title: "",
  slug: "",
  excerpt: "",
  cover_url: "",
  meta_title: "",
  meta_description: "",
  keywords: "",
  author: "",
  content: "",
  published: false,
  published_at: null,
};

/** 标题 → URL slug（仅保留字母数字，中文自动回退为时间戳式） */
function slugify(input: string): string {
  const s = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return s || `post-${Date.now().toString(36)}`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function BlogManager() {
  const [list, setList] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  /** 编辑器状态：form 为 null 时显示列表页 */
  const [form, setForm] = useState<BlogForm | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [mode, setMode] = useState<EditMode>("rich");
  const richRef = useRef<HTMLDivElement>(null);
  /** 图片/视频插入弹层 */
  const [insertImage, setInsertImage] = useState(false);
  const [insertVideo, setInsertVideo] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [embedUrl, setEmbedUrl] = useState("");

  async function load() {
    setLoading(true);
    setLoadError(null);
    const { data, error } = await supabase
      .from("blogs")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) setLoadError(error.message);
    setList((data as Blog[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function set<K extends keyof BlogForm>(key: K, value: BlogForm[K]) {
    setForm((f) => (f ? { ...f, [key]: value } : f));
  }

  /** 标题变化时自动生成 slug（除非用户手动改过） */
  function onTitleChange(v: string) {
    setForm((f) => (f ? { ...f, title: v, slug: slugTouched ? f.slug : slugify(v) } : f));
  }

  /* ========== 可视化编辑器 ========== */

  /** 切换文章 / 切换编辑模式时，把 form.content 灌入 contentEditable */
  useEffect(() => {
    if (form && mode === "rich" && richRef.current) {
      richRef.current.innerHTML = form.content || "";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form?.id, mode]);

  function syncFromRich() {
    if (richRef.current) set("content", richRef.current.innerHTML);
  }

  function exec(cmd: string, value?: string) {
    if (mode !== "rich") return;
    richRef.current?.focus();
    document.execCommand(cmd, false, value);
    syncFromRich();
  }

  function insertHtml(html: string) {
    if (mode !== "rich") return;
    richRef.current?.focus();
    document.execCommand("insertHTML", false, html);
    syncFromRich();
  }

  function insertLink() {
    const url = prompt("输入链接地址：", "https://");
    if (!url) return;
    exec("createLink", url);
  }

  /* ========== 保存 / 删除 ========== */

  async function save() {
    if (!form) return;
    if (!form.title.trim()) {
      setHint("请填写博客标题");
      return;
    }
    // 从 contentEditable 兜底同步一次（code 模式下 content 已实时更新）
    if (mode === "rich" && richRef.current) {
      set("content", richRef.current.innerHTML);
    }
    setBusy(true);
    setHint(null);
    const nowIso = new Date().toISOString();
    const payload = {
      title: form.title.trim(),
      slug: (form.slug || slugify(form.title)).trim(),
      excerpt: form.excerpt.trim(),
      cover_url: form.cover_url || null,
      meta_title: form.meta_title.trim() || null,
      meta_description: form.meta_description.trim() || null,
      keywords: form.keywords.trim() || null,
      content: form.content,
      author: form.author.trim(),
      published: form.published,
      published_at: form.published ? (form.published_at ?? nowIso) : form.published_at,
      updated_at: nowIso,
    };
    const res = form.id
      ? await supabase.from("blogs").update(payload).eq("id", form.id).select("id").single()
      : await supabase.from("blogs").insert(payload).select("id").single();
    setBusy(false);
    if (res.error) {
      setHint(res.error.code === "23505" ? "保存失败：URL（slug）已被其他文章占用，请修改" : `保存失败：${res.error.message}`);
      return;
    }
    setHint("✓ 已保存");
    setForm(null);
    setSlugTouched(false);
    load();
  }

  async function remove(b: Blog) {
    if (!confirm(`确认删除博客「${b.title || "(无标题)"}」？删除后无法恢复。`)) return;
    await supabase.from("blogs").delete().eq("id", b.id);
    load();
  }

  async function togglePublished(b: Blog) {
    const nowIso = new Date().toISOString();
    await supabase
      .from("blogs")
      .update({
        published: !b.published,
        published_at: !b.published ? (b.published_at ?? nowIso) : b.published_at,
        updated_at: nowIso,
      })
      .eq("id", b.id);
    load();
  }

  /* ========== 编辑器视图 ========== */
  if (form) {
    const toolbarBtn =
      "inline-flex h-8 w-8 items-center justify-center rounded-soft text-ink-soft transition-colors hover:bg-cream-100 hover:text-ink";
    return (
      <div className="animate-fade-in space-y-4">
        {/* 顶栏 */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (!confirm("返回列表？未保存的修改将丢失。")) return;
              setForm(null);
              setSlugTouched(false);
              setHint(null);
            }}
            className="btn-ghost !px-3 !py-1.5 text-xs"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> 返回列表
          </button>
          <span className="text-xs text-ink-mute">
            {form.id ? "编辑博客" : "新建博客"}
          </span>
          <div className="ml-auto flex items-center gap-2">
            {form.published ? (
              <span className="flex items-center gap-1 rounded-soft bg-emerald-100 px-2 py-1 text-[11px] font-medium text-emerald-700">
                <Eye className="h-3 w-3" /> 已发布
              </span>
            ) : (
              <span className="flex items-center gap-1 rounded-soft bg-cream-100 px-2 py-1 text-[11px] font-medium text-ink-mute">
                <EyeOff className="h-3 w-3" /> 草稿
              </span>
            )}
            <button type="button" onClick={save} disabled={busy} className="btn-gold !px-4 !py-1.5 text-xs">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              保存
            </button>
          </div>
        </div>

        {/* 基本信息 */}
        <div className="rounded-card border border-cream-300 bg-cream-200 p-4 shadow-paper">
          <h3 className="mb-3 flex items-center gap-1.5 text-base font-bold text-ink">
            <Newspaper className="h-4 w-4 text-gold" strokeWidth={1.8} />
            基本信息
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="field-label">标题 *</label>
              <input
                value={form.title}
                onChange={(e) => onTitleChange(e.target.value)}
                placeholder="博客标题"
                className="input-line"
              />
            </div>
            <div>
              <label className="field-label">URL（slug，留空自动生成）</label>
              <div className="flex items-center gap-1">
                <span className="flex-none text-[11px] text-ink-mute">/blog/</span>
                <input
                  value={form.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    set("slug", e.target.value);
                  }}
                  placeholder="my-first-post"
                  className="input-line font-mono text-xs"
                />
              </div>
            </div>
            <div>
              <label className="field-label">作者</label>
              <input
                value={form.author}
                onChange={(e) => set("author", e.target.value)}
                placeholder="署名（可留空）"
                className="input-line"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="field-label">摘要（列表卡片与搜索结果展示）</label>
              <textarea
                value={form.excerpt}
                onChange={(e) => set("excerpt", e.target.value)}
                rows={2}
                placeholder="一两句话概括这篇文章"
                className="input-line resize-y"
              />
            </div>
            <div className="sm:col-span-2">
              <MediaPicker
                value={form.cover_url}
                onChange={(url) => set("cover_url", url)}
                label="博客封面"
                accept="image/*"
                mediaType="image"
              />
            </div>
          </div>
        </div>

        {/* 正文编辑器 */}
        <div className="rounded-card border border-cream-300 bg-cream-200 p-4 shadow-paper">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-1.5 text-base font-bold text-ink">
              <FileText className="h-4 w-4 text-gold" strokeWidth={1.8} />
              正文
            </h3>
            {/* 双模式切换：可视化 / HTML 源码 */}
            <div className="flex gap-1 rounded-soft border border-cream-300 bg-cream-50 p-0.5">
              <button
                type="button"
                onClick={() => {
                  if (mode === "code") {
                    // 源码 → 可视化：把最新内容灌入编辑器
                    setMode("rich");
                  } else {
                    syncFromRich();
                    setMode("code");
                  }
                }}
                className={cn(
                  "rounded-soft px-3 py-1 text-[11px] font-medium transition-colors",
                  mode === "rich" ? "bg-gold/15 text-coffee" : "text-ink-mute hover:text-ink",
                )}
              >
                可视化编辑
              </button>
              <button
                type="button"
                onClick={() => {
                  if (mode === "rich") {
                    syncFromRich();
                    setMode("code");
                  } else {
                    setMode("rich");
                  }
                }}
                className={cn(
                  "rounded-soft px-3 py-1 text-[11px] font-medium transition-colors",
                  mode === "code" ? "bg-gold/15 text-coffee" : "text-ink-mute hover:text-ink",
                )}
              >
                HTML 源码
              </button>
            </div>
          </div>

          {/* 工具栏（仅可视化模式） */}
          {mode === "rich" && (
            <div className="mb-2 flex flex-wrap items-center gap-0.5 rounded-soft border border-cream-300 bg-cream-50 p-1">
              <button type="button" onClick={() => exec("bold")} title="加粗" className={toolbarBtn}><Bold className="h-4 w-4" /></button>
              <button type="button" onClick={() => exec("italic")} title="斜体" className={toolbarBtn}><Italic className="h-4 w-4" /></button>
              <button type="button" onClick={() => exec("underline")} title="下划线" className={toolbarBtn}><Underline className="h-4 w-4" /></button>
              <span className="mx-0.5 h-5 w-px bg-cream-300" />
              <button type="button" onClick={() => exec("formatBlock", "<h2>")} title="二级标题" className={toolbarBtn}><Heading2 className="h-4 w-4" /></button>
              <button type="button" onClick={() => exec("formatBlock", "<h3>")} title="三级标题" className={toolbarBtn}><Heading3 className="h-4 w-4" /></button>
              <button type="button" onClick={() => exec("formatBlock", "<blockquote>")} title="引用" className={toolbarBtn}><Quote className="h-4 w-4" /></button>
              <span className="mx-0.5 h-5 w-px bg-cream-300" />
              <button type="button" onClick={() => exec("insertUnorderedList")} title="无序列表" className={toolbarBtn}><List className="h-4 w-4" /></button>
              <button type="button" onClick={() => exec("insertOrderedList")} title="有序列表" className={toolbarBtn}><ListOrdered className="h-4 w-4" /></button>
              <span className="mx-0.5 h-5 w-px bg-cream-300" />
              <button type="button" onClick={insertLink} title="插入链接" className={toolbarBtn}><Link2 className="h-4 w-4" /></button>
              <button type="button" onClick={() => setInsertImage(true)} title="插入图片" className={toolbarBtn}><ImageIcon className="h-4 w-4" /></button>
              <button type="button" onClick={() => { setVideoUrl(""); setEmbedUrl(""); setInsertVideo(true); }} title="插入视频" className={toolbarBtn}><Video className="h-4 w-4" /></button>
              <button
                type="button"
                onClick={() => insertHtml('<pre><code>// 在这里粘贴代码</code></pre>')}
                title="插入代码块"
                className={toolbarBtn}
              >
                <Code2 className="h-4 w-4" />
              </button>
              <span className="mx-0.5 h-5 w-px bg-cream-300" />
              <button type="button" onClick={() => exec("undo")} title="撤销" className={toolbarBtn}><Undo2 className="h-4 w-4" /></button>
              <button type="button" onClick={() => exec("redo")} title="重做" className={toolbarBtn}><Redo2 className="h-4 w-4" /></button>
              <button type="button" onClick={() => exec("removeFormat")} title="清除格式" className={toolbarBtn}><RemoveFormatting className="h-4 w-4" /></button>
            </div>
          )}

          {/* 可视化编辑区 */}
          {mode === "rich" ? (
            <div
              ref={richRef}
              contentEditable
              suppressContentEditableWarning
              onInput={syncFromRich}
              onBlur={syncFromRich}
              onPaste={(e) => {
                // 粘贴纯文本，避免从 Word/网页带入杂乱样式
                e.preventDefault();
                const text = e.clipboardData.getData("text/plain");
                document.execCommand("insertText", false, text);
                syncFromRich();
              }}
              className="blog-content min-h-[280px] max-h-[520px] overflow-y-auto rounded-soft border border-cream-300 bg-white px-4 py-3 text-sm leading-relaxed text-ink outline-none focus:border-gold"
              data-placeholder="从这里开始写博客… 可用上方工具栏插入图片、视频、代码块"
            />
          ) : (
            <textarea
              value={form.content}
              onChange={(e) => set("content", e.target.value)}
              rows={16}
              placeholder="<p>直接书写 HTML 源码…</p>"
              className="w-full resize-y rounded-soft border border-cream-300 bg-white px-3 py-2 font-mono text-xs text-ink focus:border-gold focus:outline-none"
            />
          )}
          <p className="mt-2 text-[10px] text-ink-mute">
            可视化模式适合日常图文写作；HTML 源码模式适合自定义样式、嵌入第三方代码（如 B 站 iframe）。
          </p>
        </div>

        {/* SEO 设置 */}
        <details className="rounded-card border border-cream-300 bg-cream-200 p-4 shadow-paper">
          <summary className="cursor-pointer text-base font-bold text-ink">
            SEO 与发布设置
          </summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="field-label">元标题（meta title，留空用博客标题）</label>
              <input
                value={form.meta_title}
                onChange={(e) => set("meta_title", e.target.value)}
                placeholder="搜索引擎结果中显示的标题"
                className="input-line"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="field-label">元描述（meta description，留空用摘要）</label>
              <textarea
                value={form.meta_description}
                onChange={(e) => set("meta_description", e.target.value)}
                rows={2}
                placeholder="搜索引擎结果中显示的描述"
                className="input-line resize-y"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="field-label">关键词（逗号分隔，可留空）</label>
              <input
                value={form.keywords}
                onChange={(e) => set("keywords", e.target.value)}
                placeholder="纪念, 旅程, 日记"
                className="input-line"
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2 rounded-soft bg-cream-50 px-3 py-2 sm:col-span-2">
              <input
                type="checkbox"
                checked={form.published}
                onChange={(e) => set("published", e.target.checked)}
                className="h-4 w-4 rounded border-cream-300 text-gold focus:ring-gold"
              />
              <span className="text-sm text-ink">
                发布（勾选后前台博客列表可见；首次发布时间：{fmtDate(form.published_at)}）
              </span>
            </label>
          </div>
        </details>

        {/* 插入图片弹层 */}
        {insertImage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" onClick={() => setInsertImage(false)}>
            <div
              className="w-full max-w-sm rounded-card border border-cream-300 bg-cream-200 p-4 shadow-paper"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-sm font-bold text-ink">插入图片</h4>
                <button type="button" onClick={() => setInsertImage(false)} className="rounded p-1 text-ink-mute hover:bg-cream-100">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <MediaPicker
                value=""
                onChange={(url) => {
                  if (url) {
                    insertHtml(`<img src="${url}" alt="" loading="lazy" />`);
                    setInsertImage(false);
                  }
                }}
                label="选择图片（选定后自动插入光标处）"
                accept="image/*"
                mediaType="image"
              />
            </div>
          </div>
        )}

        {/* 插入视频弹层 */}
        {insertVideo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" onClick={() => setInsertVideo(false)}>
            <div
              className="w-full max-w-sm space-y-3 rounded-card border border-cream-300 bg-cream-200 p-4 shadow-paper"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-ink">插入视频</h4>
                <button type="button" onClick={() => setInsertVideo(false)} className="rounded p-1 text-ink-mute hover:bg-cream-100">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* 方式一：视频文件直链 */}
              <div className="rounded-soft border border-cream-300 bg-cream-50 p-3">
                <p className="mb-2 text-[11px] font-medium text-ink-soft">方式一：视频文件（上传 / 素材库 / 直链）</p>
                <MediaPicker
                  value={videoUrl}
                  onChange={setVideoUrl}
                  label=""
                  accept="video/*"
                  mediaType="video"
                />
                <button
                  type="button"
                  disabled={!videoUrl}
                  onClick={() => {
                    insertHtml(
                      `<video src="${videoUrl}" controls playsinline preload="metadata"></video>`,
                    );
                    setInsertVideo(false);
                  }}
                  className="btn-gold mt-2 w-full !py-1.5 text-xs disabled:opacity-50"
                >
                  插入视频文件
                </button>
              </div>

              {/* 方式二：嵌入链接（B站/YouTube 等） */}
              <div className="rounded-soft border border-cream-300 bg-cream-50 p-3">
                <p className="mb-2 text-[11px] font-medium text-ink-soft">
                  方式二：嵌入播放器（B 站分享「嵌入代码」里的 src 地址 / YouTube embed 链接）
                </p>
                <input
                  value={embedUrl}
                  onChange={(e) => setEmbedUrl(e.target.value)}
                  placeholder="https://player.bilibili.com/player.html?…"
                  className="input-line text-xs"
                />
                <button
                  type="button"
                  disabled={!embedUrl.trim()}
                  onClick={() => {
                    insertHtml(
                      `<div class="video-embed"><iframe src="${embedUrl.trim()}" allowfullscreen scrolling="no" border="0" frameborder="no" framespacing="0"></iframe></div>`,
                    );
                    setInsertVideo(false);
                  }}
                  className="btn-gold mt-2 w-full !py-1.5 text-xs disabled:opacity-50"
                >
                  插入嵌入播放器
                </button>
              </div>
            </div>
          </div>
        )}

        {hint && <p className="text-xs text-coffee">{hint}</p>}
      </div>
    );
  }

  /* ========== 列表视图 ========== */
  const filtered = list.filter(
    (b) =>
      !search.trim() ||
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      b.slug.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-5">
      {/* 顶部操作区 */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setForm({ ...EMPTY_FORM });
            setSlugTouched(false);
            setMode("rich");
            setHint(null);
          }}
          className="btn-gold !px-4 !py-2 text-xs"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={1.8} />
          写新博客
        </button>
        <div className="ml-auto flex items-center gap-1.5 rounded-soft border border-cream-300 bg-cream-50 px-2.5 py-1.5">
          <Search className="h-3.5 w-3.5 text-ink-mute" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索标题 / URL…"
            className="w-36 bg-transparent text-xs text-ink outline-none placeholder:text-ink-mute"
          />
        </div>
        <a
          href="/#/blog"
          target="_blank"
          rel="noreferrer"
          className="btn-ghost !px-3 !py-2 text-xs"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          查看博客页
        </a>
      </div>

      {hint && <p className="text-xs text-coffee">{hint}</p>}

      {/* 博客列表 */}
      <div className="rounded-card border border-cream-300 bg-cream-200 p-4">
        <h3 className="mb-3 flex items-center gap-1.5 text-base font-bold text-ink">
          <Newspaper className="h-4 w-4 text-gold" strokeWidth={1.8} />
          全部博客（{list.length}）
        </h3>

        {loading && (
          <div className="flex items-center justify-center gap-2 py-8 text-xs text-ink-soft">
            <Loader2 className="h-4 w-4 animate-spin" />
            加载博客中…
          </div>
        )}

        {!loading && loadError && (
          <div className="rounded-soft border border-rose-200 bg-rose-50/80 px-3 py-3 text-xs text-rose-600">
            <div className="font-semibold">加载博客列表失败</div>
            <div className="mt-1 break-all opacity-90">
              {loadError}（请确认已执行 supabase/v6_blog_nav_social.sql）
            </div>
            <button type="button" onClick={() => load()} className="btn-gold mt-2 !py-1 text-[11px]">
              重试
            </button>
          </div>
        )}

        {!loading && !loadError && filtered.length === 0 && (
          <div className="flex flex-col items-center py-8 text-ink-mute">
            <Newspaper className="h-6 w-6" strokeWidth={1.4} />
            <p className="mt-2 text-xs">
              {list.length === 0 ? "还没有博客，点击上方「写新博客」开始创作" : "没有匹配的博客"}
            </p>
          </div>
        )}

        <div className="space-y-3">
          {filtered.map((b) => (
            <div key={b.id} className="flex gap-3 rounded-soft border border-cream-300 bg-cream-50 p-3">
              {/* 封面 */}
              <div className="h-20 w-20 flex-none overflow-hidden rounded-soft bg-cream-100">
                {b.cover_url ? (
                  <img src={b.cover_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-ink-mute">
                    <ImageIcon className="h-5 w-5" strokeWidth={1.4} />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h4 className="truncate text-sm font-semibold text-ink">{b.title || "(无标题)"}</h4>
                  {b.published ? (
                    <span className="flex-none rounded bg-emerald-100 px-1 text-[9px] font-medium text-emerald-700">已发布</span>
                  ) : (
                    <span className="flex-none rounded bg-cream-200 px-1 text-[9px] font-medium text-ink-mute">草稿</span>
                  )}
                </div>
                <a
                  href={`/#/blog/${b.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-0.5 inline-flex items-center gap-1 font-mono text-[10px] text-coffee/70 hover:text-gold hover:underline"
                >
                  /blog/{b.slug}
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
                <p className="mt-1 line-clamp-1 text-[11px] text-ink-soft">{b.excerpt || "(无摘要)"}</p>
                <div className="mt-1.5 flex items-center gap-2 text-[10px] text-ink-mute">
                  <span>发布：{fmtDate(b.published_at)}</span>
                  <span>更新：{fmtDate(b.updated_at)}</span>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setForm({
                        id: b.id,
                        title: b.title,
                        slug: b.slug,
                        excerpt: b.excerpt,
                        cover_url: b.cover_url ?? "",
                        meta_title: b.meta_title ?? "",
                        meta_description: b.meta_description ?? "",
                        keywords: b.keywords ?? "",
                        author: b.author,
                        content: b.content,
                        published: b.published,
                        published_at: b.published_at,
                      });
                      setSlugTouched(true);
                      setMode("rich");
                      setHint(null);
                    }}
                    className="flex items-center gap-1 rounded-soft border border-cream-300 px-2 py-1 text-[10px] font-medium text-ink-soft hover:text-coffee"
                  >
                    <Pencil className="h-3 w-3" />
                    编辑
                  </button>
                  <button
                    type="button"
                    onClick={() => togglePublished(b)}
                    className="flex items-center gap-1 rounded-soft border border-cream-300 px-2 py-1 text-[10px] font-medium text-ink-soft hover:text-coffee"
                  >
                    {b.published ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    {b.published ? "转为草稿" : "发布"}
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(b)}
                    className="ml-auto flex items-center gap-1 rounded-soft border border-rust/20 bg-rust/5 px-2 py-1 text-[10px] font-medium text-rust hover:bg-rust/10"
                  >
                    <Trash2 className="h-3 w-3" />
                    删除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
