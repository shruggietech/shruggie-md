import { useState, useCallback, useRef } from "react";
import type { PlatformAdapter, PlatformCapabilities } from "@/platform/platform";

export interface UseFileSaveReturn {
  saveFile: (content: string, filePath: string | null) => Promise<void>;
  saveFileAs: (content: string, defaultName?: string) => Promise<string | null>;
  isSaving: boolean;
  lastSaved: Date | null;
}

/**
 * Triggers a browser file save via Blob + hidden anchor.
 * Used as the final fallback when no native dialog is available.
 */
function triggerBrowserSave(content: string, fileName: string, mimeType: string): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/**
 * Provides Save and Save As functionality.
 * - Desktop (Tauri): Save overwrites in place; Save As opens native dialog.
 * - Browser: Save writes to existing File System Access handle or falls back to
 *   browser save; Save As uses showSaveFilePicker or falls back to browser save.
 */
export function useFileSave(
  platform: PlatformAdapter | null,
  capabilities: PlatformCapabilities,
): UseFileSaveReturn {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const saveFile = useCallback(
    async (content: string, filePath: string | null) => {
      setIsSaving(true);
      try {
        if (capabilities.hasFilesystem && platform && filePath) {
          // Desktop: write to file via platform adapter
          await platform.writeFile(filePath, content);
        } else {
          // Browser: trigger a save via hidden anchor
          const name = filePath
            ? filePath.replace(/\\/g, "/").split("/").pop() ?? "document.md"
            : "document.md";
          triggerBrowserSave(content, name, "text/markdown");
        }
        setLastSaved(new Date());
      } finally {
        setIsSaving(false);
      }
    },
    [platform, capabilities.hasFilesystem],
  );

  const saveFileAs = useCallback(
    async (content: string, defaultName?: string): Promise<string | null> => {
      setIsSaving(true);
      try {
        const name = defaultName ?? "document.md";

        if (platform) {
          // Try native save dialog
          const chosenPath = await platform.saveFileDialog(name, [".md", ".markdown"]);
          if (chosenPath) {
            await platform.writeFile(chosenPath, content);
            setLastSaved(new Date());
            return chosenPath;
          }
          // User cancelled — no save
          if (capabilities.hasFilesystem) return null;
        }

        // Browser fallback: trigger save via hidden anchor
        triggerBrowserSave(content, name, "text/markdown");
        setLastSaved(new Date());
        return null;
      } finally {
        setIsSaving(false);
      }
    },
    [platform, capabilities.hasFilesystem],
  );

  return { saveFile, saveFileAs, isSaving, lastSaved };
}
