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
  city: string | null; // 所属城市（中文名称，与 footprints.name 对应）
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

// ============ 首页 Banner ============

export type Banner = {
  id: string;
  image_url: string;
  title: string | null;
  subtitle: string | null;
  link: string | null;
  sort_order: number;
  active: boolean;
  created_at: string;
};

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
  video_date: string | null;
  storage_path: string;
  public_url: string;
  cover_url: string | null;
  duration: string | null;
  created_at: string;
};
