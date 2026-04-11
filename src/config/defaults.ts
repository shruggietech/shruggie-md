import type { Config } from "../types/config";

export const defaultConfig: Config = {
  appearance: {
    colorMode: "dark",
    visualStyle: "default",
    showButtonLabels: true,
  },
  editor: {
    fontFamily: '"JetBrains Mono", "Fira Code", monospace',
    fontSize: 13,
    lineHeight: 1.6,
    showLineNumbers: true,
    wordWrap: true,
    lintingEnabled: false,
    activeLinter: "markdownlint",
  },
  preview: {
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
    fontSize: 15,
    lineHeight: 1.7,
  },
  engine: {
    activeEngine: "markdown-it",
  },
  fileExtensions: {
    recognized: [".md", ".markdown", ".mdown", ".mkdn", ".mkd"],
  },
  workspace: {
    recursive: true,
    showHidden: false,
    useIndependentExtensions: false,
    independentExtensions: [],
  },
  general: {
    lastViewMode: null,
    editorToolbarExpanded: false,
    lastDocumentPath: null,
    lastDocumentSource: null,
  },
  advanced: {
    logVerbosity: "warning",
  },
};
