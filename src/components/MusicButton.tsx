import { useEffect, useRef } from "react";
import { Music, Play, Pause } from "lucide-react";
import { useStore } from "@/store/useStore";
import { BG_MUSIC_URL } from "@/lib/config";
import { cn } from "@/lib/utils";

/**
 * 背景音乐播放控制 · 右下角悬浮
 * - 全局隐藏 <audio> 元素，由 store 持有引用并控制播放
 * - fixed 定位，悬浮于右下角，避开底部导航栏
 * - 播放时暖金脉冲
 */
export default function MusicButton({ className }: { className?: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { isPlaying, initAudio, togglePlay } = useStore();

  useEffect(() => {
    if (audioRef.current) {
      initAudio(audioRef.current);
    }
  }, [initAudio]);

  return (
    <>
      <audio ref={audioRef} src={BG_MUSIC_URL} preload="none" />
      <button
        type="button"
        onClick={togglePlay}
        aria-label={isPlaying ? "暂停背景音乐" : "播放背景音乐"}
        className={cn(
          "fixed bottom-20 right-4 z-50 inline-flex h-11 w-11 items-center justify-center rounded-full border border-coffee-line bg-cream-50/85 shadow-paper backdrop-blur-md transition-all hover:shadow-polaroid active:scale-95",
          isPlaying && "border-gold/60 bg-gold/20 text-coffee",
          className,
        )}
      >
        {isPlaying ? (
          <Pause className="h-4 w-4" strokeWidth={1.8} />
        ) : (
          <Play className="h-4 w-4 translate-x-[1px]" strokeWidth={1.8} />
        )}
        <Music
          className={cn(
            "ml-0.5 h-3 w-3",
            isPlaying && "animate-soft-pulse text-gold",
          )}
          strokeWidth={1.6}
        />
        {/* 播放时环绕的脉冲圈 */}
        {isPlaying && (
          <span className="absolute inset-0 -z-10 rounded-full bg-gold/30 animate-ping" />
        )}
      </button>
    </>
  );
}
