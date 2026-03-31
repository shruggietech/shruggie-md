import { useState, useMemo, useCallback } from "react";
import { FilePlus, Plus, Settings as SettingsIcon } from "lucide-react";
import { Button, Input, Modal, Select, Toggle } from "../common";
import type { WorkspaceFile, WorkspaceSettings } from "../../hooks/useWorkspaces";
import { validateWorkspaceName, parseWorkspaceSettings } from "../../hooks/useWorkspaces";
import type { WorkspaceRecord } from "../../storage";

export interface WorkspacesProps {
  files: WorkspaceFile[];
  workspaces: WorkspaceRecord[];
  activeWorkspaceId: string | null;
  hasFilesystem: boolean;
  onFileSelect: (path: string) => void;
  onActiveWorkspaceChange: (id: string) => void;
  onCreateWorkspace: (name: string, type: "internal" | "external", path?: string) => Promise<string | null>;
  onPickExternalDirectory: () => Promise<string | null>;
  onNewDocument?: () => void;
  onUpdateWorkspaceSettings?: (id: string, settings: Partial<WorkspaceSettings>) => Promise<void>;
  filter: string;
}

type SortKey = "title" | "path" | "lastEdited" | "created";
type SortDirection = "asc" | "desc";
type WorkspaceType = "internal" | "external";

interface SortSpec {
  key: SortKey;
  direction: SortDirection;
}

const columns: { key: SortKey; label: string }[] = [
  { key: "title", label: "Title" },
  { key: "path", label: "Path" },
  { key: "lastEdited", label: "Last Edited" },
  { key: "created", label: "Created" },
];

function compareFn(a: WorkspaceFile, b: WorkspaceFile, key: SortKey, direction: SortDirection): number {
  let result: number;

  switch (key) {
    case "title":
      result = a.title.toLowerCase().localeCompare(b.title.toLowerCase());
      break;
    case "path":
      result = a.path.toLowerCase().localeCompare(b.path.toLowerCase());
      break;
    case "lastEdited":
      result = new Date(a.lastEdited).getTime() - new Date(b.lastEdited).getTime();
      break;
    case "created":
      result = new Date(a.created).getTime() - new Date(b.created).getTime();
      break;
    default:
      result = 0;
  }

  return direction === "desc" ? -result : result;
}

function SortArrow({ direction }: { direction: SortDirection }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-block",
        marginLeft: "var(--space-1)",
        fontSize: "0.7em",
      }}
    >
      {direction === "asc" ? "▲" : "▼"}
    </span>
  );
}

