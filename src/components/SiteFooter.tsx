import { useContent } from "@/hooks/useContent";
import { useSocialLinks } from "@/hooks/useGlobalLinks";
import SocialIcon from "@/components/icons/SocialIcons";

/**
 * 全局页脚：署名文字 + 社媒图标
 * - 文字在后台「内容 · global.footer_text」修改（留空则不显示）
 * - 社媒图标来自 social_links 表，后台「排版 · 页脚社媒」增删改排序
 * - 显隐由后台「排版 · 全局」的页脚区块控制
 */
export default function SiteFooter() {
  const { getValue } = useContent();
  const { rows } = useSocialLinks();
  const text = getValue("global.footer_text");
  const socials = rows.filter((r) => r.active && r.url);

  if (!text && socials.length === 0) return null;

  return (
    <footer className="mt-6 space-y-3 text-center">
      {socials.length > 0 && (
        <nav className="flex flex-wrap items-center justify-center gap-1">
          {socials.map((s) => (
            <a
              key={s.id}
              href={s.url}
              target="_blank"
              rel="noreferrer"
              title={s.label}
              aria-label={s.label}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-mute/80 transition-colors hover:bg-black/5 hover:text-ink"
            >
              {s.icon_url ? (
                <img src={s.icon_url} alt={s.label} className="h-5 w-5 object-contain" />
              ) : (
                <SocialIcon icon={s.icon} size={19} />
              )}
            </a>
          ))}
        </nav>
      )}
      {text && (
        <p className="whitespace-pre-line text-center text-[11px] leading-relaxed tracking-widest text-ink-mute/70">
          {text}
        </p>
      )}
    </footer>
  );
}
