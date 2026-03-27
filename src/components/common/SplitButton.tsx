import { useState, useRef, useEffect, type MouseEventHandler } from "react";
// Focus ring handled by CSS :focus-visible (see globals.css)
import { Save, ChevronDown } from "lucide-react";
import { Icon } from "./Icon";
import { Tooltip } from "./Tooltip";

interface SplitButtonProps {
  hasPath: boolean;
  onSave: () => void;
  onSaveAs: () => void;
  disabled?: boolean;
  isSaving?: boolean;
}

export function SplitButton({
  hasPath,
  onSave,
  onSaveAs,
  disabled = false,
  isSaving = false,
}: SplitButtonProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [dropdownOpen]);

  const isDisabled = disabled || isSaving;

  const buttonBaseStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "var(--space-1)",
    minHeight: 32,
    padding: "var(--space-1) var(--space-2)",
    border: "none",
    cursor: isDisabled ? "default" : "pointer",
    opacity: isDisabled ? 0.5 : 1,
    fontSize: "var(--font-size-sm)",
    fontFamily: "var(--font-ui)",
    transition: "background-color 120ms ease-out, color 120ms ease-out",
    backgroundColor: "transparent",
    color: "var(--color-text-secondary)",
    outline: "none",
  };

  const handleHover: MouseEventHandler<HTMLButtonElement> = (e) => {
    if (isDisabled) return;
    e.currentTarget.style.backgroundColor = "var(--color-bg-hover)";
    e.currentTarget.style.color = "var(--color-text-primary)";
  };

  const handleLeave: MouseEventHandler<HTMLButtonElement> = (e) => {
    e.currentTarget.style.backgroundColor = "transparent";
    e.currentTarget.style.color = "var(--color-text-secondary)";
  };

  // No established path: plain "Save As" button
  if (!hasPath) {
    return (
      <Tooltip content="Save As (Ctrl+Shift+S)">
        <button
          type="button"
          className="shruggie-btn"
          aria-label="Save As (Ctrl+Shift+S)"
          onClick={onSaveAs}
          disabled={isDisabled}
          style={{ ...buttonBaseStyle, borderRadius: "var(--radius-sm)", minWidth: 32 }}
          onMouseEnter={handleHover}
          onMouseLeave={handleLeave}
        >
          <Icon icon={Save} size={16} />
        </button>
      </Tooltip>
    );
  }

  // Established path: split-button with Save primary + Save As dropdown
  return (
    <div
      ref={containerRef}
      style={{ display: "inline-flex", position: "relative" }}
    >
      <Tooltip content="Save / Save As">
        <div
          style={{
            display: "inline-flex",
            borderRadius: "var(--radius-sm)",
            overflow: "hidden",
          }}
        >
          {/* Primary: Save */}
          <button
            type="button"
            className="shruggie-btn"
            aria-label="Save (Ctrl+S)"
            onClick={onSave}
            disabled={isDisabled}
            style={{
              ...buttonBaseStyle,
              borderRadius: "var(--radius-sm) 0 0 var(--radius-sm)",
              minWidth: 32,
            }}
            onMouseEnter={handleHover}
            onMouseLeave={handleLeave}
          >
            <Icon icon={Save} size={16} />
          </button>

          {/* Divider */}
          <span
            style={{
              width: 1,
              alignSelf: "stretch",
              backgroundColor: "var(--color-border-primary)",
            }}
          />

          {/* Chevron: opens dropdown */}
          <button
            type="button"
            className="shruggie-btn"
            aria-label="Save As (Ctrl+Shift+S)"
            aria-haspopup="true"
            aria-expanded={dropdownOpen}
            onClick={() => setDropdownOpen((prev) => !prev)}
            disabled={isDisabled}
            style={{
              ...buttonBaseStyle,
              borderRadius: "0 var(--radius-sm) var(--radius-sm) 0",
              padding: "var(--space-1)",
              minWidth: 20,
            }}
            onMouseEnter={handleHover}
            onMouseLeave={handleLeave}
          >
            <Icon icon={ChevronDown} size={12} />
          </button>
        </div>
      </Tooltip>

      {/* Dropdown menu */}
      {dropdownOpen && (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            marginTop: 2,
            minWidth: 120,
            backgroundColor: "var(--color-bg-secondary)",
            border: "1px solid var(--color-border-primary)",
            borderRadius: "var(--radius-sm)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            zIndex: 100,
            padding: "var(--space-1) 0",
          }}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setDropdownOpen(false);
              onSaveAs();
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
              width: "100%",
              padding: "var(--space-2) var(--space-3)",
              border: "none",
              backgroundColor: "transparent",
              color: "var(--color-text-primary)",
              fontSize: "var(--font-size-sm)",
              fontFamily: "var(--font-ui)",
              cursor: "pointer",
              textAlign: "left",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--color-bg-hover)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            Save As…
            <span
              style={{
                marginLeft: "auto",
                fontSize: "var(--font-size-xs)",
                color: "var(--color-text-secondary)",
              }}
            >
              Ctrl+Shift+S
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
