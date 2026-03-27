import { useState, useCallback, type KeyboardEvent, type ChangeEvent } from "react";
import { useConfig } from "../../config/store";
import { useTheme } from "../../hooks/useTheme";
import { Input } from "../common/Input";
import { Select } from "../common/Select";
import { Toggle } from "../common/Toggle";
import { Button } from "../common/Button";
import { Tooltip } from "../common/Tooltip";
import type { PlatformCapabilities } from "../../platform/platform";
import type { ColorMode, VisualStyle } from "../../hooks/useTheme";

// ─── Shared styles ──────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  backgroundColor: "var(--color-bg-secondary)",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--color-border-primary)",
  padding: "var(--space-6)",
};

const headingStyle: React.CSSProperties = {
  fontSize: "var(--font-size-lg)",
  fontWeight: "var(--font-weight-semibold)" as unknown as number,
  fontFamily: "var(--font-ui)",
  color: "var(--color-text-primary)",
  margin: 0,
  marginBottom: "var(--space-1)",
};

const descriptionStyle: React.CSSProperties = {
  fontSize: "var(--font-size-sm)",
  color: "var(--color-text-secondary)",
  fontFamily: "var(--font-ui)",
  margin: 0,
  marginBottom: "var(--space-4)",
};

const fieldRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "var(--space-4)",
  marginBottom: "var(--space-3)",
};

const fieldLabelStyle: React.CSSProperties = {
  fontSize: "var(--font-size-base)",
  fontFamily: "var(--font-ui)",
  color: "var(--color-text-primary)",
  flexShrink: 0,
  minWidth: 140,
};

const fieldHintStyle: React.CSSProperties = {
  fontSize: "var(--font-size-xs)",
  fontFamily: "var(--font-ui)",
  color: "var(--color-text-secondary)",
  marginTop: 2,
};

const fieldControlStyle: React.CSSProperties = {
  maxWidth: 240,
  width: "100%",
};

// ─── Extension Editor sub-component ─────────────────────────────────────

