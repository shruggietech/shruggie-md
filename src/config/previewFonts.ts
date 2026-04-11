export interface FontOption {
  label: string;
  value: string;
}

export const SYSTEM_DEFAULT_FONT_VALUE =
  "-apple-system, BlinkMacSystemFont, \"Segoe UI\", system-ui, sans-serif";

export const PREVIEW_FONTS: FontOption[] = [
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Cambria", value: "Cambria, Georgia, serif" },
  { label: "Consolas", value: "Consolas, monospace" },
  { label: "Courier New", value: '"Courier New", Courier, monospace' },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Helvetica", value: "Helvetica, Arial, sans-serif" },
  { label: "Inter", value: "Inter, sans-serif" },
  { label: "JetBrains Mono", value: '"JetBrains Mono", monospace' },
  { label: "Roboto", value: "Roboto, sans-serif" },
  { label: "System Default", value: SYSTEM_DEFAULT_FONT_VALUE },
  { label: "Times New Roman", value: '"Times New Roman", Times, serif' },
  { label: "Verdana", value: "Verdana, Geneva, sans-serif" },
];
