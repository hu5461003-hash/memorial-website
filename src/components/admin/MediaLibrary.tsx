import { useEffect, useState, useRef, useCallback } from "react";
import {
  Upload,
  Trash2,
  Copy,
  Check,
  Image as ImageIcon,
  Video as VideoIcon,
  Loader2,
  Filter,
  Link2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { MediaItem } from "@/lib/types";
import { cn } from "@/lib/utils";

type FilterType = "all" | "image" | "video";

export default function MediaLibrary() {
  const [list, setList] = useState<MediaItem[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("media_library")
      .select("*")
      .order("created_at", { ascending: false });
    setList((data as MediaItem[]) ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setHint(null);
    let ok = 0;
    let fail = 0;
    let firstError: string | null = null;
    for (const file of Array.from(files)) {
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      if (!isImage && !isVideo) {
        fail++;
        if (!firstError) firstError = `文件「${file.name}」不是图片或视频`;
        continue;
      }
      const ext = file.name.split(".").pop() || (isImage ? "jpg" : "mp4");
      const path = `${isImage ? "images" : "videos"}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("media")
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (upErr) {
        fail++;
        const errCode = "code" in upErr ? (upErr as { code?: string }).code : undefined;
        if (!firstError) firstError = `[存储上传失败] ${file.name}: ${upErr.message}${errCode ? " (code:" + errCode + ")" : ""}`;
        continue;
      }
      const { data: pub } = supabase.storage.from("media").getPublicUrl(path);
      const { error: dbErr } = await supabase.from("media_library").insert({
        file_name: file.name,
        media_type: isImage ? "image" : "video",
        storage_path: path,
        public_url: pub.publicUrl,
        file_size: file.size,
      });
      if (dbErr) {
        fail++;
        if (!firstError) firstError = `[数据库写入失败] ${file.name}: ${dbErr.message}${dbErr.code ? " (code:" + dbErr.code + ")" : ""}`;
      } else {
        ok++;
      }
    }
    setUploading(false);
    let msg = "";
    if (ok > 0 && fail === 0) {
      msg = `成功上传 ${ok} 个文件`;
    } else if (ok > 0 && fail > 0) {
      msg = `上传 ${ok} 个成功，${fail} 个失败。` + (firstError ? `错误：${firstError}` : "");
    } else {
      msg = `上传失败 ${fail} 个。` + (firstError ? `错误：${firstError}` : "");
    }
    setHint(msg);
    load();
  }

  async function handleDelete(m: MediaItem) {
    if (!confirm(`确认删除「${m.file_name}」？`)) return;
    setBusy(true);
    setHint(null);
    await supabase.storage.from("media").remove([m.storage_path]);
    const { error } = await supabase.from("media_library").delete().eq("id", m.id);
    setBusy(false);
    if (error) {
      setHint(`删除失败：${error.message}`);
    } else {
      setHint(null);
      load();
    }
  }

  function copyUrl(m: MediaItem) {
    navigator.clipboard.writeText(m.public_url);
    setCopiedId(m.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const filtered = filter === "all" ? list : list.filter((m) => m.media_type === filter);
  const imageCount = list.filter((m) => m.media_type === "image").length;
  const videoCount = list.filter((m) => m.media_type === "video").length;

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  return (
    <div className="space-y-4">
      {/* 上传区 */}
      <div className="rounded-card border border-coffee-line/70 bg-cream-200 p-4 shadow-paper">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-hand text-base text-ink">媒体素材库</h3>
          <span className="text-[10px] text-ink-mute">
            {imageCount} 张图片 · {videoCount} 个视频
          </span>
        </div>

        {/* 拖拽上传区 */}
        <div
          onClick={() => fileRef.current?.click()}
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-soft border-2 border-dashed border-coffee-line/50 bg-cream-50/60 py-6 transition-colors hover:border-gold/50 hover:bg-gold/5"
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-gold" strokeWidth={1.8} />
          ) : (
            <Upload className="h-5 w-5 text-ink-mute" strokeWidth={1.8} />
          )}
          <p className="text-xs text-ink-mute">
            {uploading ? "上传中…" : "点击选择文件上传"}
          </p>
          <p className="text-[10px] text-ink-mute/70">支持图片和视频，可多选</p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={(e) => handleUpload(e.target.files)}
        />
        {hint && <p className="mt-2 text-xs text-coffee">{hint}</p>}
      </div>

      {/* 筛选栏 */}
      <div className="flex items-center gap-1.5">
        <Filter className="h-3.5 w-3.5 text-ink-mute" strokeWidth={1.8} />
        {(["all", "image", "video"] as FilterType[]).map((ft) => (
          <button
            key={ft}
            type="button"
            onClick={() => setFilter(ft)}
            className={cn(
              "rounded-soft px-2.5 py-1 text-[11px] transition-colors",
              filter === ft ? "bg-gold/20 text-coffee" : "text-ink-mute hover:text-ink-soft",
            )}
          >
            {{ all: "全部", image: "图片", video: "视频" }[ft]}
          </button>
        ))}
      </div>

      {/* 素材网格 */}
      {filtered.length === 0 ? (
        <div className="rounded-card border border-dashed border-coffee-line/70 bg-cream-200/40 py-10 text-center">
          <ImageIcon className="mx-auto h-6 w-6 text-ink-mute" strokeWidth={1.4} />
          <p className="mt-2 text-xs text-ink-mute">还没有素材，上传一个吧</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {filtered.map((m) => (
            <div
              key={m.id}
              className="group relative overflow-hidden rounded-card border border-coffee-line/70 bg-cream-50 shadow-paper"
            >
              {/* 缩略图 */}
              <div className="relative aspect-square overflow-hidden bg-cream-200">
                {m.media_type === "image" ? (
                  <img
                    src={m.public_url}
                    alt={m.file_name}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <video
                    src={m.public_url}
                    preload="metadata"
                    muted
                    className="h-full w-full object-cover"
                  />
                )}
                {/* 类型角标 */}
                <span className="absolute left-1 top-1 inline-flex items-center gap-0.5 rounded-full bg-ink/60 px-1.5 py-0.5 text-[9px] text-cream-50 backdrop-blur-sm">
                  {m.media_type === "image" ? (
                    <ImageIcon className="h-2.5 w-2.5" strokeWidth={2} />
                  ) : (
                    <VideoIcon className="h-2.5 w-2.5" strokeWidth={2} />
                  )}
                  {m.media_type === "image" ? "图" : "频"}
                </span>
                {/* 悬浮操作 */}
                <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-ink/40 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => copyUrl(m)}
                    aria-label="复制链接"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-cream-50/90 text-coffee transition-transform hover:scale-110"
                  >
                    {copiedId === m.id ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" strokeWidth={2} />
                    ) : (
                      <Link2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(m)}
                    disabled={busy}
                    aria-label="删除"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-cream-50/90 text-rust transition-transform hover:scale-110 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                  </button>
                </div>
              </div>
              {/* 文件信息 */}
              <div className="px-2 py-1.5">
                <p className="truncate text-[10px] text-ink-soft">{m.file_name}</p>
                <div className="mt-0.5 flex items-center justify-between">
                  <span className="text-[9px] text-ink-mute">{formatSize(m.file_size)}</span>
                  <button
                    type="button"
                    onClick={() => copyUrl(m)}
                    className="inline-flex items-center gap-0.5 text-[9px] text-gold hover:underline"
                  >
                    {copiedId === m.id ? (
                      <>
                        <Check className="h-2.5 w-2.5" strokeWidth={2} />
                        已复制
                      </>
                    ) : (
                      <>
                        <Copy className="h-2.5 w-2.5" strokeWidth={1.8} />
                        复制链接
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 使用提示 */}
      {filtered.length > 0 && (
        <div className="rounded-soft border border-gold/30 bg-gold/5 p-2.5">
          <p className="text-[10px] leading-relaxed text-ink-mute">
            <span className="font-medium text-coffee">使用方法：</span>
            点击素材上的「复制链接」按钮，在自定义代码块中使用
            <code className="mx-1 rounded bg-cream-200 px-1 font-mono text-[9px]">&lt;img src="粘贴链接"&gt;</code>
            或
            <code className="mx-1 rounded bg-cream-200 px-1 font-mono text-[9px]">&lt;video src="粘贴链接"&gt;&lt;/video&gt;</code>
          </p>
        </div>
      )}
    </div>
  );
}
