import { useCallback, useRef, useEffect, useState } from "react";

interface DividerProps {
  onResize: (leftWidthPercent: number) => void;
  minPaneWidth?: number;
}

export function Divider({ onResize, minPaneWidth = 280 }: DividerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const dividerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const parentEl = dividerRef.current?.parentElement;
        if (!parentEl) return;

        const parentRect = parentEl.getBoundingClientRect();
        const parentWidth = parentRect.width;
        const relativeX = moveEvent.clientX - parentRect.left;

        // Enforce minimum pane widths
        const minPercent = (minPaneWidth / parentWidth) * 100;
        const maxPercent = 100 - minPercent;
        const percent = Math.min(
          maxPercent,
          Math.max(minPercent, (relativeX / parentWidth) * 100),
        );

        onResize(percent);
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [onResize, minPaneWidth],
  );

  // Set cursor on body during drag
  useEffect(() => {
    if (isDragging) {
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      return () => {
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
    }
  }, [isDragging]);

  const active = isDragging || isHovering;

  return (
    <div
      ref={dividerRef}
      data-testid="divider"
      role="separator"
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      style={{
        width: active ? 3 : 1,
        flexShrink: 0,
        cursor: "col-resize",
        backgroundColor: active
          ? "var(--color-accent-subtle)"
          : "var(--color-border-primary)",
        transition: isDragging
          ? "none"
          : "width 120ms ease-out, background-color 120ms ease-out",
        alignSelf: "stretch",
      }}
    />
  );
}
