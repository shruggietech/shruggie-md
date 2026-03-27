export type LogLevel = "debug" | "info" | "warning" | "error";

export interface ConfigEntry {
  key: string;
  value: string;
  updated_at: string;
}

export interface DocumentRecord {
  id: string;
  title: string;
  source_type: "local" | "remote" | "internal";
  source_path: string | null;
  source_url: string | null;
  workspace_id: string;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceRecord {
  id: string;
  name: string;
  type: "internal" | "external";
  path: string;
  is_default: boolean;
  settings: string;
  created_at: string;
}

export interface EditHistoryEntry {
  id?: number;
  document_id: string;
  content_snapshot: string;
  created_at: string;
}

export interface LogEntry {
  id?: number;
  level: LogLevel;
  source: string;
  message: string;
  metadata: string | null;
  created_at: string;
}

export interface TagRecord {
  id: string;
  name: string;
  color: string | null;
  created_at: string;
}

export interface DocumentTagRecord {
  document_id: string;
  tag_id: string;
}

export interface LogFilter {
  level?: LogLevel;
  source?: string;
  since?: string;
  until?: string;
  limit?: number;
}

export interface StorageAdapter {
  // Lifecycle
  initialize(): Promise<void>;
  close(): Promise<void>;

  // Config (key-value with dotted paths)
  getConfigValue(key: string): Promise<string | null>;
  setConfigValue(key: string, value: string): Promise<void>;
  getAllConfig(): Promise<Record<string, string>>;
  setConfigBulk(entries: Array<{ key: string; value: string }>): Promise<void>;
  deleteConfigValue(key: string): Promise<void>;

  // Documents
  createDocument(doc: DocumentRecord): Promise<void>;
  getDocument(id: string): Promise<DocumentRecord | null>;
  updateDocument(id: string, updates: Partial<Omit<DocumentRecord, "id">>): Promise<void>;
  deleteDocument(id: string): Promise<void>;
  listDocuments(workspaceId?: string): Promise<DocumentRecord[]>;

  // Workspaces
  createWorkspace(ws: WorkspaceRecord): Promise<void>;
  getWorkspace(id: string): Promise<WorkspaceRecord | null>;
  updateWorkspace(id: string, updates: Partial<Omit<WorkspaceRecord, "id">>): Promise<void>;
  deleteWorkspace(id: string): Promise<void>;
  listWorkspaces(): Promise<WorkspaceRecord[]>;
  getDefaultWorkspace(): Promise<WorkspaceRecord | null>;

  // Edit History
  appendEditHistory(entry: Omit<EditHistoryEntry, "id">): Promise<void>;
  getEditHistory(documentId: string, limit?: number): Promise<EditHistoryEntry[]>;
  pruneEditHistory(documentId: string, maxSnapshots: number): Promise<void>;

  // Logs
  appendLog(entry: Omit<LogEntry, "id">): Promise<void>;
  queryLogs(filters?: LogFilter): Promise<LogEntry[]>;
}
