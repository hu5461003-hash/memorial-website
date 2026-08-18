import { useEffect, useState, useCallback } from "react";
import { supabase, supabaseReady } from "@/lib/supabase";
import { DEFAULT_THEME } from "@/lib/types";
import type { ThemeSettings } from "@/lib/types";

const THEME_ROW_ID = "00000000-0000-0000-0000-000000000001";

/**
 * 拉取全局主题设置。
 * Supabase 未配置时回退到 DEFAULT_THEME。
 */
export function useTheme() {
  const [theme, setTheme] = useState<ThemeSettings>(DEFAULT_THEME);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!supabaseReady || !supabase) {
      setTheme(DEFAULT_THEME);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("theme_settings")
      .select("settings")
      .eq("id", THEME_ROW_ID)
      .maybeSingle();
    if (data?.settings) {
      setTheme({ ...DEFAULT_THEME, ...(data.settings as ThemeSettings) });
    } else {
      setTheme(DEFAULT_THEME);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /** 保存主题到 Supabase */
  async function saveTheme(next: ThemeSettings): Promise<boolean> {
    if (!supabaseReady || !supabase) return false;
    const { error } = await supabase
      .from("theme_settings")
      .upsert(
        { id: THEME_ROW_ID, settings: next, updated_at: new Date().toISOString() },
        { onConflict: "id" },
      );
    if (!error) setTheme(next);
    return !error;
  }

  return { theme, loading, saveTheme, refetch: load };
}
