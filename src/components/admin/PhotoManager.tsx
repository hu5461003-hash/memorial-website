import { useEffect, useState } from "react";
import { Trash2, Plus, Loader2, Upload, Image as ImageIcon, X, FileImage } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Photo, Footprint } from "@/lib/types";

type PendingFile = {
  file: File;
  preview: string;
  title: string;
};

export default function PhotoManager() {
  const [list, setList] = useState<Photo[]>([]);
  const [titlePrefix, setTitlePrefix] = useState("");
  const [date, setDate] = useState("");
  const [city, setCity] = useState("");
  const [cities, setCities] = useState<string[]>([]);
  const [pending, setPending] = useState<PendingFile[]>([]);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ ok: number; fail: number; total: number } | null>(null);

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

  // ============ 多选文件 ============
  function handleSelectFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const newItems: PendingFile[] = [];
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      const preview = URL.createObjectURL(file);
      // 默认标题：去掉扩展名的文件名
      const baseName = file.name.replace(/\.[^.]+$/, "");
      newItems.push({ file, preview, title: baseName });
    });
    setPending((prev) => [...prev, ...newItems]);
    setHint(null);
  }

  function updatePendingTitle(idx: number, title: string) {
    setPending((prev) => prev.map((p, i) => (i === idx ? { ...p, title } : p)));
  }

  function removePending(idx: number) {
    setPending((prev) => {
      const item = prev[idx];
      if (item) URL.revokeObjectURL(item.preview);
      return prev.filter((_, i) => i !== idx);
    });
  }

  // ============ 批量上传 ============
  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (pending.length === 0) {
      setHint("请先选择照片");
      return;
    }
    setBusy(true);
    setHint(null);
    setProgress({ ok: 0, fail: 0, total: pending.length });

    let ok = 0;
    let fail = 0;
    const failedItems: string[] = [];

    for (let i = 0; i < pending.length; i++) {
      const item = pending[i];
      // 标题：用户填写的前缀 + 序号，或用文件自带标题
      const finalTitle =
        titlePrefix.trim()
          ? pending.length > 1
            ? `${titlePrefix.trim()}-${i + 1}`
            : titlePrefix.trim()
          : item.title.trim() || `photo-${i + 1}`;

      // 1. 上传到 Storage
      const ext = item.file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("gallery")
        .upload(path, item.file, { cacheControl: "3600", upsert: false });

      if (upErr) {
        fail++;
        failedItems.push(`${finalTitle}: [存储] ${upErr.message}`);
        setProgress({ ok, fail, total: pending.length });
        continue;
      }

      // 2. 获取公共 URL
      const { data: pub } = supabase.storage.from("gallery").getPublicUrl(path);

      // 3. 写入 photos 表
      const { error: dbErr } = await supabase.from("photos").insert({
        title: finalTitle,
        photo_date: date || null,
        city: city.trim() || null,
        storage_path: path,
        public_url: pub.publicUrl,
      });

      if (dbErr) {
        fail++;
        failedItems.push(`${finalTitle}: [数据库] ${dbErr.message}`);
        // 数据库写入失败，回滚已上传的 Storage 对象
        await supabase.storage.from("gallery").remove([path]);
      } else {
        ok++;
      }
      setProgress({ ok, fail, total: pending.length });
    }

    setBusy(false);
    // 释放预览 URL
    pending.forEach((p) => URL.revokeObjectURL(p.preview));
    setPending([]);

    if (fail === 0) {
      setHint(`✓ 成功上传 ${ok} 张照片`);
    } else {
      setHint(`上传完成：${ok} 成功，${fail} 失败。失败：${failedItems.join("；")}`);
    }
    setProgress(null);
    load();
  }

  async function handleDelete(p: Photo) {
    if (!confirm(`确认删除「${p.title}」？`)) return;
    await supabase.from("photos").delete().eq("id", p.id);
    await supabase.storage.from("gallery").remove([p.storage_path]);
    load();
  }

  return (
    <div className="space-y-5">
      {/* 上传表单 */}
      <form
        onSubmit={handleUpload}
        className="rounded-card border border-cream-300 bg-cream-200 p-4 shadow-paper"
      >
        <h3 className="mb-3 text-base font-bold text-ink">批量上传照片</h3>

        {/* 文件多选区 */}
        <label className="field-label">选择照片（支持多选）</label>
        <label className="mt-1 flex cursor-pointer items-center justify-center gap-2 rounded-soft border border-dashed border-cream-300 bg-cream-50/60 py-6 text-sm text-ink-soft transition-colors hover:border-gold hover:text-coffee">
          <Upload className="h-4 w-4" strokeWidth={1.8} />
          {pending.length > 0
            ? `已选 ${pending.length} 张，点击继续添加`
            : "点击选择照片（可多选）"}
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleSelectFiles(e.target.files)}
          />
        </label>

        {/* 已选择文件预览网格 */}
        {pending.length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {pending.map((p, idx) => (
              <div
                key={idx}
                className="group relative overflow-hidden rounded-soft border border-cream-300 bg-cream-50"
              >
                <div className="aspect-square">
                  <img
                    src={p.preview}
                    alt={p.title}
                    className="h-full w-full object-cover"
                  />
                </div>
                <input
                  value={p.title}
                  onChange={(e) => updatePendingTitle(idx, e.target.value)}
                  placeholder="标题"
                  className="w-full border-t border-cream-300 bg-cream-50 px-1.5 py-1 text-[11px] text-ink focus:outline-none focus:bg-cream-100"
                />
                <button
                  type="button"
                  onClick={() => removePending(idx)}
                  aria-label="移除"
                  className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-ink/60 text-cream-50 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-rust"
                >
                  <X className="h-3 w-3" strokeWidth={2} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 公共字段 */}
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">标题前缀（可选）</label>
            <input
              value={titlePrefix}
              onChange={(e) => setTitlePrefix(e.target.value)}
              placeholder="留空用文件名"
              className="input-line"
            />
            {titlePrefix && pending.length > 1 && (
              <p className="mt-0.5 text-[10px] text-ink-mute">
                将自动生成：{titlePrefix}-1, {titlePrefix}-2 ...
              </p>
            )}
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
          <label className="field-label">所属城市（可选，用于相簿分组）</label>
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

        {/* 进度条 */}
        {progress && (
          <div className="mt-3 rounded-soft bg-cream-100 p-2.5">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-ink-soft">
                <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2} />
                正在上传 {progress.ok + progress.fail} / {progress.total}
              </span>
              <span className="text-ink-mute">
                <span className="text-emerald-600">✓{progress.ok}</span>
                {progress.fail > 0 && (
                  <span className="ml-2 text-rust">✗{progress.fail}</span>
                )}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-cream-300">
              <div
                className="ins-gradient h-full transition-all duration-300"
                style={{
                  width: `${((progress.ok + progress.fail) / progress.total) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {hint && (
          <p className="mt-3 text-xs text-coffee">{hint}</p>
        )}

        <button
          type="submit"
          disabled={busy || pending.length === 0}
          className="btn-gold mt-4"
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.8} />
          ) : (
            <Plus className="h-3.5 w-3.5" strokeWidth={1.8} />
          )}
          {pending.length > 0 ? `上传 ${pending.length} 张照片` : "上传照片"}
        </button>
      </form>

      {/* 照片列表 */}
      <div className="rounded-card border border-cream-300 bg-cream-200 p-4">
        <h3 className="mb-3 flex items-center gap-1.5 text-base font-bold text-ink">
          <FileImage className="h-4 w-4 text-gold" strokeWidth={1.8} />
          已有照片（{list.length}）
        </h3>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {list.map((p) => (
            <div
              key={p.id}
              className="group relative overflow-hidden rounded-soft border border-cream-300 bg-cream-50"
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
                <p className="truncate text-[11px] font-medium text-ink">
                  {p.title}
                </p>
                <div className="flex items-center gap-1">
                  {p.city && (
                    <span className="rounded bg-gold/15 px-1 text-[9px] text-gold">
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
                className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-ink/60 text-cream-50 opacity-0 transition-opacity hover:bg-rust group-hover:opacity-100"
              >
                <Trash2 className="h-3 w-3" strokeWidth={1.8} />
              </button>
            </div>
          ))}
          {list.length === 0 && (
            <div className="col-span-3 flex flex-col items-center py-8 text-ink-mute sm:col-span-4">
              <ImageIcon className="h-6 w-6" strokeWidth={1.4} />
              <p className="mt-2 text-xs">还没有照片</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
