import { useState, useCallback, useRef, useEffect } from "react";
import type { PlatformAdapter, PlatformCapabilities } from "@/platform/platform";

export interface UseFileWatcherReturn {
  startWatching: (filePath: string, onContent: (content: string) => void) => void;
  stopWatching: () => void;
  isRefreshing: boolean;
}

const DEBOUNCE_MS = 300;
const REFRESH_INDICATOR_MS = 200;

/**
 * Watches a file for external changes and re-reads content when mtime changes.
 * Desktop only — uses the platform adapter's watchFile when hasFileWatcher is true.
 * Built-in 300ms debounce. Returns isRefreshing flag that pulses for 200ms after refresh.
 */
export function useFileWatcher(
  platform: PlatformAdapter | null,
  capabilities: PlatformCapabilities,
): UseFileWatcherReturn {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const unwatchRef = useRef<(() => void) | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopWatching = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    if (unwatchRef.current) {
      unwatchRef.current();
      unwatchRef.current = null;
    }
  }, []);

  const startWatching = useCallback(
    (filePath: string, onContent: (content: string) => void) => {
      // Clean up any existing watcher
      stopWatching();

      if (!capabilities.hasFileWatcher || !platform) return;

      const unwatch = platform.watchFile(filePath, (content: string) => {
        // Debounce: wait 300ms before processing
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(() => {
          onContent(content);

          // Flash the refreshing indicator for 200ms
          setIsRefreshing(true);
          if (refreshTimerRef.current) {
            clearTimeout(refreshTimerRef.current);
          }
          refreshTimerRef.current = setTimeout(() => {
            setIsRefreshing(false);
          }, REFRESH_INDICATOR_MS);
        }, DEBOUNCE_MS);
      });

      unwatchRef.current = unwatch;
    },
    [platform, capabilities.hasFileWatcher, stopWatching],
  );

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopWatching();
    };
  }, [stopWatching]);

  return { startWatching, stopWatching, isRefreshing };
}
