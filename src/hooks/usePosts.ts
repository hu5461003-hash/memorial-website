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

/**
 * 获取访客真实 IPv4 + IP 归属地 + 用户位置
 * - 优先调 https://ipapi.co/json/ 一次拿到 IP 与城市/省份/国家
 * - 失败回退 https://api.ipify.org 仅拿 IP（归属地未知）
 * - 最终回退 localStorage 生成唯一标识（保证点赞去重仍可用）
 * 结果缓存到 localStorage，避免每次发帖/评论都触发外部接口限速
 */
export type IpInfo = { ip: string; ipLocation: string; userLocation: string };

async function getMyIpInfo(): Promise<IpInfo> {
  const KEY = "post_visitor_ip_info";
  const cached = localStorage.getItem(KEY);
  if (cached) {
    try {
      const info = JSON.parse(cached) as IpInfo;
      if (info?.ip) return info;
    } catch {
      /* ignore */
    }
  }
  let ip = "";
  let ipLocation = "(未知)";
  let userLocation = "(未知)";
  try {
    const res = await fetch("https://ipapi.co/json/");
    if (res.ok) {
      const d = (await res.json()) as {
        ip?: string;
        city?: string;
        region?: string;
        country_name?: string;
      };
      ip = d.ip ?? "";
      const parts = [d.country_name, d.region, d.city].filter(Boolean);
      ipLocation = parts.length > 0 ? parts.join(" ") : "(未知)";
      userLocation = d.city || d.region || ipLocation;
    }
  } catch {
    /* 网络错误走回退 */
  }
  if (!ip) {
    try {
      const res = await fetch("https://api.ipify.org?format=json");
      if (res.ok) {
        const d = (await res.json()) as { ip?: string };
        ip = d.ip ?? "";
      }
    } catch {
      /* ignore */
    }
  }
  if (!ip) {
    // 最终回退：localStorage 生成稳定 fake id（保证点赞去重可用）
    let v = localStorage.getItem("post_visitor_ip_fallback");
    if (!v) {
      v = `client-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem("post_visitor_ip_fallback", v);
    }
    ip = v;
  }
  const info: IpInfo = { ip, ipLocation, userLocation };
  try {
    localStorage.setItem(KEY, JSON.stringify(info));
  } catch {
    /* ignore */
  }
  return info;
}

/** 仅取 IP 字符串（点赞去重等场景使用） */
async function getMyIp(): Promise<string> {
  return (await getMyIpInfo()).ip;
}

export function usePosts({ onlyFeatured = false }: { onlyFeatured?: boolean } = {}) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
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
    const { data, error: err } = await q;
    if (err) {
      const detail = [err.message, err.code, err.details, err.hint]
        .filter(Boolean)
        .join(" · ");
      setError(detail || "加载帖子失败");
      setPosts([]);
    } else {
      setPosts((data as Post[]) ?? []);
    }
    setLoading(false);
  }, [onlyFeatured]);

  useEffect(() => {
    load();
  }, [load]);

  return { posts, loading, error, reload: load };
}

export function usePostDetail(postId: string | null) {
  const [post, setPost] = useState<Post | null>(null);
  const [images, setImages] = useState<PostImage[]>([]);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!postId || !supabaseReady || !supabase) {
      setPost(null);
      setImages([]);
      setComments([]);
      setLiked(false);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
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
    const collectErr = [pRes.error, iRes.error, cRes.error]
      .filter(Boolean)
      .map((e) => [e!.message, e!.code, e!.details, e!.hint].filter(Boolean).join(" · "))
      .join(" | ");
    if (collectErr) setError(collectErr);
    setPost((pRes.data as Post) ?? null);
    setImages((iRes.data as PostImage[]) ?? []);
    setComments((cRes.data as PostComment[]) ?? []);

    // 我有没有点过赞
    const ip = await getMyIp();
    const { count, error: likeErr } = await supabase
      .from("post_likes")
      .select("*", { count: "exact", head: true })
      .eq("post_id", postId)
      .eq("ip_address", ip);
    if (likeErr) {
      const s = [likeErr.message, likeErr.code].filter(Boolean).join(" · ");
      setError((prev) => (prev ? prev + " | " + s : s));
    }
    setLiked((count ?? 0) > 0);

    setLoading(false);
  }, [postId]);

  useEffect(() => {
    load();
  }, [load]);

  return { post, images, comments, liked, loading, error, reload: load };
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

      const ipInfo = await getMyIpInfo();
      const cover_url: string | null = null;

      // 如果用户选了图，先上传到 posts 桶（匿名图片上传通过管理员的 RLS 是不行的——帖子存储桶只有管理员能上传）
      // 方案：普通用户发匿名帖不传图，只能管理员发帖带图（通过后台 PostManager）
      if (payload.imageFile) {
        return {
          ok: false,
          error: "游客发帖暂时不支持图片，请在后台管理中上传图片。或先记录文字。",
        };
      }

      // 带新字段插入；若表尚无 ip_location/user_location 列，回退为不带这些字段
      const baseInsert = {
        title,
        content,
        cover_url,
        nickname: payload.nickname?.trim() || null,
        ip_address: ipInfo.ip,
        is_admin: false,
        featured: false,
      };
      let res = await supabase
        .from("posts")
        .insert({ ...baseInsert, ip_location: ipInfo.ipLocation, user_location: ipInfo.userLocation })
        .select("id")
        .single();
      if (res.error && /ip_location|user_location/i.test(res.error.message)) {
        res = await supabase.from("posts").insert(baseInsert).select("id").single();
      }
      const { data, error } = res;
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
      const ipInfo = await getMyIpInfo();
      const baseInsert = {
        post_id: postId,
        nickname: payload.nickname?.trim() || null,
        content,
        ip_address: ipInfo.ip,
      };
      let res = await supabase
        .from("post_comments")
        .insert({ ...baseInsert, ip_location: ipInfo.ipLocation });
      if (res.error && /ip_location/i.test(res.error.message)) {
        res = await supabase.from("post_comments").insert(baseInsert);
      }
      const { error } = res;
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
