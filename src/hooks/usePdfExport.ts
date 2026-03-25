import { useCallback } from "react";
import { generateHtmlDocument } from "./useHtmlExport";

export interface UsePdfExportReturn {
  exportPdf: (source: string, engineId: string) => void;
}

/**
 * Exports markdown to PDF via the browser's print dialog.
 * Pipeline: compile markdown → HTML → inject into hidden iframe → window.print()
 */
export function usePdfExport(): UsePdfExportReturn {
  const exportPdf = useCallback((source: string, engineId: string) => {
    const html = generateHtmlDocument(source, engineId);

    // Build the print-ready document with print styles injected
    const printHtml = html.replace(
      "</style>",
      `
    /* Print styles */
    @page {
      margin: 2cm;
      @bottom-center {
        content: counter(page);
      }
    }
    @media print {
      body {
        background: white;
        color: #1d1d1f;
        padding: 0;
      }
      .preview-content {
        max-width: 100%;
        padding: 0;
        color: #1d1d1f;
        font-size: 12pt;
        line-height: 1.6;
      }
      .preview-content h1, .preview-content h2 {
        border-bottom-color: #e0e0e0;
      }
      .preview-content pre > code {
        background: #f5f5f7;
        color: #1d1d1f;
        white-space: pre-wrap;
        word-break: break-all;
      }
      .preview-content :not(pre) > code {
        background: #f0f0f0;
      }
      .preview-content a {
        color: #0071e3;
        text-decoration: underline;
      }
      .preview-content a::after {
        content: none;
      }
      .preview-content hr {
        page-break-before: always;
        border: none;
        margin: 0;
        padding: 0;
        height: 0;
      }
      .preview-content img {
        max-width: 100%;
        page-break-inside: avoid;
      }
      .preview-content table {
        page-break-inside: avoid;
      }
      .preview-content blockquote {
        border-left-color: #e0e0e0;
        color: #6e6e73;
      }
    }
  </style>`,
    );

    // Create a hidden iframe, inject content, and trigger print
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "none";
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document;
    if (iframeDoc) {
      iframeDoc.open();
      iframeDoc.write(printHtml);
      iframeDoc.close();

      // Wait for content to render before printing
      iframe.onload = () => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        // Clean up after a short delay
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      };

      // Fallback: if onload doesn't fire (content already loaded)
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 1000);
        }
      }, 500);
    }
  }, []);

  return { exportPdf };
}
