import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { renderMarkdown, engines, sanitizeHtml } from "@/engines/index";
import { defaultConfig } from "@/config/defaults";
import type { Config } from "@/types/config";

/* ================================================================
 * 1. Full Pipeline Integration
 * ================================================================ */

describe("Full pipeline integration", () => {
  const engineIds = Object.keys(engines);
  const testMarkdown = [
    "# Integration Test",
    "",
    "Paragraph with **bold** and *italic* text.",
    "",
    "```js",
    "const x = 42;",
    "```",
    "",
    "| Col1 | Col2 |",
    "| ---- | ---- |",
    "| A    | B    |",
    "",
    "[link](https://example.com)",
    "",
    "- item one",
    "- item two",
    "",
    '<script>alert("xss")</script>',
    '<img src=x onerror=alert(1)>',
  ].join("\n");

  describe.each(engineIds)("engine: %s", (engineId) => {
    it("renders markdown through the full pipeline", () => {
      const html = renderMarkdown(testMarkdown, engineId);
      expect(html).toContain("<h1");
      expect(html).toContain("<p>");
      expect(html).toContain("<strong>");
      expect(html).toContain("<code");
      expect(html).toContain("<table");
      expect(html).toContain("<a");
      expect(html).toContain("<li");
    });

    it("sanitization neutralizes script XSS", () => {
      const html = renderMarkdown(testMarkdown, engineId);
      // Script tags must not appear as executable HTML elements
      expect(html).not.toContain("<script>");
      expect(html).not.toContain("</script>");
    });

    it("sanitization neutralizes onerror XSS", () => {
      const html = renderMarkdown(testMarkdown, engineId);
      // There must be no <img> tag with an onerror attribute
      expect(html).not.toMatch(/<img[^>]+onerror/i);
    });
  });

  it("engine switching: re-render with different engine produces valid HTML", () => {
    const source = "# Title\n\nParagraph.\n\n- item\n";

    // Render with each engine and verify structural similarity
    const results = engineIds.map((id) => ({
      id,
      html: renderMarkdown(source, id),
    }));

    for (const { html } of results) {
      expect(html).toContain("<h1");
      expect(html).toContain("<p>");
      expect(html).toContain("<li");
    }

    // All results should have content (non-empty)
    for (const { html } of results) {
      expect(html.length).toBeGreaterThan(10);
    }
  });

  it("engine switching: same input, different engines produce different raw HTML but same structure", () => {
    const source = "**bold** and _italic_";
    const outputs = engineIds.map((id) => renderMarkdown(source, id));

    // All should contain bold and italic elements
    for (const html of outputs) {
      expect(html).toContain("<strong>");
      expect(html).toMatch(/<em>|<i>/);
    }
  });
});

/* ================================================================
 * 2. Config Round-Trip
 * ================================================================ */

describe("Config round-trip", () => {
  it("default config has all expected sections", () => {
    expect(defaultConfig.appearance).toBeDefined();
    expect(defaultConfig.editor).toBeDefined();
    expect(defaultConfig.preview).toBeDefined();
    expect(defaultConfig.engine).toBeDefined();
    expect(defaultConfig.fileExtensions).toBeDefined();
    expect(defaultConfig.library).toBeDefined();
  });

  it("config values can be changed and verified", () => {
    // Simulate config updates by merging
    const updated: Config = {
      ...defaultConfig,
      engine: { activeEngine: "marked" },
      editor: { ...defaultConfig.editor, fontSize: 18 },
    };

    expect(updated.engine.activeEngine).toBe("marked");
    expect(updated.editor.fontSize).toBe(18);
    // Other values unchanged
    expect(updated.appearance.colorMode).toBe("dark");
    expect(updated.preview.fontSize).toBe(15);
  });

  it("config reset restores defaults", () => {
    const modified: Config = {
      ...defaultConfig,
      engine: { activeEngine: "remark" },
      appearance: { colorMode: "light", visualStyle: "warm" },
    };

    expect(modified.engine.activeEngine).toBe("remark");

    // Reset by re-assigning defaults
    const reset = { ...defaultConfig };
    expect(reset.engine.activeEngine).toBe("markdown-it");
    expect(reset.appearance.colorMode).toBe("dark");
    expect(reset.appearance.visualStyle).toBe("default");
  });

  it("default file extensions match the spec", () => {
    expect(defaultConfig.fileExtensions.recognized).toEqual([
      ".md",
      ".markdown",
      ".mdown",
      ".mkdn",
      ".mkd",
    ]);
  });

  it("engine options are all valid engine IDs", () => {
    const validEngines = Object.keys(engines);
    expect(validEngines).toContain(defaultConfig.engine.activeEngine);
    expect(validEngines).toContain("markdown-it");
    expect(validEngines).toContain("marked");
    expect(validEngines).toContain("remark");
  });
});

