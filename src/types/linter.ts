export interface LintDiagnostic {
  from: number;
  to: number;
  severity: "error" | "warning" | "info";
  message: string;
  ruleId: string;
}

export interface LinterAdapter {
  id: string;
  name: string;
  lint(source: string): Promise<LintDiagnostic[]>;
}
