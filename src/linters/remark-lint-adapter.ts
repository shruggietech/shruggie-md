import { remark } from "remark";
import remarkPresetLintRecommended from "remark-preset-lint-recommended";
import type { LinterAdapter, LintDiagnostic } from "@/types/linter";

/** Convert 1-indexed line/column to a character offset in source. */
function lineColToOffset(
  source: string,
  line: number,
  column: number,
): number {
  const lines = source.split("\n");
  let offset = 0;
  for (let i = 0; i < line - 1 && i < lines.length; i++) {
    offset += lines[i].length + 1;
  }
  return offset + column - 1;
}

export const remarkLintAdapter: LinterAdapter = {
  id: "remark-lint",
  name: "remark-lint",

  async lint(source: string): Promise<LintDiagnostic[]> {
    try {
      const file = await remark()
        .use(remarkPresetLintRecommended)
        .process(source);

      return file.messages.map((msg) => {
        const line = msg.line ?? 1;
        const column = msg.column ?? 1;
        const from = lineColToOffset(source, line, column);
        const to = from + 1; // Minimal range

        return {
          from,
          to,
          severity: msg.fatal ? ("error" as const) : ("warning" as const),
          message: msg.reason,
          ruleId: msg.ruleId ?? msg.source ?? "unknown",
        };
      });
    } catch (e) {
      console.error("remark-lint error:", e);
      return [];
    }
  },
};
