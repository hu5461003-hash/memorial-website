import { createClient } from "@supabase/supabase-js";

// Supabase 项目凭据
// 部署时请在仓库 Settings → Secrets 配置 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
// 本地开发请在 memorial-website/.env.local 配置同名变量
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// 兜底：未配置时给出友好提示，避免运行时崩溃
const isConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storageKey: "zhipixiping-auth",
      },
    })
  : null;

export const supabaseReady = isConfigured;

/** 统一封装「未配置 Supabase」时的友好提示 */
export function ensureSupabase(): NonNullable<typeof supabase> {
  if (!supabase) {
    throw new Error(
      "Supabase 尚未配置。请在仓库 Settings → Secrets and variables → Actions 中添加 VITE_SUPABASE_URL 与 VITE_SUPABASE_ANON_KEY，并在本地 .env.local 中配置同名变量。",
    );
  }
  return supabase;
}
