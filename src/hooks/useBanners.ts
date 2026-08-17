import { useEffect, useState, useCallback } from "react";
import { supabase, supabaseReady } from "@/lib/supabase";
import { DEFAULT_BANNER_IMAGE } from "@/lib/config";
import type { Banner } from "@/lib/types";

/** 拉取启用的 Banner 列表，未配置时回退到默认粉色 Banner */
export function useBanners() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!supabaseReady || !supabase) {
      setBanners([
        {
          id: "default",
          image_url: DEFAULT_BANNER_IMAGE,
          title: null,
          subtitle: null,
          link: null,
          sort_order: 0,
          active: true,
          created_at: new Date().toISOString(),
        },
      ]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("banners")
      .select("*")
      .eq("active", true)
      .order("sort_order", { ascending: true });
    if (!data || data.length === 0) {
      setBanners([
        {
          id: "default",
          image_url: DEFAULT_BANNER_IMAGE,
          title: null,
          subtitle: null,
          link: null,
          sort_order: 0,
          active: true,
          created_at: new Date().toISOString(),
        },
      ]);
    } else {
      setBanners(data as Banner[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { banners, loading, refetch: load };
}
