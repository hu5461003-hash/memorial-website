import { useEffect, useState } from "react";
import { Send, AlertCircle, CheckCircle2, Pin } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import Layout from "@/components/Layout";
import Loading from "@/components/Loading";
import { supabase, supabaseReady } from "@/lib/supabase";
import { randomNoteColor } from "@/lib/types";
import type { MessageNote, NoteColor } from "@/lib/types";
import { useContent } from "@/hooks/useContent";
import { cn } from "@/lib/utils";

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

export default function Messages() {
  const { getValue } = useContent();
  const [messages, setMessages] = useState<MessageNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [nickname, setNickname] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [hint, setHint] = useState<{ type: "ok" | "err"; text: string } | null>(
    null,
  );

  const subtitle =
    messages.length > 0
      ? `已有 ${messages.length} 张便签`
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
      setHint({ type: "err", text: "留言内容不能为空" });
      return;
    }
    if (!supabaseReady || !supabase) {
      setHint({
        type: "err",
        text: "Supabase 未配置，留言暂无法保存",
      });
      return;
    }
    setSubmitting(true);
    const color = randomNoteColor();
    const { error } = await supabase.from("messages").insert({
      nickname: nickname.trim() || "一位访客",
      content: text,
      color,
    });
    setSubmitting(false);
    if (error) {
      setHint({ type: "err", text: "留言失败，请稍后再试" });
      return;
    }
    setHint({ type: "ok", text: "留言已留下，谢谢你的温暖" });
    setContent("");
    setNickname("");
    load();
  }

  return (
    <Layout>
      <PageHeader
        title="温暖留言"
        subtitle={subtitle}
        showBack={false}
      />

      {/* 留言表单 */}
      <form
        onSubmit={handleSubmit}
        className="mb-6 rounded-card border border-coffee-line/70 bg-cream-200 p-4 shadow-paper"
      >
        <label className="field-label block">昵称（可不填）</label>
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="一位访客"
          maxLength={20}
          className="input-line"
        />
        <label className="field-label mt-3 block">留言</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="写下你想说的一句话…"
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
            {submitting ? "发送中…" : "留下便签"}
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

      {/* 便签瀑布流 */}
      {loading ? (
        <Loading tip="正在收集便签…" />
      ) : messages.length === 0 ? (
        <div className="rounded-card border border-dashed border-coffee-line/70 bg-cream-200/40 py-12 text-center">
          <p className="font-hand text-base text-ink-soft">
            这里还没有便签
          </p>
          <p className="mt-1 text-xs text-ink-mute">
            成为第一个留下温暖的人吧
          </p>
        </div>
      ) : (
        <div className="columns-2 gap-3 [column-fill:balance]">
          {messages.map((m, idx) => (
            <div
              key={m.id}
              className={cn(
                "mb-3 inline-block w-full break-inside-avoid rounded-card p-3.5 shadow-note",
                NOTE_BG[m.color],
                NOTE_ROTATE[idx % NOTE_ROTATE.length],
              )}
            >
              <Pin
                className="mx-auto mb-1.5 h-3.5 w-3.5 text-coffee/50"
                strokeWidth={1.6}
              />
              <p className="whitespace-pre-wrap font-hand text-[14px] leading-relaxed text-ink">
                {m.content}
              </p>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="font-hand text-xs text-ink-soft">
                  — {m.nickname}
                </span>
                <span className="text-[10px] text-ink-mute">
                  {formatTime(m.created_at)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
