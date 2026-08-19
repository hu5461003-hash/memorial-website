-- ================================================================
-- 管理员权限 + 联系方式独立 + 自定义相册文件夹
-- 一次性迁移脚本 · 在 Supabase SQL Editor 中粘贴执行
-- ================================================================
-- 包含内容：
--  1. is_admin() 工具函数
--  2. admin_users 表：两位管理员按邮箱自动绑定 auth.users.id
--  3. admin_profiles 表：每位管理员独立的联系方式（昵称/QQ/微信…）
--  4. albums 相册文件夹表：自定义任意文件夹（替代城市分组）
--  5. photos / videos 扩展：加 album_id 外键 + owner_admin_uid
--  6. 全量重建 RLS 策略：把硬编码单个 UID 替换为 admin_users 表查询
--  7. 把旧 admin_* site_meta 联系方式迁移到 admin_profiles
-- ================================================================

-- =================================================================
-- 0. admin_users 表（管理员白名单）— 先建表再建函数
-- =================================================================
create table if not exists public.admin_users (
  uid uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;
drop policy if exists "admin_users_public_read" on public.admin_users;
drop policy if exists "admin_users_self_write" on public.admin_users;
create policy "admin_users_public_read" on public.admin_users
  for select using (true);
create policy "admin_users_self_write" on public.admin_users
  for all using (uid = auth.uid()) with check (uid = auth.uid());

-- ★ 绑定两位管理员（按邮箱匹配 auth.users，大小写不敏感）
insert into public.admin_users (uid, email, is_primary)
select id, email,
  case when email = '2832290588@qq.com' then true else false end as is_primary
from auth.users
where lower(email) in ('2832290588@qq.com', 'hu5461003@gmail.com')
on conflict (email) do nothing;

-- =================================================================
-- 0.5 工具函数：当前登录用户是否是管理员（必须在 admin_users 表之后创建）
-- =================================================================
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.admin_users where uid = auth.uid()
  );
$$;

-- =================================================================
-- 2. admin_profiles 表（每个管理员独立的联系方式）
-- =================================================================
create table if not exists public.admin_profiles (
  admin_uid uuid primary key references public.admin_users(uid) on delete cascade,
  nickname text not null default '',
  qq text not null default '',
  wechat text not null default '',
  phone text not null default '',
  email_display text not null default '',
  avatar_url text not null default '',
  updated_at timestamptz not null default now()
);
alter table public.admin_profiles enable row level security;
drop policy if exists "admin_profiles_public_read" on public.admin_profiles;
drop policy if exists "admin_profiles_self_write" on public.admin_profiles;
-- 公开读：首页 ContactCard 需要展示两位管理员联系方式
create policy "admin_profiles_public_read" on public.admin_profiles
  for select using (true);
-- 写仅限自己那行（登录管理员只能改自己的联系方式）
create policy "admin_profiles_self_write" on public.admin_profiles
  for all
  using (admin_uid = auth.uid())
  with check (admin_uid = auth.uid());

-- 给每个 admin_users 建默认空 profile 行（便于直接 upsert）
insert into public.admin_profiles (admin_uid, nickname, email_display)
select uid,
  case when email = '2832290588@qq.com' then '管理员一' else '管理员二' end as nickname,
  email as email_display
from public.admin_users
on conflict (admin_uid) do nothing;

-- 把旧 site_meta 里的全局联系方式（admin_*）迁到 is_primary 的管理员（第一个管理员）
do $$
declare
  v_primary_uid uuid;
  v_nick text; v_qq text; v_wx text; v_phone text; v_email text; v_avatar text;
begin
  select uid into v_primary_uid from public.admin_users where is_primary = true limit 1;
  if v_primary_uid is null then return; end if;

  select max(case when meta_key = 'admin_nickname'    then meta_value end) into v_nick    from public.site_meta;
  select max(case when meta_key = 'admin_qq'          then meta_value end) into v_qq      from public.site_meta;
  select max(case when meta_key = 'admin_wechat'      then meta_value end) into v_wx      from public.site_meta;
  select max(case when meta_key = 'admin_phone'       then meta_value end) into v_phone   from public.site_meta;
  select max(case when meta_key = 'admin_email'       then meta_value end) into v_email   from public.site_meta;
  select max(case when meta_key = 'admin_avatar_url'  then meta_value end) into v_avatar  from public.site_meta;

  update public.admin_profiles set
    nickname = coalesce(nullif(v_nick, ''), nickname),
    qq       = coalesce(nullif(v_qq, ''), qq),
    wechat   = coalesce(nullif(v_wx, ''), wechat),
    phone    = coalesce(nullif(v_phone, ''), phone),
    email_display = coalesce(nullif(v_email, ''), email_display),
    avatar_url    = coalesce(nullif(v_avatar, ''), avatar_url),
    updated_at = now()
  where admin_uid = v_primary_uid
    and (
      coalesce(nullif(v_nick, ''),   '') <> ''
      or coalesce(nullif(v_qq, ''),   '') <> ''
      or coalesce(nullif(v_wx, ''),   '') <> ''
      or coalesce(nullif(v_phone, ''),'') <> ''
      or coalesce(nullif(v_email, ''),'') <> ''
    );
