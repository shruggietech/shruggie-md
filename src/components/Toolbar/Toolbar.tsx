import { Eye, Columns2, FolderOpen, Settings, FileCode, FileText, RefreshCw, Search } from "lucide-react";
import { Button, SplitButton } from "../common";
import { UrlInput } from "./UrlInput";
import type { ViewMode } from "@/hooks/useViewMode";

export interface ToolbarProps {
  activeView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  fileName: string | null;
  hasFilesystem: boolean;
  // File operations
  onSave?: () => void;
  onSaveAs?: () => void;
  hasFilePath?: boolean;
  canSave?: boolean;
  isSaving?: boolean;
  lastSaved?: Date | null;
  // Export
  onExportHtml?: () => void;
  onExportPdf?: () => void;
  // Remote URL
  onFetchUrl?: (url: string) => void;
  isFetchingUrl?: boolean;
  fetchUrlError?: string | null;
  // File watcher
  isRefreshing?: boolean;
  // Library controls
  onMountDirectory?: () => void;
  onRefreshLibrary?: () => void;
  libraryFilter?: string;
  onLibraryFilterChange?: (filter: string) => void;
  isLibraryScanning?: boolean;
}

interface ViewButton {
  mode: ViewMode;
  icon: typeof Eye;
  tooltip: string;
  requiresFilesystem?: boolean;
}

const viewButtons: ViewButton[] = [
  { mode: "full-view", icon: Eye, tooltip: "Full view (Ctrl+1)" },
  { mode: "split-view", icon: Columns2, tooltip: "Split view (Ctrl+2)" },
  {
    mode: "library",
    icon: FolderOpen,
    tooltip: "Library (Ctrl+3)",
    requiresFilesystem: true,
  },
  { mode: "settings", icon: Settings, tooltip: "Settings (Ctrl+,)" },
];

/**
 * Format a Date as a relative "Saved" message.
 */
function formatSavedStatus(lastSaved: Date | null): string | null {
  if (!lastSaved) return null;
  const diffMs = Date.now() - lastSaved.getTime();
  if (diffMs < 3000) return "Saved";
  return null;
}

