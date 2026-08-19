import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ChevronLeft,
  Heart,
  MessageSquare,
  Share2,
  Loader2,
  X,
  Send,
  AlertCircle,
  Check,
  PenSquare,
  FileImage,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import Layout from "@/components/Layout";
import Loading from "@/components/Loading";
import PostGrid from "@/components/PostGrid";
import {
  usePosts,
  usePostDetail,
  usePostActions,
  formatTime,
} from "@/hooks/usePosts";
import type { Post } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function Posts() {
  const { id } = useParams();  // /posts/:id 有值时显示详情
  const navigate = useNavigate();
  return (
    <Layout>
      {id ? (
        <PostDetailView postId={id} onExit={() => navigate("/posts")} />
      ) : (
        <PostListView />
      )}
    </Layout>
  );
}

/* ===================== 列表视图 ===================== */
function PostListView() {
  const { posts, loading, error, reload } = usePosts();
  const { createAnonymousPost } = usePostActions();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [nickname, setNickname] = useState("");
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    if (!hint) return;
    const t = setTimeout(() => setHint(null), 3500);
    return () => clearTimeout(t);
  }, [hint]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const r = await createAnonymousPost({
      title,
      content,
      nickname,
    });
    setBusy(false);
    if (r.ok) {
      setHint({ type: "ok", text: "✓ 发帖成功，等待管理员推荐到首页" });
      setTitle("");
      setContent("");
      setNickname("");
      setShowForm(false);
    } else {
      setHint({ type: "err", text: r.error ?? "发帖失败" });
    }
  }

  const subtitle = posts.length > 0 ? `共 ${posts.length} 篇` : "";

  return (
    <>
      <PageHeader title="帖子" subtitle={subtitle} showBack={false} />

      {/* 发帖按钮 */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs text-ink-soft">
          所有人均可匿名发帖
        </p>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="btn-gold text-xs"
        >
          <PenSquare className="h-3.5 w-3.5" strokeWidth={1.8} />
          {showForm ? "收起表单" : "我要发帖"}
        </button>
      </div>

      {/* 发帖表单 */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mb-5 rounded-card border border-cream-300 bg-cream-200 p-3 shadow-paper animate-fade-up"
        >
          <h3 className="mb-2 text-sm font-semibold text-ink">匿名发帖</h3>
          <div className="space-y-2">
            <div>
              <label className="field-label">昵称（可选）</label>
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="默认显示为"匿名""
                className="input-line"
              />
            </div>
            <div>
              <label className="field-label">标题</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="一句话标题"
                className="input-line"
              />
            </div>
            <div>
              <label className="field-label">正文</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                placeholder="想说的话…"
                className="input-line resize-y"
              />
              <p className="mt-0.5 text-[10px] text-ink-mute">
                * 游客发帖暂不支持图片，带图帖子请在后台发布
              </p>
            </div>
          </div>

          {hint && (
            <p
              className={cn(
                "mt-2 flex items-center gap-1 text-xs",
                hint.type === "ok" ? "text-emerald-600" : "text-rust",
              )}
            >
              {hint.type === "ok" ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <AlertCircle className="h-3.5 w-3.5" />
              )}
              {hint.text}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="btn-gold mt-3 text-xs"
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            发布
          </button>
        </form>
      )}

      {loading ? (
        <Loading tip="正在加载帖子…" />
      ) : error ? (
        <div className="rounded-card border border-rose-200 bg-rose-50/80 px-4 py-5 text-sm text-rose-600">
          <div className="mb-1 font-semibold">加载帖子失败</div>
          <div className="break-all text-xs opacity-90">{error}</div>
          <button
            type="button"
            onClick={() => reload()}
            className="btn-gold mt-3 !py-1.5 text-xs"
          >
            重新加载
          </button>
        </div>
      ) : (
        <PostGrid posts={posts} />
      )}
    </>
  );
}

