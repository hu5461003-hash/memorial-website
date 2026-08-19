import { useEffect, useState, useCallback } from "react";
import { supabase, supabaseReady } from "@/lib/supabase";
import { CONTENT_DEFAULT_MAP } from "@/lib/config";
import type { SiteContent } from "@/lib/types";

type ContentMap = Record<string, SiteContent>;

/**
 * 拉取所有 site_content，提供 getValue(key) 读取文本内容。
 * - 若 Supabase 未配置或读取失败，回退到 CONTENT_DEFAULT_MAP
 * - 管理员在后台修改后，调用 refetch() 刷新
 */
export function useContent() {
  const [content, setContent] = useState<ContentMap>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!supabaseReady || !supabase) {
      setContent({});
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("site_content")
      .select("*")
      .order("sort_order", { ascending: true });
    const map: ContentMap = {};
    for (const row of (data as SiteContent[] | null) ?? []) {
      map[row.content_key] = row;
    }
    setContent(map);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /** 读取某 key 的文本内容：行存在则以数据库为准（清空即空），行不存在才回退默认值 */
  const getValue = useCallback(
    (key: string): string => {
      const row = content[key];
      if (row) {
        return row.content_value ?? "";
      }
      return CONTENT_DEFAULT_MAP[key] ?? "";
    },
    [content],
  );

  /** 读取某 key 的图片 URL */
  const getImage = useCallback(
    (key: string): string | null => {
      const row = content[key];
      return row?.image_url ?? null;
    },
    [content],
  );

  /** 读取长文本并按空行拆分为段落 */
  const getParagraphs = useCallback(
    (key: string): string[] => {
      const text = getValue(key);
      if (!text) return [];
      return text
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean);
    },
    [getValue],
  );

  return { content, loading, getValue, getImage, getParagraphs, refetch: load };
}
