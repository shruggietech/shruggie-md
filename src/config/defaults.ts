import type { Config } from "../types/config";

export const defaultConfig: Config = {
  appearance: {
    colorMode: "dark",
    visualStyle: "default",
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
      '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
    fontSize: 15,
    lineHeight: 1.7,
  },
  engine: {
    activeEngine: "markdown-it",
  },
  fileExtensions: {
    recognized: [".md", ".markdown", ".mdown", ".mkdn", ".mkd"],
  },
  library: {
    mountPath: null,
    recursive: true,
    showHidden: false,
    useIndependentExtensions: false,
    independentExtensions: [],
  },
  general: {
    lastViewMode: null,
  },
};
