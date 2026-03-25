import type { MarkdownEngine } from "@/types/engine";
import { markdownItEngine } from "./markdown-it-engine";
import { markedEngine } from "./marked-engine";
import { remarkEngine } from "./remark-engine";
import { sanitizeHtml } from "./sanitize";

export const engines: Record<string, MarkdownEngine> = {
  "markdown-it": markdownItEngine,
  marked: markedEngine,
  remark: remarkEngine,
};

export const defaultEngineId = "markdown-it";

export function renderMarkdown(source: string, engineId: string): string {
  const engine = engines[engineId];
  if (!engine) {
    throw new Error(`Unknown markdown engine: "${engineId}"`);
  }
  const rawHtml = engine.compile(source);
  return sanitizeHtml(rawHtml);
}

export { sanitizeHtml } from "./sanitize";
