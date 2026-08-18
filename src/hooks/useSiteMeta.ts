import { useEffect, useState, useCallback } from "react";
import { supabase, supabaseReady } from "@/lib/supabase";
import { DEFAULT_SITE_META } from "@/lib/types";
import type { SiteMeta } from "@/lib/types";

type MetaMap = Record<string, string>;

/**
 * 拉取全站 SEO 元数据。
 * Supabase 未配置时回退到 DEFAULT_SITE_META。
 */
export function useSiteMeta() {
  const [meta, setMeta] = useState<MetaMap>(DEFAULT_SITE_META);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!supabaseReady || !supabase) {
      setMeta(DEFAULT_SITE_META);
      setLoading(false);
      return;
    }
    const { data } = await supabase.from("site_meta").select("*");
    const map: MetaMap = { ...DEFAULT_SITE_META };
    for (const row of (data as SiteMeta[] | null) ?? []) {
      if (row.meta_value != null) map[row.meta_key] = row.meta_value;
    }
    setMeta(map);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
    if (!error) setMeta((m) => ({ ...m, [key]: value }));
    return !error;
  }

  /** 批量保存 */
  async function saveAll(entries: Record<string, string>): Promise<boolean> {
    if (!supabaseReady || !supabase) return false;
    const rows = Object.entries(entries).map(([meta_key, meta_value]) => ({
      meta_key,
      meta_value,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await supabase
      .from("site_meta")
      .upsert(rows, { onConflict: "meta_key" });
    if (!error) setMeta((m) => ({ ...m, ...entries }));
    return !error;
  }

  return { meta, loading, saveMeta, saveAll, refetch: load };
}
