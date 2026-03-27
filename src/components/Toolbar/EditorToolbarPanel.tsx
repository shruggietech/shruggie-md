import type { ViewMode } from "@/hooks/useViewMode";
import type { Config } from "@/types/config";

export interface EditorToolbarPanelProps {
  viewMode: ViewMode;
  config: Config;
  updateConfig: <K extends keyof Config>(section: K, values: Partial<Config[K]>) => void;
}

function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  tooltip,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  tooltip?: string;
}) {
  return (
    <label
      title={tooltip}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-1)",
        fontSize: "var(--font-size-xs)",
        color: "var(--color-text-secondary)",
        whiteSpace: "nowrap",
      }}
    >
      {label}
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const n = parseFloat(e.target.value);
          if (!isNaN(n)) onChange(n);
        }}
        style={{
          width: 52,
          backgroundColor: "var(--color-bg-tertiary)",
          border: "1px solid var(--color-border-primary)",
          borderRadius: "var(--radius-sm)",
          padding: "2px var(--space-1)",
          fontSize: "var(--font-size-xs)",
          fontFamily: "var(--font-ui)",
          color: "var(--color-text-primary)",
          outline: "none",
        }}
      />
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
  tooltip,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  tooltip?: string;
}) {
  return (
    <label
      title={tooltip}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-1)",
        fontSize: "var(--font-size-xs)",
        color: "var(--color-text-secondary)",
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ accentColor: "var(--color-accent)" }}
      />
      {label}
    </label>
  );
}

function SelectInput({
  label,
  value,
  options,
  onChange,
  tooltip,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  tooltip?: string;
}) {
  return (
    <label
      title={tooltip}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-1)",
        fontSize: "var(--font-size-xs)",
        color: "var(--color-text-secondary)",
        whiteSpace: "nowrap",
      }}
    >
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          backgroundColor: "var(--color-bg-tertiary)",
          border: "1px solid var(--color-border-primary)",
          borderRadius: "var(--radius-sm)",
          padding: "2px var(--space-1)",
          fontSize: "var(--font-size-xs)",
          fontFamily: "var(--font-ui)",
          color: "var(--color-text-primary)",
          outline: "none",
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: "var(--font-size-xs)",
        fontWeight: 600,
        color: "var(--color-text-tertiary)",
        textTransform: "uppercase" as const,
        letterSpacing: "0.05em",
      }}
    >
      {children}
    </span>
  );
}

export function EditorToolbarPanel({ viewMode, config, updateConfig }: EditorToolbarPanelProps) {
  const showEditor = viewMode === "edit" || viewMode === "edit-only";
  const showPreview = viewMode === "view" || viewMode === "edit";

  return (
    <div
      data-testid="editor-toolbar-panel"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-4)",
        padding: "var(--space-2) var(--space-3)",
        backgroundColor: "var(--color-bg-secondary)",
        borderBottom: "1px solid var(--color-border-primary)",
        fontFamily: "var(--font-ui)",
        animation: "slideDown 150ms ease-out",
        overflow: "hidden",
      }}
    >
      {showEditor && (
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <SectionLabel>Editor</SectionLabel>
          <NumberInput
            label="Size"
            tooltip="Editor font size"
            value={config.editor.fontSize}
            onChange={(v) => updateConfig("editor", { fontSize: v })}
            min={8}
            max={32}
          />
          <NumberInput
            label="Height"
            tooltip="Editor line height"
            value={config.editor.lineHeight}
            onChange={(v) => updateConfig("editor", { lineHeight: v })}
            min={1}
            max={3}
            step={0.1}
          />
          <Toggle
            label="Line #"
            tooltip="Show line numbers"
            checked={config.editor.showLineNumbers}
            onChange={(v) => updateConfig("editor", { showLineNumbers: v })}
          />
          <Toggle
            label="Wrap"
            tooltip="Word wrap"
            checked={config.editor.wordWrap}
            onChange={(v) => updateConfig("editor", { wordWrap: v })}
          />
          <Toggle
            label="Lint"
            tooltip="Enable linting"
            checked={config.editor.lintingEnabled}
            onChange={(v) => updateConfig("editor", { lintingEnabled: v })}
          />
          {config.editor.lintingEnabled && (
            <SelectInput
              label="Linter"
              tooltip="Active linter"
              value={config.editor.activeLinter}
              onChange={(v) =>
                updateConfig("editor", {
                  activeLinter: v as "markdownlint" | "remark-lint",
                })
              }
              options={[
                { value: "markdownlint", label: "markdownlint" },
                { value: "remark-lint", label: "remark-lint" },
              ]}
            />
          )}
        </div>
      )}

      {showEditor && showPreview && (
        <div
          style={{
            width: 1,
            height: 24,
            backgroundColor: "var(--color-border-primary)",
            flexShrink: 0,
          }}
        />
      )}

      {showPreview && (
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <SectionLabel>Preview</SectionLabel>
          <NumberInput
            label="Size"
            tooltip="Preview font size"
            value={config.preview.fontSize}
            onChange={(v) => updateConfig("preview", { fontSize: v })}
            min={8}
            max={32}
          />
          <NumberInput
            label="Height"
            tooltip="Preview line height"
            value={config.preview.lineHeight}
            onChange={(v) => updateConfig("preview", { lineHeight: v })}
            min={1}
            max={3}
            step={0.1}
          />
        </div>
      )}
    </div>
  );
}
