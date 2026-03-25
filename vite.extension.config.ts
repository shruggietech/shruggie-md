import { defineConfig } from "vite";
import { resolve } from "node:path";

/**
 * Vite build config for the Shruggie Markdown Chrome extension.
 *
 * Produces two self-contained IIFE bundles (content.js, popup.js).
 * Since Vite 8 / Rolldown disallows multiple inputs with IIFE format,
 * we use `es` format with code-splitting. Chrome MV3 content scripts
 * support ES modules when declared as `"type": "module"` in the manifest,
 * but for maximum compatibility we output ES and keep each entry self-contained
 * by disabling chunk splitting.
 */
export default defineConfig({
  // Don't copy the PWA public/ dir into the extension output
  publicDir: false,
  resolve: {
    alias: {
      "@/components": resolve(__dirname, "src/components"),
      "@/engines": resolve(__dirname, "src/engines"),
      "@/linters": resolve(__dirname, "src/linters"),
      "@/platform": resolve(__dirname, "src/platform"),
      "@/hooks": resolve(__dirname, "src/hooks"),
      "@/types": resolve(__dirname, "src/types"),
      "@/styles": resolve(__dirname, "src/styles"),
      "@/config": resolve(__dirname, "src/config"),
    },
  },
  build: {
    outDir: resolve(__dirname, "extension/dist"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        content: resolve(__dirname, "extension/content.ts"),
        popup: resolve(__dirname, "extension/popup.ts"),
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "[name].js",
        assetFileNames: "[name].[ext]",
      },
    },
    cssCodeSplit: false,
    minify: true,
    target: "chrome120",
  },
});
