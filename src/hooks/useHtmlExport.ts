import { useCallback } from "react";
import { renderMarkdown } from "@/engines/index";
import type { PlatformAdapter, PlatformCapabilities } from "@/platform/platform";

/**
 * Reads a CSS custom property value from computed styles on the document root.
 */
function getCSSVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/**
 * Resolves all theme tokens to their current computed values.
 */
function resolveThemeTokens(): string {
  const vars: Record<string, string> = {
    "--color-bg-primary": getCSSVar("--color-bg-primary"),
    "--color-bg-secondary": getCSSVar("--color-bg-secondary"),
    "--color-bg-tertiary": getCSSVar("--color-bg-tertiary"),
    "--color-bg-hover": getCSSVar("--color-bg-hover"),
    "--color-bg-active": getCSSVar("--color-bg-active"),
    "--color-border-primary": getCSSVar("--color-border-primary"),
    "--color-border-subtle": getCSSVar("--color-border-subtle"),
    "--color-text-primary": getCSSVar("--color-text-primary"),
    "--color-text-secondary": getCSSVar("--color-text-secondary"),
    "--color-text-tertiary": getCSSVar("--color-text-tertiary"),
    "--color-accent": getCSSVar("--color-accent"),
    "--color-accent-hover": getCSSVar("--color-accent-hover"),
    "--color-accent-subtle": getCSSVar("--color-accent-subtle"),
    "--color-success": getCSSVar("--color-success"),
    "--color-warning": getCSSVar("--color-warning"),
    "--color-error": getCSSVar("--color-error"),
    "--font-ui": getCSSVar("--font-ui"),
    "--font-preview": getCSSVar("--font-preview"),
    "--font-preview-mono": getCSSVar("--font-preview-mono"),
    "--font-size-preview": getCSSVar("--font-size-preview"),
    "--line-height-preview": getCSSVar("--line-height-preview"),
    "--font-weight-normal": getCSSVar("--font-weight-normal"),
    "--font-weight-medium": getCSSVar("--font-weight-medium"),
    "--font-weight-semibold": getCSSVar("--font-weight-semibold"),
    "--space-1": getCSSVar("--space-1"),
    "--space-2": getCSSVar("--space-2"),
    "--space-3": getCSSVar("--space-3"),
    "--space-4": getCSSVar("--space-4"),
    "--space-6": getCSSVar("--space-6"),
    "--space-8": getCSSVar("--space-8"),
    "--radius-sm": getCSSVar("--radius-sm"),
    "--radius-md": getCSSVar("--radius-md"),
  };

  return Object.entries(vars)
    .map(([key, value]) => `  ${key}: ${value};`)
    .join("\n");
}

/**
 * Builds inline CSS for the exported HTML document, using hardcoded values
 * instead of CSS variables.
 */
