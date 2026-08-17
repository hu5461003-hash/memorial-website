import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";

// https://vite.dev/config/
// base: '/' 自定义域名 zap534.site 部署在根路径
// public/CNAME 文件由 Vite 自动复制到 dist，供 GitHub Pages 识别自定义域名
export default defineConfig({
  base: '/',
  build: {
    sourcemap: 'hidden',
    outDir: 'dist',
  },
  plugins: [
    react({
      babel: {
        plugins: [
          'react-dev-locator',
        ],
      },
    }),
    tsconfigPaths()
  ],
})
