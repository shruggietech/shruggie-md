import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import type { PlatformAdapter, PlatformCapabilities } from "../platform/platform";
import type { StorageAdapter, WorkspaceRecord } from "../storage/types";
import { useConfig } from "../config";

export interface WorkspaceFile {
  title: string;
  path: string;
  lastEdited: string;
  created: string;
}

export interface UseWorkspacesReturn {
  files: WorkspaceFile[];
  isScanning: boolean;
  error: string | null;
  scan: () => Promise<void>;
  workspaces: WorkspaceRecord[];
  activeWorkspace: WorkspaceRecord | null;
  setActiveWorkspaceId: (id: string) => void;
  createWorkspace: (name: string, type: "internal" | "external", path?: string) => Promise<string | null>;
  deleteWorkspace: (id: string) => Promise<void>;
  updateWorkspaceSettings: (id: string, settings: Partial<WorkspaceSettings>) => Promise<void>;
  refreshWorkspaces: () => Promise<void>;
}

export interface WorkspaceSettings {
  recursive: boolean;
  showHidden: boolean;
  useIndependentExtensions: boolean;
  independentExtensions: string[];
}

export function parseWorkspaceSettings(ws: WorkspaceRecord): WorkspaceSettings {
  try {
    const raw = (ws as unknown as Record<string, unknown>).settings;
    if (typeof raw === "string") return JSON.parse(raw) as WorkspaceSettings;
  } catch { /* ignore */ }
  return { recursive: true, showHidden: false, useIndependentExtensions: false, independentExtensions: [] };
}

function normalizeWorkspaceBasePath(path: string): string {
  if (path.endsWith("/") || path.endsWith("\\")) {
    return path;
  }
  return `${path}/`;
}

// Workspace name validation (OS-safe filenames)
const WINDOWS_RESERVED = /^(con|prn|aux|nul|com\d|lpt\d)$/i;
const INVALID_CHARS = /[<>:"/\\|?*\x00]/;

export function validateWorkspaceName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "Name cannot be empty.";
  if (trimmed.length > 128) return "Name must be 128 characters or fewer.";
  if (INVALID_CHARS.test(trimmed)) return "Name contains invalid characters.";
  if (WINDOWS_RESERVED.test(trimmed)) return "Name is a reserved system name.";
  if (trimmed.startsWith(".") || trimmed.endsWith(".")) return "Name cannot start or end with a dot.";
  if (trimmed.endsWith(" ")) return "Name cannot end with a space.";
  return null;
}

