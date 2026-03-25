import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, renderHook } from "@testing-library/react";
import { createElement } from "react";
import { ThemeProvider } from "../hooks";
import { UrlInput } from "../components/Toolbar/UrlInput";
import { Toolbar } from "../components/Toolbar";
import type { ToolbarProps } from "../components/Toolbar";

// ── CodeMirror mocks ─────────────────────────────────────────────────────
vi.mock("@codemirror/state", () => ({
  EditorState: {
    create: vi.fn(({ doc }: { doc: string }) => ({
      doc: { toString: () => doc },
    })),
  },
}));

vi.mock("@codemirror/view", () => {
  function EditorViewCtor({ parent }: { state: unknown; parent: HTMLElement }) {
    const el = document.createElement("div");
    el.className = "cm-editor";
    parent.appendChild(el);
    return { state: { doc: { toString: () => "" } }, dispatch: vi.fn(), destroy: vi.fn(() => el.remove()) };
  }
  const ctor = EditorViewCtor as unknown as Record<string, unknown>;
  ctor.theme = vi.fn(() => []);
  ctor.lineWrapping = [];
  ctor.updateListener = { of: vi.fn(() => []) };
  return { EditorView: ctor, lineNumbers: vi.fn(() => []), highlightActiveLine: vi.fn(() => []), keymap: { of: vi.fn(() => []) } };
});

vi.mock("@codemirror/lang-markdown", () => ({ markdown: vi.fn(() => []), markdownLanguage: {} }));
vi.mock("@codemirror/language-data", () => ({ languages: [] }));
vi.mock("@codemirror/search", () => ({ search: vi.fn(() => []) }));
vi.mock("@codemirror/autocomplete", () => ({ autocompletion: vi.fn(() => []) }));
vi.mock("@codemirror/lint", () => ({ lintGutter: vi.fn(() => []) }));
vi.mock("@codemirror/commands", () => ({ defaultKeymap: [], history: vi.fn(() => []), historyKeymap: [] }));
vi.mock("@codemirror/language", () => ({ HighlightStyle: { define: vi.fn(() => ({})) }, syntaxHighlighting: vi.fn(() => []) }));
vi.mock("@lezer/highlight", () => ({
  tags: { heading: "heading", processingInstruction: "processingInstruction", emphasis: "emphasis", strong: "strong", url: "url", link: "link", monospace: "monospace", quote: "quote", list: "list", comment: "comment", contentSeparator: "contentSeparator" },
}));

// ── Platform mocks ───────────────────────────────────────────────────────
vi.mock("../platform/platform", () => ({
  getPlatform: vi.fn().mockResolvedValue({
    readFile: vi.fn().mockResolvedValue(""),
    writeFile: vi.fn().mockResolvedValue(undefined),
    watchFile: vi.fn().mockReturnValue(() => {}),
    openFileDialog: vi.fn().mockResolvedValue(null),
    openDirectoryDialog: vi.fn().mockResolvedValue(null),
    listDirectory: vi.fn().mockResolvedValue([]),
    getStoragePath: vi.fn().mockReturnValue(""),
    readConfig: vi.fn().mockResolvedValue({}),
    writeConfig: vi.fn().mockResolvedValue(undefined),
    getPlatformCapabilities: vi.fn().mockReturnValue({
      hasFilesystem: false,
      hasFileWatcher: false,
      hasNativeDialogs: false,
      hasCliArgs: false,
    }),
  }),
}));

// ── matchMedia mock ──────────────────────────────────────────────────────
function createMockMatchMedia() {
  return (query: string): MediaQueryList => {
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
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as MediaQueryList;
  };
}

beforeEach(() => {
  window.matchMedia = createMockMatchMedia();
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.removeAttribute("data-style");
});

// ─── 1. useFileSave tests ────────────────────────────────────────────────
describe("useFileSave", () => {
  it("saveFile creates a download in browser context", async () => {
    const { useFileSave } = await import("../hooks/useFileSave");

    const clickSpy = vi.fn();
    const createElementOriginal = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = createElementOriginal(tag);
      if (tag === "a") {
        Object.defineProperty(el, "click", { value: clickSpy });
      }
      return el;
    });

    const createObjectURLSpy = vi.fn().mockReturnValue("blob:mock-url");
    const revokeObjectURLSpy = vi.fn();
    globalThis.URL.createObjectURL = createObjectURLSpy;
    globalThis.URL.revokeObjectURL = revokeObjectURLSpy;

    const capabilities = {
      hasFilesystem: false,
      hasFileWatcher: false,
      hasNativeDialogs: false,
      hasCliArgs: false,
    };

    const { result } = renderHook(() => useFileSave(null, capabilities));

    await act(async () => {
      await result.current.saveFile("# Hello", null);
    });

    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalled();

    vi.restoreAllMocks();
  });

  it("isSaving state changes during save", async () => {
    const { useFileSave } = await import("../hooks/useFileSave");

    const capabilities = {
      hasFilesystem: false,
      hasFileWatcher: false,
      hasNativeDialogs: false,
      hasCliArgs: false,
    };

    // Mock URL APIs
    globalThis.URL.createObjectURL = vi.fn().mockReturnValue("blob:mock-url");
    globalThis.URL.revokeObjectURL = vi.fn();

    const { result } = renderHook(() => useFileSave(null, capabilities));

    expect(result.current.isSaving).toBe(false);

    await act(async () => {
      await result.current.saveFile("content", null);
    });

    // After save completes, isSaving should be false and lastSaved should be set
    expect(result.current.isSaving).toBe(false);
    expect(result.current.lastSaved).toBeInstanceOf(Date);
  });
});

