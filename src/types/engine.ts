export interface MarkdownEngine {
  id: string;
  name: string;
  compile(source: string): string;
}
