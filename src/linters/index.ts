import type { LinterAdapter } from "@/types/linter";
import { markdownlintAdapter } from "./markdownlint-adapter";
import { remarkLintAdapter } from "./remark-lint-adapter";

export { markdownlintAdapter } from "./markdownlint-adapter";
export { remarkLintAdapter } from "./remark-lint-adapter";

const linters: Record<string, LinterAdapter> = {
  markdownlint: markdownlintAdapter,
  "remark-lint": remarkLintAdapter,
};

export function getLinter(id: string): LinterAdapter {
  const adapter = linters[id];
  if (!adapter) {
    throw new Error(`Unknown linter: "${id}"`);
  }
  return adapter;
}