export function Toolbar({
  activeView,
  onViewChange,
  fileName,
  hasFilesystem,
  onSave,
  onSaveAs,
  hasFilePath = false,
  canSave = false,
  isSaving = false,
  lastSaved = null,
  onExportHtml,
  onExportPdf,
  onFetchUrl,
  isFetchingUrl = false,
  fetchUrlError = null,
  isRefreshing = false,
  onMountDirectory,
  onRefreshLibrary,
  libraryFilter = "",
  onLibraryFilterChange,
  isLibraryScanning = false,
}: ToolbarProps) {
  const savedStatus = formatSavedStatus(lastSaved);
  const isLibraryView = activeView === "library";

  return (
    <header
      data-testid="toolbar"
      style={{
        height: 40,
        minHeight: 40,
        maxHeight: 40,
        display: "flex",
        alignItems: "center",
        gap: "var(--space-2)",
        padding: "0 var(--space-3)",
        backgroundColor: isRefreshing
          ? "var(--color-accent-subtle)"
          : "var(--color-bg-secondary)",
        borderBottom: "1px solid var(--color-border-primary)",
        fontFamily: "var(--font-ui)",
        fontSize: "var(--font-size-sm)",
        transition: "background-color 200ms ease-out",
      }}
    >
      {/* App name */}
      <span
        data-testid="toolbar-app-name"
        style={{
          fontWeight: 600,
          color: "var(--color-text-secondary)",
          whiteSpace: "nowrap",
          marginRight: "var(--space-2)",
        }}
      >
        Shruggie MD
      </span>

      {/* View mode toggle buttons */}
      <nav
        data-testid="toolbar-view-buttons"
        style={{
          display: "flex",
          gap: "var(--space-1)",
          alignItems: "center",
        }}
      >
        {viewButtons.map((btn) => {
          if (btn.requiresFilesystem && !hasFilesystem) return null;

          const isActive = activeView === btn.mode;

          return (
            <div
              key={btn.mode}
              style={{
                borderRadius: "var(--radius-sm)",
                backgroundColor: isActive
                  ? "var(--color-bg-active)"
                  : "transparent",
              }}
            >
              <Button
                icon={btn.icon}
                tooltip={btn.tooltip}
                onClick={() => onViewChange(btn.mode)}
              />
            </div>
          );
        })}
      </nav>

      {isLibraryView ? (
        <>
          {/* Library-specific controls */}
          <div data-testid="toolbar-library-controls" style={{ display: "flex", gap: "var(--space-1)", alignItems: "center", marginLeft: "var(--space-3)", flex: 1, minWidth: 0 }}>
            {onMountDirectory && (
              <Button
                icon={FolderOpen}
                tooltip="Mount directory"
                onClick={onMountDirectory}
              >
                Mount
              </Button>
            )}
            {onRefreshLibrary && (
              <Button
                icon={RefreshCw}
                tooltip="Refresh library"
                onClick={onRefreshLibrary}
                disabled={isLibraryScanning}
              />
            )}
            {onLibraryFilterChange && (
              <div
                data-testid="toolbar-library-filter"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-1)",
                  flex: 1,
                  maxWidth: 300,
                }}
              >
                <Search size={14} style={{ color: "var(--color-text-secondary)", flexShrink: 0 }} />
                <input
                  data-testid="library-filter-input"
                  type="text"
                  aria-label="Filter library files"
                  value={libraryFilter}
                  onChange={(e) => onLibraryFilterChange(e.target.value)}
                  placeholder="Filter files..."
                  style={{
                    backgroundColor: "var(--color-bg-tertiary)",
                    border: "1px solid var(--color-border-primary)",
                    borderRadius: "var(--radius-sm)",
                    padding: "var(--space-1) var(--space-2)",
                    fontSize: "var(--font-size-sm)",
                    fontFamily: "var(--font-ui)",
                    color: "var(--color-text-primary)",
                    outline: "none",
                    width: "100%",
                    boxSizing: "border-box" as const,
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "var(--color-accent)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "var(--color-border-primary)";
                  }}
                />
              </div>
            )}
          </div>

          {/* Library status */}
          <div data-testid="toolbar-status" style={{ display: "flex", alignItems: "center", gap: "var(--space-1)" }}>
            {isLibraryScanning && (
              <span style={{ color: "var(--color-text-secondary)", fontSize: "var(--font-size-xs)" }}>
                Scanning...
              </span>
            )}
          </div>
        </>
      ) : (
        <>
          {/* File name display */}
          <span
            data-testid="toolbar-filename"
            style={{
              marginLeft: "var(--space-3)",
              color: fileName
                ? "var(--color-text-primary)"
                : "var(--color-text-secondary)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              flex: 1,
              minWidth: 0,
            }}
          >
            {fileName ?? "No file"}
          </span>

          {/* Action buttons */}
          <div data-testid="toolbar-actions" style={{ display: "flex", gap: "var(--space-1)", alignItems: "center" }}>
            {(onSave || onSaveAs) && (
              <SplitButton
                hasPath={hasFilePath}
                onSave={onSave ?? (() => {})}
                onSaveAs={onSaveAs ?? (() => {})}
                disabled={!canSave || isSaving}
                isSaving={isSaving}
              />
            )}
            {onExportHtml && (
              <Button
                icon={FileCode}
                tooltip="Export HTML (Ctrl+Shift+H)"
                onClick={onExportHtml}
              />
            )}
            {onExportPdf && (
              <Button
                icon={FileText}
                tooltip="Export PDF (Ctrl+Shift+P)"
                onClick={onExportPdf}
              />
            )}
            {onFetchUrl && (
              <UrlInput
                onSubmit={onFetchUrl}
                isLoading={isFetchingUrl}
                error={fetchUrlError}
              />
            )}
          </div>

          {/* Status area */}
          <div data-testid="toolbar-status" style={{ display: "flex", alignItems: "center", gap: "var(--space-1)" }}>
            {isSaving && (
              <span style={{ color: "var(--color-text-secondary)", fontSize: "var(--font-size-xs)" }}>
                Saving...
              </span>
            )}
            {savedStatus && !isSaving && (
              <span
                data-testid="toolbar-saved-status"
                style={{ color: "var(--color-success)", fontSize: "var(--font-size-xs)" }}
              >
                {savedStatus}
              </span>
            )}
            {isRefreshing && (
              <span
                data-testid="toolbar-refresh-indicator"
                style={{ color: "var(--color-accent)", fontSize: "var(--font-size-xs)" }}
              >
                Refreshed
              </span>
            )}
          </div>
        </>
      )}
    </header>
  );
}
