import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import type { PlatformAdapter, PlatformCapabilities } from "../platform/platform";
import { useConfig } from "../config";

export interface LibraryFile {
  title: string;
  path: string;
  lastEdited: string;
  created: string;
}

export interface UseLibraryReturn {
  files: LibraryFile[];
  isScanning: boolean;
  error: string | null;
  scan: () => Promise<void>;
  mountDirectory: () => Promise<void>;
}

export function useLibrary(
  platform: PlatformAdapter | null,
  capabilities: PlatformCapabilities,
): UseLibraryReturn {
  const { config, updateConfig } = useConfig();
  const [files, setFiles] = useState<LibraryFile[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const platformRef = useRef(platform);
  platformRef.current = platform;

  const libraryConfig = config.library;
  const globalExtensions = config.fileExtensions.recognized;

  const activeExtensions = useMemo(() => {
    if (libraryConfig.useIndependentExtensions && libraryConfig.independentExtensions.length > 0) {
      return libraryConfig.independentExtensions;
    }
    return globalExtensions;
  }, [
    libraryConfig.useIndependentExtensions,
    libraryConfig.independentExtensions,
    globalExtensions,
  ]);

  const scan = useCallback(async () => {
    const adapter = platformRef.current;
    if (!adapter || !capabilities.hasFilesystem) {
      setError("Library requires desktop filesystem access.");
      return;
    }

    const mountPath = config.library.mountPath;
    if (!mountPath) {
      setError("No directory mounted. Click Mount to select a folder.");
      setFiles([]);
      return;
    }

    setIsScanning(true);
    setError(null);

    try {
      const entries = await adapter.listDirectory(mountPath, config.library.recursive);

      const result: LibraryFile[] = [];
      for (const entry of entries) {
        // Skip directories
        if (entry.isDirectory) continue;

        // Hidden file filter: when showHidden is false (default), exclude dotfiles
        if (!config.library.showHidden) {
          // Check if any segment of the path relative to mountPath starts with "."
          const name = entry.name;
          if (name.startsWith(".")) continue;
        }

        // Extension filter
        const dotIndex = entry.name.lastIndexOf(".");
        if (dotIndex === -1) continue;
        const ext = entry.name.substring(dotIndex).toLowerCase();
        if (!activeExtensions.includes(ext)) continue;

        // Build title: filename without extension
        const title = entry.name.substring(0, dotIndex);

        result.push({
          title,
          path: entry.path,
          lastEdited: entry.mtime,
          created: entry.birthtime,
        });
      }

      setFiles(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to scan directory.");
      setFiles([]);
    } finally {
      setIsScanning(false);
    }
  }, [capabilities.hasFilesystem, config.library.mountPath, config.library.recursive, config.library.showHidden, activeExtensions]);

  const mountDirectory = useCallback(async () => {
    const adapter = platformRef.current;
    if (!adapter) return;

    const selectedPath = await adapter.openDirectoryDialog();
    if (!selectedPath) return;

    updateConfig("library", { mountPath: selectedPath });
  }, [updateConfig]);

  // Auto-scan when mountPath changes (including initial mount)
  const prevMountPath = useRef<string | null>(null);
  useEffect(() => {
    const mountPath = config.library.mountPath;
    if (mountPath && mountPath !== prevMountPath.current) {
      prevMountPath.current = mountPath;
      scan();
    } else if (!mountPath) {
      prevMountPath.current = null;
    }
  }, [config.library.mountPath, scan]);

  return useMemo(
    () => ({ files, isScanning, error, scan, mountDirectory }),
    [files, isScanning, error, scan, mountDirectory],
  );
}
