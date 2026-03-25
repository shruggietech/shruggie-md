import { useEffect, useRef } from "react";

interface CliArgsCallbacks {
  onFileOpen: (filePath: string) => void;
  onUrlFetch: (url: string) => void;
}

/**
 * Queries CLI arguments from the Tauri backend on mount.
 * If a file path was passed, calls onFileOpen.
 * If a --url flag was passed, calls onUrlFetch.
 * Only runs once on mount in a Tauri environment.
 */
export function useCliArgs(
  callbacks: CliArgsCallbacks,
  enabled: boolean,
): void {
  const calledRef = useRef(false);

  useEffect(() => {
    if (!enabled || calledRef.current) return;
    calledRef.current = true;

    // Dynamically import Tauri invoke to avoid errors in non-Tauri envs
    import("@tauri-apps/api/core")
      .then(({ invoke }) => {
        return invoke<[string | null, string | null]>("get_cli_args");
      })
      .then(([filePath, url]) => {
        if (url) {
          callbacks.onUrlFetch(url);
        } else if (filePath) {
          callbacks.onFileOpen(filePath);
        }
      })
      .catch(() => {
        // Not in Tauri or command not available — ignore
      });
  }, [enabled, callbacks]);
}
