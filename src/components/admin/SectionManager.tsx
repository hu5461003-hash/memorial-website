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
  // 编辑态：可视化对象编辑
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editObj, setEditObj] = useState<Record<string, unknown>>({});
  const [editType, setEditType] = useState<SectionType>("custom_html");

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
    const { error: e1 } = await supabase
      .from("page_sections")
      .update({ sort_order: b.sort_order, updated_at: new Date().toISOString() })
      .eq("id", a.id);
    const { error: e2 } = await supabase
      .from("page_sections")
      .update({ sort_order: a.sort_order, updated_at: new Date().toISOString() })
      .eq("id", b.id);
    setBusy(false);
    if (e1 || e2) {
      setHint(`排序失败：${e1?.message ?? e2?.message}`);
    } else {
      setHint(null);
      load();
    }
  }

  async function toggleActive(s: PageSection) {
    const { error } = await supabase
      .from("page_sections")
      .update({ active: !s.active, updated_at: new Date().toISOString() })
      .eq("id", s.id);
    if (error) {
      setHint(`操作失败：${error.message}`);
    } else {
      setHint(null);
      load();
    }
  }

  async function handleDelete(s: PageSection) {
    if (!confirm(`确认删除此「${sectionLabel(s.section_type)}」组件？`)) return;
    setBusy(true);
    const { error } = await supabase.from("page_sections").delete().eq("id", s.id);
    setBusy(false);
    if (error) {
      setHint(`删除失败：${error.message}`);
    } else {
      setHint(null);
      load();
    }
  }

  function startEdit(s: PageSection) {
    setEditingId(s.id);
    setEditType(s.section_type);
    setEditObj(s.content_data ?? {});
  }

  async function saveEdit(s: PageSection) {
    setBusy(true);
    const { error } = await supabase
      .from("page_sections")
      .update({ content_data: editObj, updated_at: new Date().toISOString() })
      .eq("id", s.id);
    if (error) {
      setHint(`保存失败：${error.message}`);
    } else {
      setHint(null);
      setEditingId(null);
      load();
    }
    setBusy(false);
  }

  // 编辑器辅助
  function setField(key: string, val: unknown) {
    setEditObj((o) => ({ ...o, [key]: val }));
  }

  function getImageList(): string[] {
    const arr = editObj.images as string[] | undefined;
    return Array.isArray(arr) ? arr : [];
  }
  function addImage(url: string) {
    if (!url.trim()) return;
    const list = getImageList();
    setField("images", [...list, url.trim()]);
  }
  function removeImage(idx: number) {
    const list = getImageList();
    setField("images", list.filter((_, i) => i !== idx));
  }

  function getTimelineItems(): { date: string; text: string }[] {
    const arr = editObj.items as { date: string; text: string }[] | undefined;
    return Array.isArray(arr) ? arr : [];
  }
  function addTimelineItem() {
    const items = getTimelineItems();
    setField("items", [...items, { date: "", text: "" }]);
  }
  function updateTimelineItem(idx: number, field: "date" | "text", val: string) {
    const items = getTimelineItems();
    items[idx] = { ...items[idx], [field]: val };
    setField("items", items);
  }
  function removeTimelineItem(idx: number) {
    const items = getTimelineItems();
    setField("items", items.filter((_, i) => i !== idx));
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

                {/* 可视化编辑区 */}
                {editingId === s.id ? (
                  <div className="mt-2.5 rounded-soft border border-gold/30 bg-cream-50/80 p-3">
                    {/* === 标题文字 === */}
                    {editType === "heading" && (
                      <div className="space-y-2.5">
                        <div>
                          <label className="field-label">标题文字</label>
                          <input
                            value={(editObj.text as string) ?? ""}
                            onChange={(e) => setField("text", e.target.value)}
                            placeholder="输入标题内容"
                            className="input-line"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="field-label">标题级别</label>
                            <div className="flex gap-1">
                              {(["h2", "h3", "h4"] as const).map((lv) => (
                                <button
                                  key={lv}
                                  type="button"
                                  onClick={() => setField("level", lv)}
                                  className={cn(
                                    "flex-1 rounded-soft border py-1.5 text-xs transition-colors",
                                    (editObj.level as string) === lv
                                      ? "border-gold bg-gold/15 text-coffee"
                                      : "border-coffee-line/50 text-ink-mute hover:text-ink",
                                  )}
                                >
                                  {lv.toUpperCase()}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="field-label">对齐方式</label>
                            <div className="flex gap-1">
                              {(["left", "center", "right"] as const).map((al) => (
                                <button
                                  key={al}
                                  type="button"
                                  onClick={() => setField("align", al)}
                                  className={cn(
                                    "flex-1 rounded-soft border py-1.5 text-xs transition-colors",
                                    (editObj.align as string) === al
                                      ? "border-gold bg-gold/15 text-coffee"
                                      : "border-coffee-line/50 text-ink-mute hover:text-ink",
                                  )}
                                >
                                  {{ left: "左", center: "中", right: "右" }[al]}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* === 留白间隔 === */}
                    {editType === "spacer" && (
                      <div className="space-y-2.5">
                        <div>
                          <label className="field-label">
                            高度：{(editObj.height as number) ?? 32}px
                          </label>
                          <input
                            type="range"
                            min={8}
                            max={128}
                            step={4}
                            value={(editObj.height as number) ?? 32}
                            onChange={(e) => setField("height", Number(e.target.value))}
                            className="w-full accent-gold"
                          />
                        </div>
                        {/* 可视化预览 */}
                        <div className="rounded-soft border border-coffee-line/50 bg-cream-200">
                          <div
                            className="flex items-center justify-center text-[10px] text-ink-mute"
                            style={{ height: `${(editObj.height as number) ?? 32}px` }}
                          >
                            间隔预览
                          </div>
                        </div>
                      </div>
                    )}

                    {/* === 自定义代码块 === */}
                    {editType === "custom_html" && (
                      <div className="space-y-2">
                        <label className="field-label">HTML / CSS / JS 代码</label>
                        <textarea
                          value={(editObj.html as string) ?? ""}
                          onChange={(e) => setField("html", e.target.value)}
                          rows={8}
                          placeholder={'<div style="text-align:center;color:#E8919F;">自定义内容</div>'}
                          className="w-full resize-y rounded-soft border border-coffee-line/70 bg-cream-50 px-3 py-2 font-mono text-xs focus:border-gold focus:outline-none"
                        />
                        {/* 实时预览 */}
                        <div className="rounded-soft border border-coffee-line/50 bg-white p-2">
                          <p className="mb-1 text-[10px] text-ink-mute">预览</p>
                          <div
                            className="overflow-hidden text-xs"
                            dangerouslySetInnerHTML={{
                              __html: (editObj.html as string) ?? "",
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* === 无限滚动相册 === */}
                    {editType === "marquee" && (
                      <div className="space-y-2.5">
                        <div>
                          <label className="field-label">
                            滚动速度：{(editObj.speed as number) ?? 30}
                          </label>
                          <input
                            type="range"
                            min={10}
                            max={80}
                            step={5}
                            value={(editObj.speed as number) ?? 30}
                            onChange={(e) => setField("speed", Number(e.target.value))}
                            className="w-full accent-gold"
                          />
                        </div>
                        <div>
                          <label className="field-label">图片列表</label>
                          <div className="space-y-1.5">
                            {getImageList().map((url, i) => (
                              <div key={i} className="flex items-center gap-1.5">
                                <img
                                  src={url}
                                  alt=""
                                  className="h-8 w-8 flex-none rounded object-cover"
                                />
                                <input
                                  value={url}
                                  onChange={(e) => {
                                    const list = getImageList();
                                    list[i] = e.target.value;
                                    setField("images", list);
                                  }}
                                  className="input-line flex-1 text-xs"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeImage(i)}
                                  className="flex-none rounded p-1 text-rust/70 hover:bg-rust/10 hover:text-rust"
                                >
                                  <Trash2 className="h-3 w-3" strokeWidth={1.8} />
                                </button>
                              </div>
                            ))}
                          </div>
                          <div className="mt-1.5 flex gap-1.5">
                            <input
                              id={`add-img-${s.id}`}
                              placeholder="粘贴图片 URL"
                              className="input-line flex-1 text-xs"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const el = document.getElementById(`add-img-${s.id}`) as HTMLInputElement;
                                if (el) {
                                  addImage(el.value);
                                  el.value = "";
                                }
                              }}
                              className="btn-ghost flex-none !px-2 !py-1 text-[11px]"
                            >
                              <Plus className="h-3 w-3" strokeWidth={1.8} />
                              添加
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* === 恋爱时间轴 === */}
                    {editType === "timeline" && (
                      <div className="space-y-2.5">
                        <div>
                          <label className="field-label">时间轴标题</label>
                          <input
                            value={(editObj.title as string) ?? ""}
                            onChange={(e) => setField("title", e.target.value)}
                            placeholder="如 我们的旅程"
                            className="input-line"
                          />
                        </div>
                        <div>
                          <div className="mb-1 flex items-center justify-between">
                            <label className="field-label mb-0">事件列表</label>
                            <button
                              type="button"
                              onClick={addTimelineItem}
                              className="text-[11px] text-gold hover:underline"
                            >
                              + 添加事件
                            </button>
                          </div>
                          <div className="space-y-1.5">
                            {getTimelineItems().map((item, i) => (
                              <div key={i} className="flex items-start gap-1.5">
                                <input
                                  type="date"
                                  value={item.date}
                                  onChange={(e) => updateTimelineItem(i, "date", e.target.value)}
                                  className="flex-none rounded-soft border border-coffee-line/50 bg-cream-50 px-2 py-1 text-[11px] focus:border-gold focus:outline-none"
                                />
                                <input
                                  value={item.text}
                                  onChange={(e) => updateTimelineItem(i, "text", e.target.value)}
                                  placeholder="事件描述"
                                  className="input-line flex-1 text-xs"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeTimelineItem(i)}
                                  className="flex-none rounded p-1 text-rust/70 hover:bg-rust/10 hover:text-rust"
                                >
                                  <Trash2 className="h-3 w-3" strokeWidth={1.8} />
                                </button>
                              </div>
                            ))}
                            {getTimelineItems().length === 0 && (
                              <p className="py-2 text-center text-[11px] text-ink-mute">
                                点击「添加事件」创建第一个
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 操作按钮 */}
                    <div className="mt-3 flex gap-2">
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
