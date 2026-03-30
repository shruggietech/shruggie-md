import { Eye, Columns2, FolderOpen, Settings, FileDown, RefreshCw, Search, SquarePen, ChevronDown, ChevronUp, FolderOpenDot, FilePlus } from "lucide-react";
import { Button, SplitButton } from "../common";
import type { ViewMode } from "@/hooks/useViewMode";

export interface ToolbarProps {
  activeView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  fileName: string | null;
  filePath?: string | null;
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
  mode: "view" | "edit" | "edit-only";
  icon: typeof Eye;
  tooltip: string;
  label: string;
}

const contentModeButtons: ViewButton[] = [
  { mode: "view", icon: Eye, tooltip: "View (Ctrl+1)", label: "View" },
  { mode: "edit", icon: Columns2, tooltip: "Edit (Ctrl+2)", label: "Edit" },
  { mode: "edit-only", icon: SquarePen, tooltip: "Edit Only (Ctrl+4)", label: "Edit Only" },
];

function DestinationButton({
  active,
  icon,
  label,
  tooltip,
  showLabel,
  onClick,
}: {
  active: boolean;
  icon: typeof FolderOpen;
  label: string;
  tooltip: string;
  showLabel: boolean;
  onClick: () => void;
}) {
  return (
    <div
      style={{
        borderRadius: "var(--radius-sm)",
        backgroundColor: active ? "var(--color-bg-active)" : "transparent",
      }}
    >
      <Button
        icon={icon}
        tooltip={tooltip}
        label={label}
        showLabel={showLabel}
        onClick={onClick}
      />
    </div>
  );
}

export function Toolbar({
  activeView,
  onViewChange,
  fileName,
  filePath = null,
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
  onExport,
  isRefreshing = false,
  onRefreshWorkspaces,
  workspacesFilter = "",
  onWorkspacesFilterChange,
  isWorkspacesScanning = false,
}: ToolbarProps) {
  const isWorkspacesView = activeView === "workspaces";
  const isSettingsView = activeView === "settings";
  const isDocumentView = !isWorkspacesView && !isSettingsView;
  const showToolbarChevron = onToggleToolbarPanel && isDocumentView;
  const fullFileTitle = filePath ?? fileName ?? "";

  return (
    <header
      data-testid="toolbar"
      style={{
        height: 40,
        minHeight: 40,
        maxHeight: 40,
        display: "flex",
        alignItems: "center",
        gap: "var(--space-4)",
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
      <div
        data-testid="toolbar-navigation-zone"
        style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}
      >
        <nav
          data-testid="toolbar-view-buttons"
          style={{
            display: "inline-flex",
            alignItems: "center",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--color-border-subtle)",
            backgroundColor: "var(--color-bg-tertiary)",
            padding: 2,
            gap: 2,
          }}
        >
          {contentModeButtons.map((btn) => {
            const isActive = activeView === btn.mode;
            return (
              <div
                key={btn.mode}
                style={{
                  borderRadius: "calc(var(--radius-sm) - 2px)",
                  backgroundColor: isActive ? "var(--color-bg-active)" : "transparent",
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

        {showToolbarChevron && (
          <Button
            icon={toolbarPanelExpanded ? ChevronUp : ChevronDown}
            tooltip={toolbarPanelExpanded ? "Hide quick settings" : "Show quick settings"}
            label=""
            showLabel={false}
            onClick={onToggleToolbarPanel}
          />
        )}
      </div>

      <div
        data-testid="toolbar-context-zone"
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {isWorkspacesView && (
          <div
            data-testid="toolbar-workspaces-controls"
            style={{
              display: "flex",
              gap: "var(--space-1)",
              alignItems: "center",
              width: "100%",
              maxWidth: 540,
            }}
          >
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
                  minWidth: 0,
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
            {isWorkspacesScanning && (
              <span style={{ color: "var(--color-text-secondary)", fontSize: "var(--font-size-xs)" }}>
                Scanning...
              </span>
            )}
          </div>
        )}

        {isSettingsView && (
          <span style={{ color: "var(--color-text-secondary)", fontSize: "var(--font-size-sm)" }}>
            Settings
          </span>
        )}

        {isDocumentView && (
          <span
            data-testid="toolbar-filename"
            title={fullFileTitle || undefined}
            style={{
              color: fileName
                ? "var(--color-text-primary)"
                : "var(--color-text-tertiary)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              textAlign: "center",
              width: "100%",
            }}
          >
            {fileName ?? "No file"}
          </span>
        )}
      </div>

      <div
        data-testid="toolbar-actions-zone"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2)",
        }}
      >
        {isDocumentView && (
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
                showLabel={showButtonLabels}
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
        )}

        {isDocumentView && (
          <div
            data-testid="toolbar-actions-separator"
            style={{
              width: 1,
              height: 20,
              backgroundColor: "var(--color-border-subtle)",
              margin: "0 var(--space-1)",
            }}
          />
        )}

        <div data-testid="toolbar-destinations" style={{ display: "flex", alignItems: "center", gap: "var(--space-1)" }}>
          {hasFilesystem && (
            <DestinationButton
              active={isWorkspacesView}
              icon={FolderOpen}
              tooltip="Workspaces (Ctrl+3)"
              label="Workspaces"
              showLabel={showButtonLabels}
              onClick={() => onViewChange("workspaces")}
            />
          )}
          <DestinationButton
            active={isSettingsView}
            icon={Settings}
            tooltip="Settings (Ctrl+,)"
            label="Settings"
            showLabel={showButtonLabels}
            onClick={() => onViewChange("settings")}
          />
        </div>
      </div>
    </header>
  );
}
