/**
 * Shruggie Markdown — Chrome Extension Content Script
 *
 * Detects raw markdown pages and replaces them with a rendered preview.
 * Self-contained vanilla DOM — no React — to keep the bundle small.
 */

import { renderMarkdown, engines, defaultEngineId } from "../src/engines/index";

/* ── Markdown URL detection ─────────────────────────────────────── */

const MD_EXTENSIONS = [".md", ".markdown", ".mdown", ".mkdn", ".mkd"];

/**
 * Returns true when the current page URL looks like a raw markdown file.
 */
export function isMarkdownUrl(url: string): boolean {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    return MD_EXTENSIONS.some((ext) => pathname.endsWith(ext));
  } catch {
    return false;
  }
}

/* ── Raw content extraction ─────────────────────────────────────── */

/**
 * Extracts raw markdown text from the page.
 * Browsers typically wrap plain-text responses in a <pre> element.
 */
export function extractMarkdownContent(): string {
  const pre = document.querySelector("pre");
  if (pre) {
    return pre.textContent ?? "";
  }
  return document.body.innerText ?? "";
}

/* ── CSS (inlined design tokens + preview styles) ───────────────── */

const INJECTED_CSS = /* css */ `
/* ── Design tokens (dark default) ──────────────────────────────── */
:host([data-theme="dark"]) {
  --color-bg-primary: #1a1a1a;
  --color-bg-secondary: #222222;
  --color-bg-tertiary: #1e1e1e;
  --color-bg-hover: #2a2a2a;
  --color-bg-active: #333333;
  --color-border-primary: #333333;
  --color-border-subtle: #2a2a2a;
  --color-text-primary: #e8e8e8;
  --color-text-secondary: #999999;
  --color-text-tertiary: #666666;
  --color-accent: #5e9eff;
  --color-accent-hover: #7bb3ff;
  --color-accent-subtle: rgba(94, 158, 255, 0.12);
  --color-success: #30d158;
  --color-warning: #ffd60a;
  --color-error: #ff453a;
}
:host([data-theme="light"]) {
  --color-bg-primary: #ffffff;
  --color-bg-secondary: #f5f5f7;
  --color-bg-tertiary: #fafafa;
  --color-bg-hover: #ebebeb;
  --color-bg-active: #e0e0e0;
  --color-border-primary: #e0e0e0;
  --color-border-subtle: #eeeeee;
  --color-text-primary: #1d1d1f;
  --color-text-secondary: #6e6e73;
  --color-text-tertiary: #aeaeb2;
  --color-accent: #0071e3;
  --color-accent-hover: #0077ed;
  --color-accent-subtle: rgba(0, 113, 227, 0.08);
  --color-success: #248a3d;
  --color-warning: #b25000;
  --color-error: #d70015;
}
:host {
  --font-ui: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
  --font-preview: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
  --font-preview-mono: "JetBrains Mono", "Fira Code", monospace;
  --font-size-preview: 15px;
  --line-height-preview: 1.7;
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
}

/* ── Host / root ──────────────────────────────────────────────── */
:host {
  all: initial;
  display: block;
  font-family: var(--font-ui);
  color: var(--color-text-primary);
  background: var(--color-bg-primary);
  min-height: 100vh;
}

/* ── Toolbar ──────────────────────────────────────────────────── */
.shruggie-toolbar {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-border-primary);
  font-family: var(--font-ui);
  font-size: 13px;
}

.shruggie-toolbar .toolbar-title {
  font-weight: 600;
  margin-right: auto;
  color: var(--color-text-primary);
}

.shruggie-toolbar button,
.shruggie-toolbar select {
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border-primary);
  border-radius: 4px;
  padding: 4px 10px;
  font-size: 12px;
  font-family: var(--font-ui);
  cursor: pointer;
}

.shruggie-toolbar button:hover {
  background: var(--color-bg-hover);
}

.shruggie-toolbar button.active {
  background: var(--color-accent);
  color: #fff;
  border-color: var(--color-accent);
}

/* ── Layout ───────────────────────────────────────────────────── */
.shruggie-container {
  display: flex;
  height: calc(100vh - 45px);
}

.shruggie-container.view-full .shruggie-source { display: none; }
.shruggie-container.view-full .shruggie-preview { flex: 1; }

.shruggie-container.view-split .shruggie-source { flex: 1; display: block; }
.shruggie-container.view-split .shruggie-preview { flex: 1; }

.shruggie-source {
  display: none;
  overflow: auto;
  padding: 16px;
  background: var(--color-bg-tertiary);
  border-right: 1px solid var(--color-border-primary);
}
.shruggie-source pre {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: var(--font-preview-mono);
  font-size: 13px;
  line-height: 1.6;
  color: var(--color-text-primary);
}

.shruggie-preview {
  flex: 1;
  overflow: auto;
  padding: 32px;
}

/* ── Preview content (mirrors preview.css) ────────────────────── */
.preview-content { max-width: 720px; margin: 0 auto; padding: 0 32px; font-family: var(--font-preview); font-size: var(--font-size-preview); line-height: var(--line-height-preview); color: var(--color-text-primary); }
.preview-content h1,.preview-content h2,.preview-content h3,.preview-content h4,.preview-content h5,.preview-content h6 { margin-top:1.5em; margin-bottom:0.5em; font-weight:600; line-height:1.25; }
.preview-content h1 { font-size:28px; padding-bottom:0.3em; border-bottom:1px solid var(--color-border-subtle); }
.preview-content h2 { font-size:22px; padding-bottom:0.3em; border-bottom:1px solid var(--color-border-subtle); }
.preview-content h3 { font-size:18px; }
.preview-content h4 { font-size:16px; }
.preview-content h5 { font-size:15px; }
.preview-content h6 { font-size:13px; }
.preview-content p { font-size:var(--font-size-preview); line-height:var(--line-height-preview); margin-bottom:1em; }
.preview-content pre { margin-bottom:1em; overflow-x:auto; }
.preview-content pre>code { display:block; background:var(--color-bg-tertiary); padding:16px; border-radius:4px; font-family:var(--font-preview-mono); font-size:0.9em; line-height:1.5; overflow-x:auto; }
.preview-content :not(pre)>code { background:var(--color-bg-hover); padding:2px 6px; border-radius:3px; font-family:var(--font-preview-mono); font-size:0.9em; }
.preview-content blockquote { margin:0 0 1em 0; padding-left:16px; border-left:3px solid var(--color-accent-subtle); color:var(--color-text-secondary); }
.preview-content blockquote p:last-child { margin-bottom:0; }
.preview-content table { width:100%; border-collapse:collapse; margin-bottom:1em; }
.preview-content thead th { background:var(--color-bg-secondary); font-weight:600; text-align:left; }
.preview-content th,.preview-content td { padding:8px 12px; border:1px solid var(--color-border-subtle); }
.preview-content a { color:var(--color-accent); text-decoration:none; }
.preview-content a:hover { text-decoration:underline; }
.preview-content img { max-width:100%; border-radius:4px; display:block; margin:0 auto; }
.preview-content hr { border:none; border-top:1px solid var(--color-border-subtle); margin:24px 0; }
.preview-content ul,.preview-content ol { padding-left:2em; margin-bottom:1em; }
.preview-content li { margin-bottom:0.25em; }
.preview-content strong { font-weight:600; }
.preview-content del { text-decoration:line-through; color:var(--color-text-secondary); }

/* ── Highlight.js tokens ──────────────────────────────────────── */
.hljs { background:var(--color-bg-tertiary); color:var(--color-text-primary); }
.hljs-keyword,.hljs-selector-tag,.hljs-built_in,.hljs-type { color:var(--color-accent); font-weight:500; }
.hljs-string,.hljs-addition,.hljs-attribute { color:var(--color-success); }
.hljs-comment,.hljs-quote { color:var(--color-text-tertiary); font-style:italic; }
.hljs-number,.hljs-literal { color:var(--color-warning); }
.hljs-title,.hljs-section { color:var(--color-accent-hover); font-weight:500; }
.hljs-variable,.hljs-template-variable,.hljs-params { color:var(--color-text-primary); }
.hljs-regexp { color:var(--color-error); }
.hljs-deletion { color:var(--color-error); background:rgba(255,69,58,0.1); }
.hljs-meta,.hljs-meta .hljs-keyword { color:var(--color-text-secondary); }
`;

