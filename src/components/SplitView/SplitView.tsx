import { useState, useRef, useCallback, useEffect } from "react";
import { Editor } from "@/components/Editor";
import { Preview } from "@/components/Preview";
import { Divider } from "@/components/common";

export interface SplitViewProps {
  source: string;
  onSourceChange: (source: string) => void;
  engineId: string;
  lintingEnabled?: boolean;
  activeLinter?: string;
  showLineNumbers?: boolean;
  wordWrap?: boolean;
}

const MIN_PANE_WIDTH = 280;
const DEBOUNCE_MS = 150;

export function SplitView({ source, onSourceChange, engineId, lintingEnabled, activeLinter, showLineNumbers, wordWrap }: SplitViewProps) {
  const [splitPercent, setSplitPercent] = useState(50);
  const [debouncedSource, setDebouncedSource] = useState(source);

  // ── Debounced preview update ──────────────────────────────────────────
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSourceChange = useCallback(
    (newSource: string) => {
      onSourceChange(newSource);

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        setDebouncedSource(newSource);
      }, DEBOUNCE_MS);
    },
    [onSourceChange],
  );

  // Sync debouncedSource when source prop changes externally (e.g. file open)
  useEffect(() => {
    setDebouncedSource(source);
  }, [source]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // ── Scroll synchronization (editor → preview) ────────────────────────
  const editorPaneRef = useRef<HTMLDivElement>(null);
  const previewPaneRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const isSyncingRef = useRef(false);

  useEffect(() => {
    const editorPane = editorPaneRef.current;
    if (!editorPane) return;

    const handleScroll = () => {
      if (isSyncingRef.current) return;

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }

      rafRef.current = requestAnimationFrame(() => {
        const previewPane = previewPaneRef.current;
        // Find the actual scrollable element inside the editor pane
        const scrollable = editorPane.querySelector(".cm-scroller") as HTMLElement | null;
        if (!previewPane || !scrollable) return;

        const scrollHeight = scrollable.scrollHeight - scrollable.clientHeight;
        if (scrollHeight <= 0) return;

        const scrollPercent = scrollable.scrollTop / scrollHeight;

        // The preview pane has a child div that is the scrollable container
        const previewScrollable = previewPane.querySelector("[style]") as HTMLElement | null;
        const target = previewScrollable ?? previewPane;
        const targetScrollHeight = target.scrollHeight - target.clientHeight;

        if (targetScrollHeight > 0) {
          isSyncingRef.current = true;
          target.scrollTop = scrollPercent * targetScrollHeight;
          // Reset syncing flag after a short delay
          requestAnimationFrame(() => {
            isSyncingRef.current = false;
          });
        }
      });
    };

    // Listen on the cm-scroller element inside the editor pane
    const scrollable = editorPane.querySelector(".cm-scroller") as HTMLElement | null;
    const target = scrollable ?? editorPane;

    target.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      target.removeEventListener("scroll", handleScroll);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  });

  return (
    <div
      data-testid="split-view"
      style={{
        display: "flex",
        flex: 1,
        overflow: "hidden",
        height: "100%",
      }}
    >
      {/* Editor pane */}
      <div
        ref={editorPaneRef}
        data-testid="editor-pane"
        style={{
          width: `${splitPercent}%`,
          minWidth: MIN_PANE_WIDTH,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Editor
          value={source}
          onChange={handleSourceChange}
          engineId={engineId}
          lintingEnabled={lintingEnabled}
          activeLinter={activeLinter}
          showLineNumbers={showLineNumbers}
          wordWrap={wordWrap}
        />
      </div>

      <Divider onResize={setSplitPercent} minPaneWidth={MIN_PANE_WIDTH} />

      {/* Preview pane */}
      <div
        ref={previewPaneRef}
        data-testid="preview-pane"
        style={{
          flex: 1,
          minWidth: MIN_PANE_WIDTH,
          overflow: "auto",
        }}
      >
        <Preview source={debouncedSource} engineId={engineId} />
      </div>
    </div>
  );
}
