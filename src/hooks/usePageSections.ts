import { useEffect, useState, useCallback } from "react";
import { supabase, supabaseReady } from "@/lib/supabase";
import type { PageSection } from "@/lib/types";

/**
 * 按 page_name 拉取已启用的动态组件列表，按 sort_order 排序。
 * Supabase 未配置时返回空数组（前台页面照常渲染原生内容）。
 */
export function usePageSections(pageName: string) {
  const [sections, setSections] = useState<PageSection[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!supabaseReady || !supabase) {
      setSections([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("page_sections")
      .select("*")
      .eq("page_name", pageName)
      .eq("active", true)
      .order("sort_order", { ascending: true });
    setSections((data as PageSection[]) ?? []);
    setLoading(false);
  }, [pageName]);

  useEffect(() => {
    load();
  }, [load]);

  return { sections, loading, refetch: load };
}
