# 致皮希平 · 纪念网站

部署在 GitHub Pages 上的全栈纪念网站。React + Vite + Tailwind + Leaflet + Supabase，温馨怀旧米白奶油色调，移动优先。

## 页面

- `/` 首页：故事标题、简述、背景音乐控制、入口卡片
- `/map` 足迹地图：Leaflet 暖色虚线连结九座城市，点击弹窗展示故事与封面图
- `/letter` 纪念长信：《寄皮希平》正文
- `/messages` 温暖留言板：便签纸卡片瀑布流，访客留言写入 Supabase
- `/gallery` 私密相册：密码 `0111` 解锁，拍立得网格照片墙（图片来自 Supabase Storage）
- `/admin` 管理后台：Supabase Auth 登录后上传照片、新增/删除足迹节点

## 本地开发

```bash
npm install
npm run dev
```

默认在 http://localhost:5173 启动。

### 环境变量

复制 `.env.example` 为 `.env.local`，填入 Supabase 凭据：

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

> 未配置 Supabase 时网站仍可运行：地图使用内置兜底数据，留言与相册功能会提示未配置。

## Supabase 初始化

1. 在 [supabase.com](https://supabase.com) 创建项目，记下 Project URL 与 anon public key。
2. 在 Dashboard → Authentication → Users 创建管理员邮箱账户（用于 `/admin` 登录）。
3. 登录该账户后，在 SQL Editor 执行 `select auth.uid();` 获取管理员 user_id。
4. 打开 `supabase/schema.sql`，将所有 `'<ADMIN_UID>'` 替换为该 user_id。
5. 在 SQL Editor 执行修改后的 `supabase/schema.sql`（创建三张表、RLS 策略、Storage 桶与九城初始数据）。

## 部署到 GitHub Pages

1. 将本目录（`memorial-website/`）推送到 GitHub 仓库（或作为独立仓库）。
   - 若作为子目录推送：把 `.github/workflows/deploy.yml` 移到仓库根 `.github/workflows/`，并在工作流的 `build` 步骤前加 `working-directory: memorial-website`。
2. 在仓库 Settings → Secrets and variables → Actions 添加：
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. 在仓库 Settings → Pages → Build and deployment → Source 选择 **GitHub Actions**。
4. 推送到 `main` 分支即可自动构建并部署。访问地址形如 `https://<user>.github.io/<repo>/`。

> 使用 HashRouter，路由通过 `#` 解析，无需额外配置 base path。

## 技术栈

| 类别 | 选型 |
|------|------|
| 前端框架 | React 18 + TypeScript |
| 构建 | Vite 6 |
| 样式 | Tailwind CSS 3（暖奶油色主题） |
| 地图 | Leaflet 1.9 + react-leaflet 4 |
| 路由 | react-router-dom 6（HashRouter） |
| 状态 | Zustand |
| 后端 | Supabase（Postgres / Auth / Storage） |
| 部署 | GitHub Actions → GitHub Pages |
| 字体 | LXGW WenKai TC（标题手写感）+ Noto Serif SC（正文） |

## 设计主色

- 米白暖奶油背景 `#FDFBF7`
- 浅咖色卡片 `#F3EFE6`
- 深暖灰文字 `#3C3836`
- 落日暖金强调 `#D4A373`
