import { useEffect, useState } from "react";
import { Trash2, Plus, Loader2, Upload, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Photo, Footprint } from "@/lib/types";

export default function PhotoManager() {
  const [list, setList] = useState<Photo[]>([]);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [city, setCity] = useState("");
  const [cities, setCities] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  async function load() {
    const [photoRes, fpRes] = await Promise.all([
      supabase.from("photos").select("*").order("photo_date", { ascending: false }),
      supabase.from("footprints").select("name").order("sort_order", { ascending: true }),
    ]);
    setList((photoRes.data as Photo[]) ?? []);
    setCities(((fpRes.data as Footprint[] | null) ?? []).map((f) => f.name));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setHint("请先选择一张照片");
      return;
    }
    if (!title.trim()) {
      setHint("请填写标题");
      return;
    }
    setBusy(true);
    setHint(null);

    // 1. 上传到 Storage
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("gallery")
      .upload(path, file, { cacheControl: "3600", upsert: false });

    if (upErr) {
      setBusy(false);
      setHint(`上传失败：${upErr.message}`);
      return;
    }

    // 2. 获取公共 URL
    const { data: pub } = supabase.storage.from("gallery").getPublicUrl(path);
    const publicUrl = pub.publicUrl;

    // 3. 写入 photos 表（含所属城市，中文名称）
    const { error: dbErr } = await supabase.from("photos").insert({
      title: title.trim(),
      photo_date: date || null,
      city: city.trim() || null,
      storage_path: path,
      public_url: publicUrl,
    });

    setBusy(false);
    if (dbErr) {
      setHint(`保存记录失败：${dbErr.message}`);
      return;
    }
    setHint("照片已上传");
    setTitle("");
    setDate("");
    setCity("");
    setFile(null);
    load();
  }

  async function handleDelete(p: Photo) {
    if (!confirm(`确认删除「${p.title}」？`)) return;
    // 先删记录，再删 Storage 对象
    await supabase.from("photos").delete().eq("id", p.id);
    await supabase.storage.from("gallery").remove([p.storage_path]);
    load();
  }

  return (
    <div className="space-y-5">
      {/* 上传表单 */}
      <form
        onSubmit={handleUpload}
        className="rounded-card border border-coffee-line/70 bg-cream-200 p-4 shadow-paper"
      >
        <h3 className="mb-3 font-hand text-base text-ink">上传新照片</h3>

        <label className="field-label">选择照片</label>
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
            <label className="field-label">标题</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="如 橘子洲头"
              className="input-line"
            />
          </div>
          <div>
            <label className="field-label">日期（可选）</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input-line"
            />
          </div>
        </div>

        <div className="mt-3">
          <label className="field-label">所属城市（中文，可选）</label>
          <input
            list="city-options"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="如 长沙"
            className="input-line"
          />
          <datalist id="city-options">
            {cities.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>

        {hint && <p className="mt-3 text-xs text-coffee">{hint}</p>}

        <button type="submit" disabled={busy} className="btn-gold mt-4">
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.8} />
          ) : (
            <Plus className="h-3.5 w-3.5" strokeWidth={1.8} />
          )}
          上传照片
        </button>
      </form>

      {/* 照片列表 */}
      <div className="rounded-card border border-coffee-line/70 bg-cream-200/60 p-4">
        <h3 className="mb-3 font-hand text-base text-ink">
          已有照片（{list.length}）
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {list.map((p) => (
            <div
              key={p.id}
              className="group relative overflow-hidden rounded-soft border border-coffee-line/50 bg-cream-50"
            >
              <div className="aspect-square">
                <img
                  src={p.public_url}
                  alt={p.title}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="p-1.5">
                <p className="truncate font-hand text-[11px] text-ink">
                  {p.title}
                </p>
                <div className="flex items-center gap-1">
                  {p.city && (
                    <span className="rounded bg-gold/15 px-1 text-[9px] text-coffee">
                      {p.city}
                    </span>
                  )}
                  {p.photo_date && (
                    <p className="text-[9px] text-ink-mute">{p.photo_date}</p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(p)}
                aria-label="删除"
                className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-ink/40 text-cream-50 opacity-0 transition-opacity group-hover:opacity-100"
              >
                <Trash2 className="h-3 w-3" strokeWidth={1.8} />
              </button>
            </div>
          ))}
          {list.length === 0 && (
            <div className="col-span-3 flex flex-col items-center py-8 text-ink-mute">
              <ImageIcon className="h-6 w-6" strokeWidth={1.4} />
              <p className="mt-2 text-xs">还没有照片</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
