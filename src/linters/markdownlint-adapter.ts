import { lint } from "markdownlint/promise";
import type { LinterAdapter, LintDiagnostic } from "@/types/linter";

/** Convert a 1-indexed line number to a character offset in source. */
function lineToOffset(source: string, line: number): number {
  const lines = source.split("\n");
  let offset = 0;
  for (let i = 0; i < line - 1 && i < lines.length; i++) {
    offset += lines[i].length + 1; // +1 for newline
  }
  return offset;
}

export const markdownlintAdapter: LinterAdapter = {
  id: "markdownlint",
  name: "markdownlint",

  async lint(source: string): Promise<LintDiagnostic[]> {
    try {
      const results = await lint({
        strings: { content: source },
      });
      const issues = results.content ?? [];
      return issues.map((issue) => {
        const lineOffset = lineToOffset(source, issue.lineNumber);
        let from = lineOffset;
        let to = lineOffset;

        if (issue.errorRange) {
          from = lineOffset + issue.errorRange[0] - 1; // errorRange column is 1-indexed
          to = from + issue.errorRange[1];
        } else {
          // Mark the entire line
          const lines = source.split("\n");
          const lineText = lines[issue.lineNumber - 1] || "";
          to = from + lineText.length;
        }

        return {
          from,
          to,
          severity: issue.severity,
          message: issue.ruleDescription,
          ruleId: issue.ruleNames[0] || "unknown",
        };
      });
    } catch (e) {
      console.error("markdownlint error:", e);
      return [];
    }
  },
};
