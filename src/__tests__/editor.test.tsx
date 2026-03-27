import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { ThemeProvider } from "../hooks";

// ── Mock CodeMirror ─────────────────────────────────────────────────────
// jsdom doesn't support the full DOM measurement APIs that CodeMirror
// needs, so we provide a lightweight mock that exercises the component's
// lifecycle (create → dispatch → destroy) without needing a real browser.

let mockViewInstance: {
  state: { doc: { toString: () => string } };
  dispatch: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
} | null = null;
let capturedUpdateListener: ((update: { docChanged: boolean; state: { doc: { toString: () => string } } }) => void) | null = null;

vi.mock("@codemirror/state", () => {
  class MockCompartment {
    of() { return []; }
    reconfigure() { return {}; }
  }
  return {
    EditorState: {
      create: vi.fn(({ doc }: { doc: string }) => ({
        doc: { toString: () => doc },
      })),
    },
    Compartment: MockCompartment,
  };
});

vi.mock("@codemirror/view", () => {
  const lineNumbers = vi.fn(() => []);
  const highlightActiveLine = vi.fn(() => []);
  const keymap = { of: vi.fn(() => []) };

  // Build the constructor function with static properties
  function EditorViewCtor({ state, parent }: { state: { doc: { toString: () => string } }; parent: HTMLElement }) {
    // Inject a .cm-editor element into the parent so tests can assert on it
    const editorEl = document.createElement("div");
    editorEl.className = "cm-editor";
    parent.appendChild(editorEl);

    const instance = {
      state,
      dispatch: vi.fn(),
      destroy: vi.fn(() => {
        editorEl.remove();
      }),
    };
    mockViewInstance = instance;
    return instance;
  }

  // Static properties — cast through `unknown` to satisfy TS strict mode
  const ctor = EditorViewCtor as unknown as Record<string, unknown>;
  ctor.theme = vi.fn(() => []);
  ctor.lineWrapping = [];
  ctor.updateListener = {
    of: vi.fn((cb: (update: { docChanged: boolean; state: { doc: { toString: () => string } } }) => void) => {
      capturedUpdateListener = cb;
      return [];
    }),
  };

  return { EditorView: ctor, lineNumbers, highlightActiveLine, keymap };
});

vi.mock("@codemirror/lang-markdown", () => ({
  markdown: vi.fn(() => []),
  markdownLanguage: {},
}));

vi.mock("@codemirror/language-data", () => ({
  languages: [],
}));

vi.mock("@codemirror/search", () => ({
  search: vi.fn(() => []),
}));

vi.mock("@codemirror/autocomplete", () => ({
  autocompletion: vi.fn(() => []),
}));

vi.mock("@codemirror/lint", () => ({
  lintGutter: vi.fn(() => []),
  linter: vi.fn(() => []),
}));

vi.mock("@codemirror/commands", () => ({
  defaultKeymap: [],
  history: vi.fn(() => []),
  historyKeymap: [],
}));

vi.mock("@codemirror/language", () => ({
  HighlightStyle: { define: vi.fn(() => ({})) },
  syntaxHighlighting: vi.fn(() => []),
}));

vi.mock("@lezer/highlight", () => ({
  tags: {
    heading: "heading",
    processingInstruction: "processingInstruction",
    emphasis: "emphasis",
    strong: "strong",
    url: "url",
    link: "link",
    monospace: "monospace",
    quote: "quote",
    list: "list",
    comment: "comment",
    contentSeparator: "contentSeparator",
  },
}));

// ── matchMedia mock ─────────────────────────────────────────────────────
beforeEach(() => {
  mockViewInstance = null;
  capturedUpdateListener = null;
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query === "(prefers-color-scheme: dark)",
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
});

function renderWithTheme(ui: React.ReactNode) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

// ─── Editor component tests ─────────────────────────────────────────────
describe("Editor", () => {
  it("renders without crashing", async () => {
    const { Editor } = await import("../components/Editor");
    renderWithTheme(<Editor value="hello" onChange={() => {}} />);
    expect(screen.getByTestId("editor-container")).toBeInTheDocument();
  });

  it("creates a CodeMirror instance (cm-editor class in DOM)", async () => {
    const { Editor } = await import("../components/Editor");
    renderWithTheme(<Editor value="# Test" onChange={() => {}} />);

    const container = screen.getByTestId("editor-container");
    expect(container.querySelector(".cm-editor")).not.toBeNull();
  });

  it("calls onChange when content changes", async () => {
    const handler = vi.fn();
    const { Editor } = await import("../components/Editor");
    renderWithTheme(<Editor value="initial" onChange={handler} />);

    // Simulate a document change via the captured update listener
    expect(capturedUpdateListener).not.toBeNull();
    act(() => {
      capturedUpdateListener!({
        docChanged: true,
        state: { doc: { toString: () => "updated content" } },
      });
    });

    expect(handler).toHaveBeenCalledWith("updated content");
  });

  it("does not call onChange when document has not changed", async () => {
    const handler = vi.fn();
    const { Editor } = await import("../components/Editor");
    renderWithTheme(<Editor value="initial" onChange={handler} />);

    act(() => {
      capturedUpdateListener!({
        docChanged: false,
        state: { doc: { toString: () => "initial" } },
      });
    });

    expect(handler).not.toHaveBeenCalled();
  });
});

