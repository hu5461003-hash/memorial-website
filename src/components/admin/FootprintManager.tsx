import { useEffect, useState } from "react";
import { Trash2, Plus, Loader2, MapPin } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Footprint } from "@/lib/types";
import { cn } from "@/lib/utils";

type Form = {
  name: string;
  lat: string;
  lng: string;
  visit_date: string;
  story: string;
  cover_url: string;
  sort_order: string;
};

const EMPTY: Form = {
  name: "",
  lat: "",
  lng: "",
  visit_date: "",
  story: "",
  cover_url: "",
  sort_order: "",
};

export default function FootprintManager() {
  const [list, setList] = useState<Footprint[]>([]);
  const [form, setForm] = useState<Form>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase
      .from("footprints")
      .select("*")
      .order("sort_order", { ascending: true });
    setList((data as Footprint[]) ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  function setField<K extends keyof Form>(key: K, val: string) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.lat || !form.lng || !form.visit_date || !form.story) {
      setHint("请填写地点、经纬度、日期与故事");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("footprints").insert({
      name: form.name.trim(),
      lat: Number(form.lat),
      lng: Number(form.lng),
      visit_date: form.visit_date,
      story: form.story.trim(),
      cover_url: form.cover_url.trim() || null,
      sort_order: form.sort_order ? Number(form.sort_order) : list.length + 1,
    });
    setBusy(false);
    if (error) {
      setHint(`添加失败：${error.message}`);
      return;
    }
    setForm(EMPTY);
    setHint("已新增足迹节点");
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("确认删除这个足迹节点？")) return;
    const { error } = await supabase.from("footprints").delete().eq("id", id);
    if (!error) load();
  }

  return (
    <div className="space-y-5">
      {/* 新增表单 */}
      <form
        onSubmit={handleAdd}
        className="rounded-card border border-coffee-line/70 bg-cream-200 p-4 shadow-paper"
      >
        <h3 className="mb-3 font-hand text-base text-ink">新增足迹节点</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">地点名称</label>
            <input
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              placeholder="如 长沙"
              className="input-line"
            />
          </div>
          <div>
            <label className="field-label">日期</label>
            <input
              type="date"
              value={form.visit_date}
              onChange={(e) => setField("visit_date", e.target.value)}
              className="input-line"
            />
          </div>
          <div>
            <label className="field-label">纬度 lat</label>
            <input
              value={form.lat}
              onChange={(e) => setField("lat", e.target.value)}
              placeholder="28.2278"
              inputMode="decimal"
              className="input-line"
            />
          </div>
          <div>
            <label className="field-label">经度 lng</label>
            <input
              value={form.lng}
              onChange={(e) => setField("lng", e.target.value)}
              placeholder="112.9388"
              inputMode="decimal"
              className="input-line"
            />
          </div>
        </div>
        <div className="mt-3">
          <label className="field-label">故事正文</label>
          <textarea
            value={form.story}
            onChange={(e) => setField("story", e.target.value)}
            rows={3}
            placeholder="当时发生了什么…"
            className="mt-1 w-full resize-none rounded-soft border border-coffee-line/70 bg-cream-50/60 px-3 py-2 text-sm focus:border-gold focus:outline-none"
          />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">封面图 URL（可选）</label>
            <input
              value={form.cover_url}
              onChange={(e) => setField("cover_url", e.target.value)}
              placeholder="https://…"
              className="input-line"
            />
          </div>
          <div>
            <label className="field-label">旅程顺序</label>
            <input
              value={form.sort_order}
              onChange={(e) => setField("sort_order", e.target.value)}
              placeholder="自动"
              inputMode="numeric"
              className="input-line"
            />
          </div>
        </div>
        {hint && (
          <p className="mt-3 text-xs text-coffee">{hint}</p>
        )}
        <button type="submit" disabled={busy} className="btn-gold mt-4">
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.8} />
          ) : (
            <Plus className="h-3.5 w-3.5" strokeWidth={1.8} />
          )}
          新增节点
        </button>
      </form>

      {/* 节点列表 */}
      <div className="rounded-card border border-coffee-line/70 bg-cream-200/60 p-4">
        <h3 className="mb-3 font-hand text-base text-ink">
          已有节点（{list.length}）
        </h3>
        <ul className="space-y-2">
          {list.map((fp) => (
            <li
              key={fp.id}
              className={cn(
                "flex items-start gap-2 rounded-soft border border-coffee-line/50 bg-cream-50/60 p-2.5",
              )}
            >
              <MapPin className="mt-0.5 h-3.5 w-3.5 flex-none text-gold" strokeWidth={1.8} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-hand text-sm text-ink">{fp.name}</span>
                  <span className="text-[10px] text-ink-mute">
                    {fp.visit_date} · #{fp.sort_order}
                  </span>
                </div>
                <p className="truncate text-[11px] text-ink-soft">{fp.story}</p>
                <p className="mt-0.5 text-[10px] text-ink-mute">
                  {fp.lat.toFixed(4)}, {fp.lng.toFixed(4)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(fp.id)}
                aria-label="删除"
                className="flex-none rounded p-1 text-rust/70 transition-colors hover:bg-rust/10 hover:text-rust"
              >
                <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
              </button>
            </li>
          ))}
          {list.length === 0 && (
            <li className="py-4 text-center text-xs text-ink-mute">
              暂无足迹节点
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
