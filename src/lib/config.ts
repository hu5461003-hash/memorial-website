// 全局配置常量

/** 私密相册解锁密码（前端校验） */
export const GALLERY_PASSWORD = "0111";

/** 背景音乐 URL（可替换为自有音频） */
export const BG_MUSIC_URL =
  "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=relaxing-mountains-rivers-streams-running-water-18178.mp3";

/** sessionStorage / localStorage 键 */
export const STORAGE_KEYS = {
  musicPlaying: "zpxp_music_playing",
  galleryUnlocked: "zpxp_gallery_unlocked",
} as const;

/** 九座城市初始数据（当 Supabase 未配置时作为兜底展示） */
export const FALLBACK_FOOTPRINTS = [
  { name: "平江", lat: 28.7017, lng: 113.5964, visit_date: "2022-04-10", story: "起点：汨罗江畔的小城，幕阜山下的清晨。", cover_url: null, sort_order: 1 },
  { name: "南宁", lat: 22.817, lng: 108.3669, visit_date: "2022-05-22", story: "邕江边的青秀山，南国第一缕湿热的风。", cover_url: null, sort_order: 2 },
  { name: "柳州", lat: 24.326, lng: 109.428, visit_date: "2022-06-18", story: "螺蛳粉的酸笋香，柳江绕城的弧线。", cover_url: null, sort_order: 3 },
  { name: "永州", lat: 26.4345, lng: 111.608, visit_date: "2022-07-30", story: "潇湘夜雨，柳子街的青石板。", cover_url: null, sort_order: 4 },
  { name: "长沙", lat: 28.2278, lng: 112.9388, visit_date: "2022-08-15", story: "橘子洲头的烟火，太平街的夜。", cover_url: null, sort_order: 5 },
  { name: "开封", lat: 34.7974, lng: 114.3074, visit_date: "2022-10-05", story: "清明上河园的灯火，北宋的旧梦。", cover_url: null, sort_order: 6 },
  { name: "郑州", lat: 34.7466, lng: 113.6253, visit_date: "2022-10-12", story: "黄河岸边的风，二七塔的钟声。", cover_url: null, sort_order: 7 },
  { name: "南京", lat: 32.0603, lng: 118.7969, visit_date: "2022-11-20", story: "秦淮河的桨声，中山陵的梧桐。", cover_url: null, sort_order: 8 },
  { name: "岳阳", lat: 29.3556, lng: 113.1289, visit_date: "2022-12-15", story: "洞庭天下水，岳阳天下楼。", cover_url: null, sort_order: 9 },
] as const;

/** 《寄皮希平》信件正文（默认值，可被后台 site_content.letter.body 覆盖） */
export const LETTER_CONTENT = [
  "皮希平：",
  "你走后的第三个秋天，我终于把那些散落的车票、照片和便签收进了抽屉的最深处。抽屉合上的那一刻，我才意识到，原来思念并不会因为收起凭证而停止——它只是从指尖挪到了更深的某个地方，安静地待着。",
  "平江的清晨，汨罗江的水还带着幕阜山的凉意。你在江边回头冲我笑，说「以后我们要走很多很多地方」。那时我并未当真，只觉得你说什么都是对的。",
  "后来真的走了很多地方。南宁的邕江湿热，柳州的螺蛳粉酸得你皱眉，永州的潇湘夜雨打湿了柳子街的青石板。长沙太平街的烟火里，你举着一串糖油粑粑说「这一口值了」。",
  "开封的清明上河园灯火通明，你说像走进了北宋的旧梦；郑州黄河岸边的风吹乱了你的头发，你没去管，只是看着河水出神。南京秦淮河的桨声里，你轻声念「烟笼寒水月笼沙」；岳阳楼前，你望着洞庭湖，久久不语。",
  "九座城市，九段故事。我把它们一一画在地图上，用暖色的线连起来，像一条慢慢延伸的、属于我们的河。",
  "皮希平，我没有更多的地方可以和你一起走了。但我会把这些走过的路，一座一座地记下来，让它们替我记住你笑着的模样。",
  "愿你在的那个地方，也有一江春水，有一盏为你亮着的灯。",
  "我，仍在这里。",
];

export const LETTER_SIGNATURE = "寄你，于每一个想你的清晨与黄昏";
export const LETTER_DATE = "壹";

// ============ 默认页面内容（site_content 兜底值） ============

export type ContentDefault = {
  content_key: string;
  page: string;
  label: string;
  type: "text" | "longtext" | "image";
  content_value: string | null;
  image_url: string | null;
  sort_order: number;
};

/**
 * 默认内容清单：作为 useContent 的兜底值，也用于后台「内容管理」初始化。
 * 后台可新增任意 key，未在下面列出的 key 也会被读取。
 */
export const CONTENT_DEFAULTS: ContentDefault[] = [
  // 全局
  { content_key: "global.site_title", page: "global", label: "网站全局标题（浏览器标签）", type: "text", content_value: "记录", image_url: null, sort_order: 1 },
  { content_key: "global.header_text", page: "global", label: "页眉文字", type: "text", content_value: "", image_url: null, sort_order: 2 },
  { content_key: "global.footer_text", page: "global", label: "页脚文字", type: "text", content_value: "— 愿你在的那个地方 也有一盏灯 —", image_url: null, sort_order: 3 },
  { content_key: "global.logo_text", page: "global", label: "Logo 文字（无图片时显示）", type: "text", content_value: "记录", image_url: null, sort_order: 4 },
  { content_key: "global.logo_image", page: "global", label: "Logo 图片（优先显示）", type: "image", content_value: null, image_url: null, sort_order: 5 },
  // 首页
  { content_key: "home.footer", page: "home", label: "首页底部文字", type: "text", content_value: "— 愿你在的那个地方 也有一盏灯 —", image_url: null, sort_order: 3 },
  { content_key: "map.subtitle", page: "map", label: "地图页副标题", type: "text", content_value: "九座城市，一条暖色的河", image_url: null, sort_order: 1 },
  { content_key: "map.list_title", page: "map", label: "地图旅程列表标题", type: "text", content_value: "旅程顺序", image_url: null, sort_order: 2 },
  { content_key: "letter.body", page: "letter", label: "长信正文（段落用空行分隔）", type: "longtext", content_value: LETTER_CONTENT.join("\n\n"), image_url: null, sort_order: 1 },
  { content_key: "letter.signature", page: "letter", label: "长信落款", type: "text", content_value: LETTER_SIGNATURE, image_url: null, sort_order: 2 },
  { content_key: "messages.subtitle", page: "messages", label: "留言板副标题", type: "text", content_value: "留下一张便签", image_url: null, sort_order: 1 },
  { content_key: "gallery.subtitle", page: "gallery", label: "相册页副标题", type: "text", content_value: "一些被暖光留下的瞬间", image_url: null, sort_order: 1 },
  { content_key: "posts.subtitle", page: "posts", label: "帖子页副标题", type: "text", content_value: "所有人均可匿名发帖", image_url: null, sort_order: 1 },
];

/** 默认内容查找表：key → 默认值字符串 */
export const CONTENT_DEFAULT_MAP: Record<string, string> = Object.fromEntries(
  CONTENT_DEFAULTS.map((c) => [c.content_key, c.content_value ?? ""]),
);
