import { useCallback, useEffect, useState } from "react";
import {
  Trash2, Plus, Loader2, Upload, Film, Play, X,
  FolderOpen, FolderPlus, Pencil, Check, Folder, ChevronLeft,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useStore } from "@/store/useStore";
import type { Video, Album } from "@/lib/types";

type PendingVideo = {
  file: File;
  title: string;
};

/**
 * 视频管理 v2：与照片一致的文件夹体系（共用 albums 表）。
 * - 左侧文件夹列表：全部视频 / 未分类 / 自定义文件夹（可增删改）
 * - 上传时选择目标文件夹，支持多选、逐个改标题
 * - 视频卡片支持改标题（文件名）、删除、预览播放
 */
export default function VideoManager() {
  const { session } = useStore();
  const uid = session?.user?.id ?? null;

  const [albums, setAlbums] = useState<Album[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedId, setSelectedId] = useState<string | "all" | "none">("all");

  // 上传表单
  const [pending, setPending] = useState<PendingVideo[]>([]);
  const [date, setDate] = useState("");
  const [uploadAlbumId, setUploadAlbumId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ ok: number; fail: number; total: number } | null>(null);

  // 文件夹编辑态
  const [editAlbumId, setEditAlbumId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [newAlbumName, setNewAlbumName] = useState("");
  const [albumBusy, setAlbumBusy] = useState(false);

  // 视频标题重命名态
  const [editVideoId, setEditVideoId] = useState<string | null>(null);
  const [editVideoTitle, setEditVideoTitle] = useState("");

  // 预览播放
  const [preview, setPreview] = useState<Video | null>(null);

  /* ========= 加载 ========= */
  const load = useCallback(async () => {
    const [aRes, vRes] = await Promise.all([
      supabase.from("albums").select("*").order("sort_order", { ascending: true }),
      supabase.from("videos").select("*").order("video_date", { ascending: false, nullsFirst: false }),
    ]);
    const alist = (aRes.data as Album[]) ?? [];
    setAlbums(alist);
    setVideos((vRes.data as Video[]) ?? []);
    if (!uploadAlbumId && alist.length > 0) setUploadAlbumId(alist[0].id);
  }, [uploadAlbumId]);

  useEffect(() => {
    load();
  }, [load]);

  // 过滤当前选中文件夹的视频
  const filteredVideos =
    selectedId === "all"
      ? videos
      : selectedId === "none"
        ? videos.filter((v) => !v.album_id)
        : videos.filter((v) => v.album_id === selectedId);

  // 每个文件夹视频数
  const videoCountByAlbum = (albumId: string | null) =>
    videos.filter((v) => (albumId === null ? !v.album_id : v.album_id === albumId)).length;

  /* ========= 多选文件 ========= */
  function handleSelectFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const items: PendingVideo[] = [];
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("video/")) return;
      const baseName = file.name.replace(/\.[^.]+$/, "");
      items.push({ file, title: baseName });
    });
    if (items.length === 0) {
      setHint("请选择视频文件");
      return;
    }
    setPending((prev) => [...prev, ...items]);
    setHint(null);
  }
  function updatePendingTitle(idx: number, title: string) {
    setPending((prev) => prev.map((p, i) => (i === idx ? { ...p, title } : p)));
  }
  function removePending(idx: number) {
    setPending((prev) => prev.filter((_, i) => i !== idx));
  }

  /* ========= 批量上传 ========= */
  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!uid) {
      setHint("登录失效，请重新登录");
      return;
    }
    if (pending.length === 0) {
      setHint("请先选择视频");
      return;
    }
    if (!uploadAlbumId) {
      setHint("请先选择/创建目标文件夹");
      return;
    }
    setBusy(true);
    setHint(null);
    setProgress({ ok: 0, fail: 0, total: pending.length });
    let ok = 0;
    let fail = 0;
    const failed: string[] = [];

    for (let i = 0; i < pending.length; i++) {
      const item = pending[i];
      const finalTitle = item.title.trim() || `video-${i + 1}`;
      const ext = item.file.name.split(".").pop()?.toLowerCase() || "mp4";
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("videos")
        .upload(path, item.file, { cacheControl: "3600", upsert: false });
      if (upErr) {
        fail++;
        failed.push(`${finalTitle}: [存储] ${upErr.message}`);
        setProgress({ ok, fail, total: pending.length });
        continue;
      }
      const { data: pub } = supabase.storage.from("videos").getPublicUrl(path);
      const { error: dbErr } = await supabase.from("videos").insert({
        title: finalTitle,
        album_id: uploadAlbumId,
        owner_admin_uid: uid,
        video_date: date || null,
        storage_path: path,
        public_url: pub.publicUrl,
      });
      if (dbErr) {
        fail++;
        failed.push(`${finalTitle}: [数据库] ${dbErr.message}`);
        await supabase.storage.from("videos").remove([path]);
      } else {
        ok++;
      }
      setProgress({ ok, fail, total: pending.length });
    }
    setBusy(false);
    setPending([]);
    if (fail === 0) setHint(`✓ 成功上传 ${ok} 个视频`);
    else setHint(`完成：${ok} 成功，${fail} 失败。${failed.join("；")}`);
    setProgress(null);
    load();
  }

  /* ========= 视频删除 / 重命名 ========= */
  async function handleDeleteVideo(v: Video) {
    if (!confirm(`确认删除「${v.title}」？`)) return;
    await supabase.from("videos").delete().eq("id", v.id);
    await supabase.storage.from("videos").remove([v.storage_path]);
    load();
  }

  async function saveVideoTitle() {
    if (!editVideoId) return;
    const title = editVideoTitle.trim();
    if (!title) {
      setEditVideoId(null);
      return;
    }
    const { error } = await supabase.from("videos").update({ title }).eq("id", editVideoId);
    if (error) setHint(`重命名失败：${error.message}`);
    else setHint("✓ 已重命名");
    setEditVideoId(null);
    load();
  }

  /* ========= 文件夹 CRUD ========= */
  async function createAlbum() {
    if (!uid) return;
    const name = newAlbumName.trim();
    if (!name) {
      setHint("请输入文件夹名称");
      return;
    }
    setAlbumBusy(true);
    const sortOrder = (albums[albums.length - 1]?.sort_order ?? 0) + 1;
    const { error } = await supabase.from("albums").insert({
      name,
      owner_admin_uid: uid,
      sort_order: sortOrder,
    });
    setAlbumBusy(false);
    if (error) {
      setHint(`创建失败：${error.message}`);
      return;
    }
    setNewAlbumName("");
    setHint(`✓ 已创建「${name}」（照片与视频共用文件夹）`);
    load();
  }

  function startEditAlbum(a: Album) {
    setEditAlbumId(a.id);
    setEditName(a.name);
  }
  async function saveEditAlbum() {
    if (!editAlbumId) return;
    const name = editName.trim();
    if (!name) return;
    const { error } = await supabase
      .from("albums")
      .update({ name, updated_at: new Date().toISOString() })
      .eq("id", editAlbumId);
    if (error) setHint(`重命名失败：${error.message}`);
    else setHint("✓ 已重命名");
    setEditAlbumId(null);
    load();
  }

  async function deleteAlbum(a: Album) {
    const pcnt = videoCountByAlbum(a.id);
    const msg =
      pcnt > 0
        ? `确认删除文件夹「${a.name}」？\n（含 ${pcnt} 个视频，删除文件夹后这些视频会移到「未分类」；照片管理中同文件夹的照片也会移到未分类）`
        : `确认删除文件夹「${a.name}」？（与照片管理共用，若照片也在此文件夹会一并移到未分类）`;
    if (!confirm(msg)) return;
    // 文件夹内的视频与照片 album_id 置空（不删除内容本身）
    await supabase.from("videos").update({ album_id: null }).eq("album_id", a.id);
    await supabase.from("photos").update({ album_id: null }).eq("album_id", a.id);
    await supabase.from("albums").delete().eq("id", a.id);
    if (selectedId === a.id) setSelectedId("all");
    if (uploadAlbumId === a.id) setUploadAlbumId("");
    setHint("✓ 已删除文件夹，内容移到未分类");
    load();
  }

  /* ========= 渲染 ========= */
  return (
    <div className="space-y-5">
      {/* ========== 上传表单 ========== */}
      <form
        onSubmit={handleUpload}
        className="rounded-card border border-cream-300 bg-cream-200 p-4 shadow-paper"
      >
        <h3 className="mb-3 flex items-center gap-1.5 text-base font-bold text-ink">
          <Upload className="h-4 w-4 text-gold" strokeWidth={1.8} />
          上传视频
        </h3>

        <label className="field-label">目标文件夹 <span className="text-rust">*</span></label>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <select
            value={uploadAlbumId}
            onChange={(e) => setUploadAlbumId(e.target.value)}
            className="input-line flex-1 !py-1.5"
          >
            <option value="">请选择文件夹</option>
            {albums.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}（{videoCountByAlbum(a.id)} 视频）
              </option>
            ))}
          </select>
        </div>

        {/* 快捷新建文件夹（内联） */}
        <div className="mt-2 flex items-center gap-2">
          <input
            value={newAlbumName}
            onChange={(e) => setNewAlbumName(e.target.value)}
            placeholder="或输入新文件夹名 →"
            className="input-line flex-1 !py-1.5 text-xs"
          />
          <button
            type="button"
            onClick={createAlbum}
            disabled={albumBusy}
            className="btn-ghost !py-1.5 text-xs"
          >
            {albumBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FolderPlus className="h-3.5 w-3.5" />}
            新建
          </button>
        </div>

        <label className="field-label mt-3">选择视频（支持多选）</label>
        <label className="mt-1 flex cursor-pointer items-center justify-center gap-2 rounded-soft border border-dashed border-cream-300 bg-cream-50/60 py-6 text-sm text-ink-soft transition-colors hover:border-gold hover:text-coffee">
          <Upload className="h-4 w-4" strokeWidth={1.8} />
          {pending.length > 0
            ? `已选 ${pending.length} 个，点击继续添加`
            : "点击选择视频（可多选）"}
          <input
            type="file"
            accept="video/*"
            multiple
            className="hidden"
            onChange={(e) => handleSelectFiles(e.target.files)}
          />
        </label>

        {pending.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {pending.map((p, idx) => (
              <div key={idx} className="flex items-center gap-1.5 rounded-soft border border-cream-300 bg-cream-50 px-2 py-1.5">
                <Film className="h-3.5 w-3.5 flex-none text-gold" strokeWidth={1.8} />
                <input
                  value={p.title}
                  onChange={(e) => updatePendingTitle(idx, e.target.value)}
                  placeholder="标题"
                  className="min-w-0 flex-1 bg-transparent text-xs text-ink focus:outline-none"
                />
                <span className="flex-none text-[10px] text-ink-mute">
                  {(p.file.size / 1024 / 1024).toFixed(1)}MB
                </span>
                <button
                  type="button"
                  onClick={() => removePending(idx)}
                  aria-label="移除"
                  className="flex-none rounded p-0.5 text-rust/70 hover:bg-rust/10 hover:text-rust"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={1.8} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-3">
          <label className="field-label">日期（可选）</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input-line"
          />
        </div>

        {progress && (
          <div className="mt-3 rounded-soft bg-cream-100 p-2.5">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-ink-soft">
                <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2} />
                正在上传 {progress.ok + progress.fail} / {progress.total}
              </span>
              <span className="text-ink-mute">
                <span className="text-emerald-600">✓{progress.ok}</span>
                {progress.fail > 0 && <span className="ml-2 text-rust">✗{progress.fail}</span>}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-cream-300">
              <div
                className="ins-gradient h-full transition-all duration-300"
                style={{ width: `${((progress.ok + progress.fail) / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {hint && <p className="mt-3 text-xs text-coffee">{hint}</p>}

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
          {pending.length > 0 ? `上传 ${pending.length} 个` : "上传视频"}
        </button>
        <p className="mt-2 text-[10px] leading-relaxed text-ink-mute">
          提示：Supabase 免费版单文件上限 50MB，较大视频建议先压缩。文件夹与照片管理共用。
        </p>
      </form>

      {/* ========== 文件夹 + 视频双栏 ========== */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[220px_1fr]">
        {/* 左：文件夹列表 */}
        <aside className="rounded-card border border-cream-300 bg-cream-200 p-3 shadow-paper h-fit">
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-ink">
            <FolderOpen className="h-3.5 w-3.5 text-gold" strokeWidth={1.8} />
            文件夹
          </h3>
          <nav className="space-y-1">
            <FolderNavItem
              active={selectedId === "all"}
              onClick={() => setSelectedId("all")}
              icon={<Film className="h-3.5 w-3.5" strokeWidth={1.8} />}
              label="全部视频"
              count={videos.length}
            />
            <FolderNavItem
              active={selectedId === "none"}
              onClick={() => setSelectedId("none")}
              icon={<Folder className="h-3.5 w-3.5 opacity-60" strokeWidth={1.8} />}
              label="未分类"
              count={videoCountByAlbum(null)}
            />
            <div className="my-2 h-px bg-cream-300" />
            {albums.map((a) => (
              <div key={a.id}>
                {editAlbumId === a.id ? (
                  <div className="flex items-center gap-1 rounded-soft bg-cream-50 px-2 py-1.5">
                    <input
                      value={editName}
                      autoFocus
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEditAlbum();
                        if (e.key === "Escape") setEditAlbumId(null);
                      }}
                      className="w-full bg-transparent text-xs focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={saveEditAlbum}
                      aria-label="保存"
                      className="text-emerald-600 hover:text-emerald-700"
                    >
                      <Check className="h-3.5 w-3.5" strokeWidth={2} />
                    </button>
                  </div>
                ) : (
                  <div
                    className={
                      "group flex items-center gap-1.5 rounded-soft px-2 py-1.5 text-xs transition-colors cursor-pointer " +
                      (selectedId === a.id
                        ? "bg-gold/15 text-coffee font-semibold"
                        : "text-ink-soft hover:bg-cream-100 hover:text-ink")
                    }
                    onClick={() => setSelectedId(a.id)}
                  >
                    <Folder className="h-3.5 w-3.5 flex-none text-gold" strokeWidth={1.8} />
                    <span className="min-w-0 flex-1 truncate">{a.name}</span>
                    <span className="ml-auto text-[10px] text-ink-mute">
                      {videoCountByAlbum(a.id)}
                    </span>
                    <div className="ml-0.5 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditAlbum(a);
                        }}
                        aria-label="重命名"
                        className="rounded p-0.5 hover:bg-cream-300"
                      >
                        <Pencil className="h-3 w-3" strokeWidth={1.8} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteAlbum(a);
                        }}
                        aria-label="删除文件夹"
                        className="rounded p-0.5 text-rust hover:bg-cream-300"
                      >
                        <Trash2 className="h-3 w-3" strokeWidth={1.8} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {albums.length === 0 && (
              <p className="px-2 py-3 text-center text-[10px] text-ink-mute">
                还没有文件夹，上面输入名称点「新建」
              </p>
            )}
          </nav>
        </aside>

        {/* 右：当前文件夹视频 */}
        <section className="rounded-card border border-cream-300 bg-cream-200 p-4">
          <div className="mb-3 flex items-center gap-2">
            {selectedId !== "all" && (
              <button
                type="button"
                onClick={() => setSelectedId("all")}
                className="inline-flex items-center gap-1 text-xs text-ink-soft hover:text-coffee"
              >
                <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.8} />
                全部
              </button>
            )}
            <h3 className="flex items-center gap-1.5 text-base font-bold text-ink">
              {selectedId === "all" && <Film className="h-4 w-4 text-gold" strokeWidth={1.8} />}
              {selectedId === "none" && <Folder className="h-4 w-4 opacity-60 text-gold" strokeWidth={1.8} />}
              {typeof selectedId === "string" &&
                selectedId !== "all" &&
                selectedId !== "none" && (
                  <FolderOpen className="h-4 w-4 text-gold" strokeWidth={1.8} />
                )}
              {selectedId === "all"
                ? "全部视频"
                : selectedId === "none"
                  ? "未分类"
                  : albums.find((a) => a.id === selectedId)?.name ?? "—"}
              <span className="ml-1 text-xs font-normal text-ink-mute">
                （{filteredVideos.length}）
              </span>
            </h3>
            <span className="ml-auto hidden rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] text-emerald-700 sm:inline">
              点击卡片可预览，✎ 可改标题
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {filteredVideos.map((v) => (
              <div
                key={v.id}
                className="group relative overflow-hidden rounded-soft border border-cream-300 bg-cream-50"
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
                  {editVideoId === v.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        value={editVideoTitle}
                        autoFocus
                        onChange={(e) => setEditVideoTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveVideoTitle();
                          if (e.key === "Escape") setEditVideoId(null);
                        }}
                        className="min-w-0 flex-1 rounded border border-gold/50 bg-cream-50 px-1 py-0.5 text-[11px] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={saveVideoTitle}
                        aria-label="保存标题"
                        className="flex-none text-emerald-600 hover:text-emerald-700"
                      >
                        <Check className="h-3.5 w-3.5" strokeWidth={2} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <p className="min-w-0 flex-1 truncate text-[11px] font-medium text-ink">{v.title}</p>
                      <button
                        type="button"
                        onClick={() => {
                          setEditVideoId(v.id);
                          setEditVideoTitle(v.title);
                        }}
                        aria-label="改标题"
                        className="flex-none rounded p-0.5 text-ink-soft opacity-0 transition-opacity hover:bg-cream-300 group-hover:opacity-100"
                      >
                        <Pencil className="h-3 w-3" strokeWidth={1.8} />
                      </button>
                    </div>
                  )}
                  <p className="text-[9px] text-ink-mute">
                    {v.video_date ?? "—"}
                    {v.album_id && albums.find((a) => a.id === v.album_id) && (
                      <span> · {albums.find((a) => a.id === v.album_id)!.name}</span>
                    )}
                  </p>
                </div>
                {/* 操作浮层 */}
                <div className="absolute right-1 top-1 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => {
                      setEditVideoId(v.id);
                      setEditVideoTitle(v.title);
                    }}
                    title="改标题"
                    className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gold/90 text-cream-50 hover:bg-gold"
                  >
                    <Pencil className="h-3 w-3" strokeWidth={1.8} />
                  </button>
                  <button
                    type="button"
                    title="删除"
                    onClick={() => handleDeleteVideo(v)}
                    className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-ink/60 text-cream-50 hover:bg-rust"
                  >
                    <Trash2 className="h-3 w-3" strokeWidth={1.8} />
                  </button>
                </div>
              </div>
            ))}
            {filteredVideos.length === 0 && (
              <div className="col-span-2 flex flex-col items-center py-8 text-ink-mute sm:col-span-3">
                <Film className="h-6 w-6" strokeWidth={1.4} />
                <p className="mt-2 text-xs">
                  {selectedId === "none" ? "没有未分类的视频" : "还没有视频，上传后会出现在这里"}
                </p>
              </div>
            )}
          </div>
        </section>
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
              {preview.album_id && albums.find((a) => a.id === preview.album_id) && (
                <span className="text-gold">{albums.find((a) => a.id === preview.album_id)!.name}</span>
              )}
              <span>{preview.title}</span>
              {preview.video_date && (
                <span className="text-xs text-ink-mute">· {preview.video_date}</span>
              )}
            </figcaption>
          </figure>
        </div>
      )}
    </div>
  );
}

function FolderNavItem({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
}) {
  return (
    <div
      onClick={onClick}
      className={
        "flex cursor-pointer items-center gap-1.5 rounded-soft px-2 py-1.5 text-xs transition-colors " +
        (active
          ? "bg-gold/15 text-coffee font-semibold"
          : "text-ink-soft hover:bg-cream-100 hover:text-ink")
      }
    >
      <span className="text-gold">{icon}</span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span className="text-[10px] text-ink-mute">{count}</span>
    </div>
  );
}
