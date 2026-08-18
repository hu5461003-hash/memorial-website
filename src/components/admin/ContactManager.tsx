import { useState, useEffect } from "react";
import { Loader2, Save, User, Upload, Link2, Check } from "lucide-react";
import { useSiteMeta } from "@/hooks/useSiteMeta";
import { getAdminAvatar } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const FIELDS: { key: string; label: string; desc: string; placeholder: string }[] = [
  { key: "admin_nickname", label: "昵称", desc: "首页联系方式卡片中显示的称呼", placeholder: "如：皮希平" },
  { key: "admin_qq", label: "QQ 号", desc: "未上传自定义头像时，将自动使用该 QQ 的头像", placeholder: "如：10001" },
  { key: "admin_wechat", label: "微信号", desc: "可选，留空则不显示", placeholder: "如：wechat_id" },
  { key: "admin_phone", label: "电话", desc: "可选，留空则不显示", placeholder: "如：13800138000" },
  { key: "admin_email", label: "邮箱", desc: "可选，留空则不显示", placeholder: "如：admin@example.com" },
  { key: "admin_avatar_url", label: "自定义头像 URL", desc: "上传图片后会自动填入；为空时使用 QQ 头像", placeholder: "https://..." },
];

export default function ContactManager() {
  const { meta, loading, saveAll } = useSiteMeta();
  const [form, setForm] = useState<Record<string, string>>(meta);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!loading) setForm(meta);
  }, [meta, loading]);

  function update(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleUpload(file: File | null) {
    if (!file || !supabase) return;
    setUploading(true);
    setHint(null);
    const ext = file.name.split(".").pop() || "png";
    const path = `avatars/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
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
    update("admin_avatar_url", pub.publicUrl);
    setHint("头像已上传，记得点保存");
  }

  async function handleSave() {
    setBusy(true);
    setHint(null);
    const ok = await saveAll(form);
    setBusy(false);
    setHint(ok ? "联系方式已保存" : "保存失败");
  }

  function copyContact() {
    const parts: string[] = [];
    if (form.admin_nickname) parts.push(`昵称：${form.admin_nickname}`);
    if (form.admin_qq) parts.push(`QQ：${form.admin_qq}`);
    if (form.admin_wechat) parts.push(`微信：${form.admin_wechat}`);
    if (form.admin_phone) parts.push(`电话：${form.admin_phone}`);
    if (form.admin_email) parts.push(`邮箱：${form.admin_email}`);
    navigator.clipboard.writeText(parts.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-gold" strokeWidth={1.6} />
      </div>
    );
  }

  const avatarUrl = getAdminAvatar(form);

  return (
    <div className="space-y-5">
      {/* 头像预览 */}
      <div className="rounded-card border border-coffee-line/70 bg-cream-200 p-4 shadow-paper">
        <h3 className="mb-3 flex items-center gap-1.5 font-hand text-base text-ink">
          <User className="h-4 w-4 text-gold" strokeWidth={1.8} />
          头像预览
        </h3>
        <div className="flex items-center gap-4">
          <div className="relative h-16 w-16 flex-none overflow-hidden rounded-full border border-coffee-line/70 bg-cream-50">
            {avatarUrl ? (
              <img src={avatarUrl} alt="头像" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[10px] text-ink-mute">
                无
              </div>
            )}
          </div>
          <div className="flex-1">
            <p className="text-xs text-ink-soft">
              {form.admin_avatar_url ? "使用自定义头像" : form.admin_qq ? "使用 QQ 头像" : "未设置"}
            </p>
            <p className="mt-1 text-[10px] leading-relaxed text-ink-mute">
              头像来源优先级：自定义头像 &gt; QQ 头像
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
          联系方式
        </h3>
        <div className="space-y-3">
          {FIELDS.map(({ key, label, desc, placeholder }) => (
            <div key={key}>
              <label className="field-label">{label}</label>
              <input
                value={form[key] ?? ""}
                onChange={(e) => update(key, e.target.value)}
                placeholder={placeholder}
                className="input-line"
              />
              <p className="mt-0.5 text-[10px] text-ink-mute">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 复制全部 */}
      <button
        type="button"
        onClick={copyContact}
        className="btn-ghost w-full"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-emerald-600" strokeWidth={1.8} />
        ) : (
          <Link2 className="h-3.5 w-3.5" strokeWidth={1.8} />
        )}
        {copied ? "已复制联系方式" : "复制全部联系方式"}
      </button>

      {hint && <p className="text-xs text-coffee">{hint}</p>}

      <button
        type="button"
        onClick={handleSave}
        disabled={busy}
        className="btn-gold w-full"
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.8} />
        ) : (
          <Save className="h-3.5 w-3.5" strokeWidth={1.8} />
        )}
        保存联系方式
      </button>
    </div>
  );
}
