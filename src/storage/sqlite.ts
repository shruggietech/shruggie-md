import type {
  StorageAdapter,
  ConfigEntry,
  DocumentRecord,
  WorkspaceRecord,
  EditHistoryEntry,
  LogEntry,
  LogFilter,
} from "./types";

/** Column whitelist for dynamic UPDATE construction (prevents injection). */
const DOCUMENT_COLUMNS = new Set([
  "title",
  "source_type",
  "source_path",
  "source_url",
  "workspace_id",
  "created_at",
  "updated_at",
]);

const WORKSPACE_COLUMNS = new Set([
  "name",
  "type",
  "path",
  "is_default",
  "settings",
  "created_at",
]);

export class SqliteStorageAdapter implements StorageAdapter {
  private db: Awaited<ReturnType<typeof import("@tauri-apps/plugin-sql")["default"]["load"]>> | null = null;

  async initialize(): Promise<void> {
    const Database = (await import("@tauri-apps/plugin-sql")).default;
    this.db = await Database.load("sqlite:shruggie-md.db");
    await this.createTables();
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
  }

  private ensureDb() {
    if (!this.db) throw new Error("SQLite database not initialized");
    return this.db;
  }

  private async createTables(): Promise<void> {
    const db = this.ensureDb();

    await db.execute(`
      CREATE TABLE IF NOT EXISTS config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        source_type TEXT NOT NULL,
        source_path TEXT,
        source_url TEXT,
        workspace_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS workspaces (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        type TEXT NOT NULL,
        path TEXT NOT NULL,
        is_default INTEGER NOT NULL DEFAULT 0,
        settings TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS edit_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        document_id TEXT NOT NULL,
        content_snapshot TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        level TEXT NOT NULL,
        source TEXT NOT NULL,
        message TEXT NOT NULL,
        metadata TEXT,
        created_at TEXT NOT NULL
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS tags (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        color TEXT,
        created_at TEXT NOT NULL
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS document_tags (
        document_id TEXT NOT NULL,
        tag_id TEXT NOT NULL,
        PRIMARY KEY (document_id, tag_id)
      )
    `);
  }

  // ── Config ──────────────────────────────────────────────────────────

  async getConfigValue(key: string): Promise<string | null> {
    const db = this.ensureDb();
    const rows = await db.select<ConfigEntry[]>(
      "SELECT value FROM config WHERE key = ?",
      [key],
    );
    return rows.length > 0 ? rows[0].value : null;
  }

  async setConfigValue(key: string, value: string): Promise<void> {
    const db = this.ensureDb();
    const now = new Date().toISOString();
    await db.execute(
      "INSERT OR REPLACE INTO config (key, value, updated_at) VALUES (?, ?, ?)",
      [key, value, now],
    );
  }

  async getAllConfig(): Promise<Record<string, string>> {
    const db = this.ensureDb();
    const rows = await db.select<ConfigEntry[]>(
      "SELECT key, value FROM config",
    );
    const result: Record<string, string> = {};
    for (const row of rows) {
      result[row.key] = row.value;
    }
    return result;
  }

  async setConfigBulk(
    entries: Array<{ key: string; value: string }>,
  ): Promise<void> {
    const db = this.ensureDb();
    const now = new Date().toISOString();
    for (const { key, value } of entries) {
      await db.execute(
        "INSERT OR REPLACE INTO config (key, value, updated_at) VALUES (?, ?, ?)",
        [key, value, now],
      );
    }
  }

  async deleteConfigValue(key: string): Promise<void> {
    const db = this.ensureDb();
    await db.execute("DELETE FROM config WHERE key = ?", [key]);
  }

  // ── Documents ───────────────────────────────────────────────────────

