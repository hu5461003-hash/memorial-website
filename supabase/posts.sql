-- ============================================================
-- 帖子系统建表脚本（幂等：CREATE IF NOT EXISTS，不清空数据，可反复执行）
-- Project: memorial-website
-- 权限模型：
--   * 任何访客（匿名）可：发帖（is_admin=false + featured=false）
--                       评论、点赞、查看帖子
--   * 管理员（admin_users 表中任意一个）可：增删改查所有帖子和评论
--                       上传帖子图片、设置首页推荐（featured=true）
--   * 首页只显示 posts.featured=true 的帖子
-- 依赖：public.is_admin() 函数（由 admin_users_and_albums.sql 提供）
-- ============================================================

-- ============================================================
-- 1. posts 帖子主表
-- ============================================================
create table if not exists public.posts (
  id            uuid primary key default gen_random_uuid(),
  title         text        not null default '',
  content       text        not null default '',
  cover_url     text,                     -- 列表 / 首页展示的首图
  featured      boolean     not null default false,  -- 是否在首页推荐展示
  is_admin      boolean     not null default false,  -- 是否管理员发布
  nickname      text,                     -- 匿名发帖者昵称
  ip_address    text,                     -- 仅后台可见，用于记录匿名用户 IP
  like_count    integer     not null default 0,
  comment_count integer     not null default 0,
  share_count   integer     not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists idx_posts_featured on public.posts(featured) where featured = true;
create index if not exists idx_posts_created  on public.posts(created_at desc);

alter table public.posts enable row level security;

-- 先删旧策略再重建（兼容之前硬编码 UID 的版本）
drop policy if exists "post_public_read"     on public.posts;
drop policy if exists "post_any_insert"      on public.posts;
drop policy if exists "post_admin_write"     on public.posts;

create policy "post_public_read" on public.posts
  for select using (true);

-- 匿名 / 普通访客发帖：只能 is_admin=false + featured=false
create policy "post_any_insert" on public.posts
  for insert
  with check (
    is_admin = false
    and featured = false
  );

-- 管理员（admin_users 表中任意一位）拥有全部写权限
create policy "post_admin_write" on public.posts
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================
-- 2. post_images 帖子图片（一帖多图，第一张=首图/封面）
-- ============================================================
create table if not exists public.post_images (
  id           uuid primary key default gen_random_uuid(),
  post_id      uuid        not null references public.posts(id) on delete cascade,
  storage_path text        not null,
  public_url   text        not null,
  sort_order   integer     not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists idx_post_images_post on public.post_images(post_id);

alter table public.post_images enable row level security;

drop policy if exists "post_image_public_read" on public.post_images;
drop policy if exists "post_image_admin_cud"  on public.post_images;

create policy "post_image_public_read" on public.post_images
  for select using (true);

create policy "post_image_admin_cud" on public.post_images
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================
-- 3. post_likes 点赞（按 IP 去重，一人一票）
-- ============================================================
create table if not exists public.post_likes (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid        not null references public.posts(id) on delete cascade,
  ip_address text        not null,
  created_at timestamptz not null default now(),
  unique (post_id, ip_address)
);

create index if not exists idx_post_likes_post on public.post_likes(post_id);

alter table public.post_likes enable row level security;

drop policy if exists "post_like_public_read"  on public.post_likes;
drop policy if exists "post_like_any_insert"   on public.post_likes;

create policy "post_like_public_read" on public.post_likes
  for select using (true);

create policy "post_like_any_insert" on public.post_likes
  for insert with check (true);

-- ============================================================
-- 4. post_comments 评论（任何人匿名）
-- ============================================================
create table if not exists public.post_comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid        not null references public.posts(id) on delete cascade,
  nickname   text,
  content    text        not null,
  ip_address text,
  created_at timestamptz not null default now()
);

create index if not exists idx_post_comments_post on public.post_comments(post_id, created_at desc);

alter table public.post_comments enable row level security;

drop policy if exists "post_comment_public_read"   on public.post_comments;
drop policy if exists "post_comment_any_insert"    on public.post_comments;
drop policy if exists "post_comment_admin_delete"  on public.post_comments;

create policy "post_comment_public_read" on public.post_comments
  for select using (true);

create policy "post_comment_any_insert" on public.post_comments
  for insert with check (true);

create policy "post_comment_admin_delete" on public.post_comments
  for delete
  using (public.is_admin());

-- ============================================================
-- 5. posts 存储桶（帖子图片独立桶，与私密相册彻底隔离）
-- ============================================================
insert into storage.buckets (id, name, public)
values ('posts', 'posts', true)
on conflict (name) do nothing;

-- 先清旧策略再重写，确保幂等
drop policy if exists "posts_bucket_public_read"   on storage.objects;
drop policy if exists "posts_bucket_admin_upload"  on storage.objects;
drop policy if exists "posts_bucket_admin_delete"  on storage.objects;

create policy "posts_bucket_public_read" on storage.objects
  for select using (bucket_id = 'posts');

create policy "posts_bucket_admin_upload" on storage.objects
  for insert
  with check (
    bucket_id = 'posts'
    and public.is_admin()
  );

create policy "posts_bucket_admin_delete" on storage.objects
  for delete
  using (
    bucket_id = 'posts'
    and public.is_admin()
  );
