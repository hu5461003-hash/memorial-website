import { useCallback, useEffect, useState } from "react";
import { supabase, supabaseReady } from "@/lib/supabase";
import type { AdminProfile } from "@/lib/types";

/**
 * 获取当前登录管理员的独立联系方式 + 所有管理员联系方式列表。
 * - 读：公开（前台首页展示两位管理员卡片）
 * - 写：RLS 已限制只能写自己那行 (admin_uid = auth.uid())
 */
export function useAdminProfiles(sessionUid: string | null) {
  const [profiles, setProfiles] = useState<AdminProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!supabaseReady || !supabase) {
      setProfiles([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("admin_profiles")
      .select("*")
      .order("updated_at", { ascending: false });
    setProfiles((data as AdminProfile[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // 当前登录管理员的 profile（后台才用到，sessionUid 才有值）
  const mine = profiles.find((p) => p.admin_uid === sessionUid) ?? null;

  /**
   * 保存当前登录管理员自己的联系方式。
   * 因 RLS 限制：即便前端改 admin_uid，数据库也会拒绝写他人行。
   */
  const saveMine = useCallback(
    async (patch: Partial<AdminProfile>): Promise<boolean> => {
      if (!supabaseReady || !supabase || !sessionUid) return false;
      const row: Partial<AdminProfile> & { admin_uid: string; updated_at: string } = {
        ...patch,
        admin_uid: sessionUid,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from("admin_profiles").upsert(row, {
        onConflict: "admin_uid",
      });
      if (!error) {
        setProfiles((prev) => {
          const others = prev.filter((p) => p.admin_uid !== sessionUid);
          const merged: AdminProfile = {
            admin_uid: sessionUid,
            nickname: "",
            qq: "",
            wechat: "",
            phone: "",
            email_display: "",
            avatar_url: "",
            updated_at: row.updated_at,
            ...(prev.find((p) => p.admin_uid === sessionUid) ?? {}),
            ...patch,
          };
          return [...others, merged];
        });
        return true;
      }
      await load();
      return false;
    },
    [sessionUid, load],
  );

  return { profiles, mine, loading, refetch: load, saveMine };
}