end $$;

-- =================================================================
-- 3. albums 相册文件夹表：自定义任意数量
-- =================================================================
create table if not exists public.albums (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  cover_url text,
  owner_admin_uid uuid not null references public.admin_users(uid) on delete set null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_albums_sort on public.albums(sort_order, created_at desc);
alter table public.albums enable row level security;
drop policy if exists "albums_public_read" on public.albums;
drop policy if exists "albums_admin_write" on public.albums;
create policy "albums_public_read" on public.albums for select using (true);
create policy "albums_admin_write" on public.albums
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- =================================================================
-- 4. photos 加自定义文件夹外键 album_id + 创建者 owner_admin_uid
--    videos 同理保持一致
-- =================================================================
do $$
begin
  if not exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='photos' and column_name='album_id') then
    alter table public.photos add column album_id uuid references public.albums(id) on delete set null;
  end if;
  if not exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='photos' and column_name='owner_admin_uid') then
    alter table public.photos add column owner_admin_uid uuid references public.admin_users(uid) on delete set null;
  end if;
end $$;
create index if not exists idx_photos_album on public.photos(album_id);

do $$
begin
  if not exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='videos' and column_name='album_id') then
    alter table public.videos add column album_id uuid references public.albums(id) on delete set null;
  end if;
  if not exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='videos' and column_name='owner_admin_uid') then
    alter table public.videos add column owner_admin_uid uuid references public.admin_users(uid) on delete set null;
  end if;
end $$;
create index if not exists idx_videos_album on public.videos(album_id);

-- 兼容：按旧 city 字段生成默认 albums（保证前台不会变空）
do $$
declare
  r record;
  v_owner uuid;
begin
  select uid into v_owner from public.admin_users where is_primary = true limit 1;
  if v_owner is null then return; end if;

  for r in select distinct city from public.photos where city is not null and city <> '' loop
    insert into public.albums (name, owner_admin_uid, sort_order)
    select r.city, v_owner, 0
    where not exists (select 1 from public.albums a where a.name = r.city);
  end loop;

  -- 把 city 对应到 album
  update public.photos p set album_id = a.id
  from public.albums a where p.city = a.name and p.album_id is null;
end $$;

-- =================================================================
-- 5. ★ 全量重建 RLS 策略：替换硬编码 UID → is_admin()
--    （所有原先写死 cb058… 的策略全部重写）
-- =================================================================

-- ---- footprints ----
alter table public.footprints enable row level security;
drop policy if exists "footprints_public_read" on public.footprints;
drop policy if exists "footprints_admin_write" on public.footprints;
create policy "footprints_public_read" on public.footprints for select using (true);
create policy "footprints_admin_write" on public.footprints
  for all using (public.is_admin()) with check (public.is_admin());

-- ---- messages ----
alter table public.messages enable row level security;
drop policy if exists "messages_public_read" on public.messages;
drop policy if exists "messages_public_insert" on public.messages;
drop policy if exists "messages_admin_modify" on public.messages;
create policy "messages_public_read"   on public.messages for select using (true);
create policy "messages_public_insert" on public.messages for insert with check (true);
create policy "messages_admin_modify" on public.messages
  for delete using (public.is_admin());

-- ---- photos ----
alter table public.photos enable row level security;
drop policy if exists "photos_public_read" on public.photos;
drop policy if exists "photos_admin_write" on public.photos;
create policy "photos_public_read" on public.photos for select using (true);
create policy "photos_admin_write" on public.photos
  for all using (public.is_admin()) with check (public.is_admin());

-- ---- banners ----
alter table public.banners enable row level security;
drop policy if exists "banners_public_read" on public.banners;
drop policy if exists "banners_admin_write" on public.banners;
create policy "banners_public_read" on public.banners for select using (true);
create policy "banners_admin_write" on public.banners
  for all using (public.is_admin()) with check (public.is_admin());

-- ---- site_content ----
alter table public.site_content enable row level security;
drop policy if exists "site_content_public_read" on public.site_content;
drop policy if exists "site_content_admin_write" on public.site_content;
create policy "site_content_public_read" on public.site_content for select using (true);
create policy "site_content_admin_write" on public.site_content
  for all using (public.is_admin()) with check (public.is_admin());

-- ---- videos ----
alter table public.videos enable row level security;
drop policy if exists "videos_public_read" on public.videos;
drop policy if exists "videos_admin_write" on public.videos;
create policy "videos_public_read" on public.videos for select using (true);
create policy "videos_admin_write" on public.videos
  for all using (public.is_admin()) with check (public.is_admin());

