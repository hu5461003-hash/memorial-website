-- ================================================================
-- v5 最小修复脚本：只补 12 个缺失列（无其他依赖，不会失败）
-- 在 Supabase Dashboard → SQL Editor 粘贴后点 Run
-- ================================================================

-- A. page_sections：分区颜色（排版保存报错的直接原因）
alter table public.page_sections
  add column if not exists bg_color text,
  add column if not exists text_color text,
  add column if not exists border_color text,
  add column if not exists accent_color text;

-- B. site_content：文字样式（内容管理保存需要）
alter table public.site_content
  add column if not exists font_size text,
  add column if not exists font_weight text,
  add column if not exists text_color text,
  add column if not exists letter_spacing text,
  add column if not exists text_align text;

-- C. posts / post_comments：IP 归属地
alter table public.posts
  add column if not exists ip_location text,
  add column if not exists user_location text;

alter table public.post_comments
  add column if not exists ip_location text;

-- D. 留言管理：管理员可编辑/代发留言（幂等）
drop policy if exists "messages_admin_write" on public.messages;
create policy "messages_admin_write" on public.messages
  for all using (public.is_admin()) with check (public.is_admin());

-- E. 刷新 API 缓存，让新列立即生效
notify pgrst, 'reload schema';

-- 自检：执行成功应显示 added_columns = 12
select count(*) as added_columns
from information_schema.columns
where table_schema = 'public'
  and (
    (table_name = 'page_sections' and column_name in ('bg_color','text_color','border_color','accent_color'))
    or (table_name = 'site_content' and column_name in ('font_size','font_weight','text_color','letter_spacing','text_align'))
    or (table_name = 'posts' and column_name in ('ip_location','user_location'))
    or (table_name = 'post_comments' and column_name = 'ip_location')
  );
