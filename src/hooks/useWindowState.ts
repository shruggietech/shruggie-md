import { useEffect, useRef } from "react";
import type { StorageAdapter } from "../storage/types";
import { getLogger } from "../storage/logger";

/**
 * Persist and restore window size/position on desktop (Tauri only).
 *
 * Config keys stored in the storage adapter's config table:
 * - window.width, window.height, window.x, window.y, window.maximized
 *
 * On launch: restores the window to its previous size and position.
 * On close: saves the current dimensions and position.
 * If the stored position would place the window off-screen, falls back
 * to centered placement at the default size.
 */
export function useWindowState(
  storage: StorageAdapter | null,
  isTauri: boolean,
): void {
  const storageRef = useRef(storage);
  storageRef.current = storage;

  useEffect(() => {
    if (!isTauri || !storage) return;

    let cleanup: (() => void) | undefined;

    const init = async () => {
      try {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        const win = getCurrentWindow();
        const logger = getLogger();

        // ── Restore previous window state ────────────────────────────
        const [wStr, hStr, xStr, yStr, maxStr] = await Promise.all([
          storage.getConfigValue("window.width"),
          storage.getConfigValue("window.height"),
          storage.getConfigValue("window.x"),
          storage.getConfigValue("window.y"),
          storage.getConfigValue("window.maximized"),
        ]);

        const width = wStr ? JSON.parse(wStr) as number : null;
        const height = hStr ? JSON.parse(hStr) as number : null;
        const x = xStr ? JSON.parse(xStr) as number : null;
        const y = yStr ? JSON.parse(yStr) as number : null;
        const maximized = maxStr ? JSON.parse(maxStr) as boolean : false;

        if (width && height && x !== null && y !== null) {
          // Validate that the position is on-screen
          const monitors = await import("@tauri-apps/api/window").then(
            (mod) => mod.availableMonitors(),
          );
          let onScreen = false;
          for (const monitor of monitors) {
            const mp = monitor.position;
            const ms = monitor.size;
            if (
              x >= mp.x &&
              y >= mp.y &&
              x < mp.x + ms.width &&
              y < mp.y + ms.height
            ) {
              onScreen = true;
              break;
            }
          }

          if (onScreen) {
            const { LogicalSize, LogicalPosition } = await import(
              "@tauri-apps/api/window"
            );
            await win.setSize(new LogicalSize(width, height));
            await win.setPosition(new LogicalPosition(x, y));
            await logger.debug(
              "window-state",
              `Restored window: ${width}x${height} at (${x}, ${y})`,
            );
          } else {
            await logger.info(
              "window-state",
              "Stored position is off-screen. Using default centered placement.",
            );
            await win.center();
          }

          if (maximized) {
            await win.maximize();
          }
        }

        const saveWindowState = async () => {
          const s = storageRef.current;
          if (!s) return;

          const isMax = await win.isMaximized();
          if (!isMax) {
            const size = await win.outerSize();
            const pos = await win.outerPosition();
            await Promise.all([
              s.setConfigValue("window.width", JSON.stringify(size.width)),
              s.setConfigValue("window.height", JSON.stringify(size.height)),
              s.setConfigValue("window.x", JSON.stringify(pos.x)),
              s.setConfigValue("window.y", JSON.stringify(pos.y)),
            ]);
          }
          await s.setConfigValue("window.maximized", JSON.stringify(isMax));
        };

        let debounceTimer: ReturnType<typeof setTimeout> | undefined;

        const debouncedSave = () => {
          if (debounceTimer) {
            clearTimeout(debounceTimer);
          }

          debounceTimer = setTimeout(async () => {
            try {
              await saveWindowState();
            } catch {
              // Silent failure — don't break move/resize flow
            }
          }, 1000);
        };

        // ── Save window state on close ───────────────────────────────
        let isClosing = false;

        const unlistenClose = await win.onCloseRequested(async (event) => {
          if (isClosing) {
            return;
          }

          isClosing = true;
          event.preventDefault();

          if (debounceTimer) {
            clearTimeout(debounceTimer);
            debounceTimer = undefined;
          }

          const saveTimeout = new Promise<void>((resolve) => {
            setTimeout(resolve, 2000);
          });

          const saveState = (async () => {
            try {
              await saveWindowState();
            } catch {
              // Silent failure — don't block close
            }
          })();

          await Promise.race([saveState, saveTimeout]);

          try {
            await win.destroy();
          } catch {
            // Silent failure — if destroy fails, avoid crashing the close flow
          }
        });

        const unlistenMove = await win.onMoved(debouncedSave);
        const unlistenResize = await win.onResized(debouncedSave);

        cleanup = () => {
          if (debounceTimer) {
            clearTimeout(debounceTimer);
          }
          unlistenClose();
          unlistenMove();
          unlistenResize();
        };
      } catch {
        // Not on Tauri or API not available — silently skip
      }
    };

    init();

    return () => {
      cleanup?.();
    };
  }, [isTauri, storage]);
}
