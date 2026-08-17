import { useEffect, useState } from "react";
import { Trash2, Plus, Loader2, Upload, Image as ImageIcon, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Banner } from "@/lib/types";
import { cn } from "@/lib/utils";

type Form = {
  title: string;
  subtitle: string;
  link: string;
  sort_order: string;
};

const EMPTY: Form = { title: "", subtitle: "", link: "", sort_order: "" };

export default function BannerManager() {
  const [list, setList] = useState<Banner[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase
      .from("banners")
      .select("*")
      .order("sort_order", { ascending: true });
    setList((data as Banner[]) ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setHint("请先选择一张 Banner 图");
      return;
    }
    setBusy(true);
    setHint(null);

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `banner-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("covers")
      .upload(path, file, { cacheControl: "3600", upsert: false });

    if (upErr) {
      setBusy(false);
      setHint(`上传失败：${upErr.message}`);
      return;
    }
    const { data: pub } = supabase.storage.from("covers").getPublicUrl(path);

    const { error: dbErr } = await supabase.from("banners").insert({
      image_url: pub.publicUrl,
      title: form.title.trim() || null,
      subtitle: form.subtitle.trim() || null,
      link: form.link.trim() || null,
      sort_order: form.sort_order ? Number(form.sort_order) : list.length + 1,
      active: true,
    });

    setBusy(false);
    if (dbErr) {
      setHint(`保存失败：${dbErr.message}`);
      return;
    }
    setHint("Banner 已添加");
    setForm(EMPTY);
    setFile(null);
    load();
  }

  async function handleDelete(b: Banner) {
    if (!confirm("确认删除这张 Banner？")) return;
    await supabase.from("banners").delete().eq("id", b.id);
    load();
  }

  async function toggleActive(b: Banner) {
    await supabase.from("banners").update({ active: !b.active }).eq("id", b.id);
    load();
  }

  return (
    <div className="space-y-5">
      {/* 上传表单 */}
      <form
        onSubmit={handleUpload}
        className="rounded-card border border-coffee-line/70 bg-cream-200 p-4 shadow-paper"
      >
        <h3 className="mb-3 font-hand text-base text-ink">新增 Banner 图</h3>

        <label className="field-label">选择图片（建议 16:10 横图）</label>
        <label className="mt-1 flex cursor-pointer items-center justify-center gap-2 rounded-soft border border-dashed border-coffee-line bg-cream-50/60 py-5 text-sm text-ink-soft transition-colors hover:border-gold hover:text-coffee">
          <Upload className="h-4 w-4" strokeWidth={1.8} />
          {file ? file.name : "点击选择文件"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">标题（可选）</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="如 记录"
              className="input-line"
            />
          </div>
          <div>
            <label className="field-label">副标题（可选）</label>
            <input
              value={form.subtitle}
              onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
              placeholder="如 走过的地方"
              className="input-line"
            />
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">跳转链接（可选）</label>
            <input
              value={form.link}
              onChange={(e) => setForm({ ...form, link: e.target.value })}
              placeholder="#/map"
              className="input-line"
            />
          </div>
          <div>
            <label className="field-label">排序</label>
            <input
              value={form.sort_order}
              onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
              placeholder="自动"
              inputMode="numeric"
              className="input-line"
            />
          </div>
        </div>

        {hint && <p className="mt-3 text-xs text-coffee">{hint}</p>}

        <button type="submit" disabled={busy} className="btn-gold mt-4">
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.8} />
          ) : (
            <Plus className="h-3.5 w-3.5" strokeWidth={1.8} />
          )}
          添加 Banner
        </button>
      </form>

      {/* Banner 列表 */}
      <div className="rounded-card border border-coffee-line/70 bg-cream-200/60 p-4">
        <h3 className="mb-3 font-hand text-base text-ink">
          已有 Banner（{list.length}）
        </h3>
        <div className="space-y-3">
          {list.map((b) => (
            <div
              key={b.id}
              className={cn(
                "overflow-hidden rounded-soft border border-coffee-line/50 bg-cream-50/60",
                !b.active && "opacity-50",
              )}
            >
              <div className="relative aspect-[16/10] bg-cream-200">
                <img
                  src={b.image_url}
                  alt={b.title ?? "banner"}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex items-center justify-between gap-2 p-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-hand text-sm text-ink">
                    {b.title || "(无标题)"}
                  </p>
                  {b.subtitle && (
                    <p className="truncate text-[11px] text-ink-mute">{b.subtitle}</p>
                  )}
                  <p className="text-[10px] text-ink-mute">排序 #{b.sort_order}</p>
                </div>
                <div className="flex flex-none gap-1">
                  <button
                    type="button"
                    onClick={() => toggleActive(b)}
                    aria-label={b.active ? "隐藏" : "显示"}
                    className="rounded p-1.5 text-ink-soft transition-colors hover:bg-cream-200 hover:text-coffee"
                  >
                    {b.active ? (
                      <Eye className="h-3.5 w-3.5" strokeWidth={1.8} />
                    ) : (
                      <EyeOff className="h-3.5 w-3.5" strokeWidth={1.8} />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(b)}
                    aria-label="删除"
                    className="rounded p-1.5 text-rust/70 transition-colors hover:bg-rust/10 hover:text-rust"
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {list.length === 0 && (
            <div className="flex flex-col items-center py-8 text-ink-mute">
              <ImageIcon className="h-6 w-6" strokeWidth={1.4} />
              <p className="mt-2 text-xs">还没有 Banner</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