export function useWorkspaces(
  platform: PlatformAdapter | null,
  capabilities: PlatformCapabilities,
  storage: StorageAdapter | null,
): UseWorkspacesReturn {
  const { config } = useConfig();
  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceRecord[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const platformRef = useRef(platform);
  platformRef.current = platform;
  const storageRef = useRef(storage);
  storageRef.current = storage;

  const activeWorkspace = useMemo(
    () => workspaces.find((w) => w.id === activeWorkspaceId) ?? workspaces.find((w) => w.is_default) ?? null,
    [workspaces, activeWorkspaceId],
  );

  const globalExtensions = config.fileExtensions.recognized;

  // Track previous workspace ID for auto-scan logic (declared early so refreshWorkspaces can reset it)
  const prevWsId = useRef<string | null>(null);

  // Load workspaces from storage
  const refreshWorkspaces = useCallback(async () => {
    const store = storageRef.current;
    if (!store) return;
    const list = await store.listWorkspaces();
    setWorkspaces(list);
    // Reset so auto-scan effect re-triggers for the active workspace
    prevWsId.current = null;
  }, []);

  // Initialize: load workspaces, ensure default exists
  useEffect(() => {
    if (!storage) return;
    let cancelled = false;
    const init = async () => {
      let list = await storage.listWorkspaces();
      if (list.length === 0) {
        // Create default workspace
        let defaultPath = "__internal__/Default";
        if (capabilities.hasFilesystem && platform) {
          try {
            const appDir = await platform.getAppDataDir();
            defaultPath = `${normalizeWorkspaceBasePath(appDir)}workspaces/Default`;
            // Ensure directory exists
            try { await platform.createDirectory(defaultPath); } catch { /* may already exist */ }
          } catch {
            // fallback to virtual path
          }
        }
        const now = new Date().toISOString();
        await storage.createWorkspace({
          id: crypto.randomUUID(),
          name: "Default",
          type: "internal",
          path: defaultPath,
          is_default: true,
          created_at: now,
          settings: "{}",
        });
        list = await storage.listWorkspaces();
      }
      if (cancelled) return;
      setWorkspaces(list);
      // Select default workspace
      const def = list.find((w) => w.is_default);
      if (def && !activeWorkspaceId) {
        setActiveWorkspaceId(def.id);
      }
    };
    init();
    return () => { cancelled = true; };
  }, [storage, capabilities.hasFilesystem, platform, activeWorkspaceId]);

  // Scan files for active workspace
  const scan = useCallback(async () => {
    const adapter = platformRef.current;
    if (!adapter || !capabilities.hasFilesystem || !activeWorkspace) {
      if (!capabilities.hasFilesystem) setError("Workspaces require desktop filesystem access.");
      return;
    }

    const wsPath = activeWorkspace.path;
    if (!wsPath || wsPath.startsWith("__internal__/")) {
      // Virtual workspace on non-filesystem platform
      setFiles([]);
      return;
    }

    setIsScanning(true);
    setError(null);

    const wsSettings = parseWorkspaceSettings(activeWorkspace);
    const activeExtensions = (wsSettings.useIndependentExtensions && wsSettings.independentExtensions.length > 0
      ? wsSettings.independentExtensions
      : globalExtensions).map((ext) => {
        const normalized = ext.trim().toLowerCase();
        return normalized.startsWith(".") ? normalized : `.${normalized}`;
      });

    try {
      const entries = await adapter.listDirectory(wsPath, wsSettings.recursive);

      const result: WorkspaceFile[] = [];
      for (const entry of entries) {
        if (entry.isDirectory) continue;

        if (!wsSettings.showHidden) {
          if (entry.name.startsWith(".")) continue;
        }

        const dotIndex = entry.name.lastIndexOf(".");
        if (dotIndex === -1) continue;
        const ext = entry.name.substring(dotIndex).toLowerCase();
        if (!activeExtensions.includes(ext)) continue;

        const title = entry.name.substring(0, dotIndex);
        result.push({ title, path: entry.path, lastEdited: entry.mtime, created: entry.birthtime });
      }

      setFiles(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to scan workspace.");
      setFiles([]);
    } finally {
      setIsScanning(false);
    }
  }, [capabilities.hasFilesystem, activeWorkspace, globalExtensions]);

  // Auto-scan when active workspace changes
  useEffect(() => {
    if (activeWorkspace && activeWorkspace.id !== prevWsId.current) {
      prevWsId.current = activeWorkspace.id;
      scan();
    }
  }, [activeWorkspace, scan]);

  const createWorkspace = useCallback(async (name: string, type: "internal" | "external", externalPath?: string) => {
    const store = storageRef.current;
    if (!store) return null;

    let wsPath: string;
    if (type === "external") {
      wsPath = externalPath ?? "";
      if (!wsPath.trim()) {
        return null;
      }
    } else {
      // Internal workspace
      if (capabilities.hasFilesystem && platformRef.current) {
        const appDir = await platformRef.current.getAppDataDir();
        wsPath = `${normalizeWorkspaceBasePath(appDir)}workspaces/${name}`;
        try { await platformRef.current.createDirectory(wsPath); } catch { /* may already exist */ }
      } else {
        wsPath = `__internal__/${name}`;
      }
    }

    const workspaceId = crypto.randomUUID();
    const now = new Date().toISOString();
    await store.createWorkspace({
      id: workspaceId,
      name,
      type,
      path: wsPath,
      is_default: false,
      created_at: now,
      settings: "{}",
    });
    await refreshWorkspaces();
    setActiveWorkspaceId(workspaceId);
    return workspaceId;
  }, [capabilities.hasFilesystem, refreshWorkspaces]);

  const deleteWorkspace = useCallback(async (id: string) => {
    const store = storageRef.current;
    if (!store) return;
    const ws = await store.getWorkspace(id);
    if (!ws || ws.is_default) return; // Cannot delete default

    // Delete internal workspace directory (if filesystem available)
    if (ws.type === "internal" && capabilities.hasFilesystem && platformRef.current) {
      try { await platformRef.current.removeDirectory(ws.path); } catch { /* best effort */ }
    }

    await store.deleteWorkspace(id);
    await refreshWorkspaces();

    // If deleted workspace was active, switch to default
    if (activeWorkspaceId === id) {
      const def = workspaces.find((w) => w.is_default);
      setActiveWorkspaceId(def?.id ?? null);
    }
  }, [capabilities.hasFilesystem, activeWorkspaceId, workspaces, refreshWorkspaces]);

  const updateWorkspaceSettings = useCallback(async (id: string, settings: Partial<WorkspaceSettings>) => {
    const store = storageRef.current;
    if (!store) return;
    const ws = await store.getWorkspace(id);
    if (!ws) return;
    const current = parseWorkspaceSettings(ws);
    const merged = { ...current, ...settings };
    await store.updateWorkspace(id, { settings: JSON.stringify(merged) } as unknown as Partial<Omit<WorkspaceRecord, "id">>);
    await refreshWorkspaces();
  }, [refreshWorkspaces]);

  return useMemo(
    () => ({
      files, isScanning, error, scan,
      workspaces, activeWorkspace, setActiveWorkspaceId,
      createWorkspace, deleteWorkspace, updateWorkspaceSettings,
      refreshWorkspaces,
    }),
    [files, isScanning, error, scan, workspaces, activeWorkspace,
     createWorkspace, deleteWorkspace, updateWorkspaceSettings, refreshWorkspaces],
  );
}
