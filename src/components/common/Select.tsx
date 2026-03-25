interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  disabled?: boolean;
}

export function Select({ value, onChange, options, disabled = false }: SelectProps) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      style={{
        backgroundColor: "var(--color-bg-tertiary)",
        border: "1px solid var(--color-border-primary)",
        borderRadius: "var(--radius-sm)",
        padding: "var(--space-1) var(--space-2)",
        fontSize: "var(--font-size-base)",
        fontFamily: "var(--font-ui)",
        color: "var(--color-text-primary)",
        outline: "none",
        width: "100%",
        boxSizing: "border-box" as const,
        transition: "border-color 120ms ease-out",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.5 : 1,
        appearance: "auto" as const,
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = "var(--color-accent)";
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = "var(--color-border-primary)";
      }}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