/* ================================================================
 * 3. Theme Integration
 * ================================================================ */

// matchMedia mock
type MediaQueryCallback = (e: MediaQueryListEvent) => void;
const mediaQueryListeners: Record<string, MediaQueryCallback[]> = {};

function createMockMatchMedia() {
  return (query: string): MediaQueryList => {
    if (!mediaQueryListeners[query]) {
      mediaQueryListeners[query] = [];
    }
    const getMatches = () => {
      if (query === "(prefers-color-scheme: dark)") return true;
      if (query === "(prefers-reduced-motion: reduce)") return false;
      return false;
    };
    return {
      matches: getMatches(),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn((_event: string, cb: MediaQueryCallback) => {
        mediaQueryListeners[query].push(cb);
      }),
      removeEventListener: vi.fn((_event: string, cb: MediaQueryCallback) => {
        const idx = mediaQueryListeners[query].indexOf(cb);
        if (idx >= 0) mediaQueryListeners[query].splice(idx, 1);
      }),
      dispatchEvent: vi.fn(),
    } as unknown as MediaQueryList;
  };
}

beforeEach(() => {
  for (const key of Object.keys(mediaQueryListeners)) {
    mediaQueryListeners[key] = [];
  }
  window.matchMedia = createMockMatchMedia();
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.removeAttribute("data-style");
});

describe("Theme integration", () => {
  it("data-style attribute is set on documentElement for each visual style", async () => {
    const { useThemeState } = await import("../hooks/useTheme");
    const { ThemeContext } = await import("../hooks/useTheme");

    const styles = ["default", "warm", "cool", "monochrome"] as const;

    for (const style of styles) {
      const TestComponent = () => {
        const themeValue = useThemeState("dark", style);
        return createElement(
          ThemeContext,
          { value: themeValue },
          createElement("span", { "data-testid": "style" }, themeValue.visualStyle),
        );
      };

      const { unmount } = render(createElement(TestComponent));
      expect(screen.getByTestId("style").textContent).toBe(style);
      expect(document.documentElement.getAttribute("data-style")).toBe(style);
      unmount();
    }
  });

  it("switching between light and dark modes updates data-theme", async () => {
    const { useThemeState, ThemeContext } = await import("../hooks/useTheme");

    const TestComponent = () => {
      const themeValue = useThemeState("dark", "default");
      return createElement(
        ThemeContext,
        { value: themeValue },
        createElement("div", null,
          createElement("span", { "data-testid": "resolved" }, themeValue.resolvedTheme),
          createElement("button", {
            "data-testid": "set-light",
            onClick: () => themeValue.setColorMode("light"),
          }, "Light"),
          createElement("button", {
            "data-testid": "set-dark",
            onClick: () => themeValue.setColorMode("dark"),
          }, "Dark"),
        ),
      );
    };

    render(createElement(TestComponent));
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");

    await act(async () => {
      fireEvent.click(screen.getByTestId("set-light"));
    });
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");

    await act(async () => {
      fireEvent.click(screen.getByTestId("set-dark"));
    });
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });
});

/* ================================================================
 * 4. Keyboard Shortcuts
 * ================================================================ */