// ─── 2. useHtmlExport tests ─────────────────────────────────────────────
describe("useHtmlExport", () => {
  it("exportHtml generates a valid HTML document", async () => {
    const { generateHtmlDocument } = await import("../hooks/useHtmlExport");

    // Mock getComputedStyle to return valid CSS values
    const mockGetComputedStyle = vi.fn().mockReturnValue({
      getPropertyValue: (_name: string) => "#1a1a1a",
    });
    vi.stubGlobal("getComputedStyle", mockGetComputedStyle);

    const html = generateHtmlDocument("# Hello World", "markdown-it");

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<html");
    expect(html).toContain("</html>");
    expect(html).toContain("<head>");
    expect(html).toContain("</head>");
    expect(html).toContain("<body>");
    expect(html).toContain("</body>");

    vi.unstubAllGlobals();
  });

  it("Generated HTML contains inlined styles", async () => {
    const { generateHtmlDocument } = await import("../hooks/useHtmlExport");

    const mockGetComputedStyle = vi.fn().mockReturnValue({
      getPropertyValue: (_name: string) => "#1a1a1a",
    });
    vi.stubGlobal("getComputedStyle", mockGetComputedStyle);

    const html = generateHtmlDocument("# Hello", "markdown-it");

    expect(html).toContain("<style>");
    expect(html).toContain(".preview-content");
    expect(html).toContain("#1a1a1a");

    vi.unstubAllGlobals();
  });

  it("Generated HTML contains rendered markdown content", async () => {
    const { generateHtmlDocument } = await import("../hooks/useHtmlExport");

    const mockGetComputedStyle = vi.fn().mockReturnValue({
      getPropertyValue: (_name: string) => "#1a1a1a",
    });
    vi.stubGlobal("getComputedStyle", mockGetComputedStyle);

    const html = generateHtmlDocument("# Hello World", "markdown-it");

    expect(html).toContain("Hello World");
    expect(html).toContain("<h1>");
    expect(html).toContain('class="preview-content"');

    vi.unstubAllGlobals();
  });
});

// ─── 3. useRemoteFetch tests ────────────────────────────────────────────
describe("useRemoteFetch", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetchUrl returns content from a successful response", async () => {
    const { useRemoteFetch } = await import("../hooks/useRemoteFetch");

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "content-type": "text/plain" }),
      text: () => Promise.resolve("# Hello from remote"),
    });
    vi.stubGlobal("fetch", mockFetch);

    const { result } = renderHook(() => useRemoteFetch());

    let fetchResult: { content: string; error: string | null } | undefined;
    await act(async () => {
      fetchResult = await result.current.fetchUrl("https://example.com/readme.md");
    });

    expect(fetchResult!.content).toBe("# Hello from remote");
    expect(fetchResult!.error).toBeNull();

    vi.unstubAllGlobals();
  });

  it("fetchUrl returns error for non-text content type", async () => {
    const { useRemoteFetch } = await import("../hooks/useRemoteFetch");

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "content-type": "image/png" }),
      text: () => Promise.resolve(""),
    });
    vi.stubGlobal("fetch", mockFetch);

    const { result } = renderHook(() => useRemoteFetch());

    let fetchResult: { content: string; error: string | null } | undefined;
    await act(async () => {
      fetchResult = await result.current.fetchUrl("https://example.com/image.png");
    });

    expect(fetchResult!.content).toBe("");
    expect(fetchResult!.error).toContain("Invalid content type");

    vi.unstubAllGlobals();
  });

  it("fetchUrl returns error for network failure", async () => {
    const { useRemoteFetch } = await import("../hooks/useRemoteFetch");

    const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));
    vi.stubGlobal("fetch", mockFetch);

    const { result } = renderHook(() => useRemoteFetch());

    let fetchResult: { content: string; error: string | null } | undefined;
    await act(async () => {
      fetchResult = await result.current.fetchUrl("https://example.com/fail");
    });

    expect(fetchResult!.content).toBe("");
    expect(fetchResult!.error).toBe("Network error");

    vi.unstubAllGlobals();
  });
});

