import { useEffect, useRef } from "react";
import { Music, Play, Pause } from "lucide-react";
import { useStore } from "@/store/useStore";
import { BG_MUSIC_URL } from "@/lib/config";
import { cn } from "@/lib/utils";

/**
 * 背景音乐播放控制
 * - 全局隐藏 <audio> 元素，由 store 持有引用并控制播放
 * - 按钮样式：右上角小圆按钮，播放时暖金脉冲
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
          "inline-flex h-9 w-9 items-center justify-center rounded-full border border-coffee-line bg-cream-50/80 backdrop-blur-sm transition-all active:scale-95",
          isPlaying && "border-gold/60 bg-gold/15 text-coffee",
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
            "ml-1 h-3 w-3",
            isPlaying && "animate-soft-pulse text-gold",
          )}
          strokeWidth={1.6}
        />
      </button>
    </>
  );
}
