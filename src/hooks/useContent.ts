import { useCallback, useSyncExternalStore } from "react";
import { supabase, supabaseReady } from "@/lib/supabase";
import { CONTENT_DEFAULT_MAP, STORAGE_KEYS } from "@/lib/config";
import type { SiteContent } from "@/lib/types";

type ContentMap = Record<string, SiteContent>;

/**
 * 站点文字内容 · 共享 store
 * - 首屏同步读 localStorage 缓存（上次内容先渲染，不再闪默认值），再静默拉取最新
 * - 多组件复用同一份数据，只请求一次
 * - getValue(key)：行存在则以数据库为准（清空即空），行不存在才回退默认值
 */

function readCache(): Record<string, SiteContent> {
  try {
    const v = JSON.parse(localStorage.getItem(STORAGE_KEYS.contentCache) || "{}");
    return typeof v === "object" && v ? v : {};
  } catch {
    return {};
  }
}
function writeCache(map: ContentMap) {
  try {
    localStorage.setItem(STORAGE_KEYS.contentCache, JSON.stringify(map));
  } catch {
    /* 存储满等异常忽略 */
  }
}

let store: ContentMap = readCache();
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
  const { data } = await supabase
    .from("site_content")
    .select("*")
    .order("sort_order", { ascending: true });
  const map: ContentMap = {};
  for (const row of (data as SiteContent[] | null) ?? []) {
    map[row.content_key] = row;
  }
  store = map;
  writeCache(map);
  fetched = true;
  fetching = false;
  emit();
}

/** 后台保存内容后失效缓存 */
export function invalidateContent() {
  store = {};
  writeCache({});
  void ensure();
}

export function useContent() {
  const subscribe = useCallback((cb: () => void) => {
    listeners.add(cb);
    void ensure();
    return () => {
      listeners.delete(cb);
    };
  }, []);

  const content = useSyncExternalStore(
    subscribe,
    () => store,
    () => store,
  );

  /** 读取某 key 的文本内容：行存在则以数据库为准（清空即空），行不存在才回退默认值 */
  const getValue = useCallback(
    (key: string): string => {
      const row = content[key];
      if (row) {
        return row.content_value ?? "";
      }
      return CONTENT_DEFAULT_MAP[key] ?? "";
    },
    [content],
  );

  /** 读取某 key 的图片 URL */
  const getImage = useCallback(
    (key: string): string | null => {
      const row = content[key];
      return row?.image_url ?? null;
    },
    [content],
  );

  /** 读取长文本并按空行拆分为段落 */
  const getParagraphs = useCallback(
    (key: string): string[] => {
      const text = getValue(key);
      if (!text) return [];
      return text
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean);
    },
    [getValue],
  );

  return { content, loading: !fetched, getValue, getImage, getParagraphs };
}
