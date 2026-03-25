export interface Config {
  appearance: {
    colorMode: "light" | "dark" | "system";
    visualStyle: "default" | "warm" | "cool" | "monochrome";
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
  library: {
    mountPath: string | null;
    recursive: boolean;
    showHidden: boolean;
    useIndependentExtensions: boolean;
    independentExtensions: string[];
  };
  general: {
    lastViewMode: "full-view" | "split-view" | null;
  };
}
