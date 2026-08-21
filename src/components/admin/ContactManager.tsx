import { useEffect, useState } from "react";
import { Loader2, Save, User, Upload, Check, EyeOff } from "lucide-react";
import { useStore } from "@/store/useStore";
import { supabase } from "@/lib/supabase";
import { useAdminProfiles } from "@/hooks/useAdmin";
import { getAdminAvatar, maskContactValue } from "@/lib/types";
import type { AdminProfile } from "@/lib/types";

type FieldKey = "nickname" | "qq" | "wechat" | "phone" | "email_display" | "avatar_url";
type MaskKey = "qq" | "wechat" | "phone" | "email_display";

const FIELDS: { key: FieldKey; label: string; desc: string; placeholder: string; maskable?: boolean }[] = [
  { key: "nickname",       label: "昵称",     desc: "首页联系方式卡片中显示的称呼",                 placeholder: "如：P" },
  { key: "qq",             label: "QQ 号",    desc: "未上传自定义头像时，自动使用该 QQ 的头像",     placeholder: "如：10001", maskable: true },
  { key: "wechat",         label: "微信号",   desc: "可选，留空则不显示",                           placeholder: "如：wechat_id", maskable: true },
  { key: "phone",          label: "电话",     desc: "可选，留空则不显示",                           placeholder: "如：13800138000", maskable: true },
  { key: "email_display",  label: "邮箱",     desc: "可选，留空则不显示",                           placeholder: "如：admin@example.com", maskable: true },
  { key: "avatar_url",     label: "自定义头像 URL", desc: "上传图片后自动填入；为空使用 QQ 头像",   placeholder: "https://..." },
];

/**
 * 联系方式管理（后台）。
 * 每位管理员只能编辑自己那行 admin_profiles —— 与另一位管理员完全独立。
 * 通过 RLS (admin_uid = auth.uid()) 做数据库级硬限制，前端无法越界写入。
 */
