import { useId } from "react";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
}

export function Toggle({ checked, onChange, disabled = false, label }: ToggleProps) {
  const id = useId();

  return (
    <label
      htmlFor={id}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "var(--space-2)",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span
        style={{
          position: "relative",
          display: "inline-block",
          width: 36,
          height: 20,
          borderRadius: 10,
          backgroundColor: checked ? "var(--color-accent)" : "var(--color-bg-hover)",
          transition: "background-color 120ms ease-out",
          flexShrink: 0,
        }}
      >
        <input
          id={id}
          type="checkbox"
          role="switch"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          style={{
            position: "absolute",
            width: 1,
            height: 1,
            padding: 0,
            margin: -1,
            overflow: "hidden",
            clip: "rect(0,0,0,0)",
            whiteSpace: "nowrap",
            border: 0,
          }}
        />
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 2,
            left: checked ? 18 : 2,
            width: 16,
            height: 16,
            borderRadius: "50%",
            backgroundColor: "#ffffff",
            transition: "left 120ms ease-out",
            boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
          }}
        />
      </span>
      {label && (
        <span
          style={{
            fontSize: "var(--font-size-base)",
            fontFamily: "var(--font-ui)",
            color: "var(--color-text-primary)",
          }}
        >
          {label}
        </span>
      )}
    </label>
  );
}
