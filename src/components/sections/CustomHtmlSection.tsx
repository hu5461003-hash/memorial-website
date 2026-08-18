import { useEffect, useRef } from "react";

/**
 * 自定义代码块：注入自定义 HTML/CSS/JavaScript
 * 使用 dangerouslySetInnerHTML 渲染 HTML，并在容器内执行 script 标签。
 */
export default function CustomHtmlSection({ data }: { data: Record<string, unknown> }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const html = (data.html as string) ?? "";

  useEffect(() => {
    if (!containerRef.current || !html) return;
    // 清空容器
    containerRef.current.innerHTML = html;

    // 手动执行 script 标签（innerHTML 不会自动执行）
    const scripts = containerRef.current.querySelectorAll("script");
    scripts.forEach((oldScript) => {
      const newScript = document.createElement("script");
      for (const attr of Array.from(oldScript.attributes)) {
        newScript.setAttribute(attr.name, attr.value);
      }
      newScript.textContent = oldScript.textContent;
      oldScript.parentNode?.replaceChild(newScript, oldScript);
    });
  }, [html]);

  if (!html) return null;

  return (
    <section className="my-4">
      <div ref={containerRef} className="custom-html-section" />
    </section>
  );
}