-- ---- page_sections ----
alter table public.page_sections enable row level security;
drop policy if exists "page_sections_public_read" on public.page_sections;
drop policy if exists "page_sections_admin_write" on public.page_sections;
create policy "page_sections_public_read" on public.page_sections for select using (true);
create policy "page_sections_admin_write" on public.page_sections
  for all using (public.is_admin()) with check (public.is_admin());

-- ---- theme_settings ----
alter table public.theme_settings enable row level security;
drop policy if exists "theme_settings_public_read" on public.theme_settings;
drop policy if exists "theme_settings_admin_write" on public.theme_settings;
create policy "theme_settings_public_read" on public.theme_settings for select using (true);
create policy "theme_settings_admin_write" on public.theme_settings
  for all using (public.is_admin()) with check (public.is_admin());

-- ---- site_meta ----
alter table public.site_meta enable row level security;
drop policy if exists "site_meta_public_read" on public.site_meta;
drop policy if exists "site_meta_admin_write" on public.site_meta;
create policy "site_meta_public_read" on public.site_meta for select using (true);
create policy "site_meta_admin_write" on public.site_meta
  for all using (public.is_admin()) with check (public.is_admin());

-- ---- media_library ----
alter table public.media_library enable row level security;
drop policy if exists "media_public_read" on public.media_library;
drop policy if exists "media_admin_write" on public.media_library;
create policy "media_public_read" on public.media_library for select using (true);
create policy "media_admin_write" on public.media_library
  for all using (public.is_admin()) with check (public.is_admin());

-- ---- posts ----
alter table public.posts enable row level security;
drop policy if exists "post_public_read" on public.posts;
drop policy if exists "post_any_insert" on public.posts;
drop policy if exists "post_admin_write" on public.posts;
create policy "post_public_read" on public.posts for select using (true);
create policy "post_any_insert" on public.posts
  for insert with check (is_admin = false and featured = false);
create policy "post_admin_write" on public.posts
  for all using (public.is_admin()) with check (public.is_admin());

-- ---- post_images ----
alter table public.post_images enable row level security;
drop policy if exists "post_image_public_read" on public.post_images;
drop policy if exists "post_image_admin_cud" on public.post_images;
create policy "post_image_public_read" on public.post_images for select using (true);
create policy "post_image_admin_cud" on public.post_images
  for all using (public.is_admin()) with check (public.is_admin());

-- ---- post_comments ----
alter table public.post_comments enable row level security;
drop policy if exists "post_comment_public_read" on public.post_comments;
drop policy if exists "post_comment_any_insert" on public.post_comments;
drop policy if exists "post_comment_admin_delete" on public.post_comments;
create policy "post_comment_public_read"   on public.post_comments for select using (true);
create policy "post_comment_any_insert"   on public.post_comments for insert with check (true);
create policy "post_comment_admin_delete" on public.post_comments
  for delete using (public.is_admin());

-- ---- post_likes ----
alter table public.post_likes enable row level security;
drop policy if exists "post_like_public_read" on public.post_likes;
drop policy if exists "post_like_any_insert" on public.post_likes;
create policy "post_like_public_read" on public.post_likes for select using (true);
create policy "post_like_any_insert" on public.post_likes for insert with check (true);

-- =================================================================
-- 6. Storage 策略重建（所有桶）
-- =================================================================
drop policy if exists "gallery_public_read"    on storage.objects;
drop policy if exists "gallery_admin_upload"   on storage.objects;
drop policy if exists "gallery_admin_delete"   on storage.objects;
drop policy if exists "posts_bucket_public_read"   on storage.objects;
drop policy if exists "posts_bucket_admin_upload"  on storage.objects;
drop policy if exists "posts_bucket_admin_delete"  on storage.objects;
drop policy if exists "media_bucket_public_read"   on storage.objects;
drop policy if exists "media_bucket_admin_upload"  on storage.objects;
drop policy if exists "media_bucket_admin_delete"  on storage.objects;

-- 公共读：gallery / covers / videos / media / posts 五个桶
create policy "gallery_public_read" on storage.objects
  for select using (bucket_id in ('gallery','covers','videos','media','posts'));

-- 管理员上传：五个桶（admin 都可传）
create policy "gallery_admin_upload" on storage.objects
  for insert
  with check (bucket_id in ('gallery','covers','videos','media','posts') and public.is_admin());

-- 管理员删除
create policy "gallery_admin_delete" on storage.objects
  for delete
  using (bucket_id in ('gallery','covers','videos','media','posts') and public.is_admin());

-- ================================================================
-- 完成！下面 SQL 用于自检（运行后应看到：admin_users=2、admin_profiles=2）
-- ================================================================
select 'admin_users' as tbl, count(*) as n from public.admin_users
union all select 'admin_profiles', count(*) from public.admin_profiles
union all select 'albums', count(*) from public.albums
union all select 'photos_with_album', count(*) from public.photos where album_id is not null;
