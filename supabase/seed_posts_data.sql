-- ========================================================
-- 帖子示范数据 · 一键插入
-- 用法：Supabase Dashboard → SQL Editor → NEW QUERY → 粘贴 → RUN
-- ========================================================

-- 1) 如果之前的示范帖存在，把它设为推荐到首页
update public.posts
set featured = true,
    cover_url = coalesce(nullif(cover_url, ''), 'https://picsum.photos/seed/welcome-post-1/800/800')
where nickname = '小助手' and title = '欢迎来发帖～';

-- 2) 插入 3 条推荐示范帖子（带首图，首页即可显示）
insert into public.posts (title, content, nickname, cover_url, featured, is_admin, ip_address, like_count, comment_count, share_count)
values
(
  '爷爷的老花镜',
  '记得小时候，爷爷每次看报纸都会戴上那副黑色边框的老花镜，一边看一边给我讲报纸上的故事。现在想起来，那真是最温暖的时光。',
  '回忆收藏夹',
  'https://picsum.photos/seed/memorial-glasses/800/800',
  true,
  false,
  'demo-seed-1',
  12, 3, 5
),
(
  '那碗手擀面',
  '外婆做的手擀面，面香浓郁，汤头清亮。每次回家都要吃两大碗。现在外婆不在了，可那个味道永远留在心里。',
  '深夜食堂',
  'https://picsum.photos/seed/memorial-noodles/800/800',
  true,
  false,
  'demo-seed-2',
  38, 7, 12
),
(
  '老照片里的夏天',
  '翻出一张老照片，是二十年前全家在海边拍的。爸爸穿着白背心，妈妈抱着我笑得很开心。时间过得真快。',
  '时光胶片',
  'https://picsum.photos/seed/memorial-summer/800/800',
  true,
  false,
  'demo-seed-3',
  27, 5, 9
)
on conflict (id) do nothing;

-- 完成
select '✓ 示范帖子插入完成。共 ' || count(*) || ' 条帖子，其中推荐到首页 ' || count(*) filter (where featured) || ' 条。' as info
from public.posts;
