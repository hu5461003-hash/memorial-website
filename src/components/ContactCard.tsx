import { MessageCircle, Mail, Phone, Copy, Check, User } from "lucide-react";
import { useState } from "react";
import { useAdminProfiles } from "@/hooks/useAdmin";
import { useContent } from "@/hooks/useContent";
import { getAdminAvatar, maskContactValue } from "@/lib/types";
import type { AdminProfile } from "@/lib/types";
import { cn } from "@/lib/utils";

/** 各联系方式项的显示标签（后台「内容」可改） */
type ContactLabels = { qq: string; wechat: string; phone: string; email: string };

/** 联系方式项：value 为真实值（复制用），display 为前台展示值（可能打码） */
type ContactItem = {
  label: string;
  value: string;
  display: string;
  href?: string;
  Icon: typeof Mail;
};

/**
 * 首页联系方式卡片区域。
 * v2 改为展示所有管理员（最多两位）的独立卡片 —— 数据来自 admin_profiles 表。
 * 如果某管理员的所有联系方式项都为空，就不展示他那张。
 */
export default function ContactCard() {
  const { profiles, loading } = useAdminProfiles(null);
  const { getValue } = useContent();
  const [copiedUid, setCopiedUid] = useState<string | null>(null);

  const labels: ContactLabels = {
    qq: getValue("home.contact_label_qq"),
    wechat: getValue("home.contact_label_wechat"),
    phone: getValue("home.contact_label_phone"),
    email: getValue("home.contact_label_email"),
  };

  if (loading) return null;

  const valid = profiles.filter((p) => hasAny(p));
  if (valid.length === 0) return null;

  return (
    <section className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
      {valid.map((p) => (
        <SingleCard
          key={p.admin_uid}
          profile={p}
          labels={labels}
          copied={copiedUid === p.admin_uid}
          onCopy={() => {
            const lines = buildItems(p, labels).map((i) => `${i.label}：${i.value}`);
            navigator.clipboard.writeText(lines.join("\n"));
            setCopiedUid(p.admin_uid);
            setTimeout(() => setCopiedUid(null), 2000);
          }}
          primary={valid.length === 1}
        />
      ))}
    </section>
  );
}

function hasAny(p: AdminProfile): boolean {
  return Boolean(
    p.nickname?.trim() ||
    p.qq?.trim() ||
    p.wechat?.trim() ||
    p.phone?.trim() ||
    p.email_display?.trim() ||
    p.avatar_url?.trim(),
  );
}

function buildItems(p: AdminProfile, L: ContactLabels): ContactItem[] {
  const items: ContactItem[] = [];
  const push = (
    label: string,
    value: string,
    masked: boolean | null | undefined,
    Icon: typeof Mail,
    href?: string,
  ) => {
    const v = value.trim();
    if (!v) return;
    // 打码时前台展示星号版本，且不再生成 tel:/mailto: 链接（打码链接无意义）
    items.push({
      label,
      value: v,
      display: masked ? maskContactValue(v) : v,
      href: masked ? undefined : href,
      Icon,
    });
  };
  push(L.qq, p.qq, p.qq_masked, MessageCircle);
  push(L.wechat, p.wechat, p.wechat_masked, MessageCircle);
  push(L.phone, p.phone, p.phone_masked, Phone, `tel:${p.phone.trim()}`);
  push(L.email, p.email_display, p.email_masked, Mail, `mailto:${p.email_display.trim()}`);
  return items;
}

function SingleCard({
  profile,
  labels,
  copied,
  onCopy,
  primary,
}: {
  profile: AdminProfile;
  labels: ContactLabels;
  copied: boolean;
  onCopy: () => void;
  primary: boolean;
}) {
  const { getValue } = useContent();
  const avatar = getAdminAvatar(profile);
  const nickname = profile.nickname?.trim() || getValue("home.contact_admin_fallback");
  const items = buildItems(profile, labels);
  return (
    <div
      className={cn(
        "rounded-card border border-coffee-line/70 bg-cream-200 p-4 shadow-paper animate-fade-up",
        !primary && "sm:h-full",
      )}
    >
      <div className="flex items-center gap-3">
        <div className="h-14 w-14 flex-none overflow-hidden rounded-full border-2 border-gold/30 bg-cream-50">
          {avatar ? (
            <img src={avatar} alt={nickname} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-ink-mute">
              <User className="h-6 w-6" strokeWidth={1.4} />
            </div>
          )}
        </div>
        <div className="flex-1">
          <p className="font-hand text-base text-ink">{nickname}</p>
          <p className="text-[10px] text-ink-mute">{getValue("home.contact_subtitle")}</p>
        </div>
        <button
          type="button"
          onClick={onCopy}
          aria-label={getValue("global.a11y_copy")}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-cream-50 text-ink-soft transition-colors hover:text-coffee"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-600" strokeWidth={1.8} />
          ) : (
            <Copy className="h-3.5 w-3.5" strokeWidth={1.8} />
          )}
        </button>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-1.5">
        {items.map(({ label, display, href, Icon }) => (
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
                {display}
              </a>
            ) : (
              <span className="ml-auto truncate font-mono text-xs tracking-wider text-ink-soft">
                {display}
              </span>
            )}
          </div>
        ))}
        {items.length === 0 && (
          <p className="py-2 text-center text-[11px] text-ink-mute">{getValue("home.contact_empty")}</p>
        )}
      </div>
      {copied && (
        <p className="mt-2 text-center text-[10px] text-emerald-600">{getValue("home.contact_copied")}</p>
      )}
    </div>
  );
}
