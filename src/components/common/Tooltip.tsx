import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

interface TooltipProps {
  content: string;
  children: ReactNode;
}

export function Tooltip({ content, children }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });
  const triggerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showTooltip = useCallback(() => {
    timerRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const minLeft = 8;
        const maxLeft = window.innerWidth - 8;
        const computedLeft = rect.left + rect.width / 2;
        setPosition({
          top: rect.top - 6,
          left: Math.min(Math.max(computedLeft, minLeft), maxLeft),
        });
      }
      setVisible(true);
    }, 400);
  }, []);

  const hideTooltip = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setVisible(false);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={triggerRef}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      style={{ display: "inline-flex" }}
    >
      {children}
      {visible && createPortal(
        <div
          role="tooltip"
          style={{
            position: "fixed",
            top: position.top,
            left: position.left,
            transform: "translate(-50%, -100%)",
            backgroundColor: "var(--color-bg-active)",
            color: "var(--color-text-primary)",
            fontSize: "var(--font-size-xs)",
            borderRadius: "var(--radius-sm)",
            padding: "var(--space-1) var(--space-2)",
            whiteSpace: "nowrap",
            pointerEvents: "none",
            zIndex: 9999,
            opacity: 1,
            transition: "opacity 120ms ease-out",
          }}
        >
          {content}
        </div>
      , document.body)}
    </div>
  );
}
