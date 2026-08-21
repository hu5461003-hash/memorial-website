-- ============================================================
-- v7：留言 QQ/IP 记录 + 联系方式打码开关 + 帖子功能下线清理
-- 执行方式：Supabase Dashboard → SQL Editor → 整段运行（可重复执行）
-- ============================================================

-- 1. messages 表：留言者 QQ（头像用）、IP 与归属地
alter table public.messages add column if not exists qq text;
alter table public.messages add column if not exists ip_address text;
alter table public.messages add column if not exists ip_location text;

-- 2. admin_profiles 表：每项联系方式的打码开关（勾选后前台中间用星号隐藏）
alter table public.admin_profiles add column if not exists qq_masked boolean not null default false;
alter table public.admin_profiles add column if not exists wechat_masked boolean not null default false;
alter table public.admin_profiles add column if not exists phone_masked boolean not null default false;
alter table public.admin_profiles add column if not exists email_masked boolean not null default false;

-- 3. 帖子功能下线：清理排版区块 / SEO 元数据 / 内容文案残留
--    （posts 相关数据表保留不动，仅移除前端功能）
delete from public.page_sections
 where section_type = 'builtin'
   and content_data->>'block' = 'featured_posts';

delete from public.site_meta where meta_key like 'seo.posts.%';

delete from public.site_content where content_key like 'posts.%';
delete from public.site_content where content_key = 'global.nav_posts';
delete from public.site_content where content_key like 'home.featured_%';
delete from public.site_content where content_key = 'home.no_title';
