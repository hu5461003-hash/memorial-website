import { useEffect, useState, useCallback } from "react";
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
  LayoutDashboard,
  FilePlus,
  Pencil,
  Pin,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { BUILTIN_BLOCKS, BUILTIN_LABELS } from "@/lib/config";
import type { PageSection, SectionType } from "@/lib/types";
import { cn } from "@/lib/utils";
import MediaPicker from "@/components/admin/MediaPicker";

/** 系统内置页面（不可删除） */
const SYSTEM_PAGES: Record<string, string> = {
  home: "首页",
  map: "地图",
  letter: "长信",
  messages: "留言",
  gallery: "相册",
  posts: "帖子",
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editObj, setEditObj] = useState<Record<string, unknown>>({});
  const [editType, setEditType] = useState<SectionType>("custom_html");
  /** 自定义页面列表（从 page_sections 中 DISTINCT 出来的） */
  const [customPages, setCustomPages] = useState<{ name: string; label: string }[]>([]);
  /** 新建页面对话框 */
  const [showNewPage, setShowNewPage] = useState(false);
  const [newPageName, setNewPageName] = useState("");
  const [newPageLabel, setNewPageLabel] = useState("");
  /** 重命名页面 */
  const [renamingPage, setRenamingPage] = useState<string | null>(null);
  const [renameLabel, setRenameLabel] = useState("");

  /** 合并系统页面 + 自定义页面 */
  const allPages: Record<string, string> = {
    ...SYSTEM_PAGES,
    ...Object.fromEntries(customPages.map((p) => [p.name, p.label])),
  };

  /** 从 page_sections 拉取所有自定义页面名 */
  const loadCustomPages = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from("page_sections")
      .select("page_name")
      .order("page_name", { ascending: true });
    const names = [...new Set((data ?? []).map((d: { page_name: string }) => d.page_name))];
    const custom = names
      .filter((n) => !(n in SYSTEM_PAGES))
      .map((n) => ({ name: n, label: n }));
    setCustomPages(custom);
  }, []);

  /**
   * 内置区块落库：首次进入某页时，为注册表中尚无数据库记录的内置区块补插记录，
   * 使内置区块与动态组件统一用 sort_order 排序、active 显隐。
   * 内置区块占据 1..N，动态组件整体后移。
   */
  async function materializeBuiltins(pageName: string) {
    const builtins = BUILTIN_BLOCKS[pageName] ?? [];
    if (builtins.length === 0) return;
    const { data } = await supabase
      .from("page_sections")
      .select("*")
      .eq("page_name", pageName)
      .order("sort_order", { ascending: true });
    const rows = (data as PageSection[]) ?? [];
    const byBlock = new Map<string, PageSection>();
    for (const r of rows) {
      if (r.section_type === "builtin") {
        byBlock.set(String((r.content_data as Record<string, unknown>)?.block ?? ""), r);
      }
    }
    const missing = builtins.filter((b) => !byBlock.has(b.block));
    if (missing.length === 0) return;

    const dynamicRows = rows.filter((r) => r.section_type !== "builtin");
    const N = builtins.length;
    const maxOrder = rows.reduce((m, r) => Math.max(m, r.sort_order), 0);
    let cursor = Math.max(maxOrder, N);
    for (const r of dynamicRows) {
      cursor += 1;
      await supabase
        .from("page_sections")
        .update({ sort_order: cursor, updated_at: new Date().toISOString() })
        .eq("id", r.id);
    }
    for (let i = 0; i < builtins.length; i++) {
      const existing = byBlock.get(builtins[i].block);
      if (existing) {
        if (existing.sort_order !== i + 1) {
          await supabase
            .from("page_sections")
            .update({ sort_order: i + 1, updated_at: new Date().toISOString() })
            .eq("id", existing.id);
        }
      } else {
        await supabase.from("page_sections").insert({
          page_name: pageName,
          section_type: "builtin",
          content_data: { block: builtins[i].block },
          sort_order: i + 1,
          active: true,
        });
      }
    }
  }

  async function load() {
    await materializeBuiltins(page);
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

  useEffect(() => {
    loadCustomPages();
  }, [loadCustomPages]);

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
    if (s.section_type === "builtin") {
      setHint("内置区块不可删除，可用眼睛图标隐藏（随时可恢复）");
      return;
    }
    if (!confirm(`确认删除此「${sectionLabel(s.section_type)}」组件？`)) return;
    setBusy(true);
    await supabase.from("page_sections").delete().eq("id", s.id);
    setBusy(false);
    load();
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
      .update({
        content_data: editObj,
        bg_color: s.bg_color || null,
        text_color: s.text_color || null,
        border_color: s.border_color || null,
        accent_color: s.accent_color || null,
        updated_at: new Date().toISOString(),
      })
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

  // ============ 页面 CRUD ============

  async function createPage() {
    const name = newPageName.trim().toLowerCase().replace(/\s+/g, "_");
    const label = newPageLabel.trim() || name;
    if (!name) {
      setHint("页面标识不能为空");
      return;
    }
    if (name in SYSTEM_PAGES || customPages.some((p) => p.name === name)) {
      setHint("页面标识已存在");
      return;
    }
    // 创建一个空的 spacer 占位，确保页面名出现在 page_sections 里
    const { error } = await supabase.from("page_sections").insert({
      page_name: name,
      section_type: "spacer",
      content_data: { height: 8 },
      sort_order: 1,
      active: false,
    });
    if (error) {
      setHint(`创建失败：${error.message}`);
      return;
    }
    setHint(`页面「${label}」已创建`);
    setNewPageName("");
    setNewPageLabel("");
    setShowNewPage(false);
    await loadCustomPages();
    setPage(name);
  }

  async function deletePage(pageName: string) {
    if (pageName in SYSTEM_PAGES) {
      setHint("系统页面不可删除");
      return;
    }
    if (!confirm(`确认删除页面「${allPages[pageName] ?? pageName}」及其所有组件？`)) return;
    setBusy(true);
    await supabase.from("page_sections").delete().eq("page_name", pageName);
    setBusy(false);
    await loadCustomPages();
    setPage("home");
    setHint(`页面已删除`);
  }

  async function renamePage() {
    if (!renamingPage) return;
    const label = renameLabel.trim();
    if (!label) return;
    // 自定义页面的 label 就是 name（简化处理：更新 page_name 为新的 label）
    // 实际只是更新 UI 显示，不修改数据库中的 page_name（避免破坏引用）
    setCustomPages((prev) =>
      prev.map((p) => (p.name === renamingPage ? { ...p, label } : p)),
    );
    setRenamingPage(null);
    setRenameLabel("");
  }

  // ============ 编辑器辅助 ============

  function setField(key: string, val: unknown) {
    setEditObj((o) => ({ ...o, [key]: val }));
  }

  function getImageList(): string[] {
    const arr = editObj.images as string[] | undefined;
    return Array.isArray(arr) ? arr : [];
  }
  function addImage(url: string) {
    if (!url.trim()) return;
    setField("images", [...getImageList(), url.trim()]);
  }
  function updateImage(idx: number, url: string) {
    const list = getImageList();
    list[idx] = url;
    setField("images", list);
  }
  function removeImage(idx: number) {
    setField("images", getImageList().filter((_, i) => i !== idx));
  }

  function getTimelineItems(): { date: string; text: string }[] {
    const arr = editObj.items as { date: string; text: string }[] | undefined;
    return Array.isArray(arr) ? arr : [];
  }
  function addTimelineItem() {
    setField("items", [...getTimelineItems(), { date: "", text: "" }]);
  }
  function updateTimelineItem(idx: number, field: "date" | "text", val: string) {
    const items = getTimelineItems();
    items[idx] = { ...items[idx], [field]: val };
    setField("items", items);
  }
  function removeTimelineItem(idx: number) {
    setField("items", getTimelineItems().filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-5">
      {/* 页面选择 + 页面管理 */}
      <div className="rounded-card border border-coffee-line/70 bg-cream-200 p-4 shadow-paper">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-hand text-base text-ink">页面排版管理</h3>
          <button
            type="button"
            onClick={() => setShowNewPage((v) => !v)}
            className="btn-ghost !px-2 !py-1 text-[11px]"
          >
            <FilePlus className="h-3 w-3" strokeWidth={1.8} />
            新建页面
          </button>
        </div>

        {/* 新建页面对话框 */}
        {showNewPage && (
          <div className="mb-3 rounded-soft border border-gold/30 bg-cream-50 p-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="field-label">页面标识（英文）</label>
                <input
                  value={newPageName}
                  onChange={(e) => setNewPageName(e.target.value)}
                  placeholder="如 about"
                  className="input-line text-xs"
                />
              </div>
              <div>
                <label className="field-label">显示名称</label>
                <input
                  value={newPageLabel}
                  onChange={(e) => setNewPageLabel(e.target.value)}
                  placeholder="如 关于我们"
                  className="input-line text-xs"
                />
              </div>
            </div>
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={createPage} className="btn-gold !px-3 !py-1 text-[11px]">
                <Plus className="h-3 w-3" /> 创建
              </button>
              <button type="button" onClick={() => setShowNewPage(false)} className="btn-ghost !px-3 !py-1 text-[11px]">
                取消
              </button>
            </div>
          </div>
        )}

        {/* 页面列表 */}
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          {Object.entries(allPages).map(([k, v]) => (
            <div key={k} className="group relative flex items-center">
              <button
                type="button"
                onClick={() => setPage(k)}
                className={cn(
                  "flex-none rounded-soft px-3 py-1.5 text-xs transition-colors",
                  page === k ? "bg-gold/20 text-coffee" : "text-ink-mute hover:text-ink-soft",
                )}
              >
                {v}
              </button>
              {/* 自定义页面才有重命名/删除 */}
              {!(k in SYSTEM_PAGES) && page === k && (
                <span className="ml-0.5 flex gap-0.5">
                  <button
                    type="button"
                    onClick={() => { setRenamingPage(k); setRenameLabel(v); }}
                    className="rounded p-0.5 text-ink-soft hover:bg-cream-100 hover:text-coffee"
                  >
                    <Pencil className="h-2.5 w-2.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deletePage(k)}
                    className="rounded p-0.5 text-rust/70 hover:bg-rust/10 hover:text-rust"
                  >
                    <Trash2 className="h-2.5 w-2.5" />
                  </button>
                </span>
              )}
            </div>
          ))}
        </div>

        {/* 重命名对话框 */}
        {renamingPage && (
          <div className="mb-3 flex items-center gap-2 rounded-soft border border-gold/30 bg-cream-50 p-2">
            <input
              value={renameLabel}
              onChange={(e) => setRenameLabel(e.target.value)}
              placeholder="显示名称"
              className="input-line flex-1 text-xs"
            />
            <button type="button" onClick={renamePage} className="btn-gold !px-2 !py-1 text-[11px]">确定</button>
            <button type="button" onClick={() => setRenamingPage(null)} className="btn-ghost !px-2 !py-1 text-[11px]">取消</button>
          </div>
        )}

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
        <p className="mb-1 text-xs text-ink-soft">
          {allPages[page] ?? page} · 共 {list.length} 个区块（按顺序渲染）
        </p>
        <p className="mb-3 text-[10px] leading-relaxed text-ink-mute">
          带「内置」标记的是页面原生区块：可隐藏（眼睛图标）/排序，删除即隐藏、随时可恢复；
          其余为自定义组件：可编辑内容、可删除。
        </p>
        <div className="space-y-2">
          {list.map((s, i) => {
            const isBuiltin = s.section_type === "builtin";
            const meta = SECTION_TYPES.find((t) => t.type === s.section_type);
            const Icon = isBuiltin ? Pin : (meta?.Icon ?? Code);
            const blockKey = isBuiltin
              ? String((s.content_data as Record<string, unknown>)?.block ?? "")
              : "";
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
                    {isBuiltin
                      ? (BUILTIN_LABELS[blockKey] ?? "内置区块")
                      : sectionLabel(s.section_type)}
                  </span>
                  {isBuiltin && (
                    <span className="flex-none rounded-full bg-gold/15 px-1.5 py-0.5 text-[9px] font-medium text-coffee">
                      内置
                    </span>
                  )}
                  <div className="flex flex-none gap-0.5">
                    <button
                      type="button"
                      onClick={() => moveSection(i, -1)}
                      disabled={busy || i === 0}
                      className="rounded p-1 text-ink-soft hover:bg-cream-200 hover:text-coffee disabled:opacity-30"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSection(i, 1)}
                      disabled={busy || i === list.length - 1}
                      className="rounded p-1 text-ink-soft hover:bg-cream-200 hover:text-coffee disabled:opacity-30"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleActive(s)}
                      title={isBuiltin ? (s.active ? "隐藏（可恢复）" : "恢复显示") : (s.active ? "隐藏" : "显示")}
                      className="rounded p-1 text-ink-soft hover:bg-cream-200 hover:text-coffee"
                    >
                      {s.active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    </button>
                    {!isBuiltin && (
                      <button
                        type="button"
                        onClick={() => handleDelete(s)}
                        className="rounded p-1 text-rust/70 hover:bg-rust/10 hover:text-rust"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                {isBuiltin && (
                  <p className="mt-0.5 pl-6 text-[10px] text-ink-mute">
                    {BUILTIN_LABELS[blockKey] ?? blockKey} · 页面原生区块，文字内容请在「内容」中修改
                  </p>
                )}

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
                                    "flex-1 rounded-soft border py-1.5 text-xs",
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
                                    "flex-1 rounded-soft border py-1.5 text-xs",
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
                          <label className="field-label">高度：{(editObj.height as number) ?? 32}px</label>
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
                        <div className="rounded-soft border border-coffee-line/50 bg-white p-2">
                          <p className="mb-1 text-[10px] text-ink-mute">预览</p>
                          <div
                            className="overflow-hidden text-xs"
                            dangerouslySetInnerHTML={{ __html: (editObj.html as string) ?? "" }}
                          />
                        </div>
                      </div>
                    )}

                    {/* === 无限滚动相册 === */}
                    {editType === "marquee" && (
                      <div className="space-y-2.5">
                        <div>
                          <label className="field-label">滚动速度：{(editObj.speed as number) ?? 30}</label>
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
                          <div className="space-y-2">
                            {getImageList().map((url, i) => (
                              <div key={i} className="flex items-start gap-1.5">
                                <img src={url} alt="" className="mt-0.5 h-8 w-8 flex-none rounded object-cover" />
                                <div className="flex-1">
                                  <MediaPicker
                                    value={url}
                                    onChange={(newUrl) => updateImage(i, newUrl)}
                                    label=""
                                    accept="image/*"
                                    mediaType="image"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeImage(i)}
                                  className="mt-0.5 flex-none rounded p-1 text-rust/70 hover:bg-rust/10 hover:text-rust"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={() => addImage("")}
                            className="mt-1.5 btn-ghost !px-2 !py-1 text-[11px]"
                          >
                            <Plus className="h-3 w-3" /> 添加图片
                          </button>
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
                            <button type="button" onClick={addTimelineItem} className="text-[11px] text-gold hover:underline">
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
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                            {getTimelineItems().length === 0 && (
                              <p className="py-2 text-center text-[11px] text-ink-mute">点击「添加事件」创建第一个</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* === 颜色覆盖（分区自定义） === */}
                    <div className="mt-3 rounded-soft border border-dashed border-coffee-line/50 bg-cream-100/50 p-2.5">
                      <p className="mb-2 text-[11px] font-medium text-ink-soft">分区颜色覆盖（留空则跟随全局主题）</p>
                      <div className="grid grid-cols-2 gap-2">
                        {([
                          ["bg_color", "背景色"],
                          ["text_color", "文字色"],
                          ["border_color", "边框色"],
                          ["accent_color", "强调色"],
                        ] as const).map(([key, label]) => {
                          const current = (s[key] as string | null) ?? "";
                          return (
                            <div key={key} className="flex items-center gap-1.5">
                              <label className="w-12 flex-none text-[10px] text-ink-mute">{label}</label>
                              <input
                                type="color"
                                value={current || "#FFFFFF"}
                                onChange={(e) => {
                                  setEditObj((o) => ({ ...o, [key]: e.target.value }));
                                  // 同步写入 s 对象的 color 字段
                                  s[key] = e.target.value;
                                }}
                                className="h-6 w-8 flex-none cursor-pointer rounded border border-coffee-line/50 bg-transparent"
                              />
                              {current && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditObj((o) => ({ ...o, [key]: "" }));
                                    s[key] = null;
                                  }}
                                  className="text-[9px] text-ink-mute hover:text-rust"
                                >
                                  清除
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

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
                ) : !isBuiltin ? (
                  <button
                    type="button"
                    onClick={() => startEdit(s)}
                    className="mt-1 text-[10px] text-gold hover:underline"
                  >
                    编辑内容
                  </button>
                ) : null}
              </div>
            );
          })}
          {list.length === 0 && (
            <p className="py-6 text-center text-xs text-ink-mute">暂无组件，点击上方按钮添加</p>
          )}
        </div>
      </div>
    </div>
  );
}

function sectionLabel(type: SectionType): string {
  const map: Record<SectionType, string> = {
    builtin: "内置区块",
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
