import type { PlatformAdapter, PlatformCapabilities, DirectoryEntry } from "./platform";
import {
  readTextFile,
  writeTextFile,
  watchImmediate,
  readDir,
  stat,
} from "@tauri-apps/plugin-fs";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { appConfigDir, join as joinPath } from "@tauri-apps/api/path";

export class TauriAdapter implements PlatformAdapter {
  async readFile(path: string): Promise<string> {
    return readTextFile(path);
  }

  async writeFile(path: string, content: string): Promise<void> {
    await writeTextFile(path, content);
  }

  watchFile(path: string, callback: (content: string) => void): () => void {
    let stopped = false;

    const startWatching = async () => {
      const unwatch = await watchImmediate(path, async (event) => {
        if (stopped) return;
        if (
          event.type === "any" ||
          (typeof event.type === "object" && "modify" in event.type)
        ) {
          try {
            const content = await readTextFile(path);
            callback(content);
          } catch {
            // File may have been deleted or become inaccessible
          }
        }
      });

      return unwatch;
    };

    let unwatchFn: (() => void) | undefined;
    startWatching().then((fn) => {
      if (stopped) {
        fn();
      } else {
        unwatchFn = fn;
      }
    });

    return () => {
      stopped = true;
      unwatchFn?.();
    };
  }

  async openFileDialog(extensions: string[]): Promise<string | null> {
    const result = await openDialog({
      multiple: false,
      filters: [
        {
          name: "Markdown",
          extensions: extensions.map((ext) => ext.replace(/^\./, "")),
        },
      ],
    });
    return result ?? null;
  }

  async openDirectoryDialog(): Promise<string | null> {
    const result = await openDialog({
      directory: true,
      multiple: false,
    });
    return result ?? null;
  }

  async listDirectory(path: string, recursive: boolean): Promise<DirectoryEntry[]> {
    const results: DirectoryEntry[] = [];

    const processDir = async (dirPath: string) => {
      const entries = await readDir(dirPath);
      for (const entry of entries) {
        const entryPath = await joinPath(dirPath, entry.name);
        try {
          const entryStats = await stat(entryPath);
          const isDir = entry.isDirectory ?? false;
          results.push({
            name: entry.name,
            path: entryPath,
            isDirectory: isDir,
            mtime: entryStats.mtime ? new Date(entryStats.mtime).toISOString() : new Date().toISOString(),
            birthtime: entryStats.birthtime ? new Date(entryStats.birthtime).toISOString() : new Date().toISOString(),
          });
          if (isDir && recursive) {
            await processDir(entryPath);
          }
        } catch {
          // Skip entries we can't stat
        }
      }
    };

    await processDir(path);
    return results;
  }

  getStoragePath(): string {
    // This is synchronous; for async resolution use appConfigDir()
    return "";
  }

  async readConfig(): Promise<Record<string, unknown>> {
    try {
      const configDir = await appConfigDir();
      const configPath = `${configDir}/config.json`;
      const content = await readTextFile(configPath);
      return JSON.parse(content) as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  async writeConfig(config: Record<string, unknown>): Promise<void> {
    const configDir = await appConfigDir();
    const configPath = `${configDir}/config.json`;
    await writeTextFile(configPath, JSON.stringify(config, null, 2));
  }

  getPlatformCapabilities(): PlatformCapabilities {
    return {
      hasFilesystem: true,
      hasFileWatcher: true,
      hasNativeDialogs: true,
      hasCliArgs: true,
    };
  }
}
