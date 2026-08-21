import { lazy, Suspense } from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import RouteMeta from "@/components/RouteMeta";

// 路由级代码分割：首屏只加载首页所需的代码
const MapPage = lazy(() => import("@/pages/MapPage"));
const Messages = lazy(() => import("@/pages/Messages"));
const Gallery = lazy(() => import("@/pages/Gallery"));
const Blog = lazy(() => import("@/pages/Blog"));
const BlogPost = lazy(() => import("@/pages/BlogPost"));
const Admin = lazy(() => import("@/pages/Admin"));
const CustomPage = lazy(() => import("@/pages/CustomPage"));

function PageLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-gold/60 border-t-transparent" />
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <RouteMeta />
      <Suspense fallback={<PageLoading />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/admin" element={<Admin />} />
          {/* 后台「排版」新建的自定义页面（静态路由优先级更高，不会互相冲突） */}
          <Route path="/:page" element={<CustomPage />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </Suspense>
    </HashRouter>
  );
}
