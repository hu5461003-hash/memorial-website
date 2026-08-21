-- ============================================================
-- v6：博客系统 + 侧边栏导航 + 页脚社媒图标
-- 幂等脚本：CREATE IF NOT EXISTS，可反复执行，不清空数据
-- 依赖：public.is_admin()（由 admin_users_and_albums.sql 提供）
-- ============================================================

-- ============================================================
-- 1. blogs 博客表
--    前台仅展示 published=true；slug 用于 URL：/#/blog/<slug>
-- ============================================================
create table if not exists public.blogs (
  id               uuid primary key default gen_random_uuid(),
  title            text        not null default '',
  slug             text        not null,
  excerpt          text        not null default '',
  cover_url        text,
  meta_title       text,
  meta_description text,
  keywords         text,
  content          text        not null default '',
  author           text        not null default '',
  published        boolean     not null default false,
  published_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint blogs_slug_key unique (slug)
);

create index if not exists idx_blogs_published on public.blogs(published, published_at desc);

alter table public.blogs enable row level security;

drop policy if exists "blog_public_read"  on public.blogs;
drop policy if exists "blog_admin_write"  on public.blogs;

create policy "blog_public_read" on public.blogs
  for select using (true);

create policy "blog_admin_write" on public.blogs
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================
-- 2. nav_links 侧边栏导航（页头汉堡菜单内容）
-- ============================================================
create table if not exists public.nav_links (
  id          uuid primary key default gen_random_uuid(),
  label       text        not null,
  url         text        not null,
  icon        text        not null default 'link',
  group_name  text        not null default '',
  sort_order  integer     not null default 0,
  active      boolean     not null default true,
  open_in_new boolean     not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists idx_nav_links_order on public.nav_links(sort_order);

alter table public.nav_links enable row level security;

drop policy if exists "nav_public_read"  on public.nav_links;
drop policy if exists "nav_admin_write"  on public.nav_links;

create policy "nav_public_read" on public.nav_links
  for select using (true);

create policy "nav_admin_write" on public.nav_links
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================
-- 3. social_links 页脚社媒图标
--    icon 为内置图标 key；icon_url 有值时优先显示自定义图片
-- ============================================================
create table if not exists public.social_links (
  id         uuid primary key default gen_random_uuid(),
  label      text        not null,
  url        text        not null,
  icon       text        not null default 'link',
  icon_url   text,
  sort_order integer     not null default 0,
  active     boolean     not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_social_links_order on public.social_links(sort_order);

alter table public.social_links enable row level security;

drop policy if exists "social_public_read"  on public.social_links;
drop policy if exists "social_admin_write"  on public.social_links;

create policy "social_public_read" on public.social_links
  for select using (true);

create policy "social_admin_write" on public.social_links
  for all
  using (public.is_admin())
  with check (public.is_admin());