/* ── State ──────────────────────────────────────────────────────── */

interface ExtensionState {
  theme: "dark" | "light";
  viewMode: "full" | "split";
  engineId: string;
  rawMarkdown: string;
}

/* ── UI builder ─────────────────────────────────────────────────── */

function buildToolbar(
  state: ExtensionState,
  callbacks: {
    onThemeToggle: () => void;
    onViewToggle: () => void;
    onEngineChange: (id: string) => void;
    onExportHtml: () => void;
    onExportPdf: () => void;
  },
): HTMLElement {
  const toolbar = document.createElement("div");
  toolbar.className = "shruggie-toolbar";

  // Title
  const title = document.createElement("span");
  title.className = "toolbar-title";
  title.textContent = "Shruggie Markdown";
  toolbar.appendChild(title);

  // View toggle
  const viewBtn = document.createElement("button");
  viewBtn.textContent = state.viewMode === "full" ? "Split View" : "Full View";
  viewBtn.addEventListener("click", callbacks.onViewToggle);
  toolbar.appendChild(viewBtn);

  // Theme toggle
  const themeBtn = document.createElement("button");
  themeBtn.textContent = state.theme === "dark" ? "Light" : "Dark";
  themeBtn.addEventListener("click", callbacks.onThemeToggle);
  toolbar.appendChild(themeBtn);

  // Engine select
  const engineSelect = document.createElement("select");
  for (const key of Object.keys(engines)) {
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = engines[key].name;
    opt.selected = key === state.engineId;
    engineSelect.appendChild(opt);
  }
  engineSelect.addEventListener("change", () => {
    callbacks.onEngineChange(engineSelect.value);
  });
  toolbar.appendChild(engineSelect);

  // Export HTML
  const htmlBtn = document.createElement("button");
  htmlBtn.textContent = "Export HTML";
  htmlBtn.addEventListener("click", callbacks.onExportHtml);
  toolbar.appendChild(htmlBtn);

  // Export PDF
  const pdfBtn = document.createElement("button");
  pdfBtn.textContent = "Export PDF";
  pdfBtn.addEventListener("click", callbacks.onExportPdf);
  toolbar.appendChild(pdfBtn);

  return toolbar;
}

