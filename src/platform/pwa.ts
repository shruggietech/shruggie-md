import type { PlatformAdapter, PlatformCapabilities, DirectoryEntry } from "./platform";

// ─── Thin IndexedDB wrapper ──────────────────────────────────────────────

const DB_NAME = "shruggie-md-config";
const DB_VERSION = 1;
const STORE_NAME = "config";
const CONFIG_KEY = "config";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function idbGet(db: IDBDatabase, key: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function idbPut(db: IDBDatabase, key: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(value, key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ─── PWA Adapter ─────────────────────────────────────────────────────────

/**
 * PWA platform adapter.
 * Uses IndexedDB for config persistence.
 */
export class PwaAdapter implements PlatformAdapter {
  async readFile(_path: string): Promise<string> {
    return "";
  }

  async writeFile(_path: string, _content: string): Promise<void> {
    // No-op in PWA environment
  }

  watchFile(_path: string, _callback: (content: string) => void): () => void {
    return () => {};
  }

  async openFileDialog(_extensions: string[]): Promise<string | null> {
    return null;
  }

  async openDirectoryDialog(): Promise<string | null> {
    return null;
  }

  async saveFileDialog(_defaultName?: string, _extensions?: string[]): Promise<string | null> {
    return null;
  }

  async listDirectory(_path: string, _recursive: boolean): Promise<DirectoryEntry[]> {
    return [];
  }

  getStoragePath(): string {
    return "";
  }

  async readConfig(): Promise<Record<string, unknown>> {
    try {
      const db = await openDB();
      const data = await idbGet(db, CONFIG_KEY);
      db.close();
      if (data && typeof data === "object" && !Array.isArray(data)) {
        return data as Record<string, unknown>;
      }
      return {};
    } catch {
      return {};
    }
  }

  async writeConfig(config: Record<string, unknown>): Promise<void> {
    try {
      const db = await openDB();
      await idbPut(db, CONFIG_KEY, config);
      db.close();
    } catch {
      // IndexedDB may be unavailable
    }
  }

  getPlatformCapabilities(): PlatformCapabilities {
    return {
      hasFilesystem: false,
      hasFileWatcher: false,
      hasNativeDialogs: false,
      hasCliArgs: false,
    };
  }
}
