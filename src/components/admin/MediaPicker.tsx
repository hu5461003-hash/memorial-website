import { useState, useEffect, useRef } from "react";
import { Upload, Link2, FolderOpen, Loader2, Search, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { MediaItem } from "@/lib/types";
import { cn } from "@/lib/utils";

type PickerMode = "url" | "upload" | "library";

/**
 * 统一媒体选择器
 * - URL: 粘贴图片/视频链接
 * - Upload: 上传文件到 covers 桶
 * - Library: 从 media_library 表选已有素材
 */
export default function MediaPicker({
  value,
  onChange,
  accept = "image/*",
  label = "选择媒体",
  mediaType = "image",
}: {
  value: string;
  onChange: (url: string) => void;
  accept?: string;
  label?: string;
  mediaType?: "image" | "video";
}) {
  const [mode, setMode] = useState<PickerMode>("url");
  const [urlInput, setUrlInput] = useState(value);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [library, setLibrary] = useState<MediaItem[]>([]);
  const [libLoading, setLibLoading] = useState(false);
  const [search, setSearch] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => setUrlInput(value), [value]);

  // 加载素材库
  async function loadLibrary() {
    if (!supabase) return;
    setLibLoading(true);
    const { data } = await supabase
      .from("media_library")
      .select("*")
      .eq("media_type", mediaType)
      .ilike("file_name", `%${search}%`)
      .order("created_at", { ascending: false })
      .limit(30);
    setLibrary((data as MediaItem[]) ?? []);
    setLibLoading(false);
  }

  useEffect(() => {
    if (mode === "library") loadLibrary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, search, mediaType]);

  async function handleUpload(file: File) {
    if (!supabase) return;
    setBusy(true);
    setHint(null);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `picker-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("covers")
      .upload(path, file, { cacheControl: "3600", upsert: false });
    if (upErr) {
      setHint(`上传失败：${upErr.message}`);
      setBusy(false);
      return;
    }
    const { data: pub } = supabase.storage.from("covers").getPublicUrl(path);
    onChange(pub.publicUrl);
    setUrlInput(pub.publicUrl);
    setBusy(false);
  }

  const tabs: { key: PickerMode; label: string; Icon: typeof Upload }[] = [
    { key: "url", label: "URL", Icon: Link2 },
    { key: "upload", label: "上传", Icon: Upload },
    { key: "library", label: "素材库", Icon: FolderOpen },
  ];

  return (
    <div className="space-y-2">
      <label className="field-label">{label}</label>

      {/* 当前值预览 */}
      {value && (
        <div className="flex items-center gap-2 rounded-soft border border-cream-300 bg-cream-50 p-1.5">
          {mediaType === "image" ? (
            <img src={value} alt="" className="h-10 w-10 flex-none rounded object-cover" />
          ) : (
            <video src={value} className="h-10 w-10 flex-none rounded object-cover" />
          )}
          <input
            value={value}
            readOnly
            className="flex-1 truncate bg-transparent text-[11px] text-ink-soft outline-none"
          />
          <button
            type="button"
            onClick={() => { onChange(""); setUrlInput(""); }}
            className="flex-none rounded p-0.5 text-rust/70 hover:bg-rust/10 hover:text-rust"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* 模式切换 */}
      <div className="flex gap-1">
        {tabs.map(({ key, label: tabLabel, Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setMode(key)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1 rounded-soft border py-1.5 text-[11px] transition-colors",
              mode === key
                ? "border-gold bg-gold/10 text-coffee"
                : "border-cream-300 text-ink-mute hover:text-ink-soft",
            )}
          >
            <Icon className="h-3 w-3" strokeWidth={1.8} />
            {tabLabel}
          </button>
        ))}
      </div>

      {/* URL 输入 */}
      {mode === "url" && (
        <input
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onBlur={() => onChange(urlInput.trim())}
          placeholder="粘贴图片或视频 URL"
          className="input-line text-xs"
        />
      )}

      {/* 上传 */}
      {mode === "upload" && (
        <>
          <input
            ref={fileRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f);
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-soft border border-dashed border-cream-300 bg-cream-50 py-3 text-xs text-ink-soft transition-colors hover:border-gold hover:text-coffee disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            {busy ? "上传中…" : "点击选择文件上传"}
          </button>
        </>
      )}

      {/* 素材库 */}
      {mode === "library" && (
        <div className="rounded-soft border border-cream-300 bg-cream-50 p-2">
          <div className="mb-1.5 flex items-center gap-1.5">
            <Search className="h-3 w-3 text-ink-mute" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索素材名…"
              className="flex-1 bg-transparent text-[11px] outline-none"
            />
          </div>
          {libLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-ink-mute" />
            </div>
          ) : library.length === 0 ? (
            <p className="py-3 text-center text-[11px] text-ink-mute">
              素材库暂无{mediaType === "image" ? "图片" : "视频"}，请先在「素材库」上传
            </p>
          ) : (
            <div className="grid max-h-48 grid-cols-4 gap-1 overflow-y-auto">
              {library.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onChange(item.public_url);
                    setUrlInput(item.public_url);
                  }}
                  className={cn(
                    "aspect-square overflow-hidden rounded border transition-all",
                    value === item.public_url
                      ? "border-gold ring-2 ring-gold/30"
                      : "border-cream-300 hover:border-gold/50",
                  )}
                >
                  {item.media_type === "image" ? (
                    <img src={item.public_url} alt={item.file_name} className="h-full w-full object-cover" />
                  ) : (
                    <video src={item.public_url} className="h-full w-full object-cover" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {hint && <p className="text-[11px] text-rust">{hint}</p>}
    </div>
  );
}
