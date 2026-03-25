import { useState, useCallback, useRef } from "react";
import { getPlatform } from "@/platform/platform";
import type { PlatformAdapter, PlatformCapabilities } from "@/platform/platform";

export interface UseFileSaveReturn {
  saveFile: (content: string, filePath: string | null) => Promise<void>;
  isSaving: boolean;
  lastSaved: Date | null;
}

/**
 * Provides file save functionality.
 * - Desktop (Tauri): writes content to the source file path via platform adapter
 * - Browser: triggers a file download via Blob + hidden anchor
 */
export function useFileSave(
  platform: PlatformAdapter | null,
  capabilities: PlatformCapabilities,
): UseFileSaveReturn {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const anchorRef = useRef<HTMLAnchorElement | null>(null);

  const saveFile = useCallback(
    async (content: string, filePath: string | null) => {
      setIsSaving(true);
      try {
        if (capabilities.hasFilesystem && platform && filePath) {
          // Desktop: write to file via platform adapter
          await platform.writeFile(filePath, content);
        } else {
          // Browser: trigger a download
          const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
          const url = URL.createObjectURL(blob);

          if (!anchorRef.current) {
            anchorRef.current = document.createElement("a");
          }
          const anchor = anchorRef.current;
          anchor.href = url;
          anchor.download = filePath
            ? filePath.replace(/\\/g, "/").split("/").pop() ?? "document.md"
            : "document.md";
          anchor.style.display = "none";
          document.body.appendChild(anchor);
          anchor.click();
          document.body.removeChild(anchor);
          URL.revokeObjectURL(url);
        }
        setLastSaved(new Date());
      } finally {
        setIsSaving(false);
      }
    },
    [platform, capabilities.hasFilesystem],
  );

  return { saveFile, isSaving, lastSaved };
}
