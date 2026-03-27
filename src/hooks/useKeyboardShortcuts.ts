import { useEffect } from "react";
import type { ViewMode } from "./useViewMode";

export interface KeyboardShortcutCallbacks {
  onViewChange: (view: ViewMode) => void;
  onOpenFile?: () => void;
  onSave?: () => void;
  onSaveAs?: () => void;
  onExportHtml?: () => void;
  onExportPdf?: () => void;
  onExportDialog?: () => void;
  hasFilesystem: boolean;
}

/**
 * Registers global keyboard shortcuts for view navigation, file operations, and exports.
 *
 * - Ctrl/Cmd+1 → full-view
 * - Ctrl/Cmd+2 → split-view
 * - Ctrl/Cmd+3 → library (only if hasFilesystem is true)
 * - Ctrl/Cmd+, → settings
 * - Ctrl/Cmd+O → open file
 * - Ctrl/Cmd+S → save
 * - Ctrl/Cmd+Shift+H → HTML export
 * - Ctrl/Cmd+Shift+P → PDF export
 */
export function useKeyboardShortcuts({
  onViewChange,
  onOpenFile,
  onSave,
  onSaveAs,
  onExportHtml,
  onExportPdf,
  onExportDialog,
  hasFilesystem,
}: KeyboardShortcutCallbacks): void {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isMod =
        navigator.platform.toUpperCase().includes("MAC") ? e.metaKey : e.ctrlKey;

      if (!isMod) return;

      // Shift+key combos
      if (e.shiftKey) {
        switch (e.key) {
          case "H":
          case "h":
            if (onExportHtml) {
              e.preventDefault();
              onExportHtml();
            }
            return;
          case "P":
          case "p":
            if (onExportPdf) {
              e.preventDefault();
              onExportPdf();
            }
            return;
          case "S":
          case "s":
            if (onSaveAs) {
              e.preventDefault();
              onSaveAs();
            }
            return;
          case "E":
          case "e":
            if (onExportDialog) {
              e.preventDefault();
              onExportDialog();
            }
            return;
        }
        return;
      }

      switch (e.key) {
        case "1":
          e.preventDefault();
          onViewChange("view");
          break;
        case "2":
          e.preventDefault();
          onViewChange("edit");
          break;
        case "3":
          if (hasFilesystem) {
            e.preventDefault();
            onViewChange("workspaces");
          }
          break;
        case "4":
          e.preventDefault();
          onViewChange("edit-only");
          break;
        case ",":
          e.preventDefault();
          onViewChange("settings");
          break;
        case "o":
        case "O":
          if (onOpenFile) {
            e.preventDefault();
            onOpenFile();
          }
          break;
        case "s":
        case "S":
          if (onSave) {
            e.preventDefault();
            onSave();
          }
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onViewChange, onOpenFile, onSave, onSaveAs, onExportHtml, onExportPdf, onExportDialog, hasFilesystem]);
}
