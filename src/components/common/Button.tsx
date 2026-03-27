import { type LucideIcon } from "lucide-react";
import { Icon } from "./Icon";
import { Tooltip } from "./Tooltip";
import { type ReactNode, type MouseEventHandler } from "react";

interface ButtonProps {
  variant?: "ghost" | "accent";
  icon?: LucideIcon;
  tooltip?: string;
  label?: string;
  showLabel?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  children?: ReactNode;
}

export function Button({
  variant = "ghost",
  icon,
  tooltip,
  label,
  showLabel = false,
  onClick,
  disabled = false,
  children,
}: ButtonProps) {
  const isGhost = variant === "ghost";

  const button = (
    <button
      type="button"
      aria-label={tooltip ?? undefined}
      onClick={onClick}
      disabled={disabled}
      className="shruggie-btn"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "var(--space-1)",
        minWidth: 32,
        minHeight: 32,
        padding: `var(--space-1) var(--space-2)`,
        borderRadius: "var(--radius-sm)",
        border: "none",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.5 : 1,
        fontSize: "var(--font-size-sm)",
        fontFamily: "var(--font-ui)",
        transition:
          "background-color 120ms ease-out, color 120ms ease-out, border-color 120ms ease-out",
        backgroundColor: isGhost ? "transparent" : "var(--color-accent)",
        color: isGhost ? "var(--color-text-secondary)" : "#ffffff",
        outline: "none",
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        const el = e.currentTarget;
        if (isGhost) {
          el.style.backgroundColor = "var(--color-bg-hover)";
          el.style.color = "var(--color-text-primary)";
        } else {
          el.style.backgroundColor = "var(--color-accent-hover)";
        }
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        if (isGhost) {
          el.style.backgroundColor = "transparent";
          el.style.color = "var(--color-text-secondary)";
        } else {
          el.style.backgroundColor = "var(--color-accent)";
        }
      }}
    >
      {icon && <Icon icon={icon} size={16} />}
      {label && (
        <span
          style={{
            fontSize: "var(--font-size-xs)",
            fontFamily: "var(--font-ui)",
            lineHeight: 1,
            display: showLabel ? "inline" : "none",
          }}
          aria-hidden="true"
        >
          {label}
        </span>
      )}
      {children}
    </button>
  );

  if (tooltip) {
    return <Tooltip content={tooltip}>{button}</Tooltip>;
  }

  return button;
}
