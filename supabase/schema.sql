-- ============================================================
-- 致皮希平 · 纪念网站 Supabase 初始化脚本
-- 在 Supabase Dashboard → SQL Editor 中执行此脚本
-- ============================================================

-- 重要：执行前请先在 Supabase Dashboard → Authentication → Users
-- 创建一个管理员邮箱账户（用于 /admin 登录）。
-- 然后将其 user_id 替换下方所有的 'cb05839f-9e99-4db0-b590-ff0501cb8855' 占位符。
-- 查询 user_id：select auth.uid(); （登录后执行）或
--   select id, email from auth.users;


-- 1. footprints 表：足迹节点
create table if not exists public.footprints (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  lat double precision not null,
  lng double precision not null,
  visit_date date not null,
  story text not null,
  cover_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- 2. messages 表：访客留言
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  nickname text not null default '一位访客',
  content text not null,
  color text not null default 'yellow',
  created_at timestamptz not null default now()
);

-- 3. photos 表：相册照片记录
create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  photo_date date,
  city text,
  storage_path text not null,
  public_url text not null,
  created_at timestamptz not null default now()
);

-- 若表已存在但缺少 city 列，补上（幂等）
do $$
begin
  if not exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'photos' and column_name = 'city') then
    alter table public.photos add column city text;
  end if;
end $$;

-- 启用行级安全 (RLS)
alter table public.footprints enable row level security;
alter table public.messages enable row level security;
alter table public.photos enable row level security;

-- 清理可能已存在的旧策略（便于重复执行）
drop policy if exists "footprints_public_read" on public.footprints;
drop policy if exists "footprints_admin_write" on public.footprints;
drop policy if exists "messages_public_read" on public.messages;
drop policy if exists "messages_public_insert" on public.messages;
drop policy if exists "messages_admin_modify" on public.messages;
drop policy if exists "photos_public_read" on public.photos;
drop policy if exists "photos_admin_write" on public.photos;

-- footprints 策略：公开读，仅管理员写
create policy "footprints_public_read" on public.footprints
  for select using (true);
create policy "footprints_admin_write" on public.footprints
  for all
  using (auth.uid() = 'cb05839f-9e99-4db0-b590-ff0501cb8855')
  with check (auth.uid() = 'cb05839f-9e99-4db0-b590-ff0501cb8855');

-- messages 策略：公开读 + 公开插入（匿名可留言），仅管理员删
create policy "messages_public_read" on public.messages
  for select using (true);
create policy "messages_public_insert" on public.messages
  for insert with check (true);
create policy "messages_admin_modify" on public.messages
  for delete using (auth.uid() = 'cb05839f-9e99-4db0-b590-ff0501cb8855');

-- photos 策略：公开读，仅管理员写
create policy "photos_public_read" on public.photos
  for select using (true);
create policy "photos_admin_write" on public.photos
  for all
  using (auth.uid() = 'cb05839f-9e99-4db0-b590-ff0501cb8855')
  with check (auth.uid() = 'cb05839f-9e99-4db0-b590-ff0501cb8855');


-- 4. Storage 桶：gallery（相册图）与 covers（足迹封面图）
insert into storage.buckets (id, name, public) values
  ('gallery', 'gallery', true),
  ('covers', 'covers', true)
on conflict (id) do nothing;

-- Storage 策略清理
drop policy if exists "gallery_public_read" on storage.objects;
drop policy if exists "gallery_admin_upload" on storage.objects;
drop policy if exists "gallery_admin_delete" on storage.objects;

-- Storage 策略：公共读，仅管理员上传/删除
create policy "gallery_public_read" on storage.objects
  for select using (bucket_id in ('gallery', 'covers'));
create policy "gallery_admin_upload" on storage.objects
  for insert
  with check (bucket_id in ('gallery', 'covers') and auth.uid() = 'cb05839f-9e99-4db0-b590-ff0501cb8855');
