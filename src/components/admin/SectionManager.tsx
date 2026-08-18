import { useEffect, useState } from "react";
import {
  Trash2,
  Plus,
  Loader2,
  ChevronUp,
  ChevronDown,
  Code,
  Image as ImageIcon,
  Clock,
  Type as TypeIcon,
  Minus,
  Eye,
  EyeOff,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { PageSection, SectionType } from "@/lib/types";
import { cn } from "@/lib/utils";

const PAGES: Record<string, string> = {
  home: "首页",
  map: "地图",
  letter: "长信",
  messages: "留言",
  gallery: "相册",
};

const SECTION_TYPES: {
  type: SectionType;
  label: string;
  Icon: typeof Code;
  desc: string;
}[] = [
  { type: "marquee", label: "无限滚动相册", Icon: ImageIcon, desc: "横向自动滚动的照片条" },
  { type: "timeline", label: "恋爱时间轴", Icon: Clock, desc: "垂直时间线展示重要日期" },
  { type: "custom_html", label: "自定义代码块", Icon: Code, desc: "注入 HTML/CSS/JS" },
  { type: "heading", label: "标题文字", Icon: TypeIcon, desc: "插入一段标题" },
  { type: "spacer", label: "留白间隔", Icon: Minus, desc: "插入垂直空白" },
];

export default function SectionManager() {
  const [list, setList] = useState<PageSection[]>([]);
  const [page, setPage] = useState("home");
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  // 编辑态
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState("");

  async function load() {
    const { data } = await supabase
      .from("page_sections")
      .select("*")
      .eq("page_name", page)
      .order("sort_order", { ascending: true });
    setList((data as PageSection[]) ?? []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  async function addSection(type: SectionType) {
    setBusy(true);
    const maxOrder = list.length > 0 ? Math.max(...list.map((s) => s.sort_order)) : 0;
    const defaultData = getDefaultData(type);
    const { error } = await supabase.from("page_sections").insert({
      page_name: page,
      section_type: type,
      content_data: defaultData,
      sort_order: maxOrder + 10,
      active: true,
    });
    setBusy(false);
    if (error) {
      setHint(`添加失败：${error.message}`);
    } else {
      setHint(null);
      load();
    }
  }

  async function moveSection(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= list.length) return;
    const a = list[index];
    const b = list[target];
    setBusy(true);
    await supabase
      .from("page_sections")
      .update({ sort_order: b.sort_order, updated_at: new Date().toISOString() })
      .eq("id", a.id);
    await supabase
      .from("page_sections")
      .update({ sort_order: a.sort_order, updated_at: new Date().toISOString() })
      .eq("id", b.id);
    setBusy(false);
    load();
  }

  async function toggleActive(s: PageSection) {
    await supabase
      .from("page_sections")
      .update({ active: !s.active, updated_at: new Date().toISOString() })
      .eq("id", s.id);
    load();
  }

  async function handleDelete(s: PageSection) {
    if (!confirm(`确认删除此「${sectionLabel(s.section_type)}」组件？`)) return;
    await supabase.from("page_sections").delete().eq("id", s.id);
    load();
  }

  function startEdit(s: PageSection) {
    setEditingId(s.id);
    setEditData(JSON.stringify(s.content_data, null, 2));
  }

  async function saveEdit(s: PageSection) {
    setBusy(true);
    try {
      const parsed = JSON.parse(editData);
      const { error } = await supabase
        .from("page_sections")
        .update({ content_data: parsed, updated_at: new Date().toISOString() })
        .eq("id", s.id);
      if (error) setHint(`保存失败：${error.message}`);
      else {
        setHint(null);
        setEditingId(null);
        load();
      }
    } catch {
      setHint("JSON 格式错误，请检查");
    }
    setBusy(false);
  }

  return (
    <div className="space-y-5">
      {/* 页面选择 */}
      <div className="rounded-card border border-coffee-line/70 bg-cream-200 p-4 shadow-paper">
        <h3 className="mb-3 font-hand text-base text-ink">动态组件排版</h3>
        <div className="mb-3 flex items-center gap-2 overflow-x-auto">
          {Object.entries(PAGES).map(([k, v]) => (
            <button
              key={k}
              type="button"
              onClick={() => setPage(k)}
              className={cn(
                "flex-none rounded-soft px-3 py-1.5 text-xs transition-colors",
                page === k ? "bg-gold/20 text-coffee" : "text-ink-mute hover:text-ink-soft",
              )}
            >
              {v}
            </button>
          ))}
        </div>

        {/* 添加组件 */}
        <div className="grid grid-cols-2 gap-2">
          {SECTION_TYPES.map(({ type, label, Icon, desc }) => (
            <button
              key={type}
              type="button"
              onClick={() => addSection(type)}
              disabled={busy}
              className="flex flex-col items-start gap-0.5 rounded-soft border border-coffee-line/50 bg-cream-50/60 p-2.5 text-left transition-colors hover:border-gold hover:bg-gold/5 disabled:opacity-50"
            >
              <span className="flex items-center gap-1.5 text-xs text-ink">
                <Icon className="h-3.5 w-3.5 text-gold" strokeWidth={1.8} />
                {label}
              </span>
              <span className="text-[10px] text-ink-mute">{desc}</span>
            </button>
          ))}
        </div>
        {hint && <p className="mt-3 text-xs text-coffee">{hint}</p>}
      </div>

      {/* 组件列表 */}
      <div className="rounded-card border border-coffee-line/70 bg-cream-200/60 p-4">
        <p className="mb-3 text-xs text-ink-soft">
          {PAGES[page]} · 共 {list.length} 个组件（按顺序渲染）
        </p>
        <div className="space-y-2">
          {list.map((s, i) => {
            const meta = SECTION_TYPES.find((t) => t.type === s.section_type);
            const Icon = meta?.Icon ?? Code;
            return (
              <div
                key={s.id}
                className={cn(
                  "rounded-soft border bg-cream-50/60 p-2.5",
                  s.active ? "border-coffee-line/50" : "border-dashed border-coffee-line/30 opacity-60",
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="flex-none text-[10px] text-ink-mute">#{i + 1}</span>
                  <Icon className="h-3.5 w-3.5 flex-none text-gold" strokeWidth={1.8} />
                  <span className="flex-1 truncate font-hand text-sm text-ink">
                    {sectionLabel(s.section_type)}
                  </span>
                  <div className="flex flex-none gap-0.5">
                    <button
                      type="button"
                      onClick={() => moveSection(i, -1)}
                      disabled={busy || i === 0}
                      aria-label="上移"
                      className="rounded p-1 text-ink-soft transition-colors hover:bg-cream-200 hover:text-coffee disabled:opacity-30"
                    >
                      <ChevronUp className="h-3.5 w-3.5" strokeWidth={1.8} />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSection(i, 1)}
                      disabled={busy || i === list.length - 1}
                      aria-label="下移"
                      className="rounded p-1 text-ink-soft transition-colors hover:bg-cream-200 hover:text-coffee disabled:opacity-30"
                    >
                      <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.8} />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleActive(s)}
                      aria-label={s.active ? "隐藏" : "显示"}
                      className="rounded p-1 text-ink-soft transition-colors hover:bg-cream-200 hover:text-coffee"
                    >
                      {s.active ? (
                        <Eye className="h-3.5 w-3.5" strokeWidth={1.8} />
                      ) : (
                        <EyeOff className="h-3.5 w-3.5" strokeWidth={1.8} />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(s)}
                      aria-label="删除"
                      className="rounded p-1 text-rust/70 transition-colors hover:bg-rust/10 hover:text-rust"
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                    </button>
                  </div>
                </div>

                {/* 编辑区 */}
                {editingId === s.id ? (
                  <div className="mt-2">
                    {s.section_type === "custom_html" ? (
                      <textarea
                        value={editData.includes('"html"')
                          ? (() => { try { return JSON.parse(editData).html ?? ""; } catch { return ""; } })()
                          : editData}
                        onChange={(e) => {
                          try {
                            const obj = JSON.parse(editData);
                            obj.html = e.target.value;
                            setEditData(JSON.stringify(obj, null, 2));
                          } catch {
                            setEditData(JSON.stringify({ html: e.target.value }, null, 2));
                          }
                        }}
                        rows={8}
                        placeholder="<div>自定义 HTML / CSS / JS</div>"
                        className="w-full resize-y rounded-soft border border-coffee-line/70 bg-cream-50 px-3 py-2 font-mono text-xs focus:border-gold focus:outline-none"
                      />
                    ) : (
                      <textarea
                        value={editData}
                        onChange={(e) => setEditData(e.target.value)}
                        rows={8}
                        className="w-full resize-y rounded-soft border border-coffee-line/70 bg-cream-50 px-3 py-2 font-mono text-xs focus:border-gold focus:outline-none"
                      />
                    )}
                    <div className="mt-1.5 flex gap-2">
                      <button
                        type="button"
                        onClick={() => saveEdit(s)}
                        disabled={busy}
                        className="btn-gold !px-3 !py-1 text-[11px]"
                      >
                        {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
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
                ) : (
                  <button
                    type="button"
                    onClick={() => startEdit(s)}
                    className="mt-1 text-[10px] text-gold hover:underline"
                  >
                    编辑内容
                  </button>
                )}
              </div>
            );
          })}
          {list.length === 0 && (
            <p className="py-6 text-center text-xs text-ink-mute">
              暂无组件，点击上方按钮添加
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function sectionLabel(type: SectionType): string {
  const map: Record<SectionType, string> = {
    marquee: "无限滚动相册",
    timeline: "恋爱时间轴",
    custom_html: "自定义代码块",
    heading: "标题文字",
    spacer: "留白间隔",
  };
  return map[type] ?? type;
}

function getDefaultData(type: SectionType): Record<string, unknown> {
  switch (type) {
    case "marquee":
      return { images: [], speed: 30 };
    case "timeline":
      return { title: "", items: [] };
    case "custom_html":
      return { html: "<div style=\"text-align:center;color:#E8919F;\">自定义内容</div>" };
    case "heading":
      return { text: "标题", level: "h3", align: "center" };
    case "spacer":
      return { height: 32 };
    default:
      return {};
  }
}
