import { useCallback, useSyncExternalStore } from "react";
import { supabase, supabaseReady } from "@/lib/supabase";
import { STORAGE_KEYS } from "@/lib/config";
import type { NavLinkItem, SocialLink } from "@/lib/types";

/**
 * 侧边栏导航 + 页脚社媒 · 共享 store（与 useSiteMeta 同模式）
 * - localStorage 缓存，首屏先渲染上次数据再静默更新
 * - 后台保存后调用 invalidateGlobalLinks() 立即刷新前台
 */

type LinkStore<T> = {
  rows: T[];
  fetched: boolean;
  fetching: boolean;
  listeners: Set<() => void>;
};

function createStore<T>(table: string, cacheKey: string, orderCol: string) {
  const store: LinkStore<T> = {
    rows: readCache<T>(cacheKey),
    fetched: false,
    fetching: false,
    listeners: new Set(),
  };

  function readCache<K>(key: string): K[] {
    try {
      const v = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  }

  function writeCache(rows: T[]) {
    try {
      localStorage.setItem(cacheKey, JSON.stringify(rows));
    } catch {
      /* 存储满等异常忽略 */
    }
  }

  function emit() {
    store.listeners.forEach((cb) => cb());
  }

  async function ensure() {
    if (store.fetched || store.fetching) return;
    if (!supabaseReady || !supabase) {
      store.fetched = true;
      emit();
      return;
    }
    store.fetching = true;
    const { data } = await supabase.from(table).select("*").order(orderCol, { ascending: true });
    store.rows = (data as T[]) ?? [];
    writeCache(store.rows);
    store.fetched = true;
    store.fetching = false;
    emit();
  }

  function invalidate() {
    store.fetched = false;
    void ensure();
  }

  function useList() {
    const subscribe = useCallback((cb: () => void) => {
      store.listeners.add(cb);
      void ensure();
      return () => {
        store.listeners.delete(cb);
      };
    }, []);
    const rows = useSyncExternalStore(
      subscribe,
      () => store.rows,
      () => store.rows,
    );
    return { rows, loading: !store.fetched };
  }

  return { useList, invalidate };
}

const navStore = createStore<NavLinkItem>("nav_links", STORAGE_KEYS.navCache, "sort_order");
const socialStore = createStore<SocialLink>("social_links", STORAGE_KEYS.socialCache, "sort_order");

export const useNavLinks = navStore.useList;
export const useSocialLinks = socialStore.useList;

/** 后台保存后调用：前台立即拉最新数据 */
export function invalidateGlobalLinks() {
  navStore.invalidate();
  socialStore.invalidate();
}
