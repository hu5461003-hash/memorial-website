import { useCallback, useEffect, useState } from "react";
import {
  Trash2, Plus, Loader2, Upload, Image as ImageIcon, X,
  FolderOpen, FolderPlus, Pencil, Check, Folder, ChevronLeft,
  KeyRound, Lock, Save, Eye, EyeOff,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useStore } from "@/store/useStore";
import { useSiteMeta } from "@/hooks/useSiteMeta";
import { GALLERY_PASSWORD } from "@/lib/config";
import type { Photo, Album } from "@/lib/types";

type PendingFile = {
  file: File;
  preview: string;
  title: string;
};

/**
 * 相册管理 v2：自定义文件夹（albums 表）+ 文件夹内照片。
 * 两管理员共享池模式：任意管理员都能建文件夹、上传、删照片。
 * 每位管理员创建的文件夹 owner_admin_uid 记录创建者。
 */
export default function PhotoManager() {
  const { session } = useStore();
  const uid = session?.user?.id ?? null;
  const { meta, saveMeta } = useSiteMeta();

  // 相册密码修改
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [pwdBusy, setPwdBusy] = useState(false);
  const [pwdHint, setPwdHint] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const currentPwd = meta.gallery_password || GALLERY_PASSWORD;

  async function handleChangePwd(e: React.FormEvent) {
    e.preventDefault();
    if (!newPwd.trim()) {
      setPwdHint({ type: "err", text: "新密码不能为空" });
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdHint({ type: "err", text: "两次输入的密码不一致" });
      return;
    }
    setPwdBusy(true);
    setPwdHint(null);
    const ok = await saveMeta("gallery_password", newPwd.trim());
    setPwdBusy(false);
    if (ok) {
      setPwdHint({ type: "ok", text: "✓ 相册密码已修改，前台立即生效" });
      setNewPwd("");
      setConfirmPwd("");
    } else {
      setPwdHint({ type: "err", text: "修改失败，请重试" });
    }
  }

  const [albums, setAlbums] = useState<Album[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedId, setSelectedId] = useState<string | "all" | "none">("all");

  // 上传表单
  const [pending, setPending] = useState<PendingFile[]>([]);
  const [titlePrefix, setTitlePrefix] = useState("");
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

  /* ========= 加载 ========= */
  const load = useCallback(async () => {
    const [aRes, pRes] = await Promise.all([
      supabase.from("albums").select("*").order("sort_order", { ascending: true }),
      supabase.from("photos").select("*").order("photo_date", { ascending: false, nullsFirst: false }),
    ]);
    const alist = (aRes.data as Album[]) ?? [];
    setAlbums(alist);
    setPhotos((pRes.data as Photo[]) ?? []);
    // 默认选第一个 album 或 all
    if (!uploadAlbumId && alist.length > 0) setUploadAlbumId(alist[0].id);
  }, [uploadAlbumId]);

  useEffect(() => {
    load();
  }, [load]);

  // 过滤当前选中文件夹照片
  const filteredPhotos =
    selectedId === "all"
      ? photos
      : selectedId === "none"
        ? photos.filter((p) => !p.album_id)
        : photos.filter((p) => p.album_id === selectedId);

  // 每个文件夹照片数
  const photoCountByAlbum = (albumId: string | null) =>
    photos.filter((p) => (albumId === null ? !p.album_id : p.album_id === albumId)).length;

  /* ========= 多选文件 ========= */
  function handleSelectFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const newItems: PendingFile[] = [];
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      const preview = URL.createObjectURL(file);
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

  /* ========= 批量上传 ========= */
  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!uid) {
      setHint("登录失效，请重新登录");
      return;
    }
    if (pending.length === 0) {
      setHint("请先选择照片");
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
      const finalTitle =
        titlePrefix.trim()
          ? pending.length > 1
            ? `${titlePrefix.trim()}-${i + 1}`
            : titlePrefix.trim()
          : item.title.trim() || `photo-${i + 1}`;
      const ext = item.file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("gallery")
        .upload(path, item.file, { cacheControl: "3600", upsert: false });
      if (upErr) {
        fail++;
        failed.push(`${finalTitle}: [存储] ${upErr.message}`);
        setProgress({ ok, fail, total: pending.length });
        continue;
      }
      const { data: pub } = supabase.storage.from("gallery").getPublicUrl(path);
      const { error: dbErr } = await supabase.from("photos").insert({
        title: finalTitle,
        photo_date: date || null,
        album_id: uploadAlbumId,
        owner_admin_uid: uid,
        storage_path: path,
        public_url: pub.publicUrl,
      });
      if (dbErr) {
        fail++;
        failed.push(`${finalTitle}: [数据库] ${dbErr.message}`);
        await supabase.storage.from("gallery").remove([path]);
      } else {
        ok++;
      }
      setProgress({ ok, fail, total: pending.length });
    }
    setBusy(false);
    pending.forEach((p) => URL.revokeObjectURL(p.preview));
    setPending([]);
    if (fail === 0) setHint(`✓ 成功上传 ${ok} 张照片`);
    else setHint(`完成：${ok} 成功，${fail} 失败。${failed.join("；")}`);
    setProgress(null);
    load();
  }

  /* ========= 照片删除 ========= */
  async function handleDeletePhoto(p: Photo) {
    if (!confirm(`确认删除「${p.title}」？`)) return;
    await supabase.from("photos").delete().eq("id", p.id);
    await supabase.storage.from("gallery").remove([p.storage_path]);
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
    setHint(`✓ 已创建「${name}」`);
    load();
  }

  function startEdit(a: Album) {
    setEditAlbumId(a.id);
    setEditName(a.name);
  }
  async function saveEdit() {
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

  async function setAlbumCover(photo: Photo) {
    const id = photo.album_id;
    if (!id) return;
    const { error } = await supabase
      .from("albums")
      .update({ cover_url: photo.public_url, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) setHint(`设封面失败：${error.message}`);
    else setHint("✓ 已设为文件夹封面");
    load();
  }

  async function deleteAlbum(a: Album) {
    const cnt = photoCountByAlbum(a.id);
    const msg =
      cnt > 0
        ? `确认删除文件夹「${a.name}」？\n（含 ${cnt} 张照片，删除文件夹后这些照片会移到「未分类」）`
        : `确认删除文件夹「${a.name}」？`;
    if (!confirm(msg)) return;
    // 先把里面的照片 album_id 置空（而不是级联删除照片）
    if (cnt > 0) {
      await supabase.from("photos").update({ album_id: null }).eq("album_id", a.id);
    }
    await supabase.from("albums").delete().eq("id", a.id);
    if (selectedId === a.id) setSelectedId("all");
    setHint("✓ 已删除文件夹，里面照片移到未分类");
    load();
  }

  /* ========= 渲染 ========= */
  return (
    <div className="space-y-5">
      {/* ========== 相册密码设置 ========== */}
      <div className="rounded-card border border-gold/30 bg-cream-200 p-4 shadow-paper">
        <h3 className="mb-3 flex items-center gap-1.5 text-base font-bold text-ink">
          <Lock className="h-4 w-4 text-gold" strokeWidth={1.8} />
          相册访问密码
          <span className="ml-1 text-xs font-normal text-ink-mute">（前台相册页解锁用）</span>
        </h3>
        <div className="mb-3 flex items-center gap-2 rounded-soft bg-cream-50/60 px-3 py-2">
          <KeyRound className="h-3.5 w-3.5 flex-none text-ink-mute" strokeWidth={1.6} />
          <span className="text-xs text-ink-soft">当前密码：</span>
          <span className="font-mono text-sm font-semibold tracking-wider text-coffee">
            {showPwd ? currentPwd : "••••••"}
          </span>
          <button
            type="button"
            onClick={() => setShowPwd((v) => !v)}
            className="ml-auto rounded p-1 text-ink-mute hover:bg-cream-100 hover:text-ink"
            aria-label={showPwd ? "隐藏密码" : "显示密码"}
          >
            {showPwd ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
        </div>
        <form onSubmit={handleChangePwd} className="grid gap-2 sm:grid-cols-2">
          <div>
            <label className="field-label">新密码</label>
            <input
              type={showPwd ? "text" : "password"}
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              placeholder="输入新密码"
              className="input-line"
            />
          </div>
          <div>
            <label className="field-label">确认新密码</label>
            <input
              type={showPwd ? "text" : "password"}
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
              placeholder="再次输入新密码"
              className="input-line"
            />
          </div>
          <div className="sm:col-span-2">
            {pwdHint && (
              <p className={`mb-2 text-xs ${pwdHint.type === "ok" ? "text-coffee" : "text-rust"}`}>
                {pwdHint.text}
              </p>
            )}
            <button type="submit" disabled={pwdBusy} className="btn-gold !px-4 !py-2 text-xs">
              {pwdBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              修改密码
            </button>
          </div>
        </form>
      </div>

      {/* ========== 上传表单 ========== */}
      <form
        onSubmit={handleUpload}
        className="rounded-card border border-cream-300 bg-cream-200 p-4 shadow-paper"
      >
        <h3 className="mb-3 flex items-center gap-1.5 text-base font-bold text-ink">
          <Upload className="h-4 w-4 text-gold" strokeWidth={1.8} />
          批量上传照片
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
                {a.name}（{photoCountByAlbum(a.id)} 张）
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

        <label className="field-label mt-3">选择照片（支持多选）</label>
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

        {pending.length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {pending.map((p, idx) => (
              <div
                key={idx}
                className="group relative overflow-hidden rounded-soft border border-cream-300 bg-cream-50"
              >
                <div className="aspect-square">
                  <img src={p.preview} alt={p.title} className="h-full w-full object-cover" />
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

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">标题前缀（可选）</label>
            <input
              value={titlePrefix}
              onChange={(e) => setTitlePrefix(e.target.value)}
              placeholder="留空用文件名"
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
          {pending.length > 0 ? `上传 ${pending.length} 张` : "上传照片"}
        </button>
      </form>

      {/* ========== 文件夹 + 照片双栏 ========== */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[220px_1fr]">
        {/* 左：文件夹列表 */}
        <aside className="rounded-card border border-cream-300 bg-cream-200 p-3 shadow-paper h-fit">
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-ink">
            <FolderOpen className="h-3.5 w-3.5 text-gold" strokeWidth={1.8} />
            文件夹
          </h3>
          <nav className="space-y-1">
            <AlbumNavItem
              active={selectedId === "all"}
              onClick={() => setSelectedId("all")}
              icon={<ImageIcon className="h-3.5 w-3.5" strokeWidth={1.8} />}
              label="全部照片"
              count={photos.length}
            />
            <AlbumNavItem
              active={selectedId === "none"}
              onClick={() => setSelectedId("none")}
              icon={<Folder className="h-3.5 w-3.5 opacity-60" strokeWidth={1.8} />}
              label="未分类"
              count={photoCountByAlbum(null)}
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
                        if (e.key === "Enter") saveEdit();
                        if (e.key === "Escape") setEditAlbumId(null);
                      }}
                      className="w-full bg-transparent text-xs focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={saveEdit}
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
                      {photoCountByAlbum(a.id)}
                    </span>
                    <div className="ml-0.5 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          startEdit(a);
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

        {/* 右：当前文件夹照片 */}
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
              {selectedId === "all" && <ImageIcon className="h-4 w-4 text-gold" strokeWidth={1.8} />}
              {selectedId === "none" && <Folder className="h-4 w-4 opacity-60 text-gold" strokeWidth={1.8} />}
              {typeof selectedId === "string" &&
                selectedId !== "all" &&
                selectedId !== "none" && (
                  <FolderOpen className="h-4 w-4 text-gold" strokeWidth={1.8} />
                )}
              {selectedId === "all"
                ? "全部照片"
                : selectedId === "none"
                  ? "未分类"
                  : albums.find((a) => a.id === selectedId)?.name ?? "—"}
              <span className="ml-1 text-xs font-normal text-ink-mute">
                （{filteredPhotos.length}）
              </span>
            </h3>
            {typeof selectedId === "string" &&
              selectedId !== "all" &&
              selectedId !== "none" && (
                <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] text-emerald-700">
                  点击某张照片上的★可设为文件夹封面
                </span>
              )}
          </div>

          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {filteredPhotos.map((p) => (
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
                  <p className="truncate text-[11px] font-medium text-ink">{p.title}</p>
                  <p className="text-[9px] text-ink-mute">
                    {p.photo_date ?? "—"}
                  </p>
                </div>
                {/* 操作浮层 */}
                <div className="absolute right-1 top-1 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  {typeof selectedId === "string" &&
                    selectedId !== "all" &&
                    selectedId !== "none" && (
                      <button
                        type="button"
                        title="设为文件夹封面"
                        onClick={() => setAlbumCover(p)}
                        className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gold/90 text-cream-50 hover:bg-gold"
                      >
                        ★
                      </button>
                    )}
                  <button
                    type="button"
                    title="删除"
                    onClick={() => handleDeletePhoto(p)}
                    className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-ink/60 text-cream-50 hover:bg-rust"
                  >
                    <Trash2 className="h-3 w-3" strokeWidth={1.8} />
                  </button>
                </div>
              </div>
            ))}
            {filteredPhotos.length === 0 && (
              <div className="col-span-3 flex flex-col items-center py-8 text-ink-mute sm:col-span-4">
                <ImageIcon className="h-6 w-6" strokeWidth={1.4} />
                <p className="mt-2 text-xs">
                  {selectedId === "none" ? "没有未分类的照片" : "还没有照片，上传后会出现在这里"}
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function AlbumNavItem({
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
