import { Loader2 } from "lucide-react";

export default function Loading({ tip = "正在加载…" }: { tip?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-ink-mute">
      <Loader2 className="h-6 w-6 animate-spin text-gold" strokeWidth={1.6} />
      <p className="text-xs tracking-wide">{tip}</p>
    </div>
  );
}
