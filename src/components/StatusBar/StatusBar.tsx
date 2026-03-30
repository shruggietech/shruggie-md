interface StatusBarProps {
  activeEngine: "markdown-it" | "marked" | "remark";
}

function getEngineDisplayName(engine: StatusBarProps["activeEngine"]): string {
  switch (engine) {
    case "markdown-it":
      return "markdown-it (GFM)";
    case "marked":
      return "Marked";
    case "remark":
      return "Remark";
    default:
      return engine;
  }
}

export function StatusBar({ activeEngine }: StatusBarProps) {
  const version = typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "0.0.0";

  return (
    <footer
      data-testid="status-bar"
      style={{
        height: 24,
        minHeight: 24,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "var(--space-2)",
        padding: "0 var(--space-3)",
        borderTop: "1px solid var(--color-border-primary)",
        backgroundColor: "var(--color-bg-secondary)",
        color: "var(--color-text-tertiary)",
        fontSize: "var(--font-size-xs)",
        fontFamily: "var(--font-ui)",
      }}
    >
      <span data-testid="status-bar-engine">{getEngineDisplayName(activeEngine)}</span>
      <span data-testid="status-bar-version">Shruggie Markdown v{version}</span>
    </footer>
  );
}
