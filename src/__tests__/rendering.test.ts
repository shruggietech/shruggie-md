import { describe, it, expect } from "vitest";
import { renderMarkdown, engines, sanitizeHtml } from "@/engines/index";

/* ================================================================
 * 1. Engine Abstraction Tests
 * ================================================================ */

describe("Engine Abstraction", () => {
  const engineIds = Object.keys(engines);

  it("registry contains all three engines", () => {
    expect(engineIds).toContain("markdown-it");
    expect(engineIds).toContain("marked");
    expect(engineIds).toContain("remark");
  });

  describe.each(engineIds)("engine: %s", (engineId) => {
    it("produces HTML from markdown", () => {
      const html = renderMarkdown("Hello **world**", engineId);
      expect(html).toBeTruthy();
      expect(typeof html).toBe("string");
    });

    it("produces heading tags from # syntax", () => {
      const html = renderMarkdown("# Heading 1\n## Heading 2", engineId);
      expect(html).toContain("<h1");
      expect(html).toContain("<h2");
    });

    it("produces paragraph tags", () => {
      const html = renderMarkdown("A paragraph of text.", engineId);
      expect(html).toContain("<p");
    });

    it("handles code blocks", () => {
      const md = "```javascript\nconst x = 1;\n```";
      const html = renderMarkdown(md, engineId);
      expect(html).toContain("<code");
    });

    it("handles links", () => {
      const html = renderMarkdown("[link](https://example.com)", engineId);
      expect(html).toContain("<a");
      expect(html).toContain("https://example.com");
    });

    it("handles unordered lists", () => {
      const html = renderMarkdown("- item 1\n- item 2\n- item 3", engineId);
      expect(html).toContain("<ul");
      expect(html).toContain("<li");
    });

    it("handles ordered lists", () => {
      const html = renderMarkdown("1. first\n2. second", engineId);
      expect(html).toContain("<ol");
      expect(html).toContain("<li");
    });

    it("handles GFM tables", () => {
      const md = "| H1 | H2 |\n| --- | --- |\n| A | B |";
      const html = renderMarkdown(md, engineId);
      expect(html).toContain("<table");
      expect(html).toContain("<th");
      expect(html).toContain("<td");
    });
  });

  it("throws for unknown engine id", () => {
    expect(() => renderMarkdown("test", "nonexistent")).toThrow(
      'Unknown markdown engine: "nonexistent"'
    );
  });
});

/* ================================================================
 * 2. Sanitization Tests
 * ================================================================ */

describe("Sanitization", () => {
  it("strips script tags", () => {
    const result = sanitizeHtml("<p>hello</p><script>alert(1)</script>");
    expect(result).not.toContain("<script");
    expect(result).toContain("<p>hello</p>");
  });

  it("strips onerror attributes", () => {
    const result = sanitizeHtml('<img src="x" onerror="alert(1)">');
    expect(result).not.toContain("onerror");
  });

  it("strips onclick attributes", () => {
    const result = sanitizeHtml('<a href="#" onclick="alert(1)">click</a>');
    expect(result).not.toContain("onclick");
  });

  it("allows headings", () => {
    const result = sanitizeHtml("<h1>Title</h1><h2>Sub</h2>");
    expect(result).toContain("<h1>");
    expect(result).toContain("<h2>");
  });

  it("allows paragraphs", () => {
    const result = sanitizeHtml("<p>Hello world</p>");
    expect(result).toContain("<p>");
  });

  it("allows links with href", () => {
    const result = sanitizeHtml('<a href="https://example.com">link</a>');
    expect(result).toContain("<a");
    expect(result).toContain('href="https://example.com"');
  });

  it("allows images with src and alt", () => {
    const result = sanitizeHtml('<img src="photo.png" alt="photo">');
    expect(result).toContain("<img");
    expect(result).toContain('src="photo.png"');
    expect(result).toContain('alt="photo"');
  });

  it("allows tables", () => {
    const html =
      "<table><thead><tr><th>H</th></tr></thead><tbody><tr><td>D</td></tr></tbody></table>";
    const result = sanitizeHtml(html);
    expect(result).toContain("<table>");
    expect(result).toContain("<thead>");
    expect(result).toContain("<th>");
    expect(result).toContain("<td>");
  });

  it("allows code blocks", () => {
    const result = sanitizeHtml("<pre><code>const x = 1;</code></pre>");
    expect(result).toContain("<pre>");
    expect(result).toContain("<code>");
  });

  it("allows task list checkboxes", () => {
    const result = sanitizeHtml(
      '<input type="checkbox" checked disabled>'
    );
    expect(result).toContain("<input");
    expect(result).toContain('type="checkbox"');
  });

  it("XSS payload: strips onerror from img", () => {
    const result = sanitizeHtml('<img src=x onerror=alert(1)>');
    expect(result).toContain("<img");
    expect(result).not.toContain("onerror");
    expect(result).not.toContain("alert");
  });
});

/* ================================================================
 * 3. Integration Tests
 * ================================================================ */

describe("Integration: full pipeline", () => {
  const markdown = [
    "# Hello World",
    "",
    "A paragraph with **bold** and *italic*.",
    "",
    "```js",
    "console.log('hi');",
    "```",
    "",
    "| Col1 | Col2 |",
    "| ---- | ---- |",
    "| A    | B    |",
    "",
    "[link](https://example.com)",
    "",
    "- [ ] unchecked",
    "- [x] checked",
    "",
    '<script>alert("xss")</script>',
  ].join("\n");

  it("markdown-it full pipeline produces expected elements", () => {
    const html = renderMarkdown(markdown, "markdown-it");
    expect(html).toContain("<h1");
    expect(html).toContain("<p>");
    expect(html).toContain("<strong>");
    expect(html).toContain("<em>");
    expect(html).toContain("<code");
    expect(html).toContain("<table");
    expect(html).toContain("<a");
    expect(html).not.toContain("<script");
  });

  it("marked full pipeline produces expected elements", () => {
    const html = renderMarkdown(markdown, "marked");
    expect(html).toContain("<h1");
    expect(html).toContain("<p>");
    expect(html).toContain("<strong>");
    expect(html).toContain("<code");
    expect(html).toContain("<table");
    expect(html).not.toContain("<script");
  });

  it("remark full pipeline produces expected elements", () => {
    const html = renderMarkdown(markdown, "remark");
    expect(html).toContain("<h1");
    expect(html).toContain("<p>");
    expect(html).toContain("<strong>");
    expect(html).toContain("<code");
    expect(html).toContain("<table");
    expect(html).not.toContain("<script");
  });

  it("engine switching: same input produces structurally similar output", () => {
    const source = "# Title\n\nParagraph text.\n\n- item\n";
    const results = Object.keys(engines).map((id) => ({
      id,
      html: renderMarkdown(source, id),
    }));

    // All engines should produce the same structural elements
    for (const { html } of results) {
      expect(html).toContain("<h1");
      expect(html).toContain("<p>");
      expect(html).toContain("<li");
    }
  });
});
