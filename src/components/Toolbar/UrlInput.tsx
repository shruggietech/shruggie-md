import { useState } from "react";
import { Globe, Info, Loader2 } from "lucide-react";
import { Button, Modal, Tooltip } from "../common";

export interface UrlInputProps {
  onSubmit: (url: string) => void;
  isLoading: boolean;
  error: string | null;
}

export function UrlInput({ onSubmit, isLoading, error }: UrlInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [showInfo, setShowInfo] = useState(false);

  const handleSubmit = () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <>
      <Button
        icon={Globe}
        tooltip="Fetch remote URL"
        onClick={() => setIsOpen(!isOpen)}
      />

      {isOpen && (
        <div
          data-testid="url-input-container"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-1)",
          }}
        >
          <input
            data-testid="url-input"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="https://raw.githubusercontent.com/..."
            disabled={isLoading}
            style={{
              backgroundColor: "var(--color-bg-tertiary)",
              border: `1px solid ${error ? "var(--color-error)" : "var(--color-border-primary)"}`,
              borderRadius: "var(--radius-sm)",
              padding: "var(--space-1) var(--space-2)",
              fontSize: "var(--font-size-sm)",
              fontFamily: "var(--font-ui)",
              color: "var(--color-text-primary)",
              outline: "none",
              width: 260,
              boxSizing: "border-box" as const,
            }}
          />

          {isLoading && (
            <span data-testid="url-loading" style={{ display: "inline-flex", color: "var(--color-text-secondary)" }}>
              <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
            </span>
          )}

          {error && (
            <span
              data-testid="url-error"
              style={{
                color: "var(--color-error)",
                fontSize: "var(--font-size-xs)",
                whiteSpace: "nowrap",
                maxWidth: 160,
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
              title={error}
            >
              {error}
            </span>
          )}

          <Tooltip content="Usage info">
            <button
              data-testid="url-info-button"
              type="button"
              onClick={() => setShowInfo(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--color-text-secondary)",
                padding: 2,
                borderRadius: "50%",
                fontSize: "var(--font-size-sm)",
              }}
              aria-label="Usage info"
            >
              <Info size={14} />
            </button>
          </Tooltip>
        </div>
      )}

      <Modal
        isOpen={showInfo}
        onClose={() => setShowInfo(false)}
        title="Remote URL Fetching"
      >
        <p
          style={{
            fontSize: "var(--font-size-base)",
            lineHeight: 1.6,
            color: "var(--color-text-secondary)",
            margin: 0,
          }}
        >
          Paste a public URL to a raw markdown file (e.g., a raw GitHub URL).
          The content will be rendered in read-only mode. Save is disabled for
          remote content.
        </p>
      </Modal>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