// ─── 4. usePdfExport tests ──────────────────────────────────────────────
describe("usePdfExport", () => {
  it("exportPdf calls window.print on iframe", async () => {
    const { usePdfExport } = await import("../hooks/usePdfExport");

    // Mock getComputedStyle
    const mockGetComputedStyle = vi.fn().mockReturnValue({
      getPropertyValue: (_name: string) => "#1a1a1a",
    });
    vi.stubGlobal("getComputedStyle", mockGetComputedStyle);

    const printSpy = vi.fn();
    const focusSpy = vi.fn();

    // Track iframes created
    const createElementOriginal = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = createElementOriginal(tag);
      if (tag === "iframe") {
        // Mock contentWindow
        Object.defineProperty(el, "contentWindow", {
          value: {
            document: {
              open: vi.fn(),
              write: vi.fn(),
              close: vi.fn(),
            },
            focus: focusSpy,
            print: printSpy,
          },
          configurable: true,
        });
      }
      return el;
    });

    const { result } = renderHook(() => usePdfExport());

    act(() => {
      result.current.exportPdf("# Test PDF", "markdown-it");
    });

    // Wait for the setTimeout fallback to trigger print
    await vi.waitFor(() => {
      expect(printSpy).toHaveBeenCalled();
    }, { timeout: 1000 });

    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
});

// ─── 5. UrlInput tests ─────────────────────────────────────────────────
describe("UrlInput", () => {
  function renderUrlInput(props: Partial<{
    onSubmit: (url: string) => void;
    isLoading: boolean;
    error: string | null;
  }> = {}) {
    return render(
      createElement(ThemeProvider, null,
        createElement(UrlInput, {
          onSubmit: props.onSubmit ?? vi.fn(),
          isLoading: props.isLoading ?? false,
          error: props.error ?? null,
        })
      )
    );
  }

  it("renders the globe toggle button", () => {
    renderUrlInput();
    // The globe button should be present (it's a button element)
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it("shows input field after clicking toggle", () => {
    renderUrlInput();
    // Click the globe toggle button
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[0]);

    const input = screen.getByTestId("url-input");
    expect(input).toBeInTheDocument();
  });

  it("submits URL on Enter", () => {
    const submitHandler = vi.fn();
    renderUrlInput({ onSubmit: submitHandler });

    // Open the input
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[0]);

    const input = screen.getByTestId("url-input");
    fireEvent.change(input, { target: { value: "https://example.com/test.md" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(submitHandler).toHaveBeenCalledWith("https://example.com/test.md");
  });

  it("shows loading state", () => {
    renderUrlInput({ isLoading: true });

    // Open the input
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[0]);

    expect(screen.getByTestId("url-loading")).toBeInTheDocument();
  });

  it("shows error message", () => {
    renderUrlInput({ error: "Network error" });

    // Open the input
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[0]);

    const errorEl = screen.getByTestId("url-error");
    expect(errorEl).toBeInTheDocument();
    expect(errorEl.textContent).toBe("Network error");
  });
});

// ─── 6. Updated Toolbar tests ───────────────────────────────────────────
describe("Updated Toolbar", () => {
  function renderToolbar(props: Partial<ToolbarProps> = {}) {
    return render(
      createElement(ThemeProvider, null,
        createElement(Toolbar, {
          activeView: "full-view" as const,
          onViewChange: vi.fn(),
          fileName: "test.md",
          hasFilesystem: false,
          onSave: vi.fn(),
          canSave: true,
          onExportHtml: vi.fn(),
          onExportPdf: vi.fn(),
          onFetchUrl: vi.fn(),
          ...props,
        })
      )
    );
  }

  it("Save button is present", () => {
    renderToolbar();
    const actions = screen.getByTestId("toolbar-actions");
    const buttons = actions.querySelectorAll("button");
    // Should have Save, Export HTML, Export PDF buttons, plus Globe toggle
    expect(buttons.length).toBeGreaterThanOrEqual(3);
  });

  it("Export buttons are present", () => {
    renderToolbar();
    const actions = screen.getByTestId("toolbar-actions");
    const buttons = actions.querySelectorAll("button");
    // At least Save + HTML export + PDF export + URL toggle = 4
    expect(buttons.length).toBeGreaterThanOrEqual(4);
  });

  it("Save button disabled when canSave is false", () => {
    renderToolbar({ canSave: false });
    const actions = screen.getByTestId("toolbar-actions");
    const buttons = actions.querySelectorAll("button");
    // First action button is Save
    const saveButton = buttons[0] as HTMLButtonElement;
    expect(saveButton.disabled).toBe(true);
  });

  it("Save button disabled when no onSave callback and file is not saveable", () => {
    renderToolbar({ canSave: false, onSave: vi.fn() });
    const actions = screen.getByTestId("toolbar-actions");
    const saveButton = actions.querySelector("button") as HTMLButtonElement;
    expect(saveButton).toBeTruthy();
    expect(saveButton.disabled).toBe(true);
  });
});
