import type {
  StorageAdapter,
  DocumentRecord,
  WorkspaceRecord,
  EditHistoryEntry,
  LogEntry,
  LogFilter,
} from "./types";

const DB_NAME = "shruggie-md";
const DB_VERSION = 1;

const STORES = {
  config: "config",
  documents: "documents",
  workspaces: "workspaces",
  editHistory: "edit_history",
  logs: "logs",
  tags: "tags",
  documentTags: "document_tags",
} as const;

export class IndexedDbStorageAdapter implements StorageAdapter {
  private db: IDBDatabase | null = null;

  async initialize(): Promise<void> {
    this.db = await this.openDatabase();
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  private ensureDb(): IDBDatabase {
    if (!this.db) throw new Error("IndexedDB not initialized");
    return this.db;
  }

  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(STORES.config)) {
          db.createObjectStore(STORES.config, { keyPath: "key" });
        }

        if (!db.objectStoreNames.contains(STORES.documents)) {
          const docStore = db.createObjectStore(STORES.documents, {
            keyPath: "id",
          });
          docStore.createIndex("workspace_id", "workspace_id", {
            unique: false,
          });
          docStore.createIndex("updated_at", "updated_at", { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.workspaces)) {
          const wsStore = db.createObjectStore(STORES.workspaces, {
            keyPath: "id",
          });
          wsStore.createIndex("name", "name", { unique: true });
          wsStore.createIndex("is_default", "is_default", { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.editHistory)) {
          const ehStore = db.createObjectStore(STORES.editHistory, {
            keyPath: "id",
            autoIncrement: true,
          });
          ehStore.createIndex("document_id", "document_id", { unique: false });
          ehStore.createIndex("created_at", "created_at", { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.logs)) {
          const logStore = db.createObjectStore(STORES.logs, {
            keyPath: "id",
            autoIncrement: true,
          });
          logStore.createIndex("level", "level", { unique: false });
          logStore.createIndex("source", "source", { unique: false });
          logStore.createIndex("created_at", "created_at", { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.tags)) {
          const tagStore = db.createObjectStore(STORES.tags, {
            keyPath: "id",
          });
          tagStore.createIndex("name", "name", { unique: true });
        }

        if (!db.objectStoreNames.contains(STORES.documentTags)) {
          const dtStore = db.createObjectStore(STORES.documentTags, {
            keyPath: ["document_id", "tag_id"],
          });
          dtStore.createIndex("document_id", "document_id", { unique: false });
          dtStore.createIndex("tag_id", "tag_id", { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /** Wrap an IDBRequest in a Promise. */
  private req<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /** Wrap a full transaction in a Promise (resolves on complete). */
  private txDone(tx: IDBTransaction): Promise<void> {
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // ── Config ──────────────────────────────────────────────────────────

  async getConfigValue(key: string): Promise<string | null> {
    const db = this.ensureDb();
    const tx = db.transaction(STORES.config, "readonly");
    const store = tx.objectStore(STORES.config);
    const entry = await this.req(store.get(key));
    return entry ? (entry as { key: string; value: string }).value : null;
  }

  async setConfigValue(key: string, value: string): Promise<void> {
    const db = this.ensureDb();
    const tx = db.transaction(STORES.config, "readwrite");
    const store = tx.objectStore(STORES.config);
    store.put({ key, value, updated_at: new Date().toISOString() });
    await this.txDone(tx);
  }

  async getAllConfig(): Promise<Record<string, string>> {
    const db = this.ensureDb();
    const tx = db.transaction(STORES.config, "readonly");
    const store = tx.objectStore(STORES.config);
    const entries = await this.req(store.getAll());
    const result: Record<string, string> = {};
    for (const entry of entries as Array<{ key: string; value: string }>) {
      result[entry.key] = entry.value;
    }
    return result;
  }

  async setConfigBulk(
    entries: Array<{ key: string; value: string }>,
  ): Promise<void> {
    const db = this.ensureDb();
    const tx = db.transaction(STORES.config, "readwrite");
    const store = tx.objectStore(STORES.config);
    const now = new Date().toISOString();
    for (const { key, value } of entries) {
      store.put({ key, value, updated_at: now });
    }
    await this.txDone(tx);
  }

  async deleteConfigValue(key: string): Promise<void> {
    const db = this.ensureDb();
    const tx = db.transaction(STORES.config, "readwrite");
    const store = tx.objectStore(STORES.config);
    store.delete(key);
    await this.txDone(tx);
  }

  // ── Documents ───────────────────────────────────────────────────────

  async createDocument(doc: DocumentRecord): Promise<void> {
    const db = this.ensureDb();
    const tx = db.transaction(STORES.documents, "readwrite");
    const store = tx.objectStore(STORES.documents);
    store.add(doc);
    await this.txDone(tx);
  }

  async getDocument(id: string): Promise<DocumentRecord | null> {
    const db = this.ensureDb();
    const tx = db.transaction(STORES.documents, "readonly");
    const store = tx.objectStore(STORES.documents);
    const result = await this.req(store.get(id));
    return (result as DocumentRecord) ?? null;
  }

  async updateDocument(
    id: string,
    updates: Partial<Omit<DocumentRecord, "id">>,
  ): Promise<void> {
    const db = this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.documents, "readwrite");
      const store = tx.objectStore(STORES.documents);
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        if (getReq.result) {
          store.put({ ...(getReq.result as DocumentRecord), ...updates });
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async deleteDocument(id: string): Promise<void> {
    const db = this.ensureDb();
    // Delete document
    const docTx = db.transaction(STORES.documents, "readwrite");
    docTx.objectStore(STORES.documents).delete(id);
    await this.txDone(docTx);
    // Delete related edit history
    await this.deleteByIndex(STORES.editHistory, "document_id", id);
    // Delete related document tags
    await this.deleteByIndex(STORES.documentTags, "document_id", id);
  }

  async listDocuments(workspaceId?: string): Promise<DocumentRecord[]> {
    const db = this.ensureDb();
    const tx = db.transaction(STORES.documents, "readonly");
    const store = tx.objectStore(STORES.documents);

    let results: DocumentRecord[];
    if (workspaceId) {
      const index = store.index("workspace_id");
      results = (await this.req(
        index.getAll(IDBKeyRange.only(workspaceId)),
      )) as DocumentRecord[];
    } else {
      results = (await this.req(store.getAll())) as DocumentRecord[];
    }

    return results.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  }

  // ── Workspaces ──────────────────────────────────────────────────────

  async createWorkspace(ws: WorkspaceRecord): Promise<void> {
    const db = this.ensureDb();
    const tx = db.transaction(STORES.workspaces, "readwrite");
    const store = tx.objectStore(STORES.workspaces);
    store.add(ws);
    await this.txDone(tx);
  }

  async getWorkspace(id: string): Promise<WorkspaceRecord | null> {
    const db = this.ensureDb();
    const tx = db.transaction(STORES.workspaces, "readonly");
    const store = tx.objectStore(STORES.workspaces);
    const result = await this.req(store.get(id));
    return (result as WorkspaceRecord) ?? null;
  }

  async updateWorkspace(
    id: string,
    updates: Partial<Omit<WorkspaceRecord, "id">>,
  ): Promise<void> {
    const db = this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.workspaces, "readwrite");
      const store = tx.objectStore(STORES.workspaces);
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        if (getReq.result) {
          store.put({ ...(getReq.result as WorkspaceRecord), ...updates });
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async deleteWorkspace(id: string): Promise<void> {
    const db = this.ensureDb();
    const tx = db.transaction(STORES.workspaces, "readwrite");
    tx.objectStore(STORES.workspaces).delete(id);
    await this.txDone(tx);
  }

  async listWorkspaces(): Promise<WorkspaceRecord[]> {
    const db = this.ensureDb();
    const tx = db.transaction(STORES.workspaces, "readonly");
    const store = tx.objectStore(STORES.workspaces);
    const results = (await this.req(store.getAll())) as WorkspaceRecord[];
    return results.sort((a, b) => {
      if (a.is_default && !b.is_default) return -1;
      if (!a.is_default && b.is_default) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  async getDefaultWorkspace(): Promise<WorkspaceRecord | null> {
    const all = await this.listWorkspaces();
    return all.find((ws) => ws.is_default) ?? null;
  }

  // ── Edit History ────────────────────────────────────────────────────

  async appendEditHistory(
    entry: Omit<EditHistoryEntry, "id">,
  ): Promise<void> {
    const db = this.ensureDb();
    const tx = db.transaction(STORES.editHistory, "readwrite");
    const store = tx.objectStore(STORES.editHistory);
    store.add(entry);
    await this.txDone(tx);
  }

  async getEditHistory(
    documentId: string,
    limit?: number,
  ): Promise<EditHistoryEntry[]> {
    const db = this.ensureDb();
    const tx = db.transaction(STORES.editHistory, "readonly");
    const store = tx.objectStore(STORES.editHistory);
    const index = store.index("document_id");
    const results = (await this.req(
      index.getAll(IDBKeyRange.only(documentId)),
    )) as EditHistoryEntry[];
    results.sort((a, b) => b.created_at.localeCompare(a.created_at));
    return limit ? results.slice(0, limit) : results;
  }

  async pruneEditHistory(
    documentId: string,
    maxSnapshots: number,
  ): Promise<void> {
    const all = await this.getEditHistory(documentId);
    if (all.length <= maxSnapshots) return;

    const toDelete = all.slice(maxSnapshots);
    const db = this.ensureDb();
    const tx = db.transaction(STORES.editHistory, "readwrite");
    const store = tx.objectStore(STORES.editHistory);
    for (const entry of toDelete) {
      if (entry.id !== undefined) {
        store.delete(entry.id);
      }
    }
    await this.txDone(tx);
  }

  // ── Logs ────────────────────────────────────────────────────────────

  async appendLog(entry: Omit<LogEntry, "id">): Promise<void> {
    const db = this.ensureDb();
    const tx = db.transaction(STORES.logs, "readwrite");
    const store = tx.objectStore(STORES.logs);
    store.add(entry);
    await this.txDone(tx);
  }

  async queryLogs(filters?: LogFilter): Promise<LogEntry[]> {
    const db = this.ensureDb();
    const tx = db.transaction(STORES.logs, "readonly");
    const store = tx.objectStore(STORES.logs);
    let results = (await this.req(store.getAll())) as LogEntry[];

    if (filters?.level) {
      results = results.filter((l) => l.level === filters.level);
    }
    if (filters?.source) {
      results = results.filter((l) => l.source === filters.source);
    }
    if (filters?.since) {
      results = results.filter((l) => l.created_at >= filters.since!);
    }
    if (filters?.until) {
      results = results.filter((l) => l.created_at <= filters.until!);
    }

    results.sort((a, b) => b.created_at.localeCompare(a.created_at));

    if (filters?.limit) {
      results = results.slice(0, filters.limit);
    }

    return results;
  }

  // ── Helpers ─────────────────────────────────────────────────────────

  private async deleteByIndex(
    storeName: string,
    indexName: string,
    value: string,
  ): Promise<void> {
    const db = this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.openCursor(IDBKeyRange.only(value));
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}