function buildInlineStyles(): string {
  const bgPrimary = getCSSVar("--color-bg-primary");
  const bgSecondary = getCSSVar("--color-bg-secondary");
  const bgTertiary = getCSSVar("--color-bg-tertiary");
  const bgHover = getCSSVar("--color-bg-hover");
  const borderPrimary = getCSSVar("--color-border-primary");
  const borderSubtle = getCSSVar("--color-border-subtle");
  const textPrimary = getCSSVar("--color-text-primary");
  const textSecondary = getCSSVar("--color-text-secondary");
  const textTertiary = getCSSVar("--color-text-tertiary");
  const accent = getCSSVar("--color-accent");
  const accentHover = getCSSVar("--color-accent-hover");
  const accentSubtle = getCSSVar("--color-accent-subtle");
  const success = getCSSVar("--color-success");
  const warning = getCSSVar("--color-warning");
  const error = getCSSVar("--color-error");
  const fontPreview = getCSSVar("--font-preview");
  const fontPreviewMono = getCSSVar("--font-preview-mono");
  const fontSizePreview = getCSSVar("--font-size-preview");
  const lineHeightPreview = getCSSVar("--line-height-preview");
  const fontWeightSemibold = getCSSVar("--font-weight-semibold");
  const fontWeightMedium = getCSSVar("--font-weight-medium");
  const space2 = getCSSVar("--space-2");
  const space3 = getCSSVar("--space-3");
  const space4 = getCSSVar("--space-4");
  const space6 = getCSSVar("--space-6");
  const space8 = getCSSVar("--space-8");
  const radiusSm = getCSSVar("--radius-sm");

  return `
    body {
      margin: 0;
      padding: ${space6};
      background: ${bgPrimary};
      color: ${textPrimary};
      font-family: ${fontPreview};
    }
    .preview-content {
      max-width: 720px;
      margin: 0 auto;
      padding: 0 ${space8};
      font-family: ${fontPreview};
      font-size: ${fontSizePreview};
      line-height: ${lineHeightPreview};
      color: ${textPrimary};
    }
    .preview-content h1, .preview-content h2, .preview-content h3,
    .preview-content h4, .preview-content h5, .preview-content h6 {
      margin-top: 1.5em; margin-bottom: 0.5em;
      font-weight: ${fontWeightSemibold}; line-height: 1.25;
    }
    .preview-content h1 { font-size: 28px; padding-bottom: 0.3em; border-bottom: 1px solid ${borderSubtle}; }
    .preview-content h2 { font-size: 22px; padding-bottom: 0.3em; border-bottom: 1px solid ${borderSubtle}; }
    .preview-content h3 { font-size: 18px; }
    .preview-content h4 { font-size: 16px; }
    .preview-content h5 { font-size: 15px; }
    .preview-content h6 { font-size: 13px; }
    .preview-content p { font-size: ${fontSizePreview}; line-height: ${lineHeightPreview}; margin-bottom: 1em; }
    .preview-content pre { margin-bottom: 1em; overflow-x: auto; }
    .preview-content pre > code {
      display: block; background: ${bgTertiary}; padding: ${space4};
      border-radius: ${radiusSm}; font-family: ${fontPreviewMono};
      font-size: 0.9em; line-height: 1.5; overflow-x: auto;
    }
    .preview-content :not(pre) > code {
      background: ${bgHover}; padding: 2px 6px; border-radius: 3px;
      font-family: ${fontPreviewMono}; font-size: 0.9em;
    }
    .preview-content blockquote {
      margin: 0 0 1em 0; padding-left: ${space4};
      border-left: 3px solid ${accentSubtle}; color: ${textSecondary};
    }
    .preview-content blockquote p:last-child { margin-bottom: 0; }
    .preview-content table { width: 100%; border-collapse: collapse; margin-bottom: 1em; }
    .preview-content thead th {
      background: ${bgSecondary}; font-weight: ${fontWeightSemibold}; text-align: left;
    }
    .preview-content th, .preview-content td {
      padding: ${space2} ${space3}; border: 1px solid ${borderSubtle};
    }
    .preview-content a { color: ${accent}; text-decoration: none; }
    .preview-content a:hover { text-decoration: underline; }
    .preview-content img { max-width: 100%; border-radius: ${radiusSm}; display: block; margin: 0 auto; }
    .preview-content hr { border: none; border-top: 1px solid ${borderSubtle}; margin: ${space6} 0; }
    .preview-content ul, .preview-content ol { padding-left: 2em; margin-bottom: 1em; }
    .preview-content li { margin-bottom: 0.25em; }
    .preview-content strong { font-weight: ${fontWeightSemibold}; }
    .preview-content del { text-decoration: line-through; color: ${textSecondary}; }
    /* Highlight.js tokens */
    .hljs { background: ${bgTertiary}; color: ${textPrimary}; }
    .hljs-keyword, .hljs-selector-tag, .hljs-built_in, .hljs-type {
      color: ${accent}; font-weight: ${fontWeightMedium};
    }
    .hljs-string, .hljs-addition, .hljs-attribute { color: ${success}; }
    .hljs-comment, .hljs-quote { color: ${textTertiary}; font-style: italic; }
    .hljs-number, .hljs-literal { color: ${warning}; }
    .hljs-title, .hljs-section { color: ${accentHover}; font-weight: ${fontWeightMedium}; }
    .hljs-variable, .hljs-template-variable, .hljs-params { color: ${textPrimary}; }
    .hljs-regexp { color: ${error}; }
    .hljs-deletion { color: ${error}; background: rgba(255, 69, 58, 0.1); }
    .hljs-meta, .hljs-meta .hljs-keyword { color: ${textSecondary}; }
    .hljs-tag { color: ${textSecondary}; }
    .hljs-name { color: ${accent}; }
    .hljs-attr { color: ${accentHover}; }
    .hljs-symbol, .hljs-bullet, .hljs-link { color: ${accent}; }
    .hljs-emphasis { font-style: italic; }
    .hljs-strong { font-weight: ${fontWeightSemibold}; }
  `;
}

/**
 * Generates a self-contained HTML document string from markdown source.
 */
export function generateHtmlDocument(source: string, engineId: string): string {
  const renderedHtml = renderMarkdown(source, engineId);
  const tokenVars = resolveThemeTokens();
  const inlineStyles = buildInlineStyles();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Shruggie MD Export</title>
  <style>
    :root {
${tokenVars}
    }
${inlineStyles}
  </style>
</head>
<body>
  <div class="preview-content">
${renderedHtml}
  </div>
</body>
</html>`;
}

export interface UseHtmlExportReturn {
  exportHtml: (source: string, engineId: string) => void;
}

/**
 * Hook to export markdown as a self-contained HTML file.
 * - Desktop: opens a save-as dialog via platform adapter
 * - Browser: triggers a download
 */
export function useHtmlExport(
  platform: PlatformAdapter | null,
  capabilities: PlatformCapabilities,
): UseHtmlExportReturn {
  const exportHtml = useCallback(
    (source: string, engineId: string) => {
      const html = generateHtmlDocument(source, engineId);

      if (capabilities.hasFilesystem && platform) {
        // Desktop: write via platform adapter (save-as)
        platform.writeFile("export.html", html).catch(() => {
          // Fallback to browser download
          triggerDownload(html);
        });
      } else {
        triggerDownload(html);
      }
    },
    [platform, capabilities.hasFilesystem],
  );

  return { exportHtml };
}

function triggerDownload(html: string): void {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "export.html";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