create policy "gallery_admin_delete" on storage.objects
  for delete
  using (bucket_id in ('gallery', 'covers') and auth.uid() = 'cb05839f-9e99-4db0-b590-ff0501cb8855');


-- 5. 初始足迹数据（九座城市，可由管理员在后台修改/删除）
insert into public.footprints (name, lat, lng, visit_date, story, cover_url, sort_order) values
('平江', 28.7017, 113.5964, '2022-04-10', '起点：汨罗江畔的小城，幕阜山下的清晨。', null, 1),
('南宁', 22.8170, 108.3669, '2022-05-22', '邕江边的青秀山，南国第一缕湿热的风。', null, 2),
('柳州', 24.3260, 109.4280, '2022-06-18', '螺蛳粉的酸笋香，柳江绕城的弧线。', null, 3),
('永州', 26.4345, 111.6080, '2022-07-30', '潇湘夜雨，柳子街的青石板。', null, 4),
('长沙', 28.2278, 112.9388, '2022-08-15', '橘子洲头的烟火，太平街的夜。', null, 5),
('开封', 34.7974, 114.3074, '2022-10-05', '清明上河园的灯火，北宋的旧梦。', null, 6),
('郑州', 34.7466, 113.6253, '2022-10-12', '黄河岸边的风，二七塔的钟声。', null, 7),
('南京', 32.0603, 118.7969, '2022-11-20', '秦淮河的桨声，中山陵的梧桐。', null, 8),
('岳阳', 29.3556, 113.1289, '2022-12-15', '洞庭天下水，岳阳天下楼。', null, 9)
on conflict (id) do nothing;


-- ============================================================
-- 6. banners 表：首页 Banner 图
-- ============================================================
create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  title text,
  subtitle text,
  link text,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.banners enable row level security;
drop policy if exists "banners_public_read" on public.banners;
drop policy if exists "banners_admin_write" on public.banners;
create policy "banners_public_read" on public.banners for select using (true);
create policy "banners_admin_write" on public.banners for all
  using (auth.uid() = 'cb05839f-9e99-4db0-b590-ff0501cb8855')
  with check (auth.uid() = 'cb05839f-9e99-4db0-b590-ff0501cb8855');


-- ============================================================
-- 7. site_content 表：各页面文字/图片内容（增删改查）
-- ============================================================
create table if not exists public.site_content (
  id uuid primary key default gen_random_uuid(),
  content_key text not null unique,
  page text not null,
  label text not null,
  type text not null default 'text',
  content_value text,
  image_url text,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.site_content enable row level security;
drop policy if exists "site_content_public_read" on public.site_content;
drop policy if exists "site_content_admin_write" on public.site_content;
create policy "site_content_public_read" on public.site_content for select using (true);
create policy "site_content_admin_write" on public.site_content for all
  using (auth.uid() = 'cb05839f-9e99-4db0-b590-ff0501cb8855')
  with check (auth.uid() = 'cb05839f-9e99-4db0-b590-ff0501cb8855');


-- ============================================================
-- 8. videos 表：视频记录
-- ============================================================
create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  city text,
  video_date date,
  storage_path text not null,
  public_url text not null,
  cover_url text,
  duration text,
  created_at timestamptz not null default now()
);
alter table public.videos enable row level security;
drop policy if exists "videos_public_read" on public.videos;
drop policy if exists "videos_admin_write" on public.videos;
create policy "videos_public_read" on public.videos for select using (true);
create policy "videos_admin_write" on public.videos for all
  using (auth.uid() = 'cb05839f-9e99-4db0-b590-ff0501cb8855')
  with check (auth.uid() = 'cb05839f-9e99-4db0-b590-ff0501cb8855');


-- ============================================================
-- 9. Storage: 新增 videos 桶，并扩展策略覆盖所有桶
-- ============================================================
insert into storage.buckets (id, name, public) values
  ('videos', 'videos', true)
on conflict (id) do nothing;

-- 重建覆盖 gallery / covers / videos 的策略
drop policy if exists "gallery_public_read" on storage.objects;
drop policy if exists "gallery_admin_upload" on storage.objects;
drop policy if exists "gallery_admin_delete" on storage.objects;

