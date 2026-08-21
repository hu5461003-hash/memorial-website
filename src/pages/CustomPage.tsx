import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { FileQuestion, Loader2 } from "lucide-react";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import PageBlocks from "@/components/PageBlocks";
import { supabase, supabaseReady } from "@/lib/supabase";
import { useContent } from "@/hooks/useContent";

/**
 * 自定义页面：后台「排版」中新建的页面统一走这条路由（/:page）。
 * 页面存在性以 page_sections 表为准：有记录则渲染区块，无记录则提示不存在。
 * 标题读 site_content 的 page.<name>.title（后台新建/重命名时写入）。
 */
export default function CustomPage() {
  const { page } = useParams<{ page: string }>();
  const { getValue } = useContent();
  const [state, setState] = useState<"loading" | "found" | "missing">("loading");

  useEffect(() => {
    let active = true;
    async function check() {
      if (!supabaseReady || !supabase || !page) {
        setState("missing");
        return;
      }
      const { count } = await supabase
        .from("page_sections")
        .select("id", { count: "exact", head: true })
        .eq("page_name", page);
      if (!active) return;
      setState((count ?? 0) > 0 ? "found" : "missing");
    }
    check();
    return () => {
      active = false;
    };
  }, [page]);

  if (state === "loading") {
    return (
      <Layout>
        <div className="flex items-center justify-center gap-2 py-20 text-xs text-ink-mute">
          <Loader2 className="h-4 w-4 animate-spin" />
          {getValue("custom.loading")}
        </div>
      </Layout>
    );
  }

  if (state === "missing") {
    return (
      <Layout>
        <PageHeader
          title={getValue("custom.not_found_title")}
          subtitle={getValue("custom.not_found_subtitle")}
        />
        <div className="flex flex-col items-center gap-3 py-16 text-ink-mute">
          <FileQuestion className="h-10 w-10" strokeWidth={1.4} />
          <p className="text-xs">{getValue("custom.not_found_desc")}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <PageHeader title={getValue(`page.${page}.title`) || page} subtitle="" showBack={false} />
      <PageBlocks pageName={page ?? ""} blocks={{}} />
    </Layout>
  );
}
