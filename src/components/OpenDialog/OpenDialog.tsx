import { useState, useEffect, useCallback } from "react";
import { File, Globe, Plus } from "lucide-react";
import { Modal, Button, Input, Select } from "../common";
import type { PlatformAdapter, PlatformCapabilities } from "@/platform/platform";
import type { StorageAdapter, WorkspaceRecord } from "../../storage";
import { validateWorkspaceName } from "@/hooks/useWorkspaces";

type SourceTab = "file" | "url";

export interface OpenDialogResult {
  content: string;
  fileName: string;
  filePath: string | null;
  sourceType: "local" | "remote" | "internal";
  sourceUrl: string | null;
  workspaceId: string;
}

export interface OpenDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onOpen: (result: OpenDialogResult) => void;
  platform: PlatformAdapter | null;
  capabilities: PlatformCapabilities;
  storage: StorageAdapter | null;
  recognizedExtensions: string[];
}

export function OpenDialog({
  isOpen,
  onClose,
  onOpen,
  platform,
  capabilities,
  storage,
  recognizedExtensions,
}: OpenDialogProps) {
  const [activeTab, setActiveTab] = useState<SourceTab>("file");
  const [url, setUrl] = useState("");
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [nameOverride, setNameOverride] = useState("");
  const [workspaces, setWorkspaces] = useState<WorkspaceRecord[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New workspace inline fields
  const [showNewWorkspace, setShowNewWorkspace] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [newWorkspaceError, setNewWorkspaceError] = useState<string | null>(null);

  // Load workspaces when dialog opens
  useEffect(() => {
    if (!isOpen || !storage) return;
    let cancelled = false;
    storage.listWorkspaces().then((list: WorkspaceRecord[]) => {
      if (cancelled) return;
      setWorkspaces(list);
      // Default to the default workspace
      const defaultWs = list.find((w: WorkspaceRecord) => w.is_default);
      if (defaultWs && !selectedWorkspaceId) {
        setSelectedWorkspaceId(defaultWs.id);
      }
    });
    return () => { cancelled = true; };
  }, [isOpen, storage, selectedWorkspaceId]);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab("file");
      setUrl("");
      setSelectedFilePath(null);
      setSelectedFileName(null);
      setNameOverride("");
      setError(null);
      setShowNewWorkspace(false);
      setNewWorkspaceName("");
      setNewWorkspaceError(null);
    }
  }, [isOpen]);

  const handleFilePick = useCallback(async () => {
    if (!platform) return;
    const path = await platform.openFileDialog(recognizedExtensions);
    if (!path) return;

    const ext = path.substring(path.lastIndexOf("."));
    if (!recognizedExtensions.includes(ext.toLowerCase())) {
      setError(`Unsupported file type "${ext}". Recognized: ${recognizedExtensions.join(", ")}`);
      return;
    }

    setSelectedFilePath(path);
    const name = path.replace(/\\/g, "/").split("/").pop() ?? path;
    setSelectedFileName(name);
    setError(null);
  }, [platform, recognizedExtensions]);

  const handleWorkspaceChange = useCallback((value: string) => {
    if (value === "__new__") {
      setShowNewWorkspace(true);
      setNewWorkspaceName("");
      setNewWorkspaceError(null);
    } else {
      setShowNewWorkspace(false);
      setSelectedWorkspaceId(value);
    }
  }, []);

  const handleCreateWorkspace = useCallback(async () => {
    if (!storage || !platform) return;

    const validationError = validateWorkspaceName(newWorkspaceName);
    if (validationError) {
      setNewWorkspaceError(validationError);
      return;
    }

    // Check uniqueness
    const existing = workspaces.find(
      (w) => w.name.toLowerCase() === newWorkspaceName.trim().toLowerCase()
    );
    if (existing) {
      setNewWorkspaceError("A workspace with this name already exists.");
      return;
    }

    try {
      const id = crypto.randomUUID();
      const appDataDir = await platform.getAppDataDir();
      const trimmedName = newWorkspaceName.trim();
      const wsPath = `${appDataDir}workspaces/${trimmedName}/`;
      await platform.createDirectory(wsPath);

      const ws: WorkspaceRecord = {
        id,
        name: trimmedName,
        type: "internal",
        path: wsPath,
        is_default: false,
        settings: "{}",
        created_at: new Date().toISOString(),
      };
      await storage.createWorkspace(ws);

      setWorkspaces((prev) => [...prev, ws]);
      setSelectedWorkspaceId(id);
      setShowNewWorkspace(false);
      setNewWorkspaceName("");
      setNewWorkspaceError(null);
    } catch (err) {
      setNewWorkspaceError(err instanceof Error ? err.message : "Failed to create workspace.");
    }
  }, [storage, platform, newWorkspaceName, workspaces]);

  const handleOpen = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (activeTab === "file") {
        if (!selectedFilePath || !platform) {
          setError("Please select a file.");
          return;
        }

        const content = await platform.readFile(selectedFilePath);
        const displayName = nameOverride.trim() || selectedFileName?.replace(/\.[^.]+$/, "") || "Untitled";

        onOpen({
          content,
          fileName: selectedFileName ?? "untitled.md",
          filePath: selectedFilePath,
          sourceType: "local",
          sourceUrl: null,
          workspaceId: selectedWorkspaceId,
        });
        onClose();
      } else {
        // URL tab
        const trimmedUrl = url.trim();
        if (!trimmedUrl) {
          setError("Please enter a URL.");
          return;
        }

        const response = await fetch(trimmedUrl);
        if (!response.ok) {
          setError(`HTTP ${response.status}: ${response.statusText}`);
          return;
        }

        const contentType = response.headers.get("content-type") ?? "";
        const isText =
          contentType.includes("text/") ||
          contentType.includes("application/json") ||
          contentType.includes("application/xml") ||
          contentType === "";

        if (!isText) {
          setError(`Invalid content type: "${contentType}". Expected text content.`);
          return;
        }

        const content = await response.text();

        // Derive filename from URL or H1
        let fileName: string;
        if (nameOverride.trim()) {
          fileName = nameOverride.trim();
          if (!fileName.endsWith(".md")) fileName += ".md";
        } else {
          // Try H1 header
          const h1Match = content.match(/^#\s+(.+)$/m);
          if (h1Match) {
            fileName = h1Match[1].replace(/[<>:"/\\|?*]/g, "").trim().substring(0, 100) + ".md";
          } else {
            // URL last segment
            const urlParts = trimmedUrl.split("/").filter(Boolean);
            const lastSegment = urlParts[urlParts.length - 1] || "remote";
            fileName = lastSegment.endsWith(".md") ? lastSegment : lastSegment + ".md";
          }
        }

        onOpen({
          content,
          fileName,
          filePath: null,
          sourceType: "remote",
          sourceUrl: trimmedUrl,
          workspaceId: selectedWorkspaceId,
        });
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open.");
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, selectedFilePath, url, nameOverride, selectedFileName, platform, selectedWorkspaceId, onOpen, onClose]);

  const tabStyle = (tab: SourceTab) => ({
    flex: 1,
    padding: "var(--space-2) var(--space-3)",
    border: "none",
    borderBottom: activeTab === tab ? "2px solid var(--color-accent)" : "2px solid transparent",
    background: "transparent",
    color: activeTab === tab ? "var(--color-text-primary)" : "var(--color-text-secondary)",
    cursor: "pointer" as const,
    fontSize: "var(--font-size-sm)",
    fontFamily: "var(--font-ui)",
    fontWeight: activeTab === tab ? 600 : 400,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "var(--space-1)",
  });

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box" as const,
    backgroundColor: "var(--color-bg-tertiary)",
    border: "1px solid var(--color-border-primary)",
    borderRadius: "var(--radius-sm)",
    padding: "var(--space-2) var(--space-3)",
    fontSize: "var(--font-size-sm)",
    fontFamily: "var(--font-ui)",
    color: "var(--color-text-primary)",
    outline: "none",
  };

  const labelStyle = {
    display: "block",
    marginBottom: "var(--space-1)",
    fontSize: "var(--font-size-xs)",
    color: "var(--color-text-secondary)",
    fontFamily: "var(--font-ui)",
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Open">
      {/* Source tabs */}
      <div
        data-testid="open-dialog-tabs"
        style={{
          display: "flex",
          borderBottom: "1px solid var(--color-border-subtle)",
          marginBottom: "var(--space-4)",
        }}
      >
        <button
          data-testid="open-tab-file"
          type="button"
          style={tabStyle("file")}
          onClick={() => setActiveTab("file")}
        >
          <File size={14} /> File
        </button>
        <button
          data-testid="open-tab-url"
          type="button"
          style={tabStyle("url")}
          onClick={() => setActiveTab("url")}
        >
          <Globe size={14} /> URL
        </button>
      </div>

      {/* Tab content */}
      <div style={{ marginBottom: "var(--space-4)" }}>
        {activeTab === "file" ? (
          <div data-testid="open-file-section">
            <label style={labelStyle}>File</label>
            <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
              <Button
                variant="accent"
                icon={File}
                label="Choose File"
                showLabel
                onClick={handleFilePick}
                disabled={!platform}
              />
              {selectedFileName && (
                <span
                  data-testid="open-selected-file"
                  style={{
                    fontSize: "var(--font-size-sm)",
                    color: "var(--color-text-primary)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    flex: 1,
                  }}
                >
                  {selectedFileName}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div data-testid="open-url-section">
            <label style={labelStyle}>URL</label>
            <input
              data-testid="open-url-input"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://raw.githubusercontent.com/..."
              style={inputStyle}
              onKeyDown={(e) => { if (e.key === "Enter") handleOpen(); }}
            />
          </div>
        )}
      </div>

      {/* Workspace selector */}
      {storage && (
        <div style={{ marginBottom: "var(--space-4)" }}>
          <label style={labelStyle}>Open in workspace</label>
          <select
            data-testid="open-workspace-select"
            value={showNewWorkspace ? "__new__" : selectedWorkspaceId}
            onChange={(e) => handleWorkspaceChange(e.target.value)}
            style={inputStyle}
          >
            {workspaces.map((ws) => (
              <option key={ws.id} value={ws.id}>
                {ws.name}{ws.is_default ? " (default)" : ""}
              </option>
            ))}
            <option value="__new__">Add a new workspace...</option>
          </select>

          {/* Inline new workspace creation */}
          {showNewWorkspace && (
            <div
              data-testid="open-new-workspace"
              style={{
                marginTop: "var(--space-3)",
                padding: "var(--space-3)",
                backgroundColor: "var(--color-bg-tertiary)",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--color-border-subtle)",
              }}
            >
              <label style={labelStyle}>New workspace name</label>
              <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
                <input
                  data-testid="open-new-workspace-name"
                  type="text"
                  value={newWorkspaceName}
                  onChange={(e) => { setNewWorkspaceName(e.target.value); setNewWorkspaceError(null); }}
                  placeholder="My Workspace"
                  style={{ ...inputStyle, flex: 1 }}
                />
                <Button
                  variant="accent"
                  icon={Plus}
                  label="Create"
                  showLabel
                  onClick={handleCreateWorkspace}
                />
              </div>
              {newWorkspaceError && (
                <span
                  data-testid="open-new-workspace-error"
                  style={{
                    color: "var(--color-error)",
                    fontSize: "var(--font-size-xs)",
                    marginTop: "var(--space-1)",
                    display: "block",
                  }}
                >
                  {newWorkspaceError}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Optional name override */}
      <div style={{ marginBottom: "var(--space-4)" }}>
        <label style={labelStyle}>Name (optional)</label>
        <input
          data-testid="open-name-override"
          type="text"
          value={nameOverride}
          onChange={(e) => setNameOverride(e.target.value)}
          placeholder={activeTab === "file" ? "Use filename" : "Auto-detect from content"}
          style={inputStyle}
        />
      </div>

      {/* Error display */}
      {error && (
        <div
          data-testid="open-dialog-error"
          style={{
            color: "var(--color-error)",
            fontSize: "var(--font-size-sm)",
            marginBottom: "var(--space-3)",
            padding: "var(--space-2) var(--space-3)",
            backgroundColor: "rgba(255, 69, 58, 0.08)",
            borderRadius: "var(--radius-sm)",
          }}
        >
          {error}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-2)" }}>
        <Button
          label="Cancel"
          showLabel
          onClick={onClose}
        />
        <Button
          variant="accent"
          label="Open"
          showLabel
          onClick={handleOpen}
          disabled={isLoading || (activeTab === "file" ? !selectedFilePath : !url.trim())}
        />
      </div>
    </Modal>
  );
}
