export type {
  StorageAdapter,
  LogLevel,
  LogEntry,
  LogFilter,
  DocumentRecord,
  WorkspaceRecord,
  EditHistoryEntry,
  TagRecord,
  DocumentTagRecord,
  ConfigEntry,
} from "./types";

export { flattenConfig, unflattenConfig } from "./config-utils";
export { Logger, initLogger, getLogger } from "./logger";
export { migrateConfig } from "./migration";
export { StorageContext, useStorage } from "./StorageContext";

/**
 * Create the appropriate storage adapter for the current platform.
 * Desktop (Tauri) → SQLite, Web/PWA/Chrome → IndexedDB.
 */
export async function getStorage(): Promise<
  import("./types").StorageAdapter
> {
  if (
    typeof window !== "undefined" &&
    ("__TAURI__" in window || "__TAURI_INTERNALS__" in window)
  ) {
    const { SqliteStorageAdapter } = await import("./sqlite");
    return new SqliteStorageAdapter();
  }

  const { IndexedDbStorageAdapter } = await import("./indexeddb");
  return new IndexedDbStorageAdapter();
}