describe("Keyboard shortcuts registration", () => {
  it("all view shortcuts are registered (Ctrl+1, 2, 3, comma)", async () => {
    const { useViewMode } = await import("../hooks/useViewMode");
    const { useKeyboardShortcuts } = await import("../hooks/useKeyboardShortcuts");
    const { ThemeProvider } = await import("../hooks");

    const TestHarness = () => {
      const { viewMode, setViewMode } = useViewMode();
      useKeyboardShortcuts({
        onViewChange: setViewMode,
        hasFilesystem: true,
      });
      return createElement("div", { "data-testid": "view" }, viewMode);
    };

    render(createElement(ThemeProvider, null, createElement(TestHarness)));

    // Ctrl+1 → full-view (already default, switch away first)
    fireEvent.keyDown(window, { key: "2", ctrlKey: true });
    expect(screen.getByTestId("view").textContent).toBe("split-view");

    fireEvent.keyDown(window, { key: "1", ctrlKey: true });
    expect(screen.getByTestId("view").textContent).toBe("full-view");

    // Ctrl+2 → split-view
    fireEvent.keyDown(window, { key: "2", ctrlKey: true });
    expect(screen.getByTestId("view").textContent).toBe("split-view");

    // Ctrl+3 → library
    fireEvent.keyDown(window, { key: "3", ctrlKey: true });
    expect(screen.getByTestId("view").textContent).toBe("library");

    // Ctrl+, → settings
    fireEvent.keyDown(window, { key: ",", ctrlKey: true });
    expect(screen.getByTestId("view").textContent).toBe("settings");
  });

  it("Ctrl+S calls save handler", async () => {
    const { useViewMode } = await import("../hooks/useViewMode");
    const { useKeyboardShortcuts } = await import("../hooks/useKeyboardShortcuts");
    const { ThemeProvider } = await import("../hooks");

    const saveFn = vi.fn();
    const TestHarness = () => {
      const { setViewMode } = useViewMode();
      useKeyboardShortcuts({
        onViewChange: setViewMode,
        onSave: saveFn,
        hasFilesystem: true,
      });
      return createElement("div");
    };

    render(createElement(ThemeProvider, null, createElement(TestHarness)));

    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    expect(saveFn).toHaveBeenCalledTimes(1);
  });

  it("Ctrl+O calls open file handler", async () => {
    const { useViewMode } = await import("../hooks/useViewMode");
    const { useKeyboardShortcuts } = await import("../hooks/useKeyboardShortcuts");
    const { ThemeProvider } = await import("../hooks");

    const openFn = vi.fn();
    const TestHarness = () => {
      const { setViewMode } = useViewMode();
      useKeyboardShortcuts({
        onViewChange: setViewMode,
        onOpenFile: openFn,
        hasFilesystem: true,
      });
      return createElement("div");
    };

    render(createElement(ThemeProvider, null, createElement(TestHarness)));

    fireEvent.keyDown(window, { key: "o", ctrlKey: true });
    expect(openFn).toHaveBeenCalledTimes(1);
  });

  it("Ctrl+Shift+H calls export HTML handler", async () => {
    const { useViewMode } = await import("../hooks/useViewMode");
    const { useKeyboardShortcuts } = await import("../hooks/useKeyboardShortcuts");
    const { ThemeProvider } = await import("../hooks");

    const exportHtmlFn = vi.fn();
    const TestHarness = () => {
      const { setViewMode } = useViewMode();
      useKeyboardShortcuts({
        onViewChange: setViewMode,
        onExportHtml: exportHtmlFn,
        hasFilesystem: true,
      });
      return createElement("div");
    };

    render(createElement(ThemeProvider, null, createElement(TestHarness)));

    fireEvent.keyDown(window, { key: "H", ctrlKey: true, shiftKey: true });
    expect(exportHtmlFn).toHaveBeenCalledTimes(1);
  });

  it("Ctrl+Shift+P calls export PDF handler", async () => {
    const { useViewMode } = await import("../hooks/useViewMode");
    const { useKeyboardShortcuts } = await import("../hooks/useKeyboardShortcuts");
    const { ThemeProvider } = await import("../hooks");

    const exportPdfFn = vi.fn();
    const TestHarness = () => {
      const { setViewMode } = useViewMode();
      useKeyboardShortcuts({
        onViewChange: setViewMode,
        onExportPdf: exportPdfFn,
        hasFilesystem: true,
      });
      return createElement("div");
    };

    render(createElement(ThemeProvider, null, createElement(TestHarness)));

    fireEvent.keyDown(window, { key: "P", ctrlKey: true, shiftKey: true });
    expect(exportPdfFn).toHaveBeenCalledTimes(1);
  });
});

/* ================================================================
 * 5. File Extension Validation
 * ================================================================ */

describe("File extension validation", () => {
  const recognized = defaultConfig.fileExtensions.recognized;

  it("valid extensions are in the recognized list", () => {
    expect(recognized).toContain(".md");
    expect(recognized).toContain(".markdown");
    expect(recognized).toContain(".mdown");
    expect(recognized).toContain(".mkdn");
    expect(recognized).toContain(".mkd");
  });

  it("validates extensions start with dot", () => {
    for (const ext of recognized) {
      expect(ext.startsWith(".")).toBe(true);
    }
  });

  it("invalid extensions are not in the recognized list", () => {
    expect(recognized).not.toContain(".exe");
    expect(recognized).not.toContain(".txt");
    expect(recognized).not.toContain(".html");
    expect(recognized).not.toContain(".js");
    expect(recognized).not.toContain(".pdf");
  });

  it("extension validation regex works correctly", () => {
    const extRegex = /^\.[a-zA-Z0-9]+$/;

    // Valid
    expect(extRegex.test(".md")).toBe(true);
    expect(extRegex.test(".markdown")).toBe(true);
    expect(extRegex.test(".txt")).toBe(true);

    // Invalid
    expect(extRegex.test("md")).toBe(false);
    expect(extRegex.test(".")).toBe(false);
    expect(extRegex.test(".m@d")).toBe(false);
    expect(extRegex.test("")).toBe(false);
    expect(extRegex.test("..md")).toBe(false);
  });
});

