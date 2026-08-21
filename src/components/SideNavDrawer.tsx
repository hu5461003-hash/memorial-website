import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { X, ExternalLink } from "lucide-react";
import { useStore } from "@/store/useStore";
import { useNavLinks } from "@/hooks/useGlobalLinks";
import { useContent } from "@/hooks/useContent";
import { useTheme } from "@/hooks/useTheme";
import NavIcon from "@/components/icons/NavIcons";
import { cn } from "@/lib/utils";

/**
 * 侧边栏导航抽屉（页头汉堡按钮触发）
 * - 导航项来自 nav_links 表，后台「导航」菜单增删改排序
 * - 支持 group_name 分组显示、内部路由 / 外部链接、新窗口打开
 */
export default function SideNavDrawer() {
  const { sidenavOpen, closeSidenav } = useStore();
  const { rows } = useNavLinks();
  const { getValue, getImage } = useContent();
  const { theme } = useTheme();
  const navigate = useNavigate();

  const logoImage = getImage("global.logo_image");
  const logoText = getValue("global.logo_text");

  // ESC 关闭 + 打开时锁定背景滚动
  useEffect(() => {
    if (!sidenavOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSidenav();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [sidenavOpen, closeSidenav]);

  const groups = useMemo(() => {
    const active = rows.filter((r) => r.active);
    const map = new Map<string, typeof active>();
    for (const r of active) {
      const g = r.group_name?.trim() || "";
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(r);
    }
    return [...map.entries()];
  }, [rows]);

  /** 内部路由：/ 或 /xxx（hash 路由下 #/xxx 形式也归一） */
  function isInternal(url: string): boolean {
    return url.startsWith("/") || url.startsWith("#/") || url.startsWith(location.origin + "/");
  }

  function normalizeInternal(url: string): string {
    let u = url;
    if (u.startsWith(location.origin)) u = u.slice(location.origin.length);
    if (u.startsWith("#")) u = u.slice(1);
    return u || "/";
  }

  function handleNav(url: string, openInNew: boolean) {
    if (isInternal(url) && !openInNew) {
      closeSidenav();
      navigate(normalizeInternal(url));
    }
  }

  return (
    <>
      {/* 遮罩 */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-ink/40 backdrop-blur-[2px] transition-opacity duration-300",
          sidenavOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={closeSidenav}
        aria-hidden="true"
      />

      {/* 抽屉主体 */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r shadow-paper transition-transform duration-300 ease-out",
          sidenavOpen ? "translate-x-0" : "-translate-x-full",
        )}
        style={{
          backgroundColor: theme.card_color,
          borderColor: theme.border_color,
        }}
        aria-label={getValue("global.sidenav_title")}
      >
        {/* 头部：Logo + 标题 */}
        <div
          className="flex h-14 flex-none items-center gap-2.5 border-b px-4"
          style={{ borderColor: theme.border_color }}
        >
          {logoImage ? (
            <img
              src={logoImage}
              alt={getValue("global.a11y_logo")}
              className="h-8 w-8 rounded-full border object-cover"
              style={{ borderColor: theme.border_color }}
            />
          ) : (
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full border text-sm font-bold"
              style={{
                borderColor: theme.border_color,
                color: theme.logo_text_color || theme.text_color,
              }}
            >
              {logoText.slice(0, 1)}
            </span>
          )}
          <p
            className="flex-1 truncate font-hand text-base"
            style={{ color: theme.text_color }}
          >
            {getValue("global.sidenav_title")}
          </p>
          <button
            type="button"
            onClick={closeSidenav}
            aria-label={getValue("global.a11y_close")}
            className="rounded-full p-1.5 transition-colors hover:bg-black/5"
            style={{ color: theme.nav_text_color }}
          >
            <X className="h-4 w-4" strokeWidth={1.8} />
          </button>
        </div>

        {/* 导航列表 */}
        <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
          {groups.map(([group, items]) => (
            <div key={group || "__default__"}>
              {group && (
                <p
                  className="mb-1.5 px-3 text-[10px] font-semibold tracking-wider"
                  style={{ color: theme.nav_text_color }}
                >
                  {group}
                </p>
              )}
              <div className="space-y-0.5">
                {items.map((item) => {
                  const internal = isInternal(item.url) && !item.open_in_new;
                  const cls =
                    "flex w-full items-center gap-2.5 rounded-soft px-3 py-2.5 text-sm transition-colors";
                  const style = { color: theme.text_color };
                  if (internal) {
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleNav(item.url, item.open_in_new)}
                        className={cn(cls, "hover:bg-black/5")}
                        style={style}
                      >
                        <NavIcon
                          name={item.icon}
                          className="h-4 w-4 flex-none opacity-70"
                        />
                        <span className="flex-1 truncate text-left">{item.label}</span>
                      </button>
                    );
                  }
                  return (
                    <a
                      key={item.id}
                      href={item.url}
                      target={item.open_in_new ? "_blank" : undefined}
                      rel={item.open_in_new ? "noreferrer" : undefined}
                      className={cn(cls, "hover:bg-black/5")}
                      style={style}
                      onClick={() => closeSidenav()}
                    >
                      <NavIcon
                        name={item.icon}
                        className="h-4 w-4 flex-none opacity-70"
                      />
                      <span className="flex-1 truncate">{item.label}</span>
                      <ExternalLink className="h-3 w-3 flex-none opacity-40" />
                    </a>
                  );
                })}
              </div>
            </div>
          ))}
          {rows.filter((r) => r.active).length === 0 && (
            <p className="px-3 py-6 text-center text-xs" style={{ color: theme.nav_text_color }}>
              暂无导航项，请到后台「导航」添加
            </p>
          )}
        </nav>
      </aside>
    </>
  );
}
