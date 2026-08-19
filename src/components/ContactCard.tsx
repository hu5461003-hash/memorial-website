import { MessageCircle, Mail, Phone, Copy, Check, User } from "lucide-react";
import { useState } from "react";
import { useAdminProfiles } from "@/hooks/useAdmin";
import { getAdminAvatar } from "@/lib/types";
import type { AdminProfile } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * 首页联系方式卡片区域。
 * v2 改为展示所有管理员（最多两位）的独立卡片 —— 数据来自 admin_profiles 表。
 * 如果某管理员的所有联系方式项都为空，就不展示他那张。
 */
export default function ContactCard() {
  const { profiles, loading } = useAdminProfiles(null);
  const [copiedUid, setCopiedUid] = useState<string | null>(null);

  if (loading) return null;

  const valid = profiles.filter((p) => hasAny(p));
  if (valid.length === 0) return null;

  return (
    <section className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
      {valid.map((p) => (
        <SingleCard
          key={p.admin_uid}
          profile={p}
          copied={copiedUid === p.admin_uid}
          onCopy={() => {
            const lines = buildItems(p).map((i) => `${i.label}：${i.value}`);
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

function buildItems(p: AdminProfile) {
  const items: { label: string; value: string; href?: string; Icon: typeof Mail }[] = [];
  if (p.qq?.trim()) items.push({ label: "QQ", value: p.qq.trim(), Icon: MessageCircle });
  if (p.wechat?.trim()) items.push({ label: "微信", value: p.wechat.trim(), Icon: MessageCircle });
  if (p.phone?.trim()) items.push({ label: "电话", value: p.phone.trim(), href: `tel:${p.phone.trim()}`, Icon: Phone });
  if (p.email_display?.trim())
    items.push({ label: "邮箱", value: p.email_display.trim(), href: `mailto:${p.email_display.trim()}`, Icon: Mail });
  return items;
}

function SingleCard({
  profile,
  copied,
  onCopy,
  primary,
}: {
  profile: AdminProfile;
  copied: boolean;
  onCopy: () => void;
  primary: boolean;
}) {
  const avatar = getAdminAvatar(profile);
  const nickname = profile.nickname?.trim() || "管理员";
  const items = buildItems(profile);
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
          <p className="text-[10px] text-ink-mute">联系方式</p>
        </div>
        <button
          type="button"
          onClick={onCopy}
          aria-label="复制"
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
        {items.length === 0 && (
          <p className="py-2 text-center text-[11px] text-ink-mute">该管理员暂无联系方式</p>
        )}
      </div>
      {copied && (
        <p className="mt-2 text-center text-[10px] text-emerald-600">已复制联系方式</p>
      )}
    </div>
  );
}
