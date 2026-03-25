import hljs from "highlight.js";

/**
 * Post-render hook: finds all <pre><code> elements in the container
 * and applies highlight.js syntax highlighting.
 */
export function highlightCodeBlocks(container: HTMLElement): void {
  const codeBlocks = container.querySelectorAll("pre code");
  codeBlocks.forEach((block) => {
    hljs.highlightElement(block as HTMLElement);
  });
}