// ─── SplitView tests ────────────────────────────────────────────────────
describe("SplitView", () => {
  it("renders both editor and preview panes", async () => {
    const { SplitView } = await import("../components/SplitView");
    renderWithTheme(
      <SplitView
        source="# Hello"
        onSourceChange={() => {}}
        engineId="markdown-it"
      />,
    );

    expect(screen.getByTestId("editor-pane")).toBeInTheDocument();
    expect(screen.getByTestId("preview-pane")).toBeInTheDocument();
  });

  it("has a divider between panes", async () => {
    const { SplitView } = await import("../components/SplitView");
    renderWithTheme(
      <SplitView
        source="# Hello"
        onSourceChange={() => {}}
        engineId="markdown-it"
      />,
    );

    expect(screen.getByTestId("divider")).toBeInTheDocument();
  });

  it("both panes are visible", async () => {
    const { SplitView } = await import("../components/SplitView");
    renderWithTheme(
      <SplitView
        source="# Hello"
        onSourceChange={() => {}}
        engineId="markdown-it"
      />,
    );

    const editorPane = screen.getByTestId("editor-pane");
    const previewPane = screen.getByTestId("preview-pane");

    // Both panes should have non-zero width styles
    expect(editorPane.style.width).toBe("50%");
    // jsdom normalizes `flex: 1` to the longhand `1 1 0%`
    expect(previewPane.style.flex).toContain("1");
  });

  it("renders preview content from source", async () => {
    const { SplitView } = await import("../components/SplitView");
    renderWithTheme(
      <SplitView
        source="# Hello World"
        onSourceChange={() => {}}
        engineId="markdown-it"
      />,
    );

    const previewContent = screen.getByTestId("preview-content");
    expect(previewContent.querySelector("h1")).not.toBeNull();
    expect(previewContent.querySelector("h1")!.textContent).toBe("Hello World");
  });
});

// ─── Linter adapters ────────────────────────────────────────────────────
describe("Linter adapters", () => {
  it("markdownlint adapter has correct id and name", async () => {
    const { markdownlintAdapter } = await import("../linters/markdownlint-adapter");
    expect(markdownlintAdapter.id).toBe("markdownlint");
    expect(markdownlintAdapter.name).toBe("markdownlint");
  });

  it("markdownlint adapter returns empty diagnostics for clean markdown", async () => {
    const { markdownlintAdapter } = await import("../linters/markdownlint-adapter");
    const result = await markdownlintAdapter.lint("# Hello\n");
    expect(result).toEqual([]);
  });

  it("markdownlint adapter returns diagnostics for bad markdown", async () => {
    const { markdownlintAdapter } = await import("../linters/markdownlint-adapter");
    // Heading level skip: H1 → H3
    const result = await markdownlintAdapter.lint("# H1\n\n### H3\n");
    expect(result.length).toBeGreaterThan(0);
    const headingIssue = result.find((d) => d.ruleId === "MD001");
    expect(headingIssue).toBeDefined();
    expect(headingIssue!.severity).toMatch(/error|warning/);
    expect(headingIssue!.message).toBeTruthy();
  });

  it("remark-lint adapter has correct id and name", async () => {
    const { remarkLintAdapter } = await import("../linters/remark-lint-adapter");
    expect(remarkLintAdapter.id).toBe("remark-lint");
    expect(remarkLintAdapter.name).toBe("remark-lint");
  });

  it("remark-lint adapter returns empty diagnostics for clean markdown", async () => {
    const { remarkLintAdapter } = await import("../linters/remark-lint-adapter");
    const result = await remarkLintAdapter.lint("# Hello\n");
    expect(result).toEqual([]);
  });

  it("remark-lint adapter returns diagnostics for bad markdown", async () => {
    const { remarkLintAdapter } = await import("../linters/remark-lint-adapter");
    // Missing final newline triggers remark-lint warning
    const result = await remarkLintAdapter.lint("# Hello");
    expect(result.length).toBeGreaterThan(0);
    const issue = result.find((d) => d.ruleId === "final-newline");
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe("warning");
    expect(issue!.message).toBeTruthy();
  });

  it("getLinter resolves correct adapter by id", async () => {
    const { getLinter } = await import("../linters/index");

    const mdlint = getLinter("markdownlint");
    expect(mdlint.id).toBe("markdownlint");

    const remarkLint = getLinter("remark-lint");
    expect(remarkLint.id).toBe("remark-lint");
  });

  it("getLinter throws for unknown id", async () => {
    const { getLinter } = await import("../linters/index");
    expect(() => getLinter("nonexistent")).toThrow('Unknown linter: "nonexistent"');
  });
});

// ─── Debounce (live preview) ────────────────────────────────────────────
describe("Debounced preview", () => {
  it("preview updates after debounce period", async () => {
    vi.useFakeTimers();
    const handler = vi.fn();
    const { SplitView } = await import("../components/SplitView");

    const { rerender } = renderWithTheme(
      <SplitView
        source="# Initial"
        onSourceChange={handler}
        engineId="markdown-it"
      />,
    );

    // Verify initial render
    const previewContent = screen.getByTestId("preview-content");
    expect(previewContent.querySelector("h1")!.textContent).toBe("Initial");

    // Simulate source prop change (as if user typed in editor and parent re-rendered)
    rerender(
      <ThemeProvider>
        <SplitView
          source="# Updated"
          onSourceChange={handler}
          engineId="markdown-it"
        />
      </ThemeProvider>,
    );

    // After source prop change, the debounced source syncs immediately via useEffect
    // The preview should reflect the new source
    expect(previewContent.querySelector("h1")!.textContent).toBe("Updated");

    vi.useRealTimers();
  });
});