  async createDocument(doc: DocumentRecord): Promise<void> {
    const db = this.ensureDb();
    await db.execute(
      `INSERT INTO documents (id, title, source_type, source_path, source_url, workspace_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        doc.id,
        doc.title,
        doc.source_type,
        doc.source_path,
        doc.source_url,
        doc.workspace_id,
        doc.created_at,
        doc.updated_at,
      ],
    );
  }

  async getDocument(id: string): Promise<DocumentRecord | null> {
    const db = this.ensureDb();
    const rows = await db.select<DocumentRecord[]>(
      "SELECT * FROM documents WHERE id = ?",
      [id],
    );
    return rows.length > 0 ? rows[0] : null;
  }

  async updateDocument(
    id: string,
    updates: Partial<Omit<DocumentRecord, "id">>,
  ): Promise<void> {
    const db = this.ensureDb();
    const fields: string[] = [];
    const values: unknown[] = [];

    for (const [key, value] of Object.entries(updates)) {
      if (!DOCUMENT_COLUMNS.has(key)) continue;
      fields.push(`${key} = ?`);
      values.push(value);
    }

    if (fields.length === 0) return;
    values.push(id);

    await db.execute(
      `UPDATE documents SET ${fields.join(", ")} WHERE id = ?`,
      values,
    );
  }

  async deleteDocument(id: string): Promise<void> {
    const db = this.ensureDb();
    await db.execute(
      "DELETE FROM edit_history WHERE document_id = ?",
      [id],
    );
    await db.execute(
      "DELETE FROM document_tags WHERE document_id = ?",
      [id],
    );
    await db.execute("DELETE FROM documents WHERE id = ?", [id]);
  }

  async listDocuments(workspaceId?: string): Promise<DocumentRecord[]> {
    const db = this.ensureDb();
    if (workspaceId) {
      return db.select<DocumentRecord[]>(
        "SELECT * FROM documents WHERE workspace_id = ? ORDER BY updated_at DESC",
        [workspaceId],
      );
    }
    return db.select<DocumentRecord[]>(
      "SELECT * FROM documents ORDER BY updated_at DESC",
    );
  }

  // ── Workspaces ──────────────────────────────────────────────────────

  async createWorkspace(ws: WorkspaceRecord): Promise<void> {
    const db = this.ensureDb();
    await db.execute(
      `INSERT INTO workspaces (id, name, type, path, is_default, settings, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [ws.id, ws.name, ws.type, ws.path, ws.is_default ? 1 : 0, ws.settings ?? "{}", ws.created_at],
    );
  }

  async getWorkspace(id: string): Promise<WorkspaceRecord | null> {
    const db = this.ensureDb();
    const rows = await db.select<Array<Omit<WorkspaceRecord, "is_default"> & { is_default: number }>>(
      "SELECT * FROM workspaces WHERE id = ?",
      [id],
    );
    if (rows.length === 0) return null;
    const row = rows[0];
    return { ...row, is_default: !!row.is_default };
  }

  async updateWorkspace(
    id: string,
    updates: Partial<Omit<WorkspaceRecord, "id">>,
  ): Promise<void> {
    const db = this.ensureDb();
    const fields: string[] = [];
    const values: unknown[] = [];

    for (const [key, value] of Object.entries(updates)) {
      if (!WORKSPACE_COLUMNS.has(key)) continue;
      if (key === "is_default") {
        fields.push(`${key} = ?`);
        values.push(value ? 1 : 0);
      } else {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (fields.length === 0) return;
    values.push(id);

    await db.execute(
      `UPDATE workspaces SET ${fields.join(", ")} WHERE id = ?`,
      values,
    );
  }

  async deleteWorkspace(id: string): Promise<void> {
    const db = this.ensureDb();
    await db.execute("DELETE FROM workspaces WHERE id = ?", [id]);
  }

  async listWorkspaces(): Promise<WorkspaceRecord[]> {
    const db = this.ensureDb();
    const rows = await db.select<Array<Omit<WorkspaceRecord, "is_default"> & { is_default: number }>>(
      "SELECT * FROM workspaces ORDER BY is_default DESC, name ASC",
    );
    return rows.map((row) => ({ ...row, is_default: !!row.is_default }));
  }

  async getDefaultWorkspace(): Promise<WorkspaceRecord | null> {
    const db = this.ensureDb();
    const rows = await db.select<Array<Omit<WorkspaceRecord, "is_default"> & { is_default: number }>>(
      "SELECT * FROM workspaces WHERE is_default = 1",
    );
    if (rows.length === 0) return null;
    const row = rows[0];
    return { ...row, is_default: true };
  }

  // ── Edit History ────────────────────────────────────────────────────

  async appendEditHistory(
    entry: Omit<EditHistoryEntry, "id">,
  ): Promise<void> {
    const db = this.ensureDb();
    await db.execute(
      "INSERT INTO edit_history (document_id, content_snapshot, created_at) VALUES (?, ?, ?)",
      [entry.document_id, entry.content_snapshot, entry.created_at],
    );
  }

  async getEditHistory(
    documentId: string,
    limit?: number,
  ): Promise<EditHistoryEntry[]> {
    const db = this.ensureDb();
    if (limit) {
      return db.select<EditHistoryEntry[]>(
        "SELECT * FROM edit_history WHERE document_id = ? ORDER BY created_at DESC LIMIT ?",
        [documentId, limit],
      );
    }
    return db.select<EditHistoryEntry[]>(
      "SELECT * FROM edit_history WHERE document_id = ? ORDER BY created_at DESC",
      [documentId],
    );
  }

  async pruneEditHistory(
    documentId: string,
    maxSnapshots: number,
  ): Promise<void> {
    const db = this.ensureDb();
    await db.execute(
      `DELETE FROM edit_history WHERE document_id = ? AND id NOT IN (
        SELECT id FROM edit_history WHERE document_id = ? ORDER BY created_at DESC LIMIT ?
      )`,
      [documentId, documentId, maxSnapshots],
    );
  }

  // ── Logs ────────────────────────────────────────────────────────────

  async appendLog(entry: Omit<LogEntry, "id">): Promise<void> {
    const db = this.ensureDb();
    await db.execute(
      "INSERT INTO logs (level, source, message, metadata, created_at) VALUES (?, ?, ?, ?, ?)",
      [entry.level, entry.source, entry.message, entry.metadata, entry.created_at],
    );
  }

  async queryLogs(filters?: LogFilter): Promise<LogEntry[]> {
    const db = this.ensureDb();
    let query = "SELECT * FROM logs WHERE 1=1";
    const params: unknown[] = [];

    if (filters?.level) {
      query += " AND level = ?";
      params.push(filters.level);
    }
    if (filters?.source) {
      query += " AND source = ?";
      params.push(filters.source);
    }
    if (filters?.since) {
      query += " AND created_at >= ?";
      params.push(filters.since);
    }
    if (filters?.until) {
      query += " AND created_at <= ?";
      params.push(filters.until);
    }

    query += " ORDER BY created_at DESC";

    if (filters?.limit) {
      query += " LIMIT ?";
      params.push(filters.limit);
    }

    return db.select<LogEntry[]>(query, params);
  }
}
