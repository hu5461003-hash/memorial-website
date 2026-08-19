import { useEffect, useState, useCallback } from "react";
import { supabase, supabaseReady } from "@/lib/supabase";
import { DEFAULT_THEME } from "@/lib/types";
import type { ThemeSettings } from "@/lib/types";

const THEME_ROW_ID = "00000000-0000-0000-0000-000000000001";

/** 将主题设置应用为 CSS 自定义属性到 :root */
function applyThemeVars(theme: ThemeSettings) {
  const root = document.documentElement;
  root.style.setProperty("--theme-bg", theme.bg_color);
  root.style.setProperty("--theme-text", theme.text_color);
  root.style.setProperty("--theme-primary", theme.primary_color);
  root.style.setProperty("--theme-card", theme.card_color);
  root.style.setProperty("--theme-border", theme.border_color);
  root.style.setProperty("--theme-nav-bg", theme.nav_bg_color);
  root.style.setProperty("--theme-nav-text", theme.nav_text_color);
  root.style.setProperty("--theme-nav-active", theme.nav_active_color);
  root.style.setProperty("--theme-logo-text", theme.logo_text_color);
  root.style.setProperty("--theme-btn-bg", theme.button_bg_color);
  root.style.setProperty("--theme-btn-text", theme.button_text_color);
  // 同时设置 body 基础色
  document.body.style.backgroundColor = theme.bg_color;
  document.body.style.color = theme.text_color;
  document.body.style.fontFamily = theme.font_family;
  document.body.style.fontSize = theme.base_font_size;
}

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
      applyThemeVars(DEFAULT_THEME);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("theme_settings")
      .select("settings")
      .eq("id", THEME_ROW_ID)
      .maybeSingle();
    if (data?.settings) {
      const merged = { ...DEFAULT_THEME, ...(data.settings as ThemeSettings) };
      setTheme(merged);
      applyThemeVars(merged);
    } else {
      setTheme(DEFAULT_THEME);
      applyThemeVars(DEFAULT_THEME);
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
    if (!error) {
      setTheme(next);
      applyThemeVars(next);
    }
    return !error;
  }

  return { theme, loading, saveTheme, refetch: load };
}
