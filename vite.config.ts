import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const pkg = JSON.parse(readFileSync(resolve(__dirname, "package.json"), "utf-8")) as { version: string };

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: false, // We provide our own public/manifest.json
      devOptions: { enabled: false },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
        runtimeCaching: [
          {
            // Cache remote markdown content with NetworkFirst strategy
            urlPattern: /^https:\/\/.*\.(md|markdown|mdown|mkdn|mkd)$/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "remote-markdown",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
              networkTimeoutSeconds: 5,
            },
          },
        ],
      },
    }),
  ],
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
  // Vite dev server port matching Tauri's default devUrl
  server: {
    port: 1420,
    strictPort: true,
  },
  // Clear the screen on dev server start
  clearScreen: false,
  build: {
    chunkSizeWarningLimit: 1600,
    rolldownOptions: {
      output: {
        manualChunks(id: string) {
          if (
            id.includes("@codemirror/") ||
            id.includes("codemirror") ||
            id.includes("@lezer/")
          ) {
            return "codemirror";
          }
          if (
            id.includes("markdown-it") ||
            id.includes("marked") ||
            id.includes("remark") ||
            id.includes("mdast") ||
            id.includes("micromark") ||
            id.includes("unified")
          ) {
            return "markdown-engines";
          }
          if (id.includes("highlight.js")) {
            return "highlight";
          }
          if (id.includes("dompurify")) {
            return "sanitize";
          }
        },
      },
    },
  },
});
