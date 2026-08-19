-- ================================================================
-- v4 全站 Schema 对齐脚本 · 在 Supabase Dashboard → SQL Editor 粘贴执行
-- 全部幂等，可重复执行
-- ================================================================
-- 修复问题（后台保存报
--   "Could not find the 'xxx' column ... in the schema cache"）：
--  A. page_sections 补 4 个分区颜色列（排版保存必报错的直接原因）
--  B. site_content 补 5 个文字样式列（内容管理“新增/编辑”表单保存会报错）
--  C. posts / post_comments 补 IP 归属地列（消除匿名发帖/评论的静默重试）
--  D. 保险：管理员体系 / albums 相册表 / photos·videos 文件夹列
--     （执行过 v2 admin_users_and_albums.sql 的跑这段也无害）
--  E. messages 管理员权限补全（编辑 / 代发留言）
--  F. 刷新 PostgREST schema 缓存 + 自检查询
-- ================================================================

-- ================================================================
-- A. page_sections：分区颜色覆盖（4 列）
-- ================================================================
alter table public.page_sections
  add column if not exists bg_color text,
  add column if not exists text_color text,
  add column if not exists border_color text,
  add column if not exists accent_color text;

-- ================================================================
-- B. site_content：文字样式（5 列）
-- ================================================================
alter table public.site_content
  add column if not exists font_size text,
  add column if not exists font_weight text,
  add column if not exists text_color text,
  add column if not exists letter_spacing text,
  add column if not exists text_align text;

-- ================================================================
-- C. posts / post_comments：IP 归属地（3 列）
-- ================================================================
alter table public.posts
  add column if not exists ip_location text,
  add column if not exists user_location text;

alter table public.post_comments
  add column if not exists ip_location text;

-- ================================================================
-- D. 保险：管理员体系 + albums 相册表 + photos/videos 文件夹列
--    （若已执行过 admin_users_and_albums.sql，此段全部跳过、无副作用）
-- ================================================================
create table if not exists public.admin_users (
  uid uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;

insert into public.admin_users (uid, email, is_primary)
select id, email,
  case when email = '2832290588@qq.com' then true else false end as is_primary
from auth.users
where lower(email) in ('2832290588@qq.com', 'hu5461003@gmail.com')
on conflict (email) do nothing;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.admin_users where uid = auth.uid()
  );
$$;

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
  for all using (public.is_admin()) with check (public.is_admin());

alter table public.photos
  add column if not exists album_id uuid references public.albums(id) on delete set null,
  add column if not exists owner_admin_uid uuid references public.admin_users(uid) on delete set null;
create index if not exists idx_photos_album on public.photos(album_id);

alter table public.videos
  add column if not exists album_id uuid references public.albums(id) on delete set null,
  add column if not exists owner_admin_uid uuid references public.admin_users(uid) on delete set null;
create index if not exists idx_videos_album on public.videos(album_id);

-- ================================================================
-- E. messages：管理员权限补全（编辑 / 删除 / 代发全覆盖）
-- ================================================================
alter table public.messages enable row level security;
drop policy if exists "messages_public_read" on public.messages;
drop policy if exists "messages_public_insert" on public.messages;
drop policy if exists "messages_admin_modify" on public.messages;
drop policy if exists "messages_admin_write" on public.messages;
create policy "messages_public_read" on public.messages for select using (true);
create policy "messages_public_insert" on public.messages for insert with check (true);
create policy "messages_admin_write" on public.messages
  for all using (public.is_admin()) with check (public.is_admin());

-- ================================================================
-- F. 刷新 PostgREST schema 缓存（让新列立即对 API 可见）
-- ================================================================
notify pgrst, 'reload schema';

-- ================================================================
-- 自检：应返回 12 行（4 + 5 + 2 + 1）
-- ================================================================
select table_name, column_name
from information_schema.columns
where table_schema = 'public'
  and (
    (table_name = 'page_sections' and column_name in ('bg_color','text_color','border_color','accent_color'))
    or (table_name = 'site_content' and column_name in ('font_size','font_weight','text_color','letter_spacing','text_align'))
    or (table_name = 'posts' and column_name in ('ip_location','user_location'))
    or (table_name = 'post_comments' and column_name = 'ip_location')
  )
order by table_name, column_name;
