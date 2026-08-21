import {
  Home, MapPin, Images, MessageSquare, FileText, Newspaper, Mail, Heart, Star,
  Link2, User, Music, Camera, Video, BookOpen, Sparkles, Gift, Coffee, Plane, Smile,
  type LucideIcon,
} from "lucide-react";

/** 侧边栏导航可选图标（后台「导航」按 key 选择） */
export const NAV_ICONS: Record<string, LucideIcon> = {
  home: Home,
  map: MapPin,
  images: Images,
  message: MessageSquare,
  file: FileText,
  newspaper: Newspaper,
  mail: Mail,
  heart: Heart,
  star: Star,
  link: Link2,
  user: User,
  music: Music,
  camera: Camera,
  video: Video,
  book: BookOpen,
  sparkles: Sparkles,
  gift: Gift,
  coffee: Coffee,
  plane: Plane,
  smile: Smile,
};

export const NAV_ICON_OPTIONS: { key: string; label: string }[] = [
  { key: "home", label: "首页" },
  { key: "map", label: "地图" },
  { key: "images", label: "相册" },
  { key: "message", label: "留言" },
  { key: "file", label: "文档" },
  { key: "newspaper", label: "博客" },
  { key: "mail", label: "邮件" },
  { key: "heart", label: "爱心" },
  { key: "star", label: "星标" },
  { key: "link", label: "链接" },
  { key: "user", label: "用户" },
  { key: "music", label: "音乐" },
  { key: "camera", label: "相机" },
  { key: "video", label: "视频" },
  { key: "book", label: "书本" },
  { key: "sparkles", label: "闪光" },
  { key: "gift", label: "礼物" },
  { key: "coffee", label: "咖啡" },
  { key: "plane", label: "飞机" },
  { key: "smile", label: "笑脸" },
];

/** 按 key 渲染导航图标（未知 key 兜底为链接图标） */
export default function NavIcon({ name, className }: { name: string; className?: string }) {
  const Icon = NAV_ICONS[name] ?? Link2;
  return <Icon className={className} strokeWidth={1.8} aria-hidden="true" />;
}
