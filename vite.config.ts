import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";

// https://vite.dev/config/
// base: '/' 自定义域名 zap534.site 部署在根路径
// public/CNAME 文件由 Vite 自动复制到 dist，供 GitHub Pages 识别自定义域名
export default defineConfig(({ mode }) => ({
  base: '/',
  build: {
    sourcemap: 'hidden',
    outDir: 'dist',
    rollupOptions: {
      output: {
        // 框架代码独立分包：业务发版后浏览器仍命中缓存，回访更快
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
  plugins: [
    react({
      babel: {
        // 组件定位器仅开发环境注入，减小生产包体积
        plugins: mode === 'development' ? ['react-dev-locator'] : [],
      },
    }),
    tsconfigPaths()
  ],
}))