function ExtensionEditor({
  extensions,
  onChange,
}: {
  extensions: string[];
  onChange: (exts: string[]) => void;
}) {
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const validate = (ext: string): boolean => {
    if (!ext.startsWith(".")) return false;
    if (ext.length < 2) return false;
    return /^\.[a-zA-Z0-9]+$/.test(ext);
  };

  const handleAdd = useCallback(() => {
    const trimmed = inputValue.trim().toLowerCase();
    if (!trimmed) return;

    if (!validate(trimmed)) {
      setError("Must start with dot, alphanumeric after (e.g. .md)");
      return;
    }

    if (extensions.includes(trimmed)) {
      setError("Already added");
      return;
    }

    onChange([...extensions, trimmed]);
    setInputValue("");
    setError(null);
  }, [inputValue, extensions, onChange]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleAdd();
      }
    },
    [handleAdd],
  );

  const handleRemove = useCallback(
    (ext: string) => {
      onChange(extensions.filter((e) => e !== ext));
    },
    [extensions, onChange],
  );

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-1)", marginBottom: "var(--space-2)" }}>
        {extensions.map((ext) => (
          <span
            key={ext}
            data-testid="extension-chip"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "var(--space-1)",
              padding: "2px var(--space-2)",
              backgroundColor: "var(--color-accent-subtle)",
              color: "var(--color-accent)",
              borderRadius: "var(--radius-sm)",
              fontSize: "var(--font-size-sm)",
              fontFamily: "var(--font-editor)",
            }}
          >
            {ext}
            <Tooltip content={`Remove ${ext}`}>
              <button
                type="button"
                aria-label={`Remove ${ext}`}
                onClick={() => handleRemove(ext)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  color: "inherit",
                  fontSize: "var(--font-size-sm)",
                  lineHeight: 1,
                }}
              >
                &times;
              </button>
            </Tooltip>
          </span>
        ))}
      </div>
      <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <input
            type="text"
            value={inputValue}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              setInputValue(e.target.value);
              setError(null);
            }}
            onKeyDown={handleKeyDown}
            placeholder=".ext"
            data-testid="extension-input"
            style={{
              backgroundColor: "var(--color-bg-tertiary)",
              border: `1px solid ${error ? "var(--color-error)" : "var(--color-border-primary)"}`,
              borderRadius: "var(--radius-sm)",
              padding: "var(--space-1) var(--space-2)",
              fontSize: "var(--font-size-base)",
              fontFamily: "var(--font-ui)",
              color: "var(--color-text-primary)",
              outline: "none",
              width: "100%",
              boxSizing: "border-box" as const,
            }}
          />
          {error && (
            <div
              data-testid="extension-error"
              style={{
                fontSize: "var(--font-size-xs)",
                color: "var(--color-error)",
                marginTop: 2,
                fontFamily: "var(--font-ui)",
              }}
            >
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Settings component ─────────────────────────────────────────────────

interface SettingsProps {
  capabilities: PlatformCapabilities;
}

export function Settings({ capabilities }: SettingsProps) {
  const { config, updateConfig, resetConfig } = useConfig();
  const theme = useTheme();

  // ── Appearance handlers ────────────────────────────────────────────────
  const handleColorMode = useCallback(
    (mode: ColorMode) => {
      updateConfig("appearance", { colorMode: mode });
      theme.setColorMode(mode);
    },
    [updateConfig, theme],
  );

  const handleVisualStyle = useCallback(
    (style: string) => {
      const vs = style as VisualStyle;
      updateConfig("appearance", { visualStyle: vs });
      theme.setVisualStyle(vs);
    },
    [updateConfig, theme],
  );

  const modeButtons: { label: string; value: ColorMode }[] = [
    { label: "Light", value: "light" },
    { label: "Dark", value: "dark" },
    { label: "System", value: "system" },
  ];

  return (
    <div
      data-testid="settings-panel"
      style={{
        flex: 1,
        overflow: "auto",
        padding: "var(--space-6)",
        maxWidth: 680,
        margin: "0 auto",
        width: "100%",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-6)",
      }}
    >
      {/* ── Section 1: Appearance ──────────────────────────────────────── */}
      <section data-testid="settings-appearance" style={cardStyle}>
        <h2 style={headingStyle}>Appearance</h2>
        <p style={descriptionStyle}>Customize the look and feel of the application.</p>

        <div style={fieldRowStyle}>
          <div><span style={fieldLabelStyle}>Color mode</span><div style={fieldHintStyle}>Choose light, dark, or follow your OS preference</div></div>
          <div style={{ display: "flex", gap: 0, ...fieldControlStyle }}>
            {modeButtons.map((btn, idx) => {
              const isActive = config.appearance.colorMode === btn.value;
              const isFirst = idx === 0;
              const isLast = idx === modeButtons.length - 1;
              return (
                <Tooltip key={btn.value} content={`Switch to ${btn.label.toLowerCase()} mode`}>
                  <button
                    type="button"
                    data-testid={`mode-${btn.value}`}
                    aria-label={`${btn.label} color mode`}
                    aria-pressed={config.appearance.colorMode === btn.value}
                    onClick={() => handleColorMode(btn.value)}
                  style={{
                    flex: 1,
                    padding: "var(--space-1) var(--space-2)",
                    fontSize: "var(--font-size-sm)",
                    fontFamily: "var(--font-ui)",
                    border: "1px solid var(--color-border-primary)",
                    borderLeft: isFirst ? "1px solid var(--color-border-primary)" : "none",
                    borderRadius: isFirst
                      ? "var(--radius-sm) 0 0 var(--radius-sm)"
                      : isLast
                        ? "0 var(--radius-sm) var(--radius-sm) 0"
                        : "0",
                    cursor: "pointer",
                    backgroundColor: isActive
                      ? "var(--color-accent)"
                      : "var(--color-bg-tertiary)",
                    color: isActive ? "#ffffff" : "var(--color-text-primary)",
                    outline: "none",
                    transition: "background-color 120ms ease-out, color 120ms ease-out",
                  }}
                >
                  {btn.label}
                </button>
                </Tooltip>
              );
            })}
          </div>
        </div>

        <div style={fieldRowStyle}>
          <div><span style={fieldLabelStyle}>Visual style</span><div style={fieldHintStyle}>Accent palette applied to the UI chrome</div></div>
          <div style={fieldControlStyle}>
            <Select
              value={config.appearance.visualStyle}
              onChange={handleVisualStyle}
              options={[
                { value: "default", label: "Default" },
                { value: "warm", label: "Warm" },
                { value: "cool", label: "Cool" },
                { value: "monochrome", label: "Monochrome" },
              ]}
            />
          </div>
        </div>

        <div style={fieldRowStyle}>
          <div><span style={fieldLabelStyle}>Show button labels</span><div style={fieldHintStyle}>Display text labels alongside icons on toolbar buttons</div></div>
          <Toggle
            checked={config.appearance.showButtonLabels}
            onChange={(v) => updateConfig("appearance", { showButtonLabels: v })}
          />
        </div>
      </section>

      {/* ── Section 2: Editor ──────────────────────────────────────────── */}
      <section data-testid="settings-editor" style={cardStyle}>
        <h2 style={headingStyle}>Editor</h2>
        <p style={descriptionStyle}>Configure the markdown editor behavior and appearance.</p>

        <div style={fieldRowStyle}>
          <div><span style={fieldLabelStyle}>Font family</span><div style={fieldHintStyle}>CSS font stack used in the editor pane</div></div>
          <div style={fieldControlStyle}>
            <Input
              value={config.editor.fontFamily}
              onChange={(e) => updateConfig("editor", { fontFamily: e.target.value })}
              placeholder={config.editor.fontFamily}
            />
          </div>
        </div>

        <div style={fieldRowStyle}>
          <div><span style={fieldLabelStyle}>Font size</span><div style={fieldHintStyle}>Editor text size in pixels (8–32)</div></div>
          <div style={fieldControlStyle}>
            <input
              type="number"
              min={8}
              max={32}
              step={1}
              value={config.editor.fontSize}
              onChange={(e) =>
                updateConfig("editor", { fontSize: Number(e.target.value) })
              }
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
              }}
            />
          </div>
        </div>

        <div style={fieldRowStyle}>
          <div><span style={fieldLabelStyle}>Line height</span><div style={fieldHintStyle}>Editor line spacing multiplier (1.0–3.0)</div></div>
          <div style={fieldControlStyle}>
            <input
              type="number"
              min={1.0}
              max={3.0}
              step={0.1}
              value={config.editor.lineHeight}
              onChange={(e) =>
                updateConfig("editor", { lineHeight: Number(e.target.value) })
              }
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
              }}
            />
          </div>
        </div>

        <div style={fieldRowStyle}>
          <div><span style={fieldLabelStyle}>Show line numbers</span><div style={fieldHintStyle}>Display line numbers in the editor gutter</div></div>
          <Toggle
            checked={config.editor.showLineNumbers}
            onChange={(v) => updateConfig("editor", { showLineNumbers: v })}
          />
        </div>

        <div style={fieldRowStyle}>
          <div><span style={fieldLabelStyle}>Word wrap</span><div style={fieldHintStyle}>Wrap long lines instead of horizontal scrolling</div></div>
          <Toggle
            checked={config.editor.wordWrap}
            onChange={(v) => updateConfig("editor", { wordWrap: v })}
          />
        </div>

        <div style={fieldRowStyle}>
          <div><span style={fieldLabelStyle}>Linting enabled</span><div style={fieldHintStyle}>Run a linter on markdown content in real time</div></div>
          <Toggle
            checked={config.editor.lintingEnabled}
            onChange={(v) => updateConfig("editor", { lintingEnabled: v })}
          />
        </div>

        <div style={fieldRowStyle}>
          <div><span style={fieldLabelStyle}>Active linter</span><div style={fieldHintStyle}>Which markdown linter to use when linting is on</div></div>
          <div style={fieldControlStyle}>
            <Select
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
              disabled={!config.editor.lintingEnabled}
            />
          </div>
        </div>
      </section>

      {/* ── Section 3: Preview ──────────────────────────────────────────── */}
      <section data-testid="settings-preview" style={cardStyle}>
        <h2 style={headingStyle}>Preview</h2>
        <p style={descriptionStyle}>Adjust the markdown preview rendering.</p>

        <div style={fieldRowStyle}>
          <div><span style={fieldLabelStyle}>Font family</span><div style={fieldHintStyle}>CSS font stack used in the preview pane</div></div>
          <div style={fieldControlStyle}>
            <Input
              value={config.preview.fontFamily}
              onChange={(e) => updateConfig("preview", { fontFamily: e.target.value })}
              placeholder={config.preview.fontFamily}
            />
          </div>
        </div>

        <div style={fieldRowStyle}>
          <div><span style={fieldLabelStyle}>Font size</span><div style={fieldHintStyle}>Preview text size in pixels (8–32)</div></div>
          <div style={fieldControlStyle}>
            <input
              type="number"
              min={8}
              max={32}
              step={1}
              value={config.preview.fontSize}
              onChange={(e) =>
                updateConfig("preview", { fontSize: Number(e.target.value) })
              }
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
              }}
            />
          </div>
        </div>

        <div style={fieldRowStyle}>
          <div><span style={fieldLabelStyle}>Line height</span><div style={fieldHintStyle}>Preview line spacing multiplier (1.0–3.0)</div></div>
          <div style={fieldControlStyle}>
            <input
              type="number"
              min={1.0}
              max={3.0}
              step={0.1}
              value={config.preview.lineHeight}
              onChange={(e) =>
                updateConfig("preview", { lineHeight: Number(e.target.value) })
              }
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
              }}
            />
          </div>
        </div>
      </section>

      {/* ── Section 4: Markdown Engine ──────────────────────────────────── */}
      <section data-testid="settings-engine" style={cardStyle}>
        <h2 style={headingStyle}>Markdown Engine</h2>
        <p style={descriptionStyle}>Choose the rendering engine for markdown content.</p>

        <div style={fieldRowStyle}>
          <div><span style={fieldLabelStyle}>Engine</span><div style={fieldHintStyle}>Markdown-to-HTML rendering library</div></div>
          <div style={fieldControlStyle}>
            <Select
              value={config.engine.activeEngine}
              onChange={(v) =>
                updateConfig("engine", {
                  activeEngine: v as "markdown-it" | "marked" | "remark",
                })
              }
              options={[
                { value: "markdown-it", label: "markdown-it" },
                { value: "marked", label: "marked" },
                { value: "remark", label: "remark" },
              ]}
            />
          </div>
        </div>
      </section>

      {/* ── Section 5: File Extensions ──────────────────────────────────── */}
      <section data-testid="settings-extensions" style={cardStyle}>
        <h2 style={headingStyle}>File Extensions</h2>
        <p style={descriptionStyle}>Manage recognized markdown file extensions.</p>

        <ExtensionEditor
          extensions={config.fileExtensions.recognized}
          onChange={(exts) => updateConfig("fileExtensions", { recognized: exts })}
        />
      </section>

      {/* ── Section 6: Advanced ────────────────────────────────────────── */}
      <section data-testid="settings-advanced" style={cardStyle}>
        <h2 style={headingStyle}>Advanced</h2>
        <p style={descriptionStyle}>Low-level settings for debugging and diagnostics.</p>

        <div style={fieldRowStyle}>
          <div>
            <label style={fieldLabelStyle}>Log verbosity</label>
            <p style={fieldHintStyle}>
              Minimum severity for persisted log entries. Events below this level are discarded.
            </p>
          </div>
          <div style={fieldControlStyle}>
            <Tooltip content="Controls which log levels are stored in the database">
              <Select
                value={config.advanced.logVerbosity}
                onChange={(value) =>
                  updateConfig("advanced", {
                    logVerbosity: value as "debug" | "info" | "warning" | "error",
                  })
                }
                options={[
                  { value: "debug", label: "Debug" },
                  { value: "info", label: "Info" },
                  { value: "warning", label: "Warning" },
                  { value: "error", label: "Error" },
                ]}
              />
            </Tooltip>
          </div>
        </div>
      </section>

      {/* ── Reset ──────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Tooltip content="Restore all settings to their default values">
          <Button variant="ghost" onClick={resetConfig}>
            Reset to defaults
          </Button>
        </Tooltip>
      </div>
    </div>
  );
}
