import { useEffect, useState } from "react";
import { Trash2, Plus, Loader2, Save, Upload, Type, Image as ImageIcon } from "lucide-react";
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
};

const EMPTY: Form = {
  content_key: "",
  page: "global",
  label: "",
  type: "text",
  content_value: "",
  image_url: "",
  sort_order: "",
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

  const filtered =
    filterPage === "all" ? list : list.filter((c) => c.page === filterPage);

  // 合并默认项（若数据库未初始化，展示默认项供编辑创建）
  const knownKeys = new Set(list.map((c) => c.content_key));
  const defaultsToShow = CONTENT_DEFAULTS.filter(
    (d) => !knownKeys.has(d.content_key) && (filterPage === "all" || d.page === filterPage),
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
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `content-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("covers")
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (upErr) {
        setBusy(false);
        setHint(`图片上传失败：${upErr.message}`);
        return;
      }
      const { data: pub } = supabase.storage.from("covers").getPublicUrl(path);
      imageUrl = pub.publicUrl;
    }

    const { error } = await supabase.from("site_content").upsert({
      content_key: form.content_key.trim(),
      page: form.page,
      label: form.label.trim(),
      type: form.type,
      content_value: form.content_value || null,
      image_url: imageUrl,
      sort_order: form.sort_order ? Number(form.sort_order) : 0,
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

  return (
    <div className="space-y-5">
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
                    c.image_url ? (
                      <img
                        src={c.image_url}
                        alt={c.label}
                        className="mt-1.5 h-16 w-full rounded object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <p className="mt-1 text-[11px] text-ink-mute">无图片</p>
                    )
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
      </div>
    </div>
  );
}
