import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import { STORAGE_KEYS } from "@/lib/config";
import type { Session } from "@supabase/supabase-js";

type AppState = {
  // 背景音乐
  isPlaying: boolean;
  audioEl: HTMLAudioElement | null;
  initAudio: (el: HTMLAudioElement) => void;
  togglePlay: () => void;

  // 私密相册解锁态
  galleryUnlocked: boolean;
  unlockGallery: () => void;
  lockGallery: () => void;

  // 管理员会话
  session: Session | null;
  setSession: (s: Session | null) => void;
};

export const useStore = create<AppState>((set, get) => ({
  // 背景音乐：默认关闭，状态从 localStorage 恢复
  isPlaying:
    typeof window !== "undefined"
      ? localStorage.getItem(STORAGE_KEYS.musicPlaying) === "1"
      : false,
  audioEl: null,

  initAudio: (el) => {
    const wasPlaying = get().isPlaying;
    set({ audioEl: el });
    el.volume = 0.35;
    el.loop = true;
    if (wasPlaying) {
      el.play().catch(() => {
        // 自动播放被浏览器拦截，置为暂停
        set({ isPlaying: false });
        localStorage.removeItem(STORAGE_KEYS.musicPlaying);
      });
    }
  },

  togglePlay: () => {
    const { audioEl, isPlaying } = get();
    if (!audioEl) return;
    if (isPlaying) {
      audioEl.pause();
      localStorage.removeItem(STORAGE_KEYS.musicPlaying);
      set({ isPlaying: false });
    } else {
      audioEl
        .play()
        .then(() => {
          localStorage.setItem(STORAGE_KEYS.musicPlaying, "1");
          set({ isPlaying: true });
        })
        .catch(() => {
          // 播放失败（如自动播放策略），保持暂停态
          set({ isPlaying: false });
        });
    }
  },

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