export default function ContactManager() {
  const { session } = useStore();
  const uid = session?.user?.id ?? null;
  const email = session?.user?.email ?? "";
  const { mine, loading, saveMine } = useAdminProfiles(uid);

  const [form, setForm] = useState<Record<FieldKey, string>>({
    nickname: "", qq: "", wechat: "", phone: "", email_display: "", avatar_url: "",
  });
  const [masks, setMasks] = useState<Record<MaskKey, boolean>>({
    qq: false, wechat: false, phone: false, email_display: false,
  });
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (mine) {
      setForm({
        nickname: mine.nickname ?? "",
        qq: mine.qq ?? "",
        wechat: mine.wechat ?? "",
        phone: mine.phone ?? "",
        email_display: mine.email_display ?? "",
        avatar_url: mine.avatar_url ?? "",
      });
      setMasks({
        qq: Boolean(mine.qq_masked),
        wechat: Boolean(mine.wechat_masked),
        phone: Boolean(mine.phone_masked),
        email_display: Boolean(mine.email_masked),
      });
    }
  }, [mine]);

  function update(k: FieldKey, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleUpload(file: File | null) {
    if (!file || !supabase || !uid) return;
    setUploading(true);
    setHint(null);
    const ext = file.name.split(".").pop() || "png";
    const path = `avatars/${uid}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("media")
      .upload(path, file, { cacheControl: "3600", upsert: false });
    if (upErr) {
      setUploading(false);
      setHint(`头像上传失败：${upErr.message}`);
      return;
    }
    const { data: pub } = supabase.storage.from("media").getPublicUrl(path);
    setUploading(false);
    update("avatar_url", pub.publicUrl);
    setHint("头像已上传，记得点保存");
  }

  async function handleSave() {
    if (!uid) return;
    setBusy(true);
    setHint(null);
    setSaved(false);
    const patch: Partial<AdminProfile> = {
      ...form,
      qq_masked: masks.qq,
      wechat_masked: masks.wechat,
      phone_masked: masks.phone,
      email_masked: masks.email_display,
    };
    const ok = await saveMine(patch);
    setBusy(false);
    if (ok) {
      setSaved(true);
      setHint("✓ 已保存（仅影响您自己的联系方式）");
      setTimeout(() => setSaved(false), 2000);
    } else {
      setHint("保存失败，请稍后重试");
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-gold" strokeWidth={1.6} />
      </div>
    );
  }

  const avatarUrl = getAdminAvatar(form as Partial<AdminProfile>);

  return (
    <div className="space-y-5">
      {/* 当前登录账号提示 */}
      <div className="rounded-card border border-coffee-line/70 bg-cream-200 p-3.5 shadow-paper">
        <p className="flex items-center gap-1.5 text-[11px] text-ink-soft">
          <User className="h-3.5 w-3.5 text-gold" strokeWidth={1.8} />
          当前登录账号：<span className="font-semibold text-ink">{email || "未识别"}</span>
          <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] text-emerald-700">
            仅编辑自己的联系方式
          </span>
        </p>
      </div>

      {/* 头像预览 */}
      <div className="rounded-card border border-coffee-line/70 bg-cream-200 p-4 shadow-paper">
        <h3 className="mb-3 flex items-center gap-1.5 font-hand text-base text-ink">
          <User className="h-4 w-4 text-gold" strokeWidth={1.8} />
          头像预览
        </h3>
        <div className="flex items-center gap-4">
          <div className="relative h-16 w-16 flex-none overflow-hidden rounded-full border-2 border-gold/30 bg-cream-50">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[10px] text-ink-mute">
                无
              </div>
            )}
          </div>
          <div className="flex-1">
            <p className="text-xs text-ink-soft">
              {form.avatar_url ? "使用自定义头像" : form.qq ? "使用 QQ 头像" : "未设置"}
            </p>
            <p className="mt-1 text-[10px] leading-relaxed text-ink-mute">
              优先级：自定义头像 &gt; QQ 头像
            </p>
            <label className="mt-2 inline-flex cursor-pointer items-center gap-1 rounded-soft border border-coffee-line/70 bg-cream-50 px-2.5 py-1 text-[11px] text-ink-soft transition-colors hover:border-gold/50 hover:text-coffee">
              {uploading ? (
                <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.8} />
              ) : (
                <Upload className="h-3 w-3" strokeWidth={1.8} />
              )}
              上传自定义头像
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleUpload(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
        </div>
      </div>

      {/* 联系方式表单 */}
      <div className="rounded-card border border-coffee-line/70 bg-cream-200 p-4 shadow-paper">
        <h3 className="mb-3 flex items-center gap-1.5 font-hand text-base text-ink">
          <User className="h-4 w-4 text-gold" strokeWidth={1.8} />
          我的联系方式
        </h3>
        <div className="space-y-3">
          {FIELDS.map(({ key, label, desc, placeholder, maskable }) => (
            <div key={key}>
              <div className="flex items-center justify-between">
                <label className="field-label">{label}</label>
                {maskable && (
                  <label className="flex cursor-pointer items-center gap-1.5 text-[10px] text-ink-soft">
                    <input
                      type="checkbox"
                      checked={masks[key as MaskKey]}
                      onChange={(e) =>
                        setMasks((m) => ({ ...m, [key]: e.target.checked }))
                      }
                      className="h-3.5 w-3.5 accent-gold"
                    />
                    <EyeOff className="h-3 w-3" strokeWidth={1.8} />
                    前台加星号隐藏中间
                  </label>
                )}
              </div>
              <input
                value={form[key]}
                onChange={(e) => update(key, e.target.value)}
                placeholder={placeholder}
                className="input-line"
              />
              <p className="mt-0.5 text-[10px] text-ink-mute">
                {maskable && masks[key as MaskKey] && form[key].trim()
                  ? `前台显示：${maskContactValue(form[key])}`
                  : desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {hint && <p className={`text-xs ${saved ? "text-emerald-600" : "text-coffee"}`}>{hint}</p>}

      <button
        type="button"
        onClick={handleSave}
        disabled={busy || !uid}
        className="btn-gold w-full"
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.8} />
        ) : saved ? (
          <Check className="h-3.5 w-3.5" strokeWidth={1.8} />
        ) : (
          <Save className="h-3.5 w-3.5" strokeWidth={1.8} />
        )}
        保存我的联系方式
      </button>
    </div>
  );
}
