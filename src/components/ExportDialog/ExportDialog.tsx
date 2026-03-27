import { useState, useCallback } from "react";
import { FileCode, FileText, FileDown } from "lucide-react";
import { Modal, Button } from "../common";

export type ExportFormat = "html" | "pdf" | "markdown";

export interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: ExportFormat) => void;
}

const formats: Array<{ id: ExportFormat; icon: typeof FileCode; label: string; description: string }> = [
  { id: "html", icon: FileCode, label: "HTML", description: "Self-contained HTML file with inlined styles." },
  { id: "pdf", icon: FileText, label: "PDF", description: "Print to PDF via the browser print dialog." },
  { id: "markdown", icon: FileDown, label: "Markdown", description: "Raw markdown file (.md)." },
];

export function ExportDialog({ isOpen, onClose, onExport }: ExportDialogProps) {
  const [selected, setSelected] = useState<ExportFormat>("html");

  const handleExport = useCallback(() => {
    onExport(selected);
    onClose();
  }, [selected, onExport, onClose]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Export">
      <div style={{ marginBottom: "var(--space-4)" }}>
        {formats.map((fmt) => {
          const isActive = selected === fmt.id;
          return (
            <button
              key={fmt.id}
              data-testid={`export-format-${fmt.id}`}
              type="button"
              onClick={() => setSelected(fmt.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-3)",
                width: "100%",
                padding: "var(--space-3)",
                marginBottom: "var(--space-2)",
                backgroundColor: isActive ? "var(--color-bg-active)" : "var(--color-bg-tertiary)",
                border: isActive ? "2px solid var(--color-accent)" : "2px solid var(--color-border-subtle)",
                borderRadius: "var(--radius-sm)",
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "var(--font-ui)",
                color: "var(--color-text-primary)",
              }}
            >
              <fmt.icon size={20} style={{ color: isActive ? "var(--color-accent)" : "var(--color-text-secondary)", flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: "var(--font-size-sm)" }}>{fmt.label}</div>
                <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)", marginTop: 2 }}>{fmt.description}</div>
              </div>
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-2)" }}>
        <Button label="Cancel" showLabel onClick={onClose} />
        <Button variant="accent" label="Export" showLabel onClick={handleExport} />
      </div>
    </Modal>
  );
}
