import MarkdownIt from "markdown-it";
import footnote from "markdown-it-footnote";
import taskLists from "markdown-it-task-lists";
import type { MarkdownEngine } from "@/types/engine";

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
});

md.use(footnote);
md.use(taskLists, { enabled: true });

export const markdownItEngine: MarkdownEngine = {
  id: "markdown-it",
  name: "markdown-it",
  compile(source: string): string {
    return md.render(source);
  },
};
