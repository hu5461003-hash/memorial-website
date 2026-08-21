import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import { STORAGE_KEYS } from "@/lib/config";
import type { Session } from "@supabase/supabase-js";

type AppState = {
  // 私密相册解锁态
  galleryUnlocked: boolean;
  unlockGallery: () => void;
  lockGallery: () => void;

  // 管理员会话
  session: Session | null;
  setSession: (s: Session | null) => void;

  // 侧边栏导航抽屉（页头汉堡按钮触发）
  sidenavOpen: boolean;
  openSidenav: () => void;
  closeSidenav: () => void;
};

export const useStore = create<AppState>((set) => ({
  // 私密相册：解锁态存 sessionStorage，刷新本会话内保持
  galleryUnlocked:
    typeof window !== "undefined"
      ? sessionStorage.getItem(STORAGE_KEYS.galleryUnlocked) === "1"
      : false,

  unlockGallery: () => {
    sessionStorage.setItem(STORAGE_KEYS.galleryUnlocked, "1");
    set({ galleryUnlocked: true });
  },

  lockGallery: () => {
    sessionStorage.removeItem(STORAGE_KEYS.galleryUnlocked);
    set({ galleryUnlocked: false });
  },

  // 管理员会话
  session: null,
  setSession: (s) => set({ session: s }),

  // 侧边栏导航抽屉
  sidenavOpen: false,
  openSidenav: () => set({ sidenavOpen: true }),
  closeSidenav: () => set({ sidenavOpen: false }),
}));

// 监听 Supabase Auth 状态变化（仅当 supabase 已配置时）
if (supabase) {
  supabase.auth.getSession().then(({ data }) => {
    useStore.getState().setSession(data.session);
  });
  supabase.auth.onAuthStateChange((_event, session) => {
    useStore.getState().setSession(session);
  });
}
