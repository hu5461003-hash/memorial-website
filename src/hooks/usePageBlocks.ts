import { useEffect, useState, useCallback } from "react";
import { supabase, supabaseReady } from "@/lib/supabase";
import { BUILTIN_BLOCKS } from "@/lib/config";
import type { PageSection } from "@/lib/types";

/**
 * 页面完整区块流：数据库动态组件 + 内置区块，统一按 sort_order 排序。
 * - 内置区块（section_type = "builtin"）无数据库记录时按注册顺序合成，默认显示
 * - 数据库中 active=false 的内置区块会被过滤（即后台隐藏）
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
      .eq("active", true)
      .order("sort_order", { ascending: true });
    const rows = (data as PageSection[]) ?? [];
    const seen = new Set<string>();
    for (const r of rows) {
      if (r.section_type === "builtin") {
        seen.add(String((r.content_data as Record<string, unknown>)?.block ?? ""));
      }
    }
    const merged = [...rows, ...synthesize(pageName, seen)];
    merged.sort((a, b) => a.sort_order - b.sort_order);
    setSections(merged);
    setLoading(false);
  }, [pageName, synthesize]);

  useEffect(() => {
    load();
  }, [load]);

  return { sections, loading, refetch: load };
}
