import { useEffect } from "react";
import type { Config } from "../types/config";

/**
 * Watches config changes and applies live side-effects:
 * - Updates CSS custom properties for preview font/size/line-height
 * - Updates CSS custom properties for editor font/size/line-height
 */
export function useConfigEffects(config: Config): void {
  // Apply preview CSS custom properties
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.style.setProperty("--font-preview", config.preview.fontFamily);
    root.style.setProperty("--font-size-preview", `${config.preview.fontSize}px`);
    root.style.setProperty("--line-height-preview", String(config.preview.lineHeight));
  }, [config.preview.fontFamily, config.preview.fontSize, config.preview.lineHeight]);

  // Apply editor CSS custom properties
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.style.setProperty("--font-editor", config.editor.fontFamily);
    root.style.setProperty("--font-size-editor", `${config.editor.fontSize}px`);
    root.style.setProperty("--line-height-editor", String(config.editor.lineHeight));
  }, [config.editor.fontFamily, config.editor.fontSize, config.editor.lineHeight]);
}
