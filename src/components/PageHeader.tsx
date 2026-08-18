import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  showBack?: boolean;
};

/**
 * 页面顶部头部
 * - 左侧返回按钮（可选）
 * - 中间标题与副标题
 * - 背景音乐控制已迁移为右下角悬浮按钮（见 Layout）
 */
export default function PageHeader({
  title,
  subtitle,
  showBack = true,
}: PageHeaderProps) {
  const navigate = useNavigate();
  return (
    <header className="flex items-start justify-between gap-3 pb-5">
      <div className="flex items-start gap-2">
        {showBack && (
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="返回"
            className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-cream-200 hover:text-ink active:scale-95"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={1.8} />
          </button>
        )}
        <div>
          <h1 className="font-hand text-2xl text-ink tracking-wide">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-xs text-ink-mute tracking-wide">{subtitle}</p>
          )}
        </div>
      </div>
    </header>
  );
}
