export interface PlatformCapabilities {
  hasFilesystem: boolean;
  hasFileWatcher: boolean;
  hasNativeDialogs: boolean;
  hasCliArgs: boolean;
}

export interface DirectoryEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  /** ISO 8601 date-time string */
  mtime: string;
  /** ISO 8601 date-time string */
  birthtime: string;
}

export interface PlatformAdapter {
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  watchFile(path: string, callback: (content: string) => void): () => void;
  openFileDialog(extensions: string[]): Promise<string | null>;
  openDirectoryDialog(): Promise<string | null>;
  saveFileDialog(defaultName?: string, extensions?: string[]): Promise<string | null>;
  listDirectory(path: string, recursive: boolean): Promise<DirectoryEntry[]>;
  getStoragePath(): string;
  readConfig(): Promise<Record<string, unknown>>;
  writeConfig(config: Record<string, unknown>): Promise<void>;
  getPlatformCapabilities(): PlatformCapabilities;
  getAppDataDir(): Promise<string>;
  createDirectory(path: string): Promise<void>;
  removeDirectory(path: string): Promise<void>;
}

/**
 * Detect the current runtime and return the appropriate platform adapter.
 * The frontend must never import adapters directly - only through this function.
 */
export async function getPlatform(): Promise<PlatformAdapter> {
  if (
    typeof window !== "undefined" &&
    ("__TAURI__" in window || "__TAURI_INTERNALS__" in window)
  ) {
    const { TauriAdapter } = await import("./tauri");
    return new TauriAdapter();
  }

  const { PwaAdapter } = await import("./pwa");
  return new PwaAdapter();
}