export function Workspaces({
  files,
  workspaces,
  activeWorkspaceId,
  hasFilesystem,
  onFileSelect,
  onActiveWorkspaceChange,
  onCreateWorkspace,
  onPickExternalDirectory,
  onNewDocument,
  onUpdateWorkspaceSettings,
  filter,
}: WorkspacesProps) {
  const [sorts, setSorts] = useState<SortSpec[]>([
    { key: "lastEdited", direction: "desc" },
  ]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceType, setWorkspaceType] = useState<WorkspaceType>("internal");
  const [externalPath, setExternalPath] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsWorkspaceId, setSettingsWorkspaceId] = useState<string | null>(null);

  const settingsWorkspace = workspaces.find(w => w.id === settingsWorkspaceId) ?? null;
  const wsSettings = settingsWorkspace ? parseWorkspaceSettings(settingsWorkspace) : null;

  const handleHeaderClick = useCallback(
    (key: SortKey, shiftKey: boolean) => {
      setSorts((prev) => {
        if (shiftKey) {
          const existingIndex = prev.findIndex((s) => s.key === key);
          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = {
              key,
              direction: prev[existingIndex].direction === "asc" ? "desc" : "asc",
            };
            return updated;
          }
          return [...prev, { key, direction: key === "lastEdited" || key === "created" ? "desc" : "asc" }];
        }

        const existing = prev.length === 1 ? prev[0] : null;
        if (existing && existing.key === key) {
          return [{ key, direction: existing.direction === "asc" ? "desc" : "asc" }];
        }
        return [{ key, direction: key === "lastEdited" || key === "created" ? "desc" : "asc" }];
      });
    },
    [],
  );

  const filteredAndSorted = useMemo(() => {
    let result = files;

    if (filter.trim()) {
      const lowerFilter = filter.toLowerCase();
      result = result.filter(
        (f) =>
          f.title.toLowerCase().includes(lowerFilter) ||
          f.path.toLowerCase().includes(lowerFilter),
      );
    }

    result = [...result].sort((a, b) => {
      for (const spec of sorts) {
        const cmp = compareFn(a, b, spec.key, spec.direction);
        if (cmp !== 0) return cmp;
      }
      return 0;
    });

    return result;
  }, [files, filter, sorts]);

  const getSortSpec = (key: SortKey): SortSpec | undefined =>
    sorts.find((s) => s.key === key);

  const resetCreateModal = () => {
    setWorkspaceName("");
    setWorkspaceType("internal");
    setExternalPath("");
    setCreateError(null);
    setIsCreating(false);
  };

  const handleOpenCreate = () => {
    resetCreateModal();
    setIsCreateOpen(true);
  };

  const handleBrowseExternal = async () => {
    const path = await onPickExternalDirectory();
    if (path) {
      setExternalPath(path);
      setCreateError(null);
    }
  };

  const handleCreateWorkspace = async () => {
    const nameError = validateWorkspaceName(workspaceName);
    if (nameError) {
      setCreateError(nameError);
      return;
    }

    const name = workspaceName.trim();
    const exists = workspaces.some((ws) => ws.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      setCreateError("A workspace with this name already exists.");
      return;
    }

    if (workspaceType === "external" && !externalPath.trim()) {
      setCreateError("Select a folder for the external workspace.");
      return;
    }

    setIsCreating(true);
    setCreateError(null);

    try {
      const id = await onCreateWorkspace(name, workspaceType, externalPath.trim() || undefined);
      if (!id) {
        setCreateError("Failed to create workspace.");
        return;
      }
      setIsCreateOpen(false);
      resetCreateModal();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create workspace.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div
      data-testid="workspaces-panel"
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "auto",
        fontFamily: "var(--font-ui)",
        fontSize: "var(--font-size-sm)",
      }}
    >
      <div
        data-testid="workspaces-management-bar"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "var(--space-3)",
          padding: "var(--space-3)",
          borderBottom: "1px solid var(--color-border-subtle)",
          backgroundColor: "var(--color-bg-secondary)",
        }}
      >
        <div style={{ minWidth: 220, maxWidth: 360, width: "100%" }}>
          <Select
            value={activeWorkspaceId ?? ""}
            onChange={onActiveWorkspaceChange}
            options={workspaces.map((workspace) => ({
              value: workspace.id,
              label: workspace.name,
            }))}
          />
        </div>
        <Button
          icon={Plus}
          label="New Workspace"
          showLabel={true}
          tooltip="Create a new workspace"
          onClick={handleOpenCreate}
        />
        {activeWorkspaceId && onUpdateWorkspaceSettings && (
          <Button
            icon={SettingsIcon}
            label="Settings"
            showLabel={false}
            tooltip="Workspace settings"
            onClick={() => {
              setSettingsWorkspaceId(activeWorkspaceId);
              setIsSettingsOpen(true);
            }}
          />
        )}
      </div>

      <table
        data-testid="workspaces-table"
        role="grid"
        aria-label="Workspace files"
        style={{
          width: "100%",
          borderCollapse: "collapse",
          tableLayout: "auto",
        }}
      >
        <thead>
          <tr
            style={{
              backgroundColor: "var(--color-bg-secondary)",
              fontWeight: "var(--font-weight-semibold)" as unknown as number,
            }}
          >
            {columns.map((col) => {
              const sortSpec = getSortSpec(col.key);
              return (
                <th
                  key={col.key}
                  data-testid={`workspaces-header-${col.key}`}
                  role="columnheader"
                  tabIndex={0}
                  aria-sort={
                    sortSpec
                      ? sortSpec.direction === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                  onClick={(e) => handleHeaderClick(col.key, e.shiftKey)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleHeaderClick(col.key, e.shiftKey);
                    }
                  }}
                  style={{
                    padding: "var(--space-2) var(--space-3)",
                    textAlign: "left",
                    cursor: "pointer",
                    userSelect: "none",
                    borderBottom: "1px solid var(--color-border-subtle)",
                    whiteSpace: "nowrap",
                    color: "var(--color-text-primary)",
                  }}
                >
                  {col.label}
                  {sortSpec && <SortArrow direction={sortSpec.direction} />}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {filteredAndSorted.map((file, index) => (
            <tr
              key={file.path}
              data-testid="workspaces-row"
              role="row"
              tabIndex={0}
              onClick={() => onFileSelect(file.path)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onFileSelect(file.path);
                }
              }}
              style={{
                backgroundColor:
                  index % 2 === 0
                    ? "var(--color-bg-primary)"
                    : "var(--color-bg-secondary)",
                borderBottom: "1px solid var(--color-border-subtle)",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--color-bg-hover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor =
                  index % 2 === 0
                    ? "var(--color-bg-primary)"
                    : "var(--color-bg-secondary)";
              }}
            >
              <td
                data-testid="workspaces-cell-title"
                style={{
                  padding: "var(--space-2) var(--space-3)",
                }}
              >
                {file.title}
              </td>
              <td
                data-testid="workspaces-cell-path"
                style={{
                  padding: "var(--space-2) var(--space-3)",
                  color: "var(--color-text-secondary)",
                  maxWidth: 300,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {file.path}
              </td>
              <td
                data-testid="workspaces-cell-lastEdited"
                style={{
                  padding: "var(--space-2) var(--space-3)",
                  whiteSpace: "nowrap",
                }}
              >
                {formatDate(file.lastEdited)}
              </td>
              <td
                data-testid="workspaces-cell-created"
                style={{
                  padding: "var(--space-2) var(--space-3)",
                  whiteSpace: "nowrap",
                }}
              >
                {formatDate(file.created)}
              </td>
            </tr>
          ))}
          {filteredAndSorted.length === 0 && (
            <tr>
              <td
                colSpan={4}
                data-testid="workspaces-empty"
                style={{
                  padding: "var(--space-3)",
                  textAlign: "center",
                  color: "var(--color-text-secondary)",
                }}
              >
                {files.length === 0
                  ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-2)" }}>
                      <span>No files found. Create a new file or add a workspace to get started.</span>
                      {onNewDocument && (
                        <Button
                          icon={FilePlus}
                          label="New File"
                          showLabel={true}
                          tooltip="Create a new blank document"
                          variant="accent"
                          onClick={onNewDocument}
                        />
                      )}
                    </div>
                  )
                  : "No files match the current filter."}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Workspace"
      >
        <div data-testid="workspace-create-modal" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
            <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>Workspace name</span>
            <Input
              value={workspaceName}
              onChange={(e) => {
                setWorkspaceName(e.target.value);
                setCreateError(null);
              }}
              placeholder="My Workspace"
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
            <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>Type</span>
            <Select
              value={workspaceType}
              onChange={(value) => {
                setWorkspaceType(value as WorkspaceType);
                setCreateError(null);
              }}
              options={[
                { value: "internal", label: "Internal" },
                { value: "external", label: "External" },
              ]}
            />
          </label>

          {workspaceType === "external" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
                <Input
                  value={externalPath}
                  onChange={(e) => setExternalPath(e.target.value)}
                  placeholder="Choose a directory"
                />
                <Button
                  onClick={handleBrowseExternal}
                  disabled={!hasFilesystem}
                >
                  Browse...
                </Button>
              </div>
            </div>
          )}

          {createError && (
            <div data-testid="workspace-create-error" style={{ color: "var(--color-error)", fontSize: "var(--font-size-sm)" }}>
              {createError}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-2)" }}>
            <Button onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button variant="accent" onClick={handleCreateWorkspace} disabled={isCreating}>
              {isCreating ? "Creating..." : "Create"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title="Workspace Settings"
      >
        {wsSettings && settingsWorkspaceId && (
          <div data-testid="workspace-settings-modal" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <Toggle
              label="Recursive traversal"
              checked={wsSettings.recursive}
              onChange={(checked) => {
                onUpdateWorkspaceSettings?.(settingsWorkspaceId, { recursive: checked });
              }}
            />
            <Toggle
              label="Show hidden files"
              checked={wsSettings.showHidden}
              onChange={(checked) => {
                onUpdateWorkspaceSettings?.(settingsWorkspaceId, { showHidden: checked });
              }}
            />
            <Toggle
              label="Independent extension rules"
              checked={wsSettings.useIndependentExtensions}
              onChange={(checked) => {
                onUpdateWorkspaceSettings?.(settingsWorkspaceId, { useIndependentExtensions: checked });
              }}
            />
            {wsSettings.useIndependentExtensions && (
              <label style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
                <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>
                  Extension whitelist (comma-separated)
                </span>
                <Input
                  value={wsSettings.independentExtensions.join(", ")}
                  onChange={(e) => {
                    const extensions = e.target.value.split(",").map(s => s.trim()).filter(Boolean);
                    onUpdateWorkspaceSettings?.(settingsWorkspaceId, { independentExtensions: extensions });
                  }}
                  placeholder=".md, .markdown, .txt"
                />
              </label>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: "var(--space-2)" }}>
              <Button onClick={() => setIsSettingsOpen(false)}>Done</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function formatDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}
