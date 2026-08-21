import { useEffect, useState } from "react";
import {
  Trash2,
  Plus,
  Loader2,
  StickyNote,
  Pencil,
  Check,
  X,
  Save,
  MapPin,
  Globe,
  UserRound,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { MessageNote, NoteColor } from "@/lib/types";
import { NOTE_COLORS, getMessageAvatar } from "@/lib/types";
import { cn } from "@/lib/utils";

const NOTE_BG: Record<NoteColor, string> = {
  yellow: "bg-note-yellow",
  pink: "bg-note-pink",
  blue: "bg-note-blue",
};

const COLOR_LABEL: Record<NoteColor, string> = {
  yellow: "黄",
  pink: "粉",
  blue: "蓝",
};

function formatTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${d.getFullYear()}.${mm}.${dd} ${hh}:${mi}`;
}

/**
 * 留言管理：查看 / 新增 / 编辑 / 删除访客便签（messages 表）
 */
export default function MessageManager() {
  const [list, setList] = useState<MessageNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  /** 编辑态 */
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNickname, setEditNickname] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editColor, setEditColor] = useState<NoteColor>("yellow");
  /** 新增表单 */
  const [showForm, setShowForm] = useState(false);
  const [newNickname, setNewNickname] = useState("管理员");
  const [newContent, setNewContent] = useState("");
  const [newColor, setNewColor] = useState<NoteColor>("yellow");

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    setList((data as MessageNote[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  /* ============ 新增 ============ */
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const content = newContent.trim();
    if (!content) {
      setHint("留言内容不能为空");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("messages").insert({
      nickname: newNickname.trim() || "管理员",
      content,
      color: newColor,
    });
    setBusy(false);
    if (error) {
      setHint(`发布失败：${error.message}`);
      return;
    }
    setHint("✓ 已发布，前台留言页可见");
    setNewContent("");
    setShowForm(false);
    load();
  }

  /* ============ 编辑 ============ */
  function startEdit(m: MessageNote) {
    setEditingId(m.id);
    setEditNickname(m.nickname);
    setEditContent(m.content);
    setEditColor(m.color);
  }

  async function saveEdit() {
    if (!editingId) return;
    const content = editContent.trim();
    if (!content) {
      setHint("留言内容不能为空");
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("messages")
      .update({
        nickname: editNickname.trim() || "一位访客",
        content,
        color: editColor,
      })
      .eq("id", editingId);
    setBusy(false);
    if (error) {
      setHint(`保存失败：${error.message}`);
      return;
    }
    setEditingId(null);
    setHint("✓ 已保存");
    load();
  }

  /* ============ 删除 ============ */
  async function handleDelete(m: MessageNote) {
    if (!confirm(`确认删除「${m.nickname}」的这条留言？`)) return;
    const { error } = await supabase.from("messages").delete().eq("id", m.id);
    if (error) setHint(`删除失败：${error.message}`);
    else setHint("✓ 已删除");
    load();
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-gold" strokeWidth={1.6} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* 新增留言 */}
      <div className="rounded-card border border-coffee-line/70 bg-cream-200 p-4 shadow-paper">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 font-hand text-base text-ink">
            <StickyNote className="h-4 w-4 text-gold" strokeWidth={1.8} />
            留言管理
            <span className="text-xs font-normal text-ink-mute">（共 {list.length} 条）</span>
          </h3>
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="btn-gold !px-3 !py-1.5 text-xs"
          >
            {showForm ? <X className="h-3.5 w-3.5" strokeWidth={1.8} /> : <Plus className="h-3.5 w-3.5" strokeWidth={1.8} />}
            {showForm ? "收起" : "发布留言"}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="mt-3 space-y-2.5 rounded-soft border border-coffee-line/50 bg-cream-50/60 p-3">
            <div className="flex items-center gap-2">
              <label className="field-label mb-0 flex-none">署名</label>
              <input
                value={newNickname}
                onChange={(e) => setNewNickname(e.target.value)}
                placeholder="如：管理员"
                className="input-line flex-1 !py-1.5 text-xs"
              />
            </div>
            <div>
              <label className="field-label">内容</label>
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                rows={3}
                placeholder="以管理员身份发布一条留言"
                className="mt-1 w-full resize-none rounded-soft border border-coffee-line/70 bg-cream-50 px-3 py-2 text-xs focus:border-gold focus:outline-none"
              />
            </div>
            <div className="flex items-center justify-between">
              <ColorPicker value={newColor} onChange={setNewColor} />
              <button type="submit" disabled={busy} className="btn-gold !px-3 !py-1.5 text-xs">
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" strokeWidth={1.8} />}
                发布
              </button>
            </div>
          </form>
        )}

        {hint && <p className="mt-3 text-xs text-coffee">{hint}</p>}
      </div>

      {/* 便签列表 */}
      <div className="rounded-card border border-coffee-line/70 bg-cream-200/60 p-4">
        <p className="mb-3 text-[10px] text-ink-mute">
          点击「编辑」可修改昵称 / 内容 / 便签颜色，删除立即生效（前台留言页同步）。
        </p>
        <div className="space-y-2">
          {list.map((m) =>
            editingId === m.id ? (
              <div key={m.id} className="rounded-soft border border-gold/40 bg-cream-50 p-3">
                <div className="flex items-center gap-2">
                  <input
                    value={editNickname}
                    autoFocus
                    onChange={(e) => setEditNickname(e.target.value)}
                    placeholder="署名"
                    className="input-line flex-1 !py-1 text-xs"
                  />
                </div>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={3}
                  placeholder="留言内容"
                  className="mt-2 w-full resize-none rounded-soft border border-coffee-line/70 bg-cream-50 px-3 py-2 text-xs focus:border-gold focus:outline-none"
                />
                <div className="mt-2 flex items-center justify-between">
                  <ColorPicker value={editColor} onChange={setEditColor} />
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={saveEdit}
                      disabled={busy}
                      className="btn-gold !px-3 !py-1 text-[11px]"
                    >
                      <Check className="h-3 w-3" strokeWidth={2} />
                      保存
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="btn-ghost !px-3 !py-1 text-[11px]"
                    >
                      取消
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                key={m.id}
                className={cn(
                  "group flex items-start gap-2.5 rounded-soft border border-coffee-line/40 p-3",
                  NOTE_BG[m.color] ?? "bg-cream-50",
                )}
              >
                <MessageAvatar m={m} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <p className="truncate text-xs font-semibold text-ink">{m.nickname}</p>
                    <p className="flex-none text-[10px] text-ink-mute">{formatTime(m.created_at)}</p>
                    <span className="flex-none rounded-full bg-white/60 px-1.5 py-0.5 text-[9px] text-ink-soft">
                      {COLOR_LABEL[m.color] ?? m.color}
                    </span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-ink-soft">
                    {m.content}
                  </p>
                  <VisitorMeta m={m} />
                </div>
                <div className="flex flex-none gap-0.5">
                  <button
                    type="button"
                    onClick={() => startEdit(m)}
                    aria-label="编辑"
                    className="rounded p-1.5 text-ink-soft transition-colors hover:bg-white/60 hover:text-coffee"
                  >
                    <Pencil className="h-3.5 w-3.5" strokeWidth={1.8} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(m)}
                    aria-label="删除"
                    className="rounded p-1.5 text-rust/70 transition-colors hover:bg-rust/10 hover:text-rust"
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                  </button>
                </div>
              </div>
            ),
          )}
          {list.length === 0 && (
            <p className="py-8 text-center text-xs text-ink-mute">还没有留言</p>
          )}
        </div>
      </div>
    </div>
  );
}

/** 留言者头像：QQ 头像 > 昵称首字 */
function MessageAvatar({ m }: { m: MessageNote }) {
  const { url, letter } = getMessageAvatar(m);
  return (
    <span className="flex h-8 w-8 flex-none items-center justify-center overflow-hidden rounded-full border border-ink/10 bg-white/70 text-xs font-semibold text-ink-soft">
      {url ? (
        <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" />
      ) : (
        letter
      )}
    </span>
  );
}

/** 留言者信息行：真实 IP + 精确归属地 + QQ（仅后台可见） */
function VisitorMeta({ m }: { m: MessageNote }) {
  const ip = m.ip_address && !m.ip_address.startsWith("client-") ? m.ip_address : "";
  const loc = m.ip_location && m.ip_location !== "(未知)" ? m.ip_location : "";
  if (!ip && !loc && !m.qq) return null;
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-soft bg-white/45 px-2 py-1 text-[10px] text-ink-mute">
      {ip && (
        <span className="inline-flex items-center gap-1 font-mono">
          <Globe className="h-3 w-3" strokeWidth={1.8} />
          {ip}
        </span>
      )}
      {loc && (
        <span className="inline-flex items-center gap-1">
          <MapPin className="h-3 w-3" strokeWidth={1.8} />
          {loc}
        </span>
      )}
      {m.qq && (
        <span className="inline-flex items-center gap-1">
          <UserRound className="h-3 w-3" strokeWidth={1.8} />
          QQ {m.qq}
        </span>
      )}
    </div>
  );
}

function ColorPicker({
  value,
  onChange,
}: {
  value: NoteColor;
  onChange: (c: NoteColor) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] text-ink-mute">便签色</span>
      {NOTE_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          aria-label={COLOR_LABEL[c]}
          className={cn(
            "h-5 w-5 rounded border transition-transform",
            NOTE_BG[c],
            value === c
              ? "scale-110 border-ink"
              : "border-transparent opacity-70 hover:opacity-100",
          )}
        />
      ))}
    </div>
  );
}
