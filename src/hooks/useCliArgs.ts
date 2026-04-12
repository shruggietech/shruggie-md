import { useEffect, useRef } from "react";

interface CliArgsCallbacks {
  onFileOpen: (filePath: string, content: string | null) => Promise<boolean>;
  onUrlFetch: (url: string) => Promise<boolean>;
  onResolved?: (result: CliArgsResolution) => void;
}

export type CliArgsResolution =
  | { source: "none"; handled: false }
  | { source: "file"; filePath: string; handled: boolean }
  | { source: "url"; url: string; handled: boolean };

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
        return invoke<[string | null, string | null, string | null]>("get_cli_args");
      })
      .then(async ([filePath, url, fileContent]) => {
        if (url) {
          const handled = await callbacks.onUrlFetch(url);
          callbacks.onResolved?.({ source: "url", url, handled });
        } else if (filePath) {
          const handled = await callbacks.onFileOpen(filePath, fileContent ?? null);
          callbacks.onResolved?.({ source: "file", filePath, handled });
        } else {
          callbacks.onResolved?.({ source: "none", handled: false });
        }
      })
      .catch(() => {
        // Not in Tauri or command not available — ignore
        callbacks.onResolved?.({ source: "none", handled: false });
      });
  }, [enabled, callbacks]);
}
