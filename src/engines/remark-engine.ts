import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkHtml from "remark-html";
import type { MarkdownEngine } from "@/types/engine";

export const remarkEngine: MarkdownEngine = {
  id: "remark",
  name: "Remark",
  compile(source: string): string {
    const result = remark()
      .use(remarkGfm)
      .use(remarkHtml, { sanitize: false })
      .processSync(source);
    return String(result);
  },
};
