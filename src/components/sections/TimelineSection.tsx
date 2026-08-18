/** 恋爱时间轴：垂直时间线展示重要日期 */
type TimelineItem = {
  date: string;
  title: string;
  desc?: string;
};

export default function TimelineSection({ data }: { data: Record<string, unknown> }) {
  const items = (data.items as TimelineItem[]) ?? [];

  if (items.length === 0) return null;

  return (
    <section className="my-5">
      {(data.title as string) && (
        <h3 className="mb-4 text-center font-hand text-lg text-ink">
          {data.title as string}
        </h3>
      )}
      <div className="relative pl-6">
        {/* 垂直线 */}
        <div className="absolute left-2 top-1 bottom-1 w-px bg-gold/30" />
        {items.map((item, i) => (
          <div key={i} className="relative mb-5 last:mb-0">
            {/* 圆点 */}
            <div className="absolute -left-4 top-1 h-3 w-3 rounded-full border-2 border-gold bg-cream-50" />
            <div className="rounded-soft border border-coffee-line/50 bg-cream-200/60 p-3 shadow-soft">
              <span className="text-[11px] tracking-wide text-gold">{item.date}</span>
              <h4 className="mt-0.5 font-hand text-sm text-ink">{item.title}</h4>
              {item.desc && (
                <p className="mt-1 text-xs leading-relaxed text-ink-soft">{item.desc}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