/* ── Export helpers ──────────────────────────────────────────────── */

function downloadFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportHtml(html: string): void {
  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Exported Markdown</title></head>
<body>${html}</body>
</html>`;
  downloadFile("export.html", fullHtml, "text/html");
}

function exportPdf(): void {
  window.print();
}

/* ── Mount point ────────────────────────────────────────────────── */

function mount(): void {
  if (!isMarkdownUrl(window.location.href)) {
    return;
  }

  const rawMarkdown = extractMarkdownContent();
  if (!rawMarkdown.trim()) {
    return;
  }

  const state: ExtensionState = {
    theme: "dark",
    viewMode: "full",
    engineId: defaultEngineId,
    rawMarkdown,
  };

  // Clear original page content
  document.body.textContent = "";
  document.body.style.margin = "0";
  document.body.style.padding = "0";

  // Create shadow host
  const host = document.createElement("div");
  host.id = "shruggie-md-root";
  document.body.appendChild(host);
  const shadow = host.attachShadow({ mode: "open" });

  // Inject styles
  const style = document.createElement("style");
  style.textContent = INJECTED_CSS;
  shadow.appendChild(style);

  // Set data-theme on the shadow host so :host() selectors resolve color tokens
  host.setAttribute("data-theme", state.theme);

  // Root wrapper
  const root = document.createElement("div");
  shadow.appendChild(root);

  // Preview + source containers
  const container = document.createElement("div");
  container.className = "shruggie-container view-full";

  const sourcePane = document.createElement("div");
  sourcePane.className = "shruggie-source";
  const sourcePre = document.createElement("pre");
  sourcePre.textContent = rawMarkdown;
  sourcePane.appendChild(sourcePre);

  const previewPane = document.createElement("div");
  previewPane.className = "shruggie-preview";

  const previewContent = document.createElement("div");
  previewContent.className = "preview-content";
  previewPane.appendChild(previewContent);

  container.appendChild(sourcePane);
  container.appendChild(previewPane);

  /* ── Render function ───────────────────────────────────── */
  function render(): void {
    const html = renderMarkdown(state.rawMarkdown, state.engineId);
    previewContent.innerHTML = html;
  }

  /* ── Rebuild toolbar & re-render ───────────────────────── */
  function rebuild(): void {
    root.innerHTML = "";
    host.setAttribute("data-theme", state.theme);

    const toolbar = buildToolbar(state, {
      onThemeToggle() {
        state.theme = state.theme === "dark" ? "light" : "dark";
        rebuild();
      },
      onViewToggle() {
        state.viewMode = state.viewMode === "full" ? "split" : "full";
        rebuild();
      },
      onEngineChange(id: string) {
        state.engineId = id;
        render();
      },
      onExportHtml() {
        exportHtml(previewContent.innerHTML);
      },
      onExportPdf() {
        exportPdf();
      },
    });

    container.className = `shruggie-container view-${state.viewMode}`;
    root.appendChild(toolbar);
    root.appendChild(container);
    render();
  }

  rebuild();
}

/* ── Bootstrap ──────────────────────────────────────────────────── */
mount();
