import { useCallback, useEffect, useState } from "react";
import { supabase, supabaseReady } from "@/lib/supabase";
import type { Post, PostComment, PostImage } from "@/lib/types";

/**
 * 帖子相关通用 hook
 * - 匿名发帖（前端帖子页面的任何人发帖）
 * - 点赞（按 IP 去重，通过 post_likes 表 unique(post_id, ip_address)）
 * - 评论
 * - 分享计数（前端点击时 +1，存库）
 * - 列表查询（支持 featured=true 过滤首页推荐）
 * - 单帖详情 + 图片列表
 */

async function getMyIp(): Promise<string> {
  // 优先：如果 Supabase 里有 edge functions，可以返回公网 IP
  // 这里用简单方式：localStorage 里随机生成一个 fake-ip 作为唯一标识（浏览器端拿不到真实 IP）
  const KEY = "post_visitor_ip";
  let v = localStorage.getItem(KEY);
  if (!v) {
    v = `client-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem(KEY, v);
  }
  return v;
}

export function usePosts({ onlyFeatured = false }: { onlyFeatured?: boolean } = {}) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    if (!supabaseReady || !supabase) {
      setPosts([]);
      setLoading(false);
      return;
    }
    let q = supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false });
    if (onlyFeatured) q = q.eq("featured", true);
    const { data } = await q;
    setPosts((data as Post[]) ?? []);
    setLoading(false);
  }, [onlyFeatured]);

  useEffect(() => {
    load();
  }, [load]);

  return { posts, loading, reload: load };
}

export function usePostDetail(postId: string | null) {
  const [post, setPost] = useState<Post | null>(null);
  const [images, setImages] = useState<PostImage[]>([]);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!postId || !supabaseReady || !supabase) {
      setPost(null);
      setImages([]);
      setComments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [pRes, iRes, cRes] = await Promise.all([
      supabase.from("posts").select("*").eq("id", postId).single(),
      supabase
        .from("post_images")
        .select("*")
        .eq("post_id", postId)
        .order("sort_order", { ascending: true }),
      supabase
        .from("post_comments")
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: true }),
    ]);
    setPost((pRes.data as Post) ?? null);
    setImages((iRes.data as PostImage[]) ?? []);
    setComments((cRes.data as PostComment[]) ?? []);

    // 我有没有点过赞
    const ip = await getMyIp();
    const { count } = await supabase
      .from("post_likes")
      .select("*", { count: "exact", head: true })
      .eq("post_id", postId)
      .eq("ip_address", ip);
    setLiked((count ?? 0) > 0);

    setLoading(false);
  }, [postId]);

  useEffect(() => {
    load();
  }, [load]);

  return { post, images, comments, liked, loading, reload: load };
}

export function usePostActions() {
  /** 匿名发帖（前台） */
  const createAnonymousPost = useCallback(
    async (payload: {
      title: string;
      content: string;
      nickname?: string;
      imageFile?: File | null;
    }): Promise<{ ok: boolean; error?: string; id?: string }> => {
      if (!supabase) return { ok: false, error: "未连接到服务器" };
      const title = payload.title.trim();
      const content = payload.content.trim();
      if (!title && !content) return { ok: false, error: "标题或正文至少填一项" };

      const ip = await getMyIp();
      let cover_url: string | null = null;

      // 如果用户选了图，先上传到 posts 桶（匿名图片上传通过管理员的 RLS 是不行的——帖子存储桶只有管理员能上传）
      // 方案：普通用户发匿名帖不传图，只能管理员发帖带图（通过后台 PostManager）
      if (payload.imageFile) {
        return {
          ok: false,
          error: "游客发帖暂时不支持图片，请在后台管理中上传图片。或先记录文字。",
        };
      }

      const { data, error } = await supabase
        .from("posts")
        .insert({
          title,
          content,
          cover_url,
          nickname: payload.nickname?.trim() || null,
          ip_address: ip,
          is_admin: false,
          featured: false,
        })
        .select("id")
        .single();
      if (error) return { ok: false, error: error.message };
      return { ok: true, id: (data as { id: string }).id };
    },
    [],
  );

  /** 点赞（一人一票） */
  const likePost = useCallback(
    async (postId: string): Promise<{ ok: boolean; newCount?: number; error?: string; already?: boolean }> => {
      if (!supabase) return { ok: false, error: "未连接到服务器" };
      const ip = await getMyIp();
      const { error } = await supabase
        .from("post_likes")
        .insert({ post_id: postId, ip_address: ip });
      if (error) {
        // unique violation → 已经点过赞
        if (String(error.code) === "23505") {
          return { ok: false, already: true, error: "已经赞过啦" };
        }
        return { ok: false, error: error.message };
      }
      // 刷新计数：重新查 count
      const { count, error: cntErr } = await supabase
        .from("post_likes")
        .select("*", { count: "exact", head: true })
        .eq("post_id", postId);
      if (!cntErr && typeof count === "number") {
        await supabase
          .from("posts")
          .update({ like_count: count })
          .eq("id", postId);
      }
      return { ok: true, newCount: count ?? undefined };
    },
    [],
  );

  /** 发评论 */
  const addComment = useCallback(
    async (postId: string, payload: { nickname?: string; content: string }): Promise<{ ok: boolean; error?: string }> => {
      if (!supabase) return { ok: false, error: "未连接到服务器" };
      const content = payload.content.trim();
      if (!content) return { ok: false, error: "评论内容不能为空" };
      const ip = await getMyIp();
      const { error } = await supabase.from("post_comments").insert({
        post_id: postId,
        nickname: payload.nickname?.trim() || null,
        content,
        ip_address: ip,
      });
      if (error) return { ok: false, error: error.message };
      // 刷新 comment_count
      const { count, error: cntErr } = await supabase
        .from("post_comments")
        .select("*", { count: "exact", head: true })
        .eq("post_id", postId);
      if (!cntErr && typeof count === "number") {
        await supabase.from("posts").update({ comment_count: count }).eq("id", postId);
      }
      return { ok: true };
    },
    [],
  );

  /** 分享（点击按钮时 +1 share_count，然后复制链接） */
  const sharePost = useCallback(
    async (postId: string, shareUrl: string): Promise<{ ok: boolean; error?: string }> => {
      if (!supabase) return { ok: false, error: "未连接到服务器" };
      // 先计数
      const { data: now } = await supabase
        .from("posts")
        .select("share_count")
        .eq("id", postId)
        .single();
      const current = (now as { share_count: number } | null)?.share_count ?? 0;
      const { error } = await supabase
        .from("posts")
        .update({ share_count: current + 1 })
        .eq("id", postId);
      if (error) return { ok: false, error: error.message };
      // 复制链接
      try {
        await navigator.clipboard.writeText(shareUrl);
      } catch {
        // ignore
      }
      return { ok: true };
    },
    [],
  );

  return { createAnonymousPost, likePost, addComment, sharePost };
}

export function formatTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}.${m}.${day} ${h}:${mm}`;
}
