import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { useContent } from "@/hooks/useContent";

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  showBack?: boolean;
};

/**
 * 页面顶部头部
 * - 左侧返回按钮（可选）
 * - 中间标题与副标题
 */
export default function PageHeader({
  title,
  subtitle,
  showBack = true,
}: PageHeaderProps) {
  const navigate = useNavigate();
  const { getValue } = useContent();
  return (
    <header className="flex items-start justify-between gap-3 pb-5">
      <div className="flex items-start gap-2">
        {showBack && (
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label={getValue("global.a11y_back")}
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
