import { useRef, useEffect } from "react";
import { renderMarkdown } from "@/engines/index";
import { highlightCodeBlocks } from "@/engines/highlight";

export interface PreviewProps {
  source: string;
  engineId: string;
}

export function Preview({ source, engineId }: PreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const html = renderMarkdown(source, engineId);
    el.innerHTML = html;
    highlightCodeBlocks(el);
  }, [source, engineId]);

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        padding: "var(--space-6) 0",
      }}
    >
      <div
        ref={containerRef}
        className="preview-content"
        data-testid="preview-content"
      />
    </div>
  );
}
