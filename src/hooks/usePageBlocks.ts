import { useCallback, useSyncExternalStore } from "react";
import { supabase, supabaseReady } from "@/lib/supabase";
import { BUILTIN_BLOCKS } from "@/lib/config";
import type { PageSection } from "@/lib/types";

/**
 * 页面区块共享 store：同一页面的区块数据全站只拉取一次，
 * 页头 / 页脚 / 底部导航等多个组件复用同一份数据（减少请求与闪烁）。
 * - 数据库动态组件 + 内置区块，统一按 sort_order 排序
 * - 内置区块以数据库记录为准：记录存在则尊重其显隐/排序，不存在才按注册顺序合成
 * - active=false 的区块被过滤（即后台隐藏）
 */

const store = new Map<string, PageSection[]>();
const status = new Map<string, "loading" | "ready">();
const fetching = new Set<string>();
const listeners = new Map<string, Set<() => void>>();

function emit(page: string) {
  listeners.get(page)?.forEach((cb) => cb());
}

function subscribe(page: string, cb: () => void) {
  if (!listeners.has(page)) listeners.set(page, new Set());
  listeners.get(page)!.add(cb);
  return () => {
    listeners.get(page)?.delete(cb);
  };
}

/** 合成内置区块（数据库无记录时按注册顺序显示） */
function synthesize(page: string, exclude: Set<string>): PageSection[] {
  const builtins = BUILTIN_BLOCKS[page] ?? [];
  return builtins
    .filter((b) => !exclude.has(b.block))
    .map((b, i) => ({
      id: `builtin-${page}-${b.block}`,
      page_name: page,
      section_type: "builtin" as const,
      content_data: { block: b.block },
      sort_order: i + 1,
      active: true,
      created_at: "",
      updated_at: "",
    }));
}

/** 拉取某页区块（同一页面并发调用只发一次请求） */
async function ensure(page: string) {
  if (status.get(page) === "ready" || fetching.has(page)) return;

  if (!supabaseReady || !supabase) {
    store.set(page, synthesize(page, new Set()));
    status.set(page, "ready");
    emit(page);
    return;
  }

  fetching.add(page);
  status.set(page, "loading");
  const { data } = await supabase
    .from("page_sections")
    .select("*")
    .eq("page_name", page)
    .order("sort_order", { ascending: true });
  const rows = (data as PageSection[]) ?? [];
  // 数据库已有记录的内置区块（无论显隐）都不再合成，避免隐藏后被"复活"
  const seen = new Set<string>();
  for (const r of rows) {
    if (r.section_type === "builtin") {
      seen.add(String((r.content_data as Record<string, unknown>)?.block ?? ""));
    }
  }
  const merged = [...rows, ...synthesize(page, seen)];
  merged.sort((a, b) => a.sort_order - b.sort_order);
  store.set(page, merged.filter((s) => s.active));
  status.set(page, "ready");
  fetching.delete(page);
  emit(page);
}

/** 后台保存排版后失效缓存（下次进入页面重新拉取） */
export function invalidatePageBlocks() {
  store.clear();
  status.clear();
  listeners.forEach((_, page) => emit(page));
}

export function usePageBlocks(pageName: string) {
  const subscribePage = useCallback(
    (cb: () => void) => {
      const unsub = subscribe(pageName, cb);
      void ensure(pageName);
      return unsub;
    },
    [pageName],
  );

  const sections = useSyncExternalStore(
    subscribePage,
    () => store.get(pageName),
    () => store.get(pageName),
  );

  return {
    sections: sections ?? [],
    loading: !store.has(pageName),
    refetch: () => {
      status.delete(pageName);
      void ensure(pageName);
    },
  };
}