/* ===================== 详情视图 ===================== */
function PostDetailView({
  postId,
  onExit,
}: {
  postId: string;
  onExit: () => void;
}) {
  const { post, images, comments, liked, loading, error, reload } = usePostDetail(postId);
  const { likePost, addComment, sharePost } = usePostActions();
  const navigate = useNavigate();

  // 图片轮播当前序号
  const [imgIdx, setImgIdx] = useState(0);
  useEffect(() => setImgIdx(0), [postId, images.length]);

  // 评论表单
  const [cNick, setCNick] = useState("");
  const [cContent, setCContent] = useState("");
  const [cBusy, setCBusy] = useState(false);
  const [cHint, setCHint] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // 操作中的状态（防止狂点）
  const [likeBusy, setLikeBusy] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [localCount, setLocalCount] = useState<Post | null>(null);

  useEffect(() => {
    if (post) setLocalCount(post);
  }, [post]);

  useEffect(() => {
    if (!cHint) return;
    const t = setTimeout(() => setCHint(null), 3000);
    return () => clearTimeout(t);
  }, [cHint]);

  async function handleLike() {
    if (likeBusy || !post) return;
    setLikeBusy(true);
    const r = await likePost(postId);
    setLikeBusy(false);
    if (r.already) {
      setCHint({ type: "err", text: r.error ?? "已经赞过啦" });
    } else if (r.ok) {
      setLocalCount({
        ...post,
        like_count: typeof r.newCount === "number" ? r.newCount : post.like_count + 1,
      });
    } else {
      setCHint({ type: "err", text: r.error ?? "点赞失败" });
    }
  }

  async function handleShare() {
    if (shareBusy || !post) return;
    setShareBusy(true);
    const url = `${window.location.origin}${window.location.pathname}${window.location.hash}`;
    const r = await sharePost(postId, url);
    setShareBusy(false);
    if (r.ok) {
      setLocalCount((prev) => (prev ? { ...prev, share_count: prev.share_count + 1 } : prev));
      setCHint({ type: "ok", text: "✓ 链接已复制，快去分享吧" });
    } else {
      setCHint({ type: "err", text: r.error ?? "分享失败" });
    }
  }

  async function handleSubmitComment(e: React.FormEvent) {
    e.preventDefault();
    if (cBusy) return;
    setCBusy(true);
    setCHint(null);
    const r = await addComment(postId, { nickname: cNick, content: cContent });
    setCBusy(false);
    if (r.ok) {
      setCHint({ type: "ok", text: "✓ 评论已发出" });
      setCContent("");
      reload();
    } else {
      setCHint({ type: "err", text: r.error ?? "评论失败" });
    }
  }

  if (loading) {
    return (
      <>
        <PageHeader title="帖子详情" showBack={false} />
        <Loading tip="加载中…" />
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader title="帖子详情" showBack={false} />
        <div className="rounded-card border border-rose-200 bg-rose-50/80 px-4 py-5 text-sm text-rose-600">
          <div className="mb-1 font-semibold">加载帖子详情失败</div>
          <div className="break-all text-xs opacity-90">{error}</div>
          <button
            type="button"
            onClick={() => reload()}
            className="btn-gold mt-3 !py-1.5 text-xs"
          >
            重新加载
          </button>
        </div>
      </>
    );
  }

  if (!post) {
    return (
      <>
        <PageHeader title="帖子" showBack={false} />
        <div className="flex flex-col items-center py-16 text-ink-mute">
          <AlertCircle className="h-7 w-7" />
          <p className="mt-2 text-sm">帖子不存在或已删除</p>
          <button
            type="button"
            onClick={() => navigate("/posts")}
            className="btn-ghost mt-4 text-xs"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            返回帖子列表
          </button>
        </div>
      </>
    );
  }

  const p = localCount ?? post;

  return (
    <>
      <PageHeader title="帖子详情" showBack={false} />

      {/* 返回按钮 */}
      <button
        type="button"
        onClick={onExit}
        className="mb-3 flex items-center gap-1.5 rounded-soft px-2 py-1.5 text-xs text-ink-soft transition-colors hover:bg-cream-100 hover:text-ink"
      >
        <ChevronLeft className="h-4 w-4" strokeWidth={1.8} />
        返回帖子列表
      </button>

      {/* 帖子卡片 */}
      <article className="overflow-hidden rounded-card border border-cream-300 bg-cream-200 shadow-paper">
        {/* 图片轮播 */}
        {images.length > 0 && (
          <div className="relative bg-ink">
            <div className="aspect-square w-full">
              <img
                src={images[imgIdx].public_url}
                alt=""
                className="h-full w-full object-contain"
              />
            </div>
            {images.length > 1 && (
              <>
                {/* 点 */}
                <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
                  {images.map((_, i) => (
                    <span
                      key={i}
                      className={cn(
                        "h-1.5 rounded-full transition-all",
                        i === imgIdx ? "w-4 bg-cream-50" : "w-1.5 bg-cream-50/50",
                      )}
                    />
                  ))}
                </div>
                {/* 左右箭头（仅>1 张） */}
                <button
                  type="button"
                  onClick={() => setImgIdx((v) => (v - 1 + images.length) % images.length)}
                  className="absolute left-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-ink/50 text-cream-50 transition-colors hover:bg-ink/70"
                  aria-label="上一张"
                >
                  <ChevronLeft className="h-4 w-4" strokeWidth={2} />
                </button>
                <button
                  type="button"
                  onClick={() => setImgIdx((v) => (v + 1) % images.length)}
                  className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 rotate-180 items-center justify-center rounded-full bg-ink/50 text-cream-50 transition-colors hover:bg-ink/70"
                  aria-label="下一张"
                >
                  <ChevronLeft className="h-4 w-4" strokeWidth={2} />
                </button>
              </>
            )}
          </div>
        )}
        {/* 没有图也显示封面占位（如果有封面） */}
        {images.length === 0 && p.cover_url && (
          <div className="aspect-square w-full bg-ink">
            <img src={p.cover_url} alt="" className="h-full w-full object-cover" />
          </div>
        )}
        {images.length === 0 && !p.cover_url && (
          <div className="flex aspect-square w-full items-center justify-center bg-cream-100 text-ink-mute">
            <FileImage className="h-10 w-10" strokeWidth={1.4} />
          </div>
        )}

        {/* 内容区 */}
        <div className="p-4">
          {/* 操作栏 */}
          <div className="mb-3 flex items-center gap-1.5 border-b border-cream-300 pb-3">
            <button
              type="button"
              onClick={handleLike}
              disabled={likeBusy}
              className={cn(
                "inline-flex items-center gap-1 rounded-soft px-2 py-1.5 text-xs transition-colors",
                liked
                  ? "bg-gold/10 text-gold"
                  : "text-ink-soft hover:text-coffee hover:bg-cream-100",
              )}
            >
              <Heart
                className="h-4 w-4"
                strokeWidth={liked ? 0 : 1.8}
                fill={liked ? "currentColor" : "none"}
              />
              {p.like_count}
            </button>
            <Link
              to="#comments"
              className="inline-flex items-center gap-1 rounded-soft px-2 py-1.5 text-xs text-ink-soft hover:text-coffee hover:bg-cream-100"
            >
              <MessageSquare className="h-4 w-4" strokeWidth={1.8} />
              {p.comment_count}
            </Link>
            <button
              type="button"
              onClick={handleShare}
              disabled={shareBusy}
              className="inline-flex items-center gap-1 rounded-soft px-2 py-1.5 text-xs text-ink-soft hover:text-coffee hover:bg-cream-100"
            >
              <Share2 className="h-4 w-4" strokeWidth={1.8} />
              分享 {p.share_count > 0 ? p.share_count : ""}
            </button>

            {/* 作者信息 */}
            <div className="ml-auto text-right">
              <p className="text-[11px] font-medium text-ink">
                {p.is_admin ? "管理员" : p.nickname ? p.nickname : "匿名"}
              </p>
              <p className="text-[9px] text-ink-mute">{formatTime(p.created_at)}</p>
            </div>
          </div>

          {/* 标题 */}
          {p.title && (
            <h2 className="text-base font-bold text-ink">{p.title}</h2>
          )}
          {/* 正文 */}
          {p.content && (
            <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">
              {p.content}
            </div>
          )}
        </div>

        {/* 评论区 */}
        <div id="comments" className="border-t border-cream-300 p-4">
          <h3 className="mb-2 text-sm font-semibold text-ink">
            评论（{comments.length}）
          </h3>

          {cHint && (
            <p
              className={cn(
                "mb-2 flex items-center gap-1 text-xs",
                cHint.type === "ok" ? "text-emerald-600" : "text-rust",
              )}
            >
              {cHint.type === "ok" ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <AlertCircle className="h-3.5 w-3.5" />
              )}
              {cHint.text}
            </p>
          )}

          {/* 评论列表 */}
          <ul className="space-y-3">
            {comments.length === 0 && (
              <li className="py-4 text-center text-xs text-ink-mute">
                抢沙发 — 说点什么吧
              </li>
            )}
            {comments.map((c) => (
              <li
                key={c.id}
                className="flex items-start gap-2 rounded-soft bg-cream-50/60 p-2.5 animate-fade-up"
              >
                {/* 简单圆圈头像 */}
                <span className="flex-none inline-flex h-7 w-7 items-center justify-center rounded-full ins-gradient text-[11px] font-semibold text-cream-50">
                  {(c.nickname || "匿").slice(0, 1)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <strong className="text-[11px] text-ink">
                      {c.nickname || "匿名"}
                    </strong>
                    <span className="text-[9px] text-ink-mute">
                      {formatTime(c.created_at)}
                    </span>
                  </div>
                  <p className="mt-0.5 break-words text-[12px] leading-relaxed text-ink-soft">
                    {c.content}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          {/* 评论表单 */}
          <form
            onSubmit={handleSubmitComment}
            className="mt-4 rounded-soft border border-cream-300 bg-cream-50 p-2.5"
          >
            <input
              value={cNick}
              onChange={(e) => setCNick(e.target.value)}
              placeholder="昵称（可选）"
              className="input-line text-xs"
            />
            <div className="mt-2 flex items-end gap-2">
              <textarea
                value={cContent}
                onChange={(e) => setCContent(e.target.value)}
                rows={2}
                placeholder="写评论…"
                className="input-line flex-1 resize-none text-xs"
              />
              <button
                type="submit"
                disabled={cBusy || !cContent.trim()}
                className="flex-none rounded-soft bg-gold px-3 py-2 text-xs font-semibold text-cream-50 transition-opacity disabled:opacity-50"
              >
                {cBusy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </form>
        </div>
      </article>
    </>
  );
}