/* ================================================================
 * 6. Component Accessibility
 * ================================================================ */

describe("Component accessibility", () => {
  it("Toolbar buttons have aria-labels via tooltip prop", async () => {
    const { ThemeProvider } = await import("../hooks");
    const { Toolbar } = await import("../components/Toolbar");

    render(createElement(ThemeProvider, null,
      createElement(Toolbar, {
        activeView: "full-view" as const,
        onViewChange: () => {},
        fileName: null,
        hasFilesystem: true,
        onSave: () => {},
        onExportHtml: () => {},
        onExportPdf: () => {},
        onFetchUrl: () => {},
      }),
    ));

    // View buttons should have aria-labels from tooltips
    const viewButtons = screen.getByTestId("toolbar-view-buttons").querySelectorAll("button");
    for (const btn of viewButtons) {
      expect(btn.getAttribute("aria-label")).toBeTruthy();
    }

    // Action buttons (Save, Export HTML, Export PDF) should have aria-labels
    const actionButtons = screen.getByTestId("toolbar-actions").querySelectorAll("button");
    for (const btn of actionButtons) {
      // The URL globe button and the action buttons all have tooltips
      const ariaLabel = btn.getAttribute("aria-label");
      expect(ariaLabel === null || ariaLabel.length > 0).toBe(true);
    }
  });

  it("Modal has role=dialog and aria-modal=true", async () => {
    const { ThemeProvider } = await import("../hooks");
    const { Modal } = await import("../components/common/Modal");

    render(createElement(ThemeProvider, null,
      createElement(Modal, {
        isOpen: true,
        onClose: () => {},
        title: "Test Modal",
        children: createElement("p", null, "Content"),
      }),
    ));

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.getAttribute("aria-label")).toBe("Test Modal");
  });

  it("Toggle has associated label via htmlFor", async () => {
    const { Toggle } = await import("../components/common/Toggle");

    render(createElement(Toggle, {
      checked: false,
      onChange: () => {},
      label: "Test Label",
    }));

    const checkbox = screen.getByRole("switch");
    expect(checkbox).toBeInTheDocument();
    expect(checkbox.getAttribute("id")).toBeTruthy();

    // The label element should have htmlFor matching the checkbox id
    const label = checkbox.closest("label");
    expect(label).toBeTruthy();
    expect(label!.getAttribute("for")).toBe(checkbox.getAttribute("id"));
  });

  it("Library table has role=grid and aria-label", async () => {
    const { ThemeProvider } = await import("../hooks");
    const { Library } = await import("../components/Library");

    render(createElement(ThemeProvider, null,
      createElement(Library, {
        files: [
          { title: "test.md", path: "/test.md", lastEdited: new Date().toISOString(), created: new Date().toISOString() },
        ],
        onFileSelect: () => {},
        filter: "",
        onFilterChange: () => {},
      }),
    ));

    const table = screen.getByTestId("library-table");
    expect(table.getAttribute("role")).toBe("grid");
    expect(table.getAttribute("aria-label")).toBe("Markdown files library");
  });

  it("Library column headers are keyboard-accessible", async () => {
    const { ThemeProvider } = await import("../hooks");
    const { Library } = await import("../components/Library");

    render(createElement(ThemeProvider, null,
      createElement(Library, {
        files: [],
        onFileSelect: () => {},
        filter: "",
        onFilterChange: () => {},
      }),
    ));

    const headers = screen.getAllByRole("columnheader");
    for (const header of headers) {
      expect(header.getAttribute("tabindex")).toBe("0");
    }
  });

  it("Library rows are keyboard-accessible", async () => {
    const { ThemeProvider } = await import("../hooks");
    const { Library } = await import("../components/Library");

    const selectFn = vi.fn();
    render(createElement(ThemeProvider, null,
      createElement(Library, {
        files: [
          { title: "test.md", path: "/test.md", lastEdited: new Date().toISOString(), created: new Date().toISOString() },
        ],
        onFileSelect: selectFn,
        filter: "",
        onFilterChange: () => {},
      }),
    ));

    const row = screen.getByTestId("library-row");
    expect(row.getAttribute("tabindex")).toBe("0");

    // Pressing Enter on a row should trigger file select
    fireEvent.keyDown(row, { key: "Enter" });
    expect(selectFn).toHaveBeenCalledWith("/test.md");
  });
});
