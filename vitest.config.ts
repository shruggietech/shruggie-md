import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
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
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
    css: true,
  },
});
