import { useEffect, useRef, useState } from "react";
import {
  Trash2, Plus, Loader2, Save, Upload, Type, Image as ImageIcon,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { CONTENT_DEFAULTS } from "@/lib/config";
import type { SiteContent, ContentType } from "@/lib/types";
import { cn } from "@/lib/utils";

type Form = {
  content_key: string;
  page: string;
  label: string;
  type: ContentType;
  content_value: string;
  image_url: string;
  sort_order: string;
  font_size: string;
  font_weight: string;
  text_color: string;
  letter_spacing: string;
  text_align: "left" | "center" | "right" | "";
};

const EMPTY: Form = {
  content_key: "",
  page: "global",
  label: "",
  type: "text",
  content_value: "",
  image_url: "",
  sort_order: "",
  font_size: "",
  font_weight: "",
  text_color: "",
  letter_spacing: "",
  text_align: "",
};

const PAGE_LABELS: Record<string, string> = {
  global: "全局",
  home: "首页",
  map: "地图",
  letter: "长信",
  messages: "留言",
  gallery: "相册",
  posts: "帖子",
};

const LOGO_KEY = "global.logo_image";

/** 上传图片到 covers 桶，返回公开 URL */
async function uploadImage(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `content-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage
    .from("covers")
    .upload(path, file, { cacheControl: "3600", upsert: false });
  if (error) throw error;
  const { data: pub } = supabase.storage.from("covers").getPublicUrl(path);
  return pub.publicUrl;
}

export default function ContentManager() {
  const [list, setList] = useState<SiteContent[]>([]);
  const [filterPage, setFilterPage] = useState<string>("all");
  const [form, setForm] = useState<Form>(EMPTY);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  // 编辑态：记录当前正在编辑的 key（行内展开）
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  // 图片行内上传：目标行与上传状态
  const [imageTarget, setImageTarget] = useState<string | null>(null);
  const [imageBusy, setImageBusy] = useState(false);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const rowInputRef = useRef<HTMLInputElement | null>(null);

  async function load() {
    const { data } = await supabase
      .from("site_content")
      .select("*")
      .order("page", { ascending: true })
      .order("sort_order", { ascending: true });
    setList((data as SiteContent[]) ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  const logoRow = list.find((c) => c.content_key === LOGO_KEY);

  const filtered =
    filterPage === "all" ? list : list.filter((c) => c.page === filterPage);

  // 合并默认项（若数据库未初始化，展示默认项供编辑创建）
  // Logo 图片由顶部 Logo 卡片单独管理，列表中不再重复展示
  const knownKeys = new Set(list.map((c) => c.content_key));
  const defaultsToShow = CONTENT_DEFAULTS.filter(
    (d) =>
      d.content_key !== LOGO_KEY &&
      !knownKeys.has(d.content_key) &&
      (filterPage === "all" || d.page === filterPage),
  );

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.content_key.trim() || !form.label.trim()) {
      setHint("请填写内容标识与显示名称");
      return;
    }
    setBusy(true);
    setHint(null);

    let imageUrl = form.image_url.trim() || null;

    // 若为图片类型且选择了文件，先上传
    if (form.type === "image" && file) {
      try {
        imageUrl = await uploadImage(file);
      } catch (upErr) {
        setBusy(false);
        setHint(`图片上传失败：${(upErr as Error).message}`);
        return;
      }
    }

    const { error } = await supabase.from("site_content").upsert({
      content_key: form.content_key.trim(),
      page: form.page,
      label: form.label.trim(),
      type: form.type,
      content_value: form.content_value || null,
      image_url: imageUrl,
      sort_order: form.sort_order ? Number(form.sort_order) : 0,
      font_size: form.font_size || null,
      font_weight: form.font_weight || null,
      text_color: form.text_color || null,
      letter_spacing: form.letter_spacing || null,
      text_align: form.text_align || null,
      updated_at: new Date().toISOString(),
    });

    setBusy(false);
    if (error) {
      setHint(`保存失败：${error.message}`);
      return;
    }
    setHint("内容已保存");
    setForm(EMPTY);
    setFile(null);
    load();
  }

  function startEdit(c: SiteContent) {
    setEditingKey(c.content_key);
    setEditValue(c.content_value ?? "");
  }

  async function saveEdit(c: SiteContent) {
    setBusy(true);
    const { error } = await supabase
      .from("site_content")
      .update({ content_value: editValue, updated_at: new Date().toISOString() })
      .eq("id", c.id);
    setBusy(false);
    if (error) {
      setHint(`保存失败：${error.message}`);
      return;
    }
    setEditingKey(null);
    load();
  }

  async function handleDelete(c: SiteContent) {
    if (!confirm(`确认删除「${c.label}」？`)) return;
    await supabase.from("site_content").delete().eq("id", c.id);
    load();
  }

  async function quickCreateDefault(key: string) {
    const def = CONTENT_DEFAULTS.find((d) => d.content_key === key);
    if (!def) return;
    setBusy(true);
    const { error } = await supabase.from("site_content").insert({
      content_key: def.content_key,
      page: def.page,
      label: def.label,
      type: def.type,
      content_value: def.content_value,
      image_url: def.image_url,
      sort_order: def.sort_order,
    });
    setBusy(false);
    if (error) setHint(`创建失败：${error.message}`);
    else load();
  }

  // ============ Logo 上传 / 清除 ============

  async function saveLogo(url: string | null) {
    const def = CONTENT_DEFAULTS.find((d) => d.content_key === LOGO_KEY);
    const { error } = await supabase.from("site_content").upsert({
      content_key: LOGO_KEY,
      page: "global",
      label: def?.label ?? "Logo 图片（优先显示）",
      type: "image",
      content_value: null,
      image_url: url,
      sort_order: def?.sort_order ?? 5,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      setHint(`Logo 保存失败：${error.message}`);
      return false;
    }
    return true;
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setImageBusy(true);
    setHint(null);
    try {
      const url = await uploadImage(f);
      if (await saveLogo(url)) {
        setHint("✓ Logo 已更新，前台顶部即时生效");
        await load();
      }
    } catch (err) {
      setHint(`Logo 上传失败：${(err as Error).message}`);
    }
    setImageBusy(false);
  }

  async function handleLogoClear() {
    if (!logoRow) return;
    setImageBusy(true);
    if (await saveLogo(null)) {
      setHint("已清除 Logo 图片，前台将显示 Logo 文字");
      await load();
    }
    setImageBusy(false);
  }

  // ============ 图片行的行内上传 / 清除 ============

  async function handleRowImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f || !imageTarget) return;
    const row = list.find((c) => c.id === imageTarget);
    if (!row) return;
    setImageBusy(true);
    setHint(null);
    try {
      const url = await uploadImage(f);
      const { error } = await supabase
        .from("site_content")
        .update({ image_url: url, updated_at: new Date().toISOString() })
        .eq("id", row.id);
      if (error) setHint(`图片保存失败：${error.message}`);
      else {
        setHint(`✓「${row.label}」图片已更新`);
        await load();
      }
    } catch (err) {
      setHint(`图片上传失败：${(err as Error).message}`);
    }
    setImageBusy(false);
    setImageTarget(null);
  }

  async function handleRowImageClear(c: SiteContent) {
    setImageBusy(true);
    const { error } = await supabase
      .from("site_content")
      .update({ image_url: null, updated_at: new Date().toISOString() })
      .eq("id", c.id);
    if (error) setHint(`清除失败：${error.message}`);
    else {
      setHint(`已清除「${c.label}」的图片`);
      await load();
    }
    setImageBusy(false);
  }

  return (
    <div className="space-y-5">
      {/* Logo 上传快捷入口 */}
      <div className="rounded-card border border-coffee-line/70 bg-cream-200 p-4 shadow-paper">
        <h3 className="mb-1 flex items-center gap-1.5 font-hand text-base text-ink">
          <ImageIcon className="h-4 w-4 text-gold" strokeWidth={1.8} />
          Logo 图片
        </h3>
        <p className="mb-3 text-[10px] text-ink-mute">
          上传后前台顶部优先显示图片 Logo；未上传时显示 Logo 文字（可在下方列表「全局」中修改）
        </p>
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-28 flex-none items-center justify-center overflow-hidden rounded-soft border border-coffee-line/50 bg-cream-50">
            {logoRow?.image_url ? (
              <img src={logoRow.image_url} alt="Logo" className="max-h-full max-w-full object-contain" />
            ) : (
              <span className="text-[10px] text-ink-mute">未设置</span>
            )}
          </div>
          <div className="flex flex-1 flex-col gap-2">
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoUpload}
            />
            <button
              type="button"
              disabled={imageBusy}
              onClick={() => logoInputRef.current?.click()}
              className="btn-gold !py-1.5 text-xs"
            >
              {imageBusy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.8} />
              ) : (
                <Upload className="h-3.5 w-3.5" strokeWidth={1.8} />
              )}
              {logoRow?.image_url ? "替换 Logo" : "上传 Logo"}
            </button>
            {logoRow?.image_url && (
              <button
                type="button"
                disabled={imageBusy}
                onClick={handleLogoClear}
                className="btn-ghost !py-1.5 text-xs"
              >
                <X className="h-3.5 w-3.5" strokeWidth={1.8} />
                清除（改用文字）
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 新增表单 */}
      <form
        onSubmit={handleCreate}
        className="rounded-card border border-coffee-line/70 bg-cream-200 p-4 shadow-paper"
      >
        <h3 className="mb-3 font-hand text-base text-ink">新增 / 编辑内容</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">内容标识 key</label>
            <input
              value={form.content_key}
              onChange={(e) => setForm({ ...form, content_key: e.target.value })}
              placeholder="如 home.footer"
              className="input-line"
            />
          </div>
          <div>
            <label className="field-label">所属页面</label>
            <select
              value={form.page}
              onChange={(e) => setForm({ ...form, page: e.target.value })}
              className="input-line"
            >
              {Object.entries(PAGE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">显示名称</label>
            <input
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="如 首页底部文字"
              className="input-line"
            />
          </div>
          <div>
            <label className="field-label">类型</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as ContentType })}
              className="input-line"
            >
              <option value="text">单行文本</option>
              <option value="longtext">长文本</option>
              <option value="image">图片</option>
            </select>
          </div>
        </div>

        {form.type !== "image" ? (
          <div className="mt-3">
            <label className="field-label">文本内容</label>
            <textarea
              value={form.content_value}
              onChange={(e) => setForm({ ...form, content_value: e.target.value })}
              rows={form.type === "longtext" ? 5 : 2}
              placeholder={form.type === "longtext" ? "段落之间用空行分隔" : "文本内容"}
              className="mt-1 w-full resize-none rounded-soft border border-coffee-line/70 bg-cream-50/60 px-3 py-2 text-sm focus:border-gold focus:outline-none"
            />
            {/* 文字样式 */}
            <div className="mt-3 rounded-soft border border-dashed border-coffee-line/50 bg-cream-100/50 p-2.5">
              <p className="mb-2 text-[11px] font-medium text-ink-soft">文字样式（留空则跟随全局）</p>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="field-label">字号</label>
                  <input
                    value={form.font_size}
                    onChange={(e) => setForm({ ...form, font_size: e.target.value })}
                    placeholder="如 16px"
                    className="input-line text-xs"
                  />
                </div>
                <div>
                  <label className="field-label">字重</label>
                  <select
                    value={form.font_weight}
                    onChange={(e) => setForm({ ...form, font_weight: e.target.value })}
                    className="input-line text-xs"
                  >
                    <option value="">默认</option>
                    <option value="300">细 (300)</option>
                    <option value="400">常规 (400)</option>
                    <option value="500">中 (500)</option>
                    <option value="600">半粗 (600)</option>
                    <option value="700">粗 (700)</option>
                  </select>
                </div>
                <div>
                  <label className="field-label">颜色</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="color"
                      value={form.text_color || "#000000"}
                      onChange={(e) => setForm({ ...form, text_color: e.target.value })}
                      className="h-7 w-8 flex-none cursor-pointer rounded border border-coffee-line/50 bg-transparent"
                    />
                    {form.text_color && (
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, text_color: "" })}
                        className="text-[9px] text-ink-mute hover:text-rust"
                      >
                        清除
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <label className="field-label">字距</label>
                  <input
                    value={form.letter_spacing}
                    onChange={(e) => setForm({ ...form, letter_spacing: e.target.value })}
                    placeholder="如 1px"
                    className="input-line text-xs"
                  />
                </div>
                <div>
                  <label className="field-label">对齐</label>
                  <select
                    value={form.text_align}
                    onChange={(e) => setForm({ ...form, text_align: e.target.value as Form["text_align"] })}
                    className="input-line text-xs"
                  >
                    <option value="">默认</option>
                    <option value="left">左对齐</option>
                    <option value="center">居中</option>
                    <option value="right">右对齐</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-3">
            <label className="field-label">图片（上传或填写 URL）</label>
            <label className="mt-1 flex cursor-pointer items-center justify-center gap-2 rounded-soft border border-dashed border-coffee-line bg-cream-50/60 py-4 text-xs text-ink-soft transition-colors hover:border-gold hover:text-coffee">
              <Upload className="h-3.5 w-3.5" strokeWidth={1.8} />
              {file ? file.name : "点击上传图片"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <input
              value={form.image_url}
              onChange={(e) => setForm({ ...form, image_url: e.target.value })}
              placeholder="或填写图片 URL"
              className="input-line mt-2"
            />
          </div>
        )}

        <div className="mt-3">
          <label className="field-label">排序（可选）</label>
          <input
            value={form.sort_order}
            onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
            placeholder="0"
            inputMode="numeric"
            className="input-line"
          />
        </div>

        {hint && <p className="mt-3 text-xs text-coffee">{hint}</p>}

        <button type="submit" disabled={busy} className="btn-gold mt-4">
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.8} />
          ) : (
            <Plus className="h-3.5 w-3.5" strokeWidth={1.8} />
          )}
          保存内容
        </button>
      </form>

      {/* 筛选 + 列表 */}
      <div className="rounded-card border border-coffee-line/70 bg-cream-200/60 p-4">
        <div className="mb-3 flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setFilterPage("all")}
            className={cn(
              "flex-none rounded-soft px-2.5 py-1 text-xs transition-colors",
              filterPage === "all" ? "bg-gold/20 text-coffee" : "text-ink-mute hover:text-ink-soft",
            )}
          >
            全部
          </button>
          {Object.entries(PAGE_LABELS).map(([k, v]) => (
            <button
              key={k}
              type="button"
              onClick={() => setFilterPage(k)}
              className={cn(
                "flex-none rounded-soft px-2.5 py-1 text-xs transition-colors",
                filterPage === k ? "bg-gold/20 text-coffee" : "text-ink-mute hover:text-ink-soft",
              )}
            >
              {v}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {filtered.map((c) => (
            <div
              key={c.id}
              className="rounded-soft border border-coffee-line/50 bg-cream-50/60 p-2.5"
            >
              <div className="flex items-start gap-2">
                <span className="mt-0.5 flex-none">
                  {c.type === "image" ? (
                    <ImageIcon className="h-3.5 w-3.5 text-gold" strokeWidth={1.8} />
                  ) : (
                    <Type className="h-3.5 w-3.5 text-gold" strokeWidth={1.8} />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-hand text-sm text-ink">{c.label}</span>
                    <span className="flex-none text-[10px] text-ink-mute">
                      {PAGE_LABELS[c.page] ?? c.page} · {c.content_key}
                    </span>
                  </div>
                  {c.type === "image" ? (
                    <div className="mt-1.5">
                      {c.image_url ? (
                        <img
                          src={c.image_url}
                          alt={c.label}
                          className="h-16 w-full rounded object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <p className="mt-1 text-[11px] text-ink-mute">无图片</p>
                      )}
                      <div className="mt-1.5 flex gap-1.5">
                        <button
                          type="button"
                          disabled={imageBusy}
                          onClick={() => {
                            setImageTarget(c.id);
                            setTimeout(() => rowInputRef.current?.click(), 0);
                          }}
                          className="btn-ghost !px-2 !py-1 text-[10px]"
                        >
                          <Upload className="h-3 w-3" strokeWidth={1.8} />
                          {c.image_url ? "替换图片" : "上传图片"}
                        </button>
                        {c.image_url && (
                          <button
                            type="button"
                            disabled={imageBusy}
                            onClick={() => handleRowImageClear(c)}
                            className="btn-ghost !px-2 !py-1 text-[10px]"
                          >
                            <X className="h-3 w-3" strokeWidth={1.8} />
                            清除
                          </button>
                        )}
                      </div>
                    </div>
                  ) : editingKey === c.content_key ? (
                    <div className="mt-1.5">
                      <textarea
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        rows={c.type === "longtext" ? 5 : 2}
                        className="w-full resize-none rounded-soft border border-coffee-line/70 bg-cream-50 px-2 py-1.5 text-xs focus:border-gold focus:outline-none"
                      />
                      <div className="mt-1.5 flex gap-2">
                        <button
                          type="button"
                          onClick={() => saveEdit(c)}
                          disabled={busy}
                          className="btn-gold !px-2 !py-1 text-[11px]"
                        >
                          <Save className="h-3 w-3" strokeWidth={1.8} />
                          保存
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingKey(null)}
                          className="btn-ghost !px-2 !py-1 text-[11px]"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-ink-soft">
                      {c.content_value || "(空)"}
                    </p>
                  )}
                </div>
                {editingKey !== c.content_key && (
                  <div className="flex flex-none gap-1">
                    {c.type !== "image" && (
                      <button
                        type="button"
                        onClick={() => startEdit(c)}
                        aria-label="编辑"
                        className="rounded p-1 text-ink-soft transition-colors hover:bg-cream-200 hover:text-coffee"
                      >
                        <Type className="h-3.5 w-3.5" strokeWidth={1.8} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(c)}
                      aria-label="删除"
                      className="rounded p-1 text-rust/70 transition-colors hover:bg-rust/10 hover:text-rust"
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* 未初始化的默认内容项，提供快捷创建 */}
          {defaultsToShow.map((d) => (
            <div
              key={d.content_key}
              className="flex items-center justify-between gap-2 rounded-soft border border-dashed border-coffee-line/50 bg-cream-50/30 p-2.5"
            >
              <div className="min-w-0">
                <span className="font-hand text-sm text-ink-soft">{d.label}</span>
                <p className="text-[10px] text-ink-mute">
                  {PAGE_LABELS[d.page] ?? d.page} · {d.content_key} · 未创建
                </p>
              </div>
              <button
                type="button"
                onClick={() => quickCreateDefault(d.content_key)}
                disabled={busy}
                className="btn-ghost flex-none !px-2 !py-1 text-[11px]"
              >
                <Plus className="h-3 w-3" strokeWidth={1.8} />
                创建
              </button>
            </div>
          ))}

          {filtered.length === 0 && defaultsToShow.length === 0 && (
            <p className="py-6 text-center text-xs text-ink-mute">暂无内容</p>
          )}
        </div>

        {/* 图片行行内上传用的共享文件选择器 */}
        <input
          ref={rowInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleRowImageUpload}
        />
      </div>
    </div>
  );
}
