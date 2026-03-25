import { type ChangeEventHandler } from "react";

interface InputProps {
  value: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  placeholder?: string;
  type?: string;
  className?: string;
}

export function Input({
  value,
  onChange,
  placeholder,
  type = "text",
  className,
}: InputProps) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={className}
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
        boxSizing: "border-box",
        transition: "border-color 120ms ease-out",
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = "var(--color-accent)";
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = "var(--color-border-primary)";
      }}
    />
  );
}