create policy "gallery_public_read" on storage.objects
  for select using (bucket_id in ('gallery', 'covers', 'videos'));
create policy "gallery_admin_upload" on storage.objects
  for insert
  with check (bucket_id in ('gallery', 'covers', 'videos') and auth.uid() = 'cb05839f-9e99-4db0-b590-ff0501cb8855');
create policy "gallery_admin_delete" on storage.objects
  for delete
  using (bucket_id in ('gallery', 'covers', 'videos') and auth.uid() = 'cb05839f-9e99-4db0-b590-ff0501cb8855');


-- ============================================================
-- 10. 默认页面内容初始化（site_content）
-- ============================================================
insert into public.site_content (content_key, page, label, type, content_value, image_url, sort_order) values
('home.banner_title',    'home',     '首页 Banner 标题', 'text',     '记录', null, 1),
('home.banner_subtitle', 'home',     '首页 Banner 副标题', 'text',     '走过的地方 都值得留下', null, 2),
('home.footer',          'home',     '首页底部文字',       'text',     '— 愿你在的那个地方 也有一盏灯 —', null, 3),
('map.subtitle',         'map',      '地图页副标题',       'text',     '九座城市，一条暖色的河', null, 1),
('map.list_title',       'map',      '地图旅程列表标题',   'text',     '旅程顺序', null, 2),
('letter.body',          'letter',   '长信正文（段落用空行分隔）', 'longtext', '皮希平：

你走后的第三个秋天，我终于把那些散落的车票、照片和便签收进了抽屉的最深处。抽屉合上的那一刻，我才意识到，原来思念并不会因为收起凭证而停止——它只是从指尖挪到了更深的某个地方，安静地待着。

平江的清晨，汨罗江的水还带着幕阜山的凉意。你在江边回头冲我笑，说「以后我们要走很多很多地方」。那时我并未当真，只觉得你说什么都是对的。

后来真的走了很多地方。南宁的邕江湿热，柳州的螺蛳粉酸得你皱眉，永州的潇湘夜雨打湿了柳子街的青石板。长沙太平街的烟火里，你举着一串糖油粑粑说「这一口值了」。

九座城市，九段故事。我把它们一一画在地图上，用暖色的线连起来，像一条慢慢延伸的、属于我们的河。

我，仍在这里。', null, 1),
('letter.signature',     'letter',   '长信落款',           'text',     '寄你，于每一个想你的清晨与黄昏', null, 2),
('messages.subtitle',    'messages', '留言板副标题',       'text',     '留下一张便签', null, 1),
('gallery.subtitle',     'gallery',  '相册页副标题',       'text',     '一些被暖光留下的瞬间', null, 1)
on conflict (content_key) do nothing;


-- ============================================================
-- 11. page_sections 表：动态组件 / 自由排版系统
-- ============================================================
create table if not exists public.page_sections (
  id uuid primary key default gen_random_uuid(),
  page_name text not null default 'home',
  section_type text not null default 'custom_html',
  content_data jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_page_sections_page on public.page_sections(page_name, sort_order);
alter table public.page_sections enable row level security;
drop policy if exists "page_sections_public_read" on public.page_sections;
drop policy if exists "page_sections_admin_write" on public.page_sections;
create policy "page_sections_public_read" on public.page_sections
  for select using (true);
create policy "page_sections_admin_write" on public.page_sections
  for all
  using (auth.uid() = 'cb05839f-9e99-4db0-b590-ff0501cb8855')
  with check (auth.uid() = 'cb05839f-9e99-4db0-b590-ff0501cb8855');


-- ============================================================
-- 12. theme_settings 表：全局主题样式（单行 JSONB）
-- ============================================================
create table if not exists public.theme_settings (
  id uuid primary key default gen_random_uuid(),
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.theme_settings enable row level security;
drop policy if exists "theme_settings_public_read" on public.theme_settings;
drop policy if exists "theme_settings_admin_write" on public.theme_settings;
create policy "theme_settings_public_read" on public.theme_settings
  for select using (true);
create policy "theme_settings_admin_write" on public.theme_settings
  for all
  using (auth.uid() = 'cb05839f-9e99-4db0-b590-ff0501cb8855')
  with check (auth.uid() = 'cb05839f-9e99-4db0-b590-ff0501cb8855');

-- 初始化默认主题（单行）
insert into public.theme_settings (id, settings) values (
  '00000000-0000-0000-0000-000000000001',
  '{"bg_color":"#FFF5F7","text_color":"#4A3B47","primary_color":"#E8919F","card_color":"#FFF0F3","border_color":"#F5D5DD","base_font_size":"16px","heading_font_size":"24px","font_family":"Noto Serif SC"}'::jsonb
) on conflict (id) do nothing;


-- ============================================================
-- 13. site_meta 表：SEO / 网站标题 / 图标 / 社交分享
-- ============================================================
create table if not exists public.site_meta (
  id uuid primary key default gen_random_uuid(),
  meta_key text not null unique,
  meta_value text,
  updated_at timestamptz not null default now()
);
alter table public.site_meta enable row level security;
drop policy if exists "site_meta_public_read" on public.site_meta;
drop policy if exists "site_meta_admin_write" on public.site_meta;
create policy "site_meta_public_read" on public.site_meta
  for select using (true);
create policy "site_meta_admin_write" on public.site_meta
  for all
  using (auth.uid() = 'cb05839f-9e99-4db0-b590-ff0501cb8855')
  with check (auth.uid() = 'cb05839f-9e99-4db0-b590-ff0501cb8855');

-- 初始化默认 SEO 元数据
insert into public.site_meta (meta_key, meta_value) values
('site_title',       '记录'),
('site_description', '一段跨越九座城市的旅程记录'),
('favicon_url',      '/favicon.svg'),
('og_title',         '记录'),
('og_description',   '走过的地方 都值得留下'),
('og_image',         ''),
('keywords',         '纪念,旅程,记录,足迹'),
('author',           ''),
('lang',             'zh-CN'),
('robots',           'index, follow')
on conflict (meta_key) do nothing;

-- ============================================================
-- 14. media_library 表：媒体素材库（照片/视频统一管理）
-- ============================================================
create table if not exists public.media_library (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  media_type text not null default 'image', -- image | video
  storage_path text not null,
  public_url text not null,
  file_size bigint default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_media_type on public.media_library(media_type);
create index if not exists idx_media_created on public.media_library(created_at desc);

alter table public.media_library enable row level security;
drop policy if exists "media_public_read" on public.media_library;
drop policy if exists "media_admin_write" on public.media_library;
create policy "media_public_read" on public.media_library
  for select using (true);
create policy "media_admin_write" on public.media_library
  for all
  using (auth.uid() = 'cb05839f-9e99-4db0-b590-ff0501cb8855')
  with check (auth.uid() = 'cb05839f-9e99-4db0-b590-ff0501cb8855');

-- ============================================================
-- 15. media 存储桶（公开读取，管理员上传/删除）
-- ============================================================
insert into storage.buckets (id, name, public) values
  ('media', 'media', true)
on conflict (name) do nothing;

drop policy if exists "media_bucket_public_read" on storage.objects;
drop policy if exists "media_bucket_admin_upload" on storage.objects;
drop policy if exists "media_bucket_admin_delete" on storage.objects;
create policy "media_bucket_public_read" on storage.objects
  for select using (bucket_id = 'media');
create policy "media_bucket_admin_upload" on storage.objects
  for insert
  with check (bucket_id = 'media' and auth.uid() = 'cb05839f-9e99-4db0-b590-ff0501cb8855');
create policy "media_bucket_admin_delete" on storage.objects
  for delete
  using (bucket_id = 'media' and auth.uid() = 'cb05839f-9e99-4db0-b590-ff0501cb8855');

