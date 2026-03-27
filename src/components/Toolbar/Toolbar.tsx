import { Eye, Columns2, FolderOpen, Settings, FileDown, RefreshCw, Search, SquarePen, ChevronDown, ChevronUp, FolderOpenDot, FilePlus } from "lucide-react";
import { Button, SplitButton } from "../common";
import type { ViewMode } from "@/hooks/useViewMode";

export interface ToolbarProps {
  activeView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  fileName: string | null;
  hasFilesystem: boolean;
  showButtonLabels?: boolean;
  // Pop-down toolbar panel
  toolbarPanelExpanded?: boolean;
  onToggleToolbarPanel?: () => void;
  // File operations
  onOpen?: () => void;
  onNewDocument?: () => void;
  onSave?: () => void;
  onSaveAs?: () => void;
  hasFilePath?: boolean;
  canSave?: boolean;
  isSaving?: boolean;
  lastSaved?: Date | null;
  // Export
  onExport?: () => void;
  // File watcher
  isRefreshing?: boolean;
  // Workspace controls
  onRefreshWorkspaces?: () => void;
  workspacesFilter?: string;
  onWorkspacesFilterChange?: (filter: string) => void;
  isWorkspacesScanning?: boolean;
}

interface ViewButton {
  mode: ViewMode;
  icon: typeof Eye;
  tooltip: string;
  label: string;
  requiresFilesystem?: boolean;
}

const viewButtons: ViewButton[] = [
  { mode: "view", icon: Eye, tooltip: "View (Ctrl+1)", label: "View" },
  { mode: "edit", icon: Columns2, tooltip: "Edit (Ctrl+2)", label: "Edit" },
  { mode: "edit-only", icon: SquarePen, tooltip: "Edit Only (Ctrl+4)", label: "Edit Only" },
  {
    mode: "workspaces",
    icon: FolderOpen,
    tooltip: "Workspaces (Ctrl+3)",
    label: "Workspaces",
    requiresFilesystem: true,
  },
  { mode: "settings", icon: Settings, tooltip: "Settings (Ctrl+,)", label: "Settings" },
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
  showButtonLabels = true,
  toolbarPanelExpanded = false,
  onToggleToolbarPanel,
  onOpen,
  onNewDocument,
  onSave,
  onSaveAs,
  hasFilePath = false,
  canSave = false,
  isSaving = false,
  lastSaved = null,
  onExport,
  isRefreshing = false,
  onRefreshWorkspaces,
  workspacesFilter = "",
  onWorkspacesFilterChange,
  isWorkspacesScanning = false,
}: ToolbarProps) {
  const savedStatus = formatSavedStatus(lastSaved);
  const isWorkspacesView = activeView === "workspaces";
  const showToolbarChevron = onToggleToolbarPanel && activeView !== "workspaces" && activeView !== "settings";

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
                label={btn.label}
                showLabel={showButtonLabels}
                onClick={() => onViewChange(btn.mode)}
              />
            </div>
          );
        })}
      </nav>

      {/* Pop-down toolbar chevron */}
      {showToolbarChevron && (
        <Button
          icon={toolbarPanelExpanded ? ChevronUp : ChevronDown}
          tooltip={toolbarPanelExpanded ? "Hide quick settings" : "Show quick settings"}
          label=""
          showLabel={false}
          onClick={onToggleToolbarPanel}
        />
      )}

      {isWorkspacesView ? (
        <>
          {/* Workspace-specific controls */}
          <div data-testid="toolbar-workspaces-controls" style={{ display: "flex", gap: "var(--space-1)", alignItems: "center", marginLeft: "var(--space-3)", flex: 1, minWidth: 0 }}>
            {onRefreshWorkspaces && (
              <Button
                icon={RefreshCw}
                tooltip="Refresh workspace"
                label="Refresh"
                showLabel={showButtonLabels}
                onClick={onRefreshWorkspaces}
                disabled={isWorkspacesScanning}
              />
            )}
            {onWorkspacesFilterChange && (
              <div
                data-testid="toolbar-workspaces-filter"
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
                  data-testid="workspaces-filter-input"
                  type="text"
                  aria-label="Filter workspace files"
                  value={workspacesFilter}
                  onChange={(e) => onWorkspacesFilterChange(e.target.value)}
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

          {/* Workspace status */}
          <div data-testid="toolbar-status" style={{ display: "flex", alignItems: "center", gap: "var(--space-1)" }}>
            {isWorkspacesScanning && (
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
            {onOpen && (
              <Button
                icon={FolderOpenDot}
                tooltip="Open (Ctrl+O)"
                label="Open"
                showLabel={showButtonLabels}
                onClick={onOpen}
              />
            )}
            {onNewDocument && (
              <Button
                icon={FilePlus}
                tooltip="New Document"
                label="New"
                showLabel={showButtonLabels}
                onClick={onNewDocument}
              />
            )}
            {(onSave || onSaveAs) && (
              <SplitButton
                hasPath={hasFilePath}
                onSave={onSave ?? (() => {})}
                onSaveAs={onSaveAs ?? (() => {})}
                disabled={!canSave || isSaving}
                isSaving={isSaving}
              />
            )}
            {onExport && (
              <Button
                icon={FileDown}
                tooltip="Export (Ctrl+Shift+E)"
                label="Export"
                showLabel={showButtonLabels}
                onClick={onExport}
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
