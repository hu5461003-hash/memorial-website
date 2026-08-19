-- ================================================================
-- v3 修复与数据清理脚本 · 在 Supabase Dashboard → SQL Editor 中粘贴执行
-- 可重复执行（全部幂等）
-- ================================================================
-- 包含内容：
--  1. page_sections 排版表 + 权限（前台公开读 / 管理员写）
--     —— 修复“后台排版操作后前台无效果”（前台读不到排版权限表）
--  2. messages 留言权限补全（管理员可编辑/删除/代发留言）
--  3. 全库文本清理：“皮希平” → “P”
--  4. 站点标题与 Logo 初始值 “记录” → “P”
--  5. 已被删除的长信正文：补一行空记录，避免前台回退默认信
-- ================================================================

-- =================================================================
-- 0. 前置：admin_users 表 + is_admin() 函数（幂等，已存在则跳过）
-- =================================================================
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

-- =================================================================
-- 1. page_sections：排版表（若已存在则不动数据，仅重刷权限）
-- =================================================================
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
-- 前台公开读（关键：没有这条，前台永远读不到排版配置）
create policy "page_sections_public_read" on public.page_sections
  for select using (true);
create policy "page_sections_admin_write" on public.page_sections
  for all using (public.is_admin()) with check (public.is_admin());

-- =================================================================
-- 2. messages：留言权限（公开读 + 任何人可留言 + 管理员可增删改）
-- =================================================================
alter table public.messages enable row level security;
drop policy if exists "messages_public_read" on public.messages;
drop policy if exists "messages_public_insert" on public.messages;
drop policy if exists "messages_admin_modify" on public.messages;
drop policy if exists "messages_admin_write" on public.messages;

create policy "messages_public_read" on public.messages
  for select using (true);
create policy "messages_public_insert" on public.messages
  for insert with check (true);
-- 管理员可编辑、删除、代发（覆盖 update/delete/insert）
create policy "messages_admin_write" on public.messages
  for all using (public.is_admin()) with check (public.is_admin());

-- =================================================================
-- 3. 全库文本清理：“皮希平” → “P”
-- =================================================================
update public.site_content
set content_value = replace(content_value, '皮希平', 'P')
where content_value like '%皮希平%';

update public.site_meta
set meta_value = replace(meta_value, '皮希平', 'P')
where meta_value like '%皮希平%';

update public.admin_profiles
set nickname = replace(nickname, '皮希平', 'P')
where nickname like '%皮希平%';

update public.footprints
set name = replace(name, '皮希平', 'P'),
    story = replace(story, '皮希平', 'P')
where name like '%皮希平%' or story like '%皮希平%';

update public.messages
set nickname = replace(nickname, '皮希平', 'P'),
    content = replace(content, '皮希平', 'P')
where nickname like '%皮希平%' or content like '%皮希平%';

update public.posts
set title = replace(title, '皮希平', 'P'),
    content = replace(content, '皮希平', 'P'),
    nickname = replace(nickname, '皮希平', 'P')
where title like '%皮希平%' or content like '%皮希平%' or nickname like '%皮希平%';

update public.photos
set title = replace(title, '皮希平', 'P')
where title like '%皮希平%';

update public.videos
set title = replace(title, '皮希平', 'P')
where title like '%皮希平%';

update public.page_sections
set content_data = replace(content_data::text, '皮希平', 'P')::jsonb
where content_data::text like '%皮希平%';

-- =================================================================
-- 4. 站点标题与 Logo 初始值：“记录” → “P”（仅改未自定义过的）
-- =================================================================
update public.site_meta set meta_value = 'P'
where meta_key = 'site_title' and meta_value = '记录';
update public.site_meta set meta_value = 'P'
where meta_key = 'og_title' and meta_value = '记录';
update public.site_content set content_value = 'P'
where content_key in ('global.logo_text', 'global.site_title') and content_value = '记录';

-- =================================================================
-- 5. 长信正文若已被整行删除：补一行空记录
--    （新逻辑“以数据库为准”，行存在且为空 → 前台显示为空）
-- =================================================================
insert into public.site_content (content_key, page, label, type, content_value, image_url, sort_order)
values ('letter.body', 'letter', '长信正文（段落用空行分隔）', 'longtext', '', null, 1)
on conflict (content_key) do nothing;

-- 完成。执行结果检查（可选）：
-- select count(*) from site_content where content_value like '%皮希平%';  -- 应为 0
