import { marked } from "marked";
import type { MarkdownEngine } from "@/types/engine";

marked.setOptions({
  gfm: true,
});

export const markedEngine: MarkdownEngine = {
  id: "marked",
  name: "Marked",
  compile(source: string): string {
    return marked.parse(source, { async: false }) as string;
  },
};
