import type { PlatformAdapter, PlatformCapabilities, DirectoryEntry } from "./platform";

/**
 * Web (browser) platform adapter.
 * Provides sensible no-op defaults for all platform operations.
 */
export class WebAdapter implements PlatformAdapter {
  async readFile(_path: string): Promise<string> {
    return "";
  }

  async writeFile(_path: string, _content: string): Promise<void> {
    // No-op in web environment
  }

  watchFile(_path: string, _callback: (content: string) => void): () => void {
    // No-op watcher
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
    // Library is desktop-only; web returns empty
    return [];
  }

  getStoragePath(): string {
    return "";
  }

  async readConfig(): Promise<Record<string, unknown>> {
    try {
      const stored = localStorage.getItem("shruggie-md-config");
      return stored ? (JSON.parse(stored) as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }

  async writeConfig(config: Record<string, unknown>): Promise<void> {
    try {
      localStorage.setItem("shruggie-md-config", JSON.stringify(config));
    } catch {
      // localStorage may be unavailable
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
