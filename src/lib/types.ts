// 数据类型定义，与 Supabase 表结构对齐

export type Footprint = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  visit_date: string; // YYYY-MM-DD
  story: string;
  cover_url: string | null;
  sort_order: number;
  created_at: string;
};

export type MessageNote = {
  id: string;
  nickname: string;
  content: string;
  color: "yellow" | "pink" | "blue";
  created_at: string;
};

export type Photo = {
  id: string;
  title: string;
  photo_date: string | null;
  city: string | null; // 兼容旧字段，不再作为分组依据
  album_id: string | null;  // 自定义文件夹
  owner_admin_uid: string | null;
  storage_path: string;
  public_url: string;
  created_at: string;
};

export type NoteColor = "yellow" | "pink" | "blue";

export const NOTE_COLORS: NoteColor[] = ["yellow", "pink", "blue"];

/** 随机挑选一种便签底色 */
export function randomNoteColor(): NoteColor {
  return NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)];
}

// ============ 页面内容（文字 / 图片 增删改查） ============

export type ContentType = "text" | "longtext" | "image";

export type SiteContent = {
  id: string;
  content_key: string; // 唯一标识，如 home.footer
  page: string; // 所属页面：home / map / letter / messages / gallery
  label: string; // 显示名称
  type: ContentType; // text | longtext | image
  content_value: string | null; // 文本内容
  image_url: string | null; // 图片 URL（type=image 时）
  sort_order: number;
  updated_at: string;
};

// ============ 视频 ============

export type Video = {
  id: string;
  title: string;
  city: string | null;
  album_id: string | null;
  owner_admin_uid: string | null;
  video_date: string | null;
  storage_path: string;
  public_url: string;
  cover_url: string | null;
  duration: string | null;
  created_at: string;
};

// ============ 动态组件 / 自由排版 ============

export type SectionType =
  | "marquee"       // 无限滚动相册
  | "timeline"      // 恋爱时间轴
  | "custom_html"   // 自定义代码块
  | "heading"       // 标题文字
  | "spacer";       // 留白间隔

export type PageSection = {
  id: string;
  page_name: string;
  section_type: SectionType;
  content_data: Record<string, unknown>;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

// ============ 全局主题设置 ============

export type ThemeSettings = {
  bg_color: string;
  text_color: string;
  primary_color: string;
  card_color: string;
  border_color: string;
  base_font_size: string;
  heading_font_size: string;
  font_family: string;
};

export const DEFAULT_THEME: ThemeSettings = {
  bg_color: "#FFF5F7",
  text_color: "#4A3B47",
  primary_color: "#E8919F",
  card_color: "#FFF0F3",
  border_color: "#F5D5DD",
  base_font_size: "16px",
  heading_font_size: "24px",
  font_family: "Noto Serif SC",
};

// ============ 媒体素材库 ============

export type MediaItem = {
  id: string;
  file_name: string;
  media_type: "image" | "video";
  storage_path: string;
  public_url: string;
  file_size: number;
  created_at: string;
};

// ============ SEO / 站点元数据 ============

export type SiteMeta = {
  id: string;
  meta_key: string;
  meta_value: string | null;
  updated_at: string;
};

// ============ 帖子系统 ============

export type Post = {
  id: string;
  title: string;
  content: string;
  cover_url: string | null;
  featured: boolean;
  is_admin: boolean;
  nickname: string | null;
  ip_address: string | null;  // IPv4，仅后台可见
  ip_location: string | null;  // IP 归属地，仅后台可见
  user_location: string | null;  // 用户位置，仅后台可见
  like_count: number;
  comment_count: number;
  share_count: number;
  created_at: string;
};

export type PostImage = {
  id: string;
  post_id: string;
  storage_path: string;
  public_url: string;
  sort_order: number;
  created_at: string;
};

export type PostComment = {
  id: string;
  post_id: string;
  nickname: string | null;
  content: string;
  ip_address: string | null;  // 仅后台可见
  ip_location: string | null;  // IP 归属地，仅后台可见
  created_at: string;
};

// ================================================================

export const DEFAULT_SITE_META: Record<string, string> = {
  site_title: "记录",
  site_description: "一段跨越九座城市的旅程记录",
  favicon_url: "/favicon.svg",
  og_title: "记录",
  og_description: "走过的地方 都值得留下",
  og_image: "",
  keywords: "纪念,旅程,记录,足迹",
  author: "",
  lang: "zh-CN",
  robots: "index, follow",
  // 注意：admin 联系方式已于 v2 迁移到 admin_profiles 表（按管理员独立）
  // 保留以下 key 仅为兼容老代码读取
  admin_nickname: "管理员",
  admin_qq: "",
  admin_wechat: "",
  admin_phone: "",
  admin_email: "",
  admin_avatar_url: "",
};

// ============ 管理员系统 ============
export type AdminUser = {
  uid: string;
  email: string;
  is_primary: boolean;
  created_at: string;
};

export type AdminProfile = {
  admin_uid: string;
  nickname: string;
  qq: string;
  wechat: string;
  phone: string;
  email_display: string;
  avatar_url: string;
  updated_at: string;
};

// ============ 自定义相册文件夹 ============
export type Album = {
  id: string;
  name: string;
  description: string;
  cover_url: string | null;
  owner_admin_uid: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

/**
 * 生成头像 URL（同时兼容旧 site_meta 全局 Record 和新 AdminProfile）
 * 优先级：自定义头像 > QQ 头像 > 空
 */
export function getAdminAvatar(m: Record<string, string>): string;
export function getAdminAvatar(p: Partial<AdminProfile>): string;
export function getAdminAvatar(x: Record<string, string | undefined> | Partial<AdminProfile>): string {
  // 联合类型下直接访问具体属性会报"属性不存在"，统一按索引签名读取
  const r = x as Record<string, string | undefined>;
  const custom = (r.avatar_url ?? r.admin_avatar_url ?? "").trim();
  if (custom) return custom;
  const qq = (r.qq ?? r.admin_qq ?? "").trim();
  if (qq) return `https://q.qlogo.cn/g?b=qq&nk=${encodeURIComponent(qq)}&s=100`;
  return "";
}
