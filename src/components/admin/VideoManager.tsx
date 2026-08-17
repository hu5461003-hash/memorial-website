import { useEffect, useState } from "react";
import { Trash2, Plus, Loader2, Upload, Film, Play, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Video, Footprint } from "@/lib/types";

export default function VideoManager() {
  const [list, setList] = useState<Video[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [city, setCity] = useState("");
  const [date, setDate] = useState("");
  const [duration, setDuration] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [preview, setPreview] = useState<Video | null>(null);

  async function load() {
    const [vRes, fpRes] = await Promise.all([
      supabase.from("videos").select("*").order("video_date", { ascending: false }),
      supabase.from("footprints").select("name").order("sort_order", { ascending: true }),
    ]);
    setList((vRes.data as Video[]) ?? []);
    setCities(((fpRes.data as Footprint[] | null) ?? []).map((f) => f.name));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setHint("请先选择一个视频文件");
      return;
    }
    if (!title.trim()) {
      setHint("请填写标题");
      return;
    }
    setBusy(true);
    setHint(null);

    const ext = file.name.split(".").pop()?.toLowerCase() || "mp4";
    const path = `video-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("videos")
      .upload(path, file, { cacheControl: "3600", upsert: false });

    if (upErr) {
      setBusy(false);
      setHint(`上传失败：${upErr.message}`);
      return;
    }
    const { data: pub } = supabase.storage.from("videos").getPublicUrl(path);

    const { error: dbErr } = await supabase.from("videos").insert({
      title: title.trim(),
      city: city.trim() || null,
      video_date: date || null,
      storage_path: path,
      public_url: pub.publicUrl,
      duration: duration.trim() || null,
    });

    setBusy(false);
    if (dbErr) {
      setHint(`保存失败：${dbErr.message}`);
      return;
    }
    setHint("视频已上传");
    setTitle("");
    setCity("");
    setDate("");
    setDuration("");
    setFile(null);
    load();
  }

  async function handleDelete(v: Video) {
    if (!confirm(`确认删除「${v.title}」？`)) return;
    await supabase.from("videos").delete().eq("id", v.id);
    await supabase.storage.from("videos").remove([v.storage_path]);
    load();
  }

  return (
    <div className="space-y-5">
      {/* 上传表单 */}
      <form
        onSubmit={handleUpload}
        className="rounded-card border border-coffee-line/70 bg-cream-200 p-4 shadow-paper"
      >
        <h3 className="mb-3 font-hand text-base text-ink">上传视频</h3>

        <label className="field-label">选择视频文件</label>
        <label className="mt-1 flex cursor-pointer items-center justify-center gap-2 rounded-soft border border-dashed border-coffee-line bg-cream-50/60 py-5 text-sm text-ink-soft transition-colors hover:border-gold hover:text-coffee">
          <Upload className="h-4 w-4" strokeWidth={1.8} />
          {file ? file.name : "点击选择视频"}
          <input
            type="file"
            accept="video/*"
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
              placeholder="如 长沙夜色"
              className="input-line"
            />
          </div>
          <div>
            <label className="field-label">所属城市（中文，可选）</label>
            <input
              list="video-city-options"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="如 长沙"
              className="input-line"
            />
            <datalist id="video-city-options">
              {cities.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
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
          <div>
            <label className="field-label">时长（可选，如 01:23）</label>
            <input
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="01:23"
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
          上传视频
        </button>
        <p className="mt-2 text-[10px] leading-relaxed text-ink-mute">
          提示：Supabase 免费版单文件上限 50MB。较大视频建议先压缩。
        </p>
      </form>

      {/* 视频列表 */}
      <div className="rounded-card border border-coffee-line/70 bg-cream-200/60 p-4">
        <h3 className="mb-3 font-hand text-base text-ink">
          已有视频（{list.length}）
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {list.map((v) => (
            <div
              key={v.id}
              className="group relative overflow-hidden rounded-soft border border-coffee-line/50 bg-cream-50"
            >
              <button
                type="button"
                onClick={() => setPreview(v)}
                className="relative block aspect-video w-full bg-ink"
              >
                <video
                  src={v.public_url}
                  poster={v.cover_url ?? undefined}
                  preload="metadata"
                  muted
                  className="h-full w-full object-cover"
                />
                <span className="absolute inset-0 flex items-center justify-center bg-ink/30">
                  <Play className="h-5 w-5 text-cream-50" strokeWidth={1.8} />
                </span>
                {v.duration && (
                  <span className="absolute bottom-1 right-1 rounded bg-ink/70 px-1 text-[9px] text-cream-50">
                    {v.duration}
                  </span>
                )}
              </button>
              <div className="p-1.5">
                <p className="truncate font-hand text-[11px] text-ink">{v.title}</p>
                <div className="flex items-center gap-1">
                  {v.city && (
                    <span className="rounded bg-gold/15 px-1 text-[9px] text-coffee">
                      {v.city}
                    </span>
                  )}
                  {v.video_date && (
                    <p className="text-[9px] text-ink-mute">{v.video_date}</p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(v)}
                aria-label="删除"
                className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-ink/40 text-cream-50 opacity-0 transition-opacity group-hover:opacity-100"
              >
                <Trash2 className="h-3 w-3" strokeWidth={1.8} />
              </button>
            </div>
          ))}
          {list.length === 0 && (
            <div className="col-span-2 flex flex-col items-center py-8 text-ink-mute">
              <Film className="h-6 w-6" strokeWidth={1.4} />
              <p className="mt-2 text-xs">还没有视频</p>
            </div>
          )}
        </div>
      </div>

      {/* 预览播放 */}
      {preview && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/85 p-5 backdrop-blur-sm animate-fade-in"
          onClick={() => setPreview(null)}
        >
          <button
            type="button"
            aria-label="关闭"
            className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-cream-50/20 text-cream-50 transition-colors hover:bg-cream-50/30"
          >
            <X className="h-5 w-5" strokeWidth={1.8} />
          </button>
          <figure
            className="max-h-[88vh] max-w-[92vw] bg-cream-50 p-3 pb-5 shadow-polaroid"
            onClick={(e) => e.stopPropagation()}
          >
            <video
              src={preview.public_url}
              poster={preview.cover_url ?? undefined}
              controls
              autoPlay
              className="max-h-[72vh] max-w-full"
            />
            <figcaption className="mt-3 flex items-center justify-center gap-2 font-hand text-sm text-ink-soft">
              {preview.city && <span className="text-gold">{preview.city}</span>}
              <span>{preview.title}</span>
            </figcaption>
          </figure>
        </div>
      )}
    </div>
  );
}
