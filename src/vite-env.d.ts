/// <reference types="vite/client" />

declare module "*.css" {
  const content: string;
  export default content;
}

declare module "markdown-it-footnote" {
  import type MarkdownIt from "markdown-it";
  const footnote: MarkdownIt.PluginSimple;
  export default footnote;
}

declare module "markdown-it-task-lists" {
  import type MarkdownIt from "markdown-it";
  const taskLists: MarkdownIt.PluginWithOptions<{ enabled?: boolean }>;
  export default taskLists;
}

declare module "remark-preset-lint-recommended" {
  import type { Preset } from "unified";
  const preset: Preset;
  export default preset;
}
