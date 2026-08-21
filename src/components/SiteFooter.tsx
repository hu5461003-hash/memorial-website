import { useContent } from "@/hooks/useContent";

/**
 * 全局页脚：每页底部居中的署名文字
 * - 文字在后台「内容 · global.footer_text」修改（留空则不显示）
 * - 显隐由后台「排版 · 全局」的页脚区块控制
 */
export default function SiteFooter() {
  const { getValue } = useContent();
  const text = getValue("global.footer_text");
  if (!text) return null;

  return (
    <p className="mt-6 whitespace-pre-line text-center text-[11px] leading-relaxed tracking-widest text-ink-mute/70">
      {text}
    </p>
  );
}
