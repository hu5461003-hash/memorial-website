import { useEffect, useState } from "react";
import {
  Trash2,
  Plus,
  Loader2,
  Upload,
  Image as ImageIcon,
  X,
  Star,
  Pin,
  FileText,
  Eye,
  MessageSquare,
  Heart,
  Share2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Post, PostImage, PostComment } from "@/lib/types";
import { formatTime } from "@/hooks/usePosts";

type PendingImage = {
  file: File;
  preview: string;
};

export default function PostManager() {
  const [list, setList] = useState<Post[]>([]);
  const [imagesMap, setImagesMap] = useState<Record<string, PostImage[]>>({});
  const [commentsMap, setCommentsMap] = useState<Record<string, PostComment[]>>({});
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [featured, setFeatured] = useState(false);
  const [pendingImgs, setPendingImgs] = useState<PendingImage[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ ok: number; total: number } | null>(null);
  // 展开查看的帖子 ID（查看 IP / 评论 / 图片详情）
  const [expanded, setExpanded] = useState<string | null>(null);

  async function load() {
    const [postsRes, imagesRes, commentsRes] = await Promise.all([
      supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase.from("post_images").select("*"),
      supabase.from("post_comments").select("*"),
    ]);
    const posts = (postsRes.data as Post[]) ?? [];
    setList(posts);

    const imgs = (imagesRes.data as PostImage[]) ?? [];
    const iMap: Record<string, PostImage[]> = {};
    imgs.forEach((i) => {
      if (!iMap[i.post_id]) iMap[i.post_id] = [];
      iMap[i.post_id].push(i);
    });
    // 按 sort_order 排序
    Object.keys(iMap).forEach((k) =>
      iMap[k].sort((a, b) => a.sort_order - b.sort_order),
    );
    setImagesMap(iMap);

    const comments = (commentsRes.data as PostComment[]) ?? [];
    const cMap: Record<string, PostComment[]> = {};
    comments.forEach((c) => {
      if (!cMap[c.post_id]) cMap[c.post_id] = [];
      cMap[c.post_id].push(c);
    });
    setCommentsMap(cMap);
  }

  useEffect(() => {
    load();
  }, []);

  function handleSelectImgs(files: FileList | null) {
    if (!files || files.length === 0) return;
    const arr: PendingImage[] = [];
    Array.from(files).forEach((f) => {
      if (!f.type.startsWith("image/")) return;
      arr.push({ file: f, preview: URL.createObjectURL(f) });
    });
    setPendingImgs((prev) => [...prev, ...arr]);
  }

  function removePending(idx: number) {
    setPendingImgs((prev) => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  }

  async function handleCreatePost(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    const c = content.trim();
    if (!t && !c && pendingImgs.length === 0) {
      setHint("请填写标题/正文或选择图片");
      return;
    }
    setBusy(true);
    setHint(null);
    setProgress({ ok: 0, total: pendingImgs.length });

    // 1. 先建 Post 记录（is_admin=true）
    const { data: inserted, error: postErr } = await supabase
      .from("posts")
      .insert({
        title: t,
        content: c,
        featured,
        is_admin: true,
      })
      .select("id")
      .single();
    if (postErr) {
      setBusy(false);
      setHint(`创建帖子失败：${postErr.message}`);
      return;
    }
    const postId = (inserted as { id: string }).id;

    // 2. 批量上传图片
    let cover_url: string | null = null;
    const sortedImages = pendingImgs;
    for (let i = 0; i < sortedImages.length; i++) {
      const item = sortedImages[i];
      const ext = item.file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${postId}/${Date.now()}-${i}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("posts")
        .upload(path, item.file, { cacheControl: "3600", upsert: false });
      if (upErr) continue;
      const { data: pub } = supabase.storage.from("posts").getPublicUrl(path);
      const { error: dbErr } = await supabase.from("post_images").insert({
        post_id: postId,
        storage_path: path,
        public_url: pub.publicUrl,
        sort_order: i,
      });
      if (!dbErr && i === 0) cover_url = pub.publicUrl;
      setProgress({ ok: i + 1, total: pendingImgs.length });
    }
    URL.revokeObjectURL(""); // 清 preview
    pendingImgs.forEach((p) => URL.revokeObjectURL(p.preview));

    // 3. 更新首图 cover_url
    if (cover_url) {
      await supabase.from("posts").update({ cover_url }).eq("id", postId);
    }

    setBusy(false);
    setProgress(null);
    setHint("✓ 帖子已创建");
    setTitle("");
    setContent("");
    setFeatured(false);
    setPendingImgs([]);
    load();
  }

  async function toggleFeatured(p: Post) {
    const { error } = await supabase
      .from("posts")
      .update({ featured: !p.featured })
      .eq("id", p.id);
    if (error) {
      setHint(`推荐开关失败：${error.message}`);
    } else {
      load();
    }
  }

  async function handleDelete(p: Post) {
    if (!confirm(`确认删除帖子「${p.title || "(无标题)"}」？\n关联的图片/评论也会一并删除。`)) return;
    // 删除桶中的图片
    const imgs = imagesMap[p.id] ?? [];
    if (imgs.length > 0) {
      await supabase.storage
        .from("posts")
        .remove(imgs.map((i) => i.storage_path));
    }
    // 通过 on delete cascade，删 post 自动删 post_images/post_comments/post_likes
    await supabase.from("posts").delete().eq("id", p.id);
    load();
  }

  async function deleteComment(comment: PostComment) {
    if (!confirm("删除这条评论？")) return;
    await supabase.from("post_comments").delete().eq("id", comment.id);
    load();
  }

  return (
    <div className="space-y-5">
      {/* 发帖表单 */}
      <form
        onSubmit={handleCreatePost}
        className="rounded-card border border-cream-300 bg-cream-200 p-4 shadow-paper"
      >
        <h3 className="mb-3 flex items-center gap-1.5 text-base font-bold text-ink">
          <FileText className="h-4 w-4 text-gold" strokeWidth={1.8} />
          发布新帖子（管理员）
        </h3>

        <div className="space-y-3">
          <div>
            <label className="field-label">标题</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="简短标题，列表展示一行"
              className="input-line"
            />
          </div>
          <div>
            <label className="field-label">正文</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              placeholder="帖子正文内容"
              className="input-line resize-y"
            />
          </div>
        </div>

        {/* 图片多选 */}
        <div className="mt-3">
          <label className="field-label">帖子图片（可多选，第一张为首页首图）</label>
          <label className="mt-1 flex cursor-pointer items-center justify-center gap-2 rounded-soft border border-dashed border-cream-300 bg-cream-50/60 py-6 text-sm text-ink-soft transition-colors hover:border-gold hover:text-coffee">
            <Upload className="h-4 w-4" strokeWidth={1.8} />
            {pendingImgs.length > 0
              ? `已选 ${pendingImgs.length} 张，点击继续添加`
              : "点击选择图片（可多选）"}
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleSelectImgs(e.target.files)}
            />
          </label>
          {pendingImgs.length > 0 && (
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {pendingImgs.map((p, idx) => (
                <div
                  key={idx}
                  className="group relative overflow-hidden rounded-soft border border-cream-300 bg-cream-50"
                >
                  <div className="aspect-square">
                    <img src={p.preview} alt="" className="h-full w-full object-cover" />
                  </div>
                  {idx === 0 && (
                    <span className="absolute left-1 top-1 rounded bg-gold/90 px-1 py-0.5 text-[9px] font-semibold text-cream-50">
                      首图
                    </span>
                  )}
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
        </div>

        {/* 推荐到首页 */}
        <label className="mt-3 flex cursor-pointer items-center gap-2 rounded-soft bg-cream-50 px-3 py-2">
          <input
            type="checkbox"
            checked={featured}
            onChange={(e) => setFeatured(e.target.checked)}
            className="h-4 w-4 rounded border-cream-300 text-gold focus:ring-gold"
          />
          <Star className="h-4 w-4 text-gold-tint" strokeWidth={1.8} />
          <span className="text-sm text-ink">
            推荐到首页（Stories 区展示首图）
          </span>
        </label>

        {/* 进度条 */}
        {progress && busy && (
          <div className="mt-3 rounded-soft bg-cream-100 p-2.5">
            <div className="mb-1.5 flex items-center justify-between text-xs text-ink-soft">
              <span className="flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2} />
                上传图片 {progress.ok} / {progress.total}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-cream-300">
              <div
                className="ins-gradient h-full transition-all duration-300"
                style={{
                  width: progress.total > 0 ? `${(progress.ok / progress.total) * 100}%` : "0%",
                }}
              />
            </div>
          </div>
        )}

        {hint && <p className="mt-3 text-xs text-coffee">{hint}</p>}

        <button
          type="submit"
          disabled={busy}
          className="btn-gold mt-4"
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.8} />
          ) : (
            <Plus className="h-3.5 w-3.5" strokeWidth={1.8} />
          )}
          发布帖子
        </button>
      </form>

      {/* 帖子列表 */}
      <div className="rounded-card border border-cream-300 bg-cream-200 p-4">
        <h3 className="mb-3 flex items-center gap-1.5 text-base font-bold text-ink">
          <Pin className="h-4 w-4 text-gold" strokeWidth={1.8} />
          全部帖子（{list.length}）
        </h3>

        {list.length === 0 && (
          <div className="flex flex-col items-center py-8 text-ink-mute">
            <FileText className="h-6 w-6" strokeWidth={1.4} />
            <p className="mt-2 text-xs">还没有帖子，先去发一篇吧</p>
          </div>
        )}

        <div className="space-y-3">
          {list.map((p) => {
            const imgs = imagesMap[p.id] ?? [];
            const comments = commentsMap[p.id] ?? [];
            const isOpen = expanded === p.id;
            return (
              <div
                key={p.id}
                className="overflow-hidden rounded-soft border border-cream-300 bg-cream-50"
              >
                <div className="flex gap-3 p-3">
                  {/* 首图或占位 */}
                  <div className="h-20 w-20 flex-none overflow-hidden rounded-soft bg-cream-100">
                    {p.cover_url ? (
                      <img src={p.cover_url} alt="" className="h-full w-full object-cover" />
                    ) : imgs[0] ? (
                      <img src={imgs[0].public_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-ink-mute">
                        <ImageIcon className="h-5 w-5" strokeWidth={1.4} />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h4 className="truncate text-sm font-semibold text-ink">
                            {p.title || "(无标题)"}
                          </h4>
                          {p.is_admin && (
                            <span className="rounded bg-gold/15 px-1 text-[9px] font-medium text-gold">
                              管理员
                            </span>
                          )}
                          {p.featured && (
                            <span className="flex items-center gap-0.5 rounded bg-coffee/15 px-1 text-[9px] font-medium text-coffee">
                              <Pin className="h-2.5 w-2.5" />
                              首页
                            </span>
                          )}
                        </div>
                        <p className="mt-1 line-clamp-2 text-[11px] text-ink-soft">
                          {p.content || "(无正文)"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-ink-mute">
                      <span>{formatTime(p.created_at)}</span>
                      <span className="inline-flex items-center gap-1">
                        <Heart className="h-3 w-3" />
                        {p.like_count}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {p.comment_count}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Share2 className="h-3 w-3" />
                        {p.share_count}
                      </span>
                      <span>{imgs.length} 图</span>
                      {p.nickname && <span>匿名：{p.nickname}</span>}
                    </div>

                    {/* 操作按钮 */}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => toggleFeatured(p)}
                        className={
                          p.featured
                            ? "flex items-center gap-1 rounded-soft bg-coffee/10 px-2 py-1 text-[10px] font-medium text-coffee"
                            : "flex items-center gap-1 rounded-soft border border-cream-300 px-2 py-1 text-[10px] font-medium text-ink-soft hover:text-coffee"
                        }
                      >
                        <Pin className="h-3 w-3" />
                        {p.featured ? "已推荐到首页" : "推荐到首页"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setExpanded(isOpen ? null : p.id)}
                        className="flex items-center gap-1 rounded-soft border border-cream-300 px-2 py-1 text-[10px] font-medium text-ink-soft hover:text-coffee"
                      >
                        <Eye className="h-3 w-3" />
                        {isOpen ? "收起详情" : "详情/IP/评论"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(p)}
                        className="ml-auto flex items-center gap-1 rounded-soft border border-rust/20 bg-rust/5 px-2 py-1 text-[10px] font-medium text-rust hover:bg-rust/10"
                      >
                        <Trash2 className="h-3 w-3" />
                        删除
                      </button>
                    </div>
                  </div>
                </div>

                {/* 展开详情：图片 + IP + 评论 */}
                {isOpen && (
                  <div className="border-t border-cream-300 bg-cream-100/50 p-3 space-y-3">
                    {/* IP & 访客信息 */}
                    <div className="rounded-soft bg-cream-50 p-2.5 text-[11px]">
                      <p>
                        <strong className="text-ink">发帖IP：</strong>
                        <span className="font-mono text-ink-soft">{p.ip_address ?? "(无)"}</span>
                      </p>
                      {p.nickname && (
                        <p className="mt-1">
                          <strong className="text-ink">访客昵称：</strong>
                          <span className="text-ink-soft">{p.nickname}</span>
                        </p>
                      )}
                    </div>

                    {/* 图片列表 */}
                    {imgs.length > 0 && (
                      <div>
                        <p className="mb-1.5 text-[11px] text-ink-soft">
                          帖子图片（{imgs.length}）
                        </p>
                        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
                          {imgs.map((i) => (
                            <div
                              key={i.id}
                              className="aspect-square overflow-hidden rounded-soft bg-cream-50"
                            >
                              <img src={i.public_url} alt="" className="h-full w-full object-cover" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 评论列表 */}
                    {comments.length > 0 && (
                      <div>
                        <p className="mb-1.5 text-[11px] text-ink-soft">
                          评论（{comments.length}）
                        </p>
                        <ul className="space-y-1.5">
                          {comments.map((c) => (
                            <li
                              key={c.id}
                              className="flex items-start justify-between gap-2 rounded-soft bg-cream-50 p-2"
                            >
                              <div className="min-w-0 flex-1 text-[11px]">
                                <div className="flex items-center gap-1.5">
                                  <strong className="text-ink">
                                    {c.nickname || "匿名"}
                                  </strong>
                                  <span className="font-mono text-[9px] text-ink-mute">
                                    IP:{c.ip_address ?? "-"}
                                  </span>
                                  <span className="text-[9px] text-ink-mute">
                                    {formatTime(c.created_at)}
                                  </span>
                                </div>
                                <p className="mt-0.5 text-ink-soft break-words">{c.content}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => deleteComment(c)}
                                className="flex-none rounded border border-rust/20 bg-rust/5 px-1.5 py-0.5 text-[9px] text-rust hover:bg-rust/10"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
