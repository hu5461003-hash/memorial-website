import { MessageCircle, Mail, Phone, Link2, Copy, Check } from "lucide-react";
import { useState } from "react";
import { useSiteMeta } from "@/hooks/useSiteMeta";
import { getAdminAvatar } from "@/lib/types";

/**
 * 管理员联系方式卡片（首页展示）
 * - 头像：优先自定义上传，否则使用 QQ 头像
 * - 若全部联系方式为空，则不渲染整张卡片
 */
export default function ContactCard() {
  const { meta, loading } = useSiteMeta();
  const [copied, setCopied] = useState(false);

  if (loading) return null;

  const avatarUrl = getAdminAvatar(meta);
  const nickname = meta.admin_nickname || "管理员";
  const qq = meta.admin_qq?.trim();
  const wechat = meta.admin_wechat?.trim();
  const phone = meta.admin_phone?.trim();
  const email = meta.admin_email?.trim();

  // 全部为空就不显示卡片
  if (!qq && !wechat && !phone && !email && !avatarUrl) return null;

  const items: { label: string; value: string; href?: string; Icon: typeof Mail }[] = [];
  if (qq) items.push({ label: "QQ", value: qq, Icon: MessageCircle });
  if (wechat) items.push({ label: "微信", value: wechat, Icon: MessageCircle });
  if (phone) items.push({ label: "电话", value: phone, href: `tel:${phone}`, Icon: Phone });
  if (email)
    items.push({ label: "邮箱", value: email, href: `mailto:${email}`, Icon: Mail });

  function copyAll() {
    const parts = items.map((i) => `${i.label}：${i.value}`);
    navigator.clipboard.writeText(parts.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="mt-6 rounded-card border border-coffee-line/70 bg-cream-200 p-4 shadow-paper animate-fade-up">
      <div className="flex items-center gap-3">
        {/* 头像 */}
        <div className="h-14 w-14 flex-none overflow-hidden rounded-full border-2 border-gold/30 bg-cream-50">
          {avatarUrl ? (
            <img src={avatarUrl} alt={nickname} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[10px] text-ink-mute">
              无
            </div>
          )}
        </div>
        {/* 昵称 */}
        <div className="flex-1">
          <p className="font-hand text-base text-ink">{nickname}</p>
          <p className="text-[10px] text-ink-mute">联系方式</p>
        </div>
        <button
          type="button"
          onClick={copyAll}
          aria-label="复制联系方式"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-cream-50 text-ink-soft transition-colors hover:text-coffee"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-600" strokeWidth={1.8} />
          ) : (
            <Copy className="h-3.5 w-3.5" strokeWidth={1.8} />
          )}
        </button>
      </div>

      {/* 联系项列表 */}
      <div className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {items.map(({ label, value, href, Icon }) => (
          <div
            key={label}
            className="flex items-center gap-2 rounded-soft bg-cream-50/60 px-2.5 py-1.5"
          >
            <Icon className="h-3.5 w-3.5 flex-none text-gold" strokeWidth={1.8} />
            <span className="text-[10px] text-ink-mute">{label}</span>
            {href ? (
              <a
                href={href}
                className="ml-auto truncate text-xs text-ink-soft hover:text-coffee"
              >
                {value}
              </a>
            ) : (
              <span className="ml-auto truncate text-xs text-ink-soft">{value}</span>
            )}
          </div>
        ))}
      </div>

      {copied && (
        <p className="mt-2 text-center text-[10px] text-emerald-600">已复制全部联系方式</p>
      )}
    </section>
  );
}
