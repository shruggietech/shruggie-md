import type { PlatformAdapter, PlatformCapabilities, DirectoryEntry } from "./platform";

/* Ambient declaration for the Chrome extension API global. */
declare const chrome: {
  storage: {
    sync: {
      get(key: string, cb: (items: Record<string, unknown>) => void): void;
      set(items: Record<string, unknown>, cb: () => void): void;
    };
  };
};

/**
 * Check if chrome.storage.sync is available.
 */
function hasChromeStorage(): boolean {
  try {
    return (
      typeof chrome !== "undefined" &&
      chrome.storage !== undefined &&
      chrome.storage.sync !== undefined
    );
  } catch {
    return false;
  }
}

/**
 * Chrome extension platform adapter.
 * Uses chrome.storage.sync for config persistence, with localStorage fallback.
 */
export class ChromeAdapter implements PlatformAdapter {
  private static readonly CONFIG_KEY = "shruggie-md-config";

  async readFile(_path: string): Promise<string> {
    return "";
  }

  async writeFile(_path: string, _content: string): Promise<void> {
    // No-op in Chrome extension environment
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

  async listDirectory(_path: string, _recursive: boolean): Promise<DirectoryEntry[]> {
    return [];
  }

  getStoragePath(): string {
    return "";
  }

  async readConfig(): Promise<Record<string, unknown>> {
    if (hasChromeStorage()) {
      try {
        const result = await new Promise<Record<string, unknown>>((resolve) => {
          chrome.storage.sync.get(ChromeAdapter.CONFIG_KEY, (items) => {
            const data = items[ChromeAdapter.CONFIG_KEY];
            resolve(
              data && typeof data === "object"
                ? (data as Record<string, unknown>)
                : {},
            );
          });
        });
        return result;
      } catch {
        // Fall through to localStorage
      }
    }

    // localStorage fallback
    try {
      const stored = localStorage.getItem(ChromeAdapter.CONFIG_KEY);
      return stored ? (JSON.parse(stored) as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }

  async writeConfig(config: Record<string, unknown>): Promise<void> {
    if (hasChromeStorage()) {
      try {
        await new Promise<void>((resolve) => {
          chrome.storage.sync.set(
            { [ChromeAdapter.CONFIG_KEY]: config },
            () => resolve(),
          );
        });
        return;
      } catch {
        // Fall through to localStorage
      }
    }

    // localStorage fallback
    try {
      localStorage.setItem(ChromeAdapter.CONFIG_KEY, JSON.stringify(config));
    } catch {
      // Storage may be unavailable
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
