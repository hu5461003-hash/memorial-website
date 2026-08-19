import { useEffect, useState, useCallback } from "react";
import { supabase, supabaseReady } from "@/lib/supabase";
import { BUILTIN_BLOCKS } from "@/lib/config";
import type { PageSection } from "@/lib/types";

/**
 * 页面完整区块流：数据库动态组件 + 内置区块，统一按 sort_order 排序。
 * - 拉取该页全部区块（含 active=false），内置区块以数据库记录为准：
 *   记录存在则尊重其显隐/排序，记录不存在才按注册顺序合成（默认显示）
 * - 数据库中 active=false 的区块（含内置）会被过滤（即后台隐藏）
 * - Supabase 未配置时仅返回合成的内置区块
 */
export function usePageBlocks(pageName: string) {
  const [sections, setSections] = useState<PageSection[]>([]);
  const [loading, setLoading] = useState(true);

  const synthesize = useCallback((page: string, exclude: Set<string>): PageSection[] => {
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
  }, []);

  const load = useCallback(async () => {
    if (!supabaseReady || !supabase) {
      setSections(synthesize(pageName, new Set()));
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("page_sections")
      .select("*")
      .eq("page_name", pageName)
      .order("sort_order", { ascending: true });
    const rows = (data as PageSection[]) ?? [];
    // 数据库已有记录的内置区块（无论显隐）都不再合成，避免隐藏后被"复活"
    const seen = new Set<string>();
    for (const r of rows) {
      if (r.section_type === "builtin") {
        seen.add(String((r.content_data as Record<string, unknown>)?.block ?? ""));
      }
    }
    const merged = [...rows, ...synthesize(pageName, seen)];
    merged.sort((a, b) => a.sort_order - b.sort_order);
    setSections(merged.filter((s) => s.active));
    setLoading(false);
  }, [pageName, synthesize]);

  useEffect(() => {
    load();
  }, [load]);

  return { sections, loading, refetch: load };
}
