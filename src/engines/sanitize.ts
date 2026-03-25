import DOMPurify from "dompurify";

const ALLOWED_TAGS = [
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "a",
  "img",
  "ul",
  "ol",
  "li",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "pre",
  "code",
  "blockquote",
  "hr",
  "em",
  "strong",
  "del",
  "br",
  "sup",
  "input",
  "div",
  "span",
  "section",
  "dl",
  "dt",
  "dd",
];

const ALLOWED_ATTR = [
  "class",
  "id",
  "href",
  "src",
  "alt",
  "title",
  "type",
  "checked",
  "disabled",
  "target",
  "rel",
];

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
  });
}
