import { useEffect, useState } from "react";
import { Send, AlertCircle, CheckCircle2, Pin, MapPin } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import Layout from "@/components/Layout";
import Loading from "@/components/Loading";
import { supabase, supabaseReady } from "@/lib/supabase";
import { randomNoteColor, getMessageAvatar } from "@/lib/types";
import type { MessageNote, NoteColor } from "@/lib/types";
import { getMyIpInfo } from "@/lib/ipInfo";
import { useContent } from "@/hooks/useContent";
import { cn, extractProvince } from "@/lib/utils";
import PageBlocks from "@/components/PageBlocks";

const NOTE_BG: Record<NoteColor, string> = {
  yellow: "bg-note-yellow",
  pink: "bg-note-pink",
  blue: "bg-note-blue",
};

const NOTE_ROTATE = ["-rotate-2", "rotate-1", "-rotate-1", "rotate-2"];

function formatTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${d.getFullYear()}.${mm}.${dd} ${hh}:${mi}`;
}

/** 前台展示留言者 IP：真实 IP 完整显示；接口失败的 client- 兜底串不显示 */
function displayIp(ip: string | null | undefined): string {
  if (!ip) return "";
  if (ip.startsWith("client-")) return "";
  return ip;
}

/** 便签头像：有 QQ 用 QQ 头像，否则昵称首字 */
function NoteAvatar({ m }: { m: MessageNote }) {
  const { url, letter } = getMessageAvatar(m);
  return (
    <span className="flex h-7 w-7 flex-none items-center justify-center overflow-hidden rounded-full border border-ink/10 bg-white/70 text-[11px] font-semibold text-ink-soft shadow-sm">
      {url ? (
        <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" />
      ) : (
        letter
      )}
    </span>
  );
}

export default function Messages() {
  const { getValue } = useContent();
  const [messages, setMessages] = useState<MessageNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [nickname, setNickname] = useState("");
  const [qq, setQq] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [hint, setHint] = useState<{ type: "ok" | "err"; text: string } | null>(
    null,
  );

  const subtitle =
    messages.length > 0
      ? getValue("messages.count").replace("{n}", String(messages.length))
      : getValue("messages.subtitle");

  async function load() {
    setLoading(true);
    if (!supabaseReady || !supabase) {
      setMessages([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    setMessages((data as MessageNote[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  // 3 秒后清空提示
  useEffect(() => {
    if (!hint) return;
    const t = setTimeout(() => setHint(null), 3000);
    return () => clearTimeout(t);
  }, [hint]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = content.trim();
    if (!text) {
      setHint({ type: "err", text: getValue("messages.hint_empty") });
      return;
    }
    if (!supabaseReady || !supabase) {
      setHint({
        type: "err",
        text: getValue("messages.hint_no_supabase"),
      });
      return;
    }
    setSubmitting(true);
    // 记录留言者真实 IP 与归属地（后台可见，前台展示 IP）
    const ipInfo = await getMyIpInfo();
    const color = randomNoteColor();
    const { error } = await supabase.from("messages").insert({
      nickname: nickname.trim() || getValue("messages.anonymous_name"),
      content: text,
      color,
      qq: qq.trim() || null,
      ip_address: ipInfo.ip,
      ip_location: ipInfo.ipLocation,
    });
    setSubmitting(false);
    if (error) {
      setHint({ type: "err", text: getValue("messages.hint_failed") });
      return;
    }
    setHint({ type: "ok", text: getValue("messages.hint_ok") });
    setContent("");
    setNickname("");
    setQq("");
    load();
  }

  return (
    <Layout>
      <PageHeader
        title={getValue("messages.title")}
        subtitle={subtitle}
        showBack={false}
      />

      <PageBlocks
        pageName="messages"
        blocks={{
          message_form: (
            <form
              onSubmit={handleSubmit}
              className="mb-6 rounded-card border border-coffee-line/70 bg-cream-200 p-4 shadow-paper"
            >
              <label className="field-label block">{getValue("messages.form_nickname_label")}</label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder={getValue("messages.form_nickname_placeholder")}
                maxLength={20}
                className="input-line"
              />
              <label className="field-label mt-3 block">{getValue("messages.form_qq_label")}</label>
              <input
                type="text"
                inputMode="numeric"
                value={qq}
                onChange={(e) => setQq(e.target.value.replace(/\D/g, "").slice(0, 12))}
                placeholder={getValue("messages.form_qq_placeholder")}
                maxLength={12}
                className="input-line"
              />
              <label className="field-label mt-3 block">{getValue("messages.form_content_label")}</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={getValue("messages.form_content_placeholder")}
                maxLength={200}
                rows={3}
                className="mt-1 w-full resize-none rounded-soft border border-coffee-line/70 bg-cream-50/60 px-3 py-2 text-sm text-ink placeholder:text-ink-mute focus:border-gold focus:outline-none"
              />
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-[11px] text-ink-mute">
                  {content.length}/200
                </span>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-gold"
                >
                  <Send className="h-3.5 w-3.5" strokeWidth={1.8} />
                  {submitting ? getValue("messages.submitting") : getValue("messages.submit")}
                </button>
              </div>
              {hint && (
                <div
                  className={cn(
                    "mt-3 flex items-center gap-1.5 rounded-soft px-3 py-2 text-xs",
                    hint.type === "ok"
                      ? "bg-gold/15 text-coffee"
                      : "bg-rust/10 text-rust",
                  )}
                >
                  {hint.type === "ok" ? (
                    <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5" strokeWidth={1.8} />
                  )}
                  {hint.text}
                </div>
              )}
            </form>
          ),

          notes_wall: loading ? (
            <Loading tip={getValue("messages.loading")} />
          ) : messages.length === 0 ? (
            <div className="rounded-card border border-dashed border-coffee-line/70 bg-cream-200/40 py-12 text-center">
              <p className="font-hand text-base text-ink-soft">
                {getValue("messages.empty_title")}
              </p>
              <p className="mt-1 text-xs text-ink-mute">
                {getValue("messages.empty_desc")}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {messages.map((m, idx) => {
                const ip = displayIp(m.ip_address);
                const province = extractProvince(m.ip_location);
                const isAdmin = Boolean(m.is_admin);
                return (
                  <div
                    key={m.id}
                    className={cn(
                      "relative break-inside-avoid rounded-card p-3.5 shadow-note transition-all",
                      NOTE_BG[m.color],
                      NOTE_ROTATE[idx % NOTE_ROTATE.length],
                      isAdmin && "ring-2 ring-gold ring-offset-1 ring-offset-transparent",
                    )}
                    style={isAdmin ? { borderWidth: "3px", borderStyle: "solid", borderColor: "rgba(212,175,55,0.6)" } : undefined}
                  >
                    {isAdmin && (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-gold px-2 py-0.5 text-[9px] font-bold text-white shadow-sm">
                        管理员
                      </span>
                    )}
                    <Pin
                      className="mx-auto mb-1.5 h-3.5 w-3.5 text-coffee/50"
                      strokeWidth={1.6}
                    />
                    <p className="whitespace-pre-wrap font-hand text-[14px] leading-relaxed text-ink">
                      {m.content}
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <NoteAvatar m={m} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-hand text-xs text-ink-soft">
                          — {m.nickname}
                        </p>
                        {(ip || province) && (
                          <p className="flex flex-wrap items-center gap-x-1.5 text-[10px] leading-tight text-ink-mute">
                            {province && (
                              <span className="inline-flex items-center gap-0.5">
                                <MapPin className="h-2.5 w-2.5" strokeWidth={1.8} />
                                {province}
                              </span>
                            )}
                            {ip && <span className="font-mono">IP {ip}</span>}
                          </p>
                        )}
                      </div>
                      <span className="flex-none text-[10px] text-ink-mute">
                        {formatTime(m.created_at)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ),
        }}
      />
    </Layout>
  );
}
