import { Link } from "react-router-dom";
import { useContent } from "@/hooks/useContent";
import { useSocialLinks, useNavLinks } from "@/hooks/useGlobalLinks";
import SocialIcon from "@/components/icons/SocialIcons";

/**
 * 全局页脚：关于我们 + 快速链接 + 社媒图标 + 版权/备案
 * - 文字在后台「内容 · global」修改
 * - 社媒图标来自 social_links 表
 * - 快速链接来自 nav_links 表中 group_name 包含"页脚"的项，或显示默认页面链接
 * - 显隐由后台「排版 · 全局」的页脚区块控制
 */
export default function SiteFooter() {
  const { getValue } = useContent();
  const { rows: socials } = useSocialLinks();
  const { rows: navLinks } = useNavLinks();
  const footerText = getValue("global.footer_text");
  const aboutText = getValue("global.footer_about");
  const copyright = getValue("global.footer_copyright");
  const icp = getValue("global.footer_icp");
  const icpUrl = getValue("global.footer_icp_url") || "https://beian.miit.gov.cn";
  const quickLinksTitle = getValue("global.footer_quick_links_title");
  const showQuickLinks = getValue("global.footer_show_quick_links") !== "0";

  const activeSocials = socials.filter((r) => r.active && r.url);

  // 快速链接：优先用 nav_links 中分组为"页脚"的，否则用默认页面
  const footerNavLinks = navLinks.filter(
    (n) => n.active && (n.group_name?.includes("页脚") || n.group_name?.includes("footer")),
  );
  const defaultQuickLinks = [
    { label: getValue("global.nav_home") || "首页", url: "/" },
    { label: getValue("global.nav_map") || "足迹", url: "/map" },
    { label: getValue("global.nav_blog") || "博客", url: "/blog" },
    { label: getValue("global.nav_messages") || "留言", url: "/messages" },
    { label: getValue("global.nav_gallery") || "相册", url: "/gallery" },
  ];
  const quickLinks = footerNavLinks.length > 0
    ? footerNavLinks.map((n) => ({ label: n.label, url: n.url }))
    : defaultQuickLinks;

  // 默认版权信息
  const defaultCopyright = `© ${new Date().getFullYear()} ${getValue("global.site_title") || "Zap"}. All rights reserved.`;
  const finalCopyright = copyright || defaultCopyright;

  // 如果什么都没有，不渲染
  if (!footerText && !aboutText && activeSocials.length === 0 && !icp && !showQuickLinks) {
    return null;
  }

  return (
    <footer className="mt-8 border-t border-cream-300 bg-cream-100/50 px-4 py-6">
      <div className="mx-auto max-w-[470px] space-y-5 md:max-w-[760px]">
        {/* 上半部分：关于我们 + 快速链接 */}
        {(aboutText || showQuickLinks) && (
          <div className="grid gap-5 sm:grid-cols-2">
            {/* 关于我们 */}
            {aboutText && (
              <div>
                <h4 className="mb-2 text-xs font-semibold text-ink">关于本站</h4>
                <p className="whitespace-pre-line text-[11px] leading-relaxed text-ink-soft">
                  {aboutText}
                </p>
              </div>
            )}

            {/* 快速链接 */}
            {showQuickLinks && (
              <div>
                <h4 className="mb-2 text-xs font-semibold text-ink">{quickLinksTitle || "快速导航"}</h4>
                <div className="flex flex-wrap gap-x-3 gap-y-1.5">
                  {quickLinks.map((link, idx) => {
                    const isExternal = link.url.startsWith("http");
                    return isExternal ? (
                      <a
                        key={idx}
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-ink-soft transition-colors hover:text-gold hover:underline"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        key={idx}
                        to={link.url}
                        className="text-[11px] text-ink-soft transition-colors hover:text-gold hover:underline"
                      >
                        {link.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 社媒图标 */}
        {activeSocials.length > 0 && (
          <nav className="flex flex-wrap items-center justify-center gap-1">
            {activeSocials.map((s) => (
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

        {/* 页脚文字 */}
        {footerText && (
          <p className="whitespace-pre-line text-center text-[11px] leading-relaxed tracking-widest text-ink-mute/70">
            {footerText}
          </p>
        )}

        {/* 版权 + 备案 */}
        <div className="flex flex-col items-center gap-1 text-center">
          <p className="text-[10px] text-ink-mute/60">
            {finalCopyright}
          </p>
          {icp && (
            <a
              href={icpUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[10px] text-ink-mute/50 transition-colors hover:text-ink-mute hover:underline"
            >
              {icp}
            </a>
          )}
        </div>
      </div>
    </footer>
  );
}
