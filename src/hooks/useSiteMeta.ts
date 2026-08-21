import { useCallback, useSyncExternalStore } from "react";
import { supabase, supabaseReady } from "@/lib/supabase";
import { DEFAULT_SITE_META } from "@/lib/types";
import { STORAGE_KEYS } from "@/lib/config";
import type { SiteMeta } from "@/lib/types";

type MetaMap = Record<string, string>;

/**
 * 全站 SEO 元数据 · 共享 store
 * - 首屏同步读 localStorage 缓存（标题/图标不再闪默认值），再静默拉取最新
 * - 多个组件（ThemeProvider/RouteMeta/SeoManager）复用同一份数据，只请求一次
 */

function readCache(): Record<string, string> {
  try {
    const v = JSON.parse(localStorage.getItem(STORAGE_KEYS.metaCache) || "{}");
    return typeof v === "object" && v ? v : {};
  } catch {
    return {};
  }
}
function writeCache(rows: Record<string, string>) {
  try {
    localStorage.setItem(STORAGE_KEYS.metaCache, JSON.stringify(rows));
  } catch {
    /* 存储满等异常忽略 */
  }
}

let rows: Record<string, string> = readCache();
let metaStore: MetaMap = { ...DEFAULT_SITE_META, ...rows };
let fetched = false;
let fetching = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((cb) => cb());
}

async function ensure() {
  if (fetched || fetching) return;
  if (!supabaseReady || !supabase) {
    fetched = true;
    emit();
    return;
  }
  fetching = true;
  const { data } = await supabase.from("site_meta").select("*");
  const next: Record<string, string> = {};
  for (const row of (data as SiteMeta[] | null) ?? []) {
    if (row.meta_value != null) next[row.meta_key] = row.meta_value;
  }
  rows = next;
  writeCache(next);
  metaStore = { ...DEFAULT_SITE_META, ...next };
  fetched = true;
  fetching = false;
  emit();
}

export function useSiteMeta() {
  const subscribe = useCallback((cb: () => void) => {
    listeners.add(cb);
    void ensure();
    return () => {
      listeners.delete(cb);
    };
  }, []);

  const meta = useSyncExternalStore(
    subscribe,
    () => metaStore,
    () => metaStore,
  );

  /** 保存单个 meta key */
  async function saveMeta(key: string, value: string): Promise<boolean> {
    if (!supabaseReady || !supabase) return false;
    const { error } = await supabase.from("site_meta").upsert(
      {
        meta_key: key,
        meta_value: value,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "meta_key" },
    );
    if (!error) {
      rows[key] = value;
      writeCache(rows);
      metaStore = { ...metaStore, [key]: value };
      emit();
    }
    return !error;
  }

  /** 批量保存 */
  async function saveAll(entries: Record<string, string>): Promise<boolean> {
    if (!supabaseReady || !supabase) return false;
    const upsertRows = Object.entries(entries).map(([meta_key, meta_value]) => ({
      meta_key,
      meta_value,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await supabase
      .from("site_meta")
      .upsert(upsertRows, { onConflict: "meta_key" });
    if (!error) {
      Object.assign(rows, entries);
      writeCache(rows);
      metaStore = { ...metaStore, ...entries };
      emit();
    }
    return !error;
  }

  return { meta, loading: !fetched, saveMeta, saveAll };
}
