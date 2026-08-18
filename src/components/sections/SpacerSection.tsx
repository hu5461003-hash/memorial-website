/** 留白间隔组件 */
export default function SpacerSection({ data }: { data: Record<string, unknown> }) {
  const height = (data.height as number) ?? 32;
  return <section style={{ height: `${height}px` }} aria-hidden="true" />;
}
