// 全局配置常量

/** 私密相册解锁密码（前端校验） */
export const GALLERY_PASSWORD = "0111";

/** sessionStorage / localStorage 键 */
export const STORAGE_KEYS = {
  galleryUnlocked: "zpxp_gallery_unlocked",
  /** site_content 缓存：首屏防闪烁（上次内容先渲染，再静默更新） */
  contentCache: "zp_content_cache",
  /** site_meta 缓存：标题/图标首屏防闪烁 */
  metaCache: "zp_meta_cache",
  /** nav_links / social_links 缓存 */
  navCache: "zp_nav_cache",
  socialCache: "zp_social_cache",
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

/** 长信正文默认值（可被后台 site_content.letter.body 覆盖） */
export const LETTER_CONTENT = [
  "P：",
  "你走后的第三个秋天，我终于把那些散落的车票、照片和便签收进了抽屉的最深处。抽屉合上的那一刻，我才意识到，原来思念并不会因为收起凭证而停止——它只是从指尖挪到了更深的某个地方，安静地待着。",
  "平江的清晨，汨罗江的水还带着幕阜山的凉意。你在江边回头冲我笑，说「以后我们要走很多很多地方」。那时我并未当真，只觉得你说什么都是对的。",
  "后来真的走了很多地方。南宁的邕江湿热，柳州的螺蛳粉酸得你皱眉，永州的潇湘夜雨打湿了柳子街的青石板。长沙太平街的烟火里，你举着一串糖油粑粑说「这一口值了」。",
  "开封的清明上河园灯火通明，你说像走进了北宋的旧梦；郑州黄河岸边的风吹乱了你的头发，你没去管，只是看着河水出神。南京秦淮河的桨声里，你轻声念「烟笼寒水月笼沙」；岳阳楼前，你望着洞庭湖，久久不语。",
  "九座城市，九段故事。我把它们一一画在地图上，用暖色的线连起来，像一条慢慢延伸的、属于我们的河。",
  "P，我没有更多的地方可以和你一起走了。但我会把这些走过的路，一座一座地记下来，让它们替我记住你笑着的模样。",
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
  { content_key: "global.site_title", page: "global", label: "网站全局标题（浏览器标签）", type: "text", content_value: "P", image_url: null, sort_order: 1 },
  { content_key: "global.header_text", page: "global", label: "页眉文字", type: "text", content_value: "", image_url: null, sort_order: 2 },
  { content_key: "global.footer_text", page: "global", label: "页脚文字（每页底部，留空不显示）", type: "text", content_value: "", image_url: null, sort_order: 3 },
  { content_key: "global.logo_text", page: "global", label: "Logo 文字（无图片时显示）", type: "text", content_value: "P", image_url: null, sort_order: 4 },
  { content_key: "global.logo_image", page: "global", label: "Logo 图片（优先显示）", type: "image", content_value: null, image_url: null, sort_order: 5 },
  // 底部导航标签
  { content_key: "global.nav_home", page: "global", label: "底部导航·首页文字", type: "text", content_value: "首页", image_url: null, sort_order: 6 },
  { content_key: "global.nav_map", page: "global", label: "底部导航·足迹文字", type: "text", content_value: "足迹", image_url: null, sort_order: 7 },
  { content_key: "global.nav_blog", page: "global", label: "底部导航·博客文字", type: "text", content_value: "博客", image_url: null, sort_order: 8 },
  { content_key: "global.nav_letter", page: "global", label: "底部导航·长信文字", type: "text", content_value: "长信", image_url: null, sort_order: 9 },
  { content_key: "global.nav_messages", page: "global", label: "底部导航·留言文字", type: "text", content_value: "留言", image_url: null, sort_order: 10 },
  { content_key: "global.nav_gallery", page: "global", label: "底部导航·相册文字", type: "text", content_value: "相册", image_url: null, sort_order: 11 },
  // 通用提示
  { content_key: "global.loading", page: "global", label: "通用加载提示文字", type: "text", content_value: "加载中…", image_url: null, sort_order: 12 },
  // 无障碍提示（读屏器朗读的按钮名称）
  { content_key: "global.a11y_back", page: "global", label: "无障碍·返回按钮名称", type: "text", content_value: "返回", image_url: null, sort_order: 13 },
  { content_key: "global.a11y_close", page: "global", label: "无障碍·关闭按钮名称", type: "text", content_value: "关闭", image_url: null, sort_order: 14 },
  { content_key: "global.a11y_copy", page: "global", label: "无障碍·复制按钮名称", type: "text", content_value: "复制", image_url: null, sort_order: 15 },
  { content_key: "global.a11y_logo", page: "global", label: "无障碍·Logo 图片名称", type: "text", content_value: "Logo", image_url: null, sort_order: 16 },
  // 自定义页面（后台「排版」新建的页面）
  { content_key: "custom.loading", page: "custom", label: "自定义页·加载提示", type: "text", content_value: "加载页面中…", image_url: null, sort_order: 1 },
  { content_key: "custom.not_found_title", page: "custom", label: "自定义页·不存在时标题", type: "text", content_value: "页面不存在", image_url: null, sort_order: 2 },
  { content_key: "custom.not_found_subtitle", page: "custom", label: "自定义页·不存在时副标题", type: "text", content_value: "该页面尚未创建或已被删除", image_url: null, sort_order: 3 },
  { content_key: "custom.not_found_desc", page: "custom", label: "自定义页·不存在时说明", type: "text", content_value: "在浏览器地址栏确认链接是否正确，或到后台「排版」重新创建。", image_url: null, sort_order: 4 },
  // 首页
  { content_key: "home.entry_map_title", page: "home", label: "入口卡片·足迹地图标题", type: "text", content_value: "足迹地图", image_url: null, sort_order: 4 },
  { content_key: "home.entry_map_desc", page: "home", label: "入口卡片·足迹地图描述", type: "text", content_value: "九座城市，一条暖色的河", image_url: null, sort_order: 5 },
  { content_key: "home.entry_letter_title", page: "home", label: "入口卡片·纪念长信标题", type: "text", content_value: "纪念长信", image_url: null, sort_order: 6 },
  { content_key: "home.entry_letter_desc", page: "home", label: "入口卡片·纪念长信描述", type: "text", content_value: "写给那段时光", image_url: null, sort_order: 7 },
  { content_key: "home.entry_messages_title", page: "home", label: "入口卡片·温暖留言标题", type: "text", content_value: "温暖留言", image_url: null, sort_order: 8 },
  { content_key: "home.entry_messages_desc", page: "home", label: "入口卡片·温暖留言描述", type: "text", content_value: "留下一张便签", image_url: null, sort_order: 9 },
  { content_key: "home.entry_gallery_title", page: "home", label: "入口卡片·私密相册标题", type: "text", content_value: "私密相册", image_url: null, sort_order: 10 },
  { content_key: "home.entry_gallery_desc", page: "home", label: "入口卡片·私密相册描述", type: "text", content_value: "需要一把小钥匙", image_url: null, sort_order: 11 },
  { content_key: "home.footer", page: "home", label: "首页底部文字", type: "text", content_value: "— 愿你在的那个地方 也有一盏灯 —", image_url: null, sort_order: 12 },
  // 首页 · 联系卡片
  { content_key: "home.contact_subtitle", page: "home", label: "联系卡片·「联系方式」文字", type: "text", content_value: "联系方式", image_url: null, sort_order: 15 },
  { content_key: "home.contact_admin_fallback", page: "home", label: "联系卡片·无名管理员占位", type: "text", content_value: "管理员", image_url: null, sort_order: 16 },
  { content_key: "home.contact_empty", page: "home", label: "联系卡片·无联系方式提示", type: "text", content_value: "该管理员暂无联系方式", image_url: null, sort_order: 17 },
  { content_key: "home.contact_copied", page: "home", label: "联系卡片·已复制提示", type: "text", content_value: "已复制联系方式", image_url: null, sort_order: 18 },
  { content_key: "home.contact_label_qq", page: "home", label: "联系卡片·QQ 标签", type: "text", content_value: "QQ", image_url: null, sort_order: 19 },
  { content_key: "home.contact_label_wechat", page: "home", label: "联系卡片·微信标签", type: "text", content_value: "微信", image_url: null, sort_order: 20 },
  { content_key: "home.contact_label_phone", page: "home", label: "联系卡片·电话标签", type: "text", content_value: "电话", image_url: null, sort_order: 21 },
  { content_key: "home.contact_label_email", page: "home", label: "联系卡片·邮箱标签", type: "text", content_value: "邮箱", image_url: null, sort_order: 22 },
  // 地图页
  { content_key: "map.title", page: "map", label: "页面标题", type: "text", content_value: "足迹地图", image_url: null, sort_order: 1 },
  { content_key: "map.subtitle", page: "map", label: "地图页副标题", type: "text", content_value: "九座城市，一条暖色的河", image_url: null, sort_order: 2 },
  { content_key: "map.list_title", page: "map", label: "地图旅程列表标题", type: "text", content_value: "旅程顺序", image_url: null, sort_order: 3 },
  { content_key: "map.loading", page: "map", label: "加载提示文字", type: "text", content_value: "正在铺开地图…", image_url: null, sort_order: 4 },
  { content_key: "map.view_album", page: "map", label: "「查看相册」按钮文字", type: "text", content_value: "查看相册", image_url: null, sort_order: 5 },
  { content_key: "map.no_photos", page: "map", label: "城市无照片提示", type: "text", content_value: "这里还没有照片", image_url: null, sort_order: 6 },
  { content_key: "map.no_footprints", page: "map", label: "无足迹节点提示", type: "text", content_value: "还没有足迹节点，请在后台上传", image_url: null, sort_order: 7 },
  { content_key: "map.photo_unit", page: "map", label: "照片数量文字（{n} 为数字）", type: "text", content_value: "{n} 张", image_url: null, sort_order: 8 },
  // 长信页
  { content_key: "letter.title", page: "letter", label: "页面标题", type: "text", content_value: "纪念长信", image_url: null, sort_order: 1 },
  { content_key: "letter.subtitle", page: "letter", label: "页面副标题", type: "text", content_value: "一封永远在路上的长信", image_url: null, sort_order: 2 },
  { content_key: "letter.body", page: "letter", label: "长信正文（段落用空行分隔）", type: "longtext", content_value: LETTER_CONTENT.join("\n\n"), image_url: null, sort_order: 3 },
  { content_key: "letter.signature", page: "letter", label: "长信落款", type: "text", content_value: LETTER_SIGNATURE, image_url: null, sort_order: 4 },
  { content_key: "letter.side_text", page: "letter", label: "信纸左上角装饰文字", type: "text", content_value: "长信", image_url: null, sort_order: 5 },
  { content_key: "letter.sign", page: "letter", label: "页面底部署名", type: "text", content_value: "— 此信 长存于此 —", image_url: null, sort_order: 6 },
  // 留言页
  { content_key: "messages.title", page: "messages", label: "页面标题", type: "text", content_value: "温暖留言", image_url: null, sort_order: 1 },
  { content_key: "messages.subtitle", page: "messages", label: "留言板副标题", type: "text", content_value: "留下一张便签", image_url: null, sort_order: 2 },
  { content_key: "messages.form_nickname_label", page: "messages", label: "表单·昵称标签", type: "text", content_value: "昵称（可不填）", image_url: null, sort_order: 3 },
  { content_key: "messages.form_nickname_placeholder", page: "messages", label: "表单·昵称占位提示", type: "text", content_value: "一位访客", image_url: null, sort_order: 4 },
  { content_key: "messages.form_content_label", page: "messages", label: "表单·留言标签", type: "text", content_value: "留言", image_url: null, sort_order: 5 },
  { content_key: "messages.form_content_placeholder", page: "messages", label: "表单·留言占位提示", type: "text", content_value: "写下你想说的一句话…", image_url: null, sort_order: 6 },
  { content_key: "messages.form_qq_label", page: "messages", label: "表单·QQ 标签", type: "text", content_value: "QQ（可不填）", image_url: null, sort_order: 18 },
  { content_key: "messages.form_qq_placeholder", page: "messages", label: "表单·QQ 占位提示", type: "text", content_value: "填写后留言将显示您的 QQ 头像", image_url: null, sort_order: 19 },
  { content_key: "messages.submit", page: "messages", label: "提交按钮文字", type: "text", content_value: "留下便签", image_url: null, sort_order: 7 },
  { content_key: "messages.submitting", page: "messages", label: "提交中按钮文字", type: "text", content_value: "发送中…", image_url: null, sort_order: 8 },
  { content_key: "messages.loading", page: "messages", label: "加载提示文字", type: "text", content_value: "正在收集便签…", image_url: null, sort_order: 9 },
  { content_key: "messages.empty_title", page: "messages", label: "无留言时主提示", type: "text", content_value: "这里还没有便签", image_url: null, sort_order: 10 },
  { content_key: "messages.empty_desc", page: "messages", label: "无留言时副提示", type: "text", content_value: "成为第一个留下温暖的人吧", image_url: null, sort_order: 11 },
  // 留言页 · 提示语
  { content_key: "messages.count", page: "messages", label: "便签总数文字（{n} 为数字）", type: "text", content_value: "已有 {n} 张便签", image_url: null, sort_order: 12 },
  { content_key: "messages.anonymous_name", page: "messages", label: "未填昵称时的默认名", type: "text", content_value: "一位访客", image_url: null, sort_order: 13 },
  { content_key: "messages.hint_empty", page: "messages", label: "留言为空提示", type: "text", content_value: "留言内容不能为空", image_url: null, sort_order: 14 },
  { content_key: "messages.hint_no_supabase", page: "messages", label: "数据库未配置提示", type: "text", content_value: "Supabase 未配置，留言暂无法保存", image_url: null, sort_order: 15 },
  { content_key: "messages.hint_failed", page: "messages", label: "留言失败提示", type: "text", content_value: "留言失败，请稍后再试", image_url: null, sort_order: 16 },
  { content_key: "messages.hint_ok", page: "messages", label: "留言成功提示", type: "text", content_value: "留言已留下，谢谢你的温暖", image_url: null, sort_order: 17 },
  // 相册页
  { content_key: "gallery.title", page: "gallery", label: "页面标题", type: "text", content_value: "私密相册", image_url: null, sort_order: 1 },
  { content_key: "gallery.subtitle", page: "gallery", label: "相册页副标题", type: "text", content_value: "一些被暖光留下的瞬间", image_url: null, sort_order: 2 },
  { content_key: "gallery.password_subtitle", page: "gallery", label: "密码门副标题", type: "text", content_value: "需要一把小钥匙", image_url: null, sort_order: 3 },
  { content_key: "gallery.password_tip1", page: "gallery", label: "密码门主提示", type: "text", content_value: "这里收着一些瞬间", image_url: null, sort_order: 4 },
  { content_key: "gallery.password_tip2", page: "gallery", label: "密码门副提示", type: "text", content_value: "输入密码，推开这扇门", image_url: null, sort_order: 5 },
  { content_key: "gallery.password_placeholder", page: "gallery", label: "密码输入框占位提示", type: "text", content_value: "密码", image_url: null, sort_order: 6 },
  { content_key: "gallery.password_error", page: "gallery", label: "密码错误提示", type: "text", content_value: "密码不对哦，再试一次", image_url: null, sort_order: 7 },
  { content_key: "gallery.password_btn", page: "gallery", label: "密码门按钮文字", type: "text", content_value: "推开门", image_url: null, sort_order: 8 },
  { content_key: "gallery.tab_albums", page: "gallery", label: "Tab·相簿文字", type: "text", content_value: "相簿", image_url: null, sort_order: 9 },
  { content_key: "gallery.tab_all", page: "gallery", label: "Tab·全部文字", type: "text", content_value: "全部", image_url: null, sort_order: 10 },
  { content_key: "gallery.empty_title", page: "gallery", label: "无内容时主提示", type: "text", content_value: "还没有内容", image_url: null, sort_order: 11 },
  { content_key: "gallery.empty_desc", page: "gallery", label: "无内容时副提示", type: "text", content_value: "管理员可以在后台添加", image_url: null, sort_order: 12 },
  { content_key: "gallery.no_folder", page: "gallery", label: "无文件夹提示", type: "text", content_value: "管理员还没有创建自定义文件夹", image_url: null, sort_order: 13 },
  { content_key: "gallery.empty_folder", page: "gallery", label: "空文件夹提示", type: "text", content_value: "文件夹还是空的", image_url: null, sort_order: 14 },
  { content_key: "gallery.back_albums", page: "gallery", label: "「返回相簿」按钮文字", type: "text", content_value: "返回相簿", image_url: null, sort_order: 15 },
  // 相册页 · 数量与杂项
  { content_key: "gallery.loading", page: "gallery", label: "加载提示文字", type: "text", content_value: "正在加载…", image_url: null, sort_order: 16 },
  { content_key: "gallery.count", page: "gallery", label: "顶部总数文字（{p}/{v} 为数字）", type: "text", content_value: "共 {p} 照片 · {v} 视频", image_url: null, sort_order: 17 },
  { content_key: "gallery.album_count", page: "gallery", label: "相簿卡片数量文字（{p}/{v} 为数字）", type: "text", content_value: "{p} 照片 · {v} 视频", image_url: null, sort_order: 18 },
  { content_key: "gallery.album_count_photos", page: "gallery", label: "相簿卡片仅照片文字（{p} 为数字）", type: "text", content_value: "{p} 照片", image_url: null, sort_order: 19 },
  { content_key: "gallery.uncategorized", page: "gallery", label: "未分类文件夹名称", type: "text", content_value: "未分类", image_url: null, sort_order: 20 },
  { content_key: "gallery.close", page: "gallery", label: "关闭按钮无障碍文字", type: "text", content_value: "关闭", image_url: null, sort_order: 21 },
  // 博客页（/#/blog）
  { content_key: "blog.title", page: "blog", label: "博客页·标题", type: "text", content_value: "博客", image_url: null, sort_order: 1 },
  { content_key: "blog.subtitle", page: "blog", label: "博客页·副标题", type: "text", content_value: "记录每一段值得留下的文字", image_url: null, sort_order: 2 },
  { content_key: "blog.loading", page: "blog", label: "博客·加载提示", type: "text", content_value: "加载博客中…", image_url: null, sort_order: 3 },
  { content_key: "blog.empty", page: "blog", label: "博客·暂无文章提示", type: "text", content_value: "还没有发布博客", image_url: null, sort_order: 4 },
  { content_key: "blog.back_list", page: "blog", label: "博客详情·返回列表按钮文字", type: "text", content_value: "返回博客列表", image_url: null, sort_order: 5 },
  { content_key: "blog.not_found", page: "blog", label: "博客详情·文章不存在提示", type: "text", content_value: "文章不存在或未发布", image_url: null, sort_order: 6 },
  { content_key: "blog.read_more", page: "blog", label: "博客卡片·阅读全文文字", type: "text", content_value: "阅读全文", image_url: null, sort_order: 7 },
  { content_key: "blog.author_prefix", page: "blog", label: "博客详情·作者前缀文字", type: "text", content_value: "文 / ", image_url: null, sort_order: 8 },
  // 侧边栏（页头汉堡菜单）
  { content_key: "global.sidenav_title", page: "global", label: "侧边栏·标题文字", type: "text", content_value: "菜单", image_url: null, sort_order: 17 },
  { content_key: "global.a11y_menu", page: "global", label: "无障碍·侧边栏按钮名称", type: "text", content_value: "打开菜单", image_url: null, sort_order: 18 },
];

/** 默认内容查找表：key → 默认值字符串 */
export const CONTENT_DEFAULT_MAP: Record<string, string> = Object.fromEntries(
  CONTENT_DEFAULTS.map((c) => [c.content_key, c.content_value ?? ""]),
);

// ============ 内置区块注册表（排版管理用） ============

/**
 * 每个页面原生组件的区块注册表。
 * - page_sections 中 section_type = "builtin"、content_data.block = 区块标识
 * - 无数据库记录时按注册顺序合成（默认显示）
 * - 后台「排版」可显隐 / 排序，不可删除（隐藏后可随时恢复）
 */
export const BUILTIN_BLOCKS: Record<
  string,
  { block: string; label: string; desc: string }[]
> = {
  home: [
    { block: "entry_cards", label: "入口卡片", desc: "四宫格页面入口" },
    { block: "contact_card", label: "联系方式卡片", desc: "管理员联系卡片" },
    { block: "footer_text", label: "底部署名", desc: "页面底部一行字" },
  ],
  map: [
    { block: "map_view", label: "足迹地图", desc: "地图主体" },
    { block: "city_list", label: "旅程列表", desc: "按顺序的城市列表" },
  ],
  letter: [
    { block: "letter_body", label: "长信正文", desc: "信件内容与落款" },
    { block: "letter_sign", label: "底部署名", desc: "页面底部一行字" },
  ],
  messages: [
    { block: "message_form", label: "留言表单", desc: "昵称与留言输入" },
    { block: "notes_wall", label: "便签墙", desc: "留言瀑布流" },
  ],
  gallery: [
    { block: "gallery_grid", label: "相册内容区", desc: "相簿 / 全部网格" },
  ],
  blog: [
    { block: "blog_list", label: "博客列表", desc: "博客卡片流" },
  ],
  global: [
    { block: "header", label: "页头", desc: "顶部 Logo 栏（下滑自动隐藏）" },
    { block: "footer", label: "页脚", desc: "每页底部署名文字" },
    { block: "bottom_nav", label: "底部导航", desc: "底部六宫格导航栏" },
  ],
};

/** 内置区块标识 → 显示名称 的查找表 */
export const BUILTIN_LABELS: Record<string, string> = Object.fromEntries(
  Object.values(BUILTIN_BLOCKS)
    .flat()
    .map((b) => [`${b.block}`, b.label]),
);
