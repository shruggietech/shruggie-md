export interface Config {
  appearance: {
    colorMode: "light" | "dark" | "system";
    visualStyle: "default" | "warm" | "cool" | "monochrome";
    showButtonLabels: boolean;
  };
  editor: {
    fontFamily: string;
    fontSize: number;
    lineHeight: number;
    showLineNumbers: boolean;
    wordWrap: boolean;
    lintingEnabled: boolean;
    activeLinter: "markdownlint" | "remark-lint";
  };
  preview: {
    fontFamily: string;
    fontSize: number;
    lineHeight: number;
  };
  engine: {
    activeEngine: "markdown-it" | "marked" | "remark";
  };
  fileExtensions: {
    recognized: string[];
  };
  workspace: {
    recursive: boolean;
    showHidden: boolean;
    useIndependentExtensions: boolean;
    independentExtensions: string[];
  };
  general: {
    lastViewMode: "view" | "edit" | "edit-only" | null;
    editorToolbarExpanded: boolean;
  };
  advanced: {
    logVerbosity: "debug" | "info" | "warning" | "error";
  };
}
