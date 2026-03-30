import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act, renderHook } from "@testing-library/react";
import { ThemeProvider } from "../hooks";
import { Toolbar } from "../components/Toolbar";
import { StatusBar } from "../components/StatusBar";
import { Preview } from "../components/Preview";
import { useViewMode } from "../hooks/useViewMode";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import type { ViewMode } from "../hooks/useViewMode";

// ── CodeMirror mocks (needed because App now imports SplitView → Editor) ─
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
vi.mock("@codemirror/lint", () => ({ lintGutter: vi.fn(() => []), linter: vi.fn(() => []) }));
vi.mock("@codemirror/commands", () => ({ defaultKeymap: [], history: vi.fn(() => []), historyKeymap: [] }));
vi.mock("@codemirror/language", () => ({ HighlightStyle: { define: vi.fn(() => ({})) }, syntaxHighlighting: vi.fn(() => []) }));
vi.mock("@lezer/highlight", () => ({
  tags: { heading: "heading", processingInstruction: "processingInstruction", emphasis: "emphasis", strong: "strong", url: "url", link: "link", monospace: "monospace", quote: "quote", list: "list", comment: "comment", contentSeparator: "contentSeparator" },
}));

// Mock platform adapter for App integration tests
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

// ─── matchMedia mock ─────────────────────────────────────────────────────
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

// Helper to render with ThemeProvider
function renderWithTheme(ui: React.ReactNode) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

// ─── Toolbar tests ───────────────────────────────────────────────────────
describe("Toolbar", () => {
  it("renders redesigned toolbar zones and file context", () => {
    renderWithTheme(
      <Toolbar
        activeView="view"
        onViewChange={() => {}}
        fileName="readme.md"
        hasFilesystem={true}
      />,
    );

    expect(screen.getByTestId("toolbar")).toBeInTheDocument();
    expect(screen.getByTestId("toolbar-navigation-zone")).toBeInTheDocument();
    expect(screen.getByTestId("toolbar-context-zone")).toBeInTheDocument();
    expect(screen.getByTestId("toolbar-actions-zone")).toBeInTheDocument();
    expect(screen.getByTestId("toolbar-view-buttons")).toBeInTheDocument();
    expect(screen.getByTestId("toolbar-filename").textContent).toBe("readme.md");
  });

  it("active view button has active styling", () => {
    renderWithTheme(
      <Toolbar
        activeView="view"
        onViewChange={() => {}}
        fileName={null}
        hasFilesystem={true}
      />,
    );

    const viewButtons = screen.getByTestId("toolbar-view-buttons");
    const wrappers = viewButtons.querySelectorAll("div[style]");

    // The first button wrapper (view) should have active background
    const viewWrapper = wrappers[0];
    expect(viewWrapper.getAttribute("style")).toContain("var(--color-bg-active)");
  });

  it("clicking view buttons calls onViewChange", () => {
    const handler = vi.fn();
    renderWithTheme(
      <Toolbar
        activeView="view"
        onViewChange={handler}
        fileName={null}
        hasFilesystem={true}
      />,
    );

    // Segmented control now includes only content modes.
    const buttons = screen.getByTestId("toolbar-view-buttons").querySelectorAll("button");
    expect(buttons.length).toBe(3);

    // Click edit button (second)
    fireEvent.click(buttons[1]);
    expect(handler).toHaveBeenCalledWith("edit");

  });

  it("library button hidden when hasFilesystem=false", () => {
    renderWithTheme(
      <Toolbar
        activeView="view"
        onViewChange={() => {}}
        fileName={null}
        hasFilesystem={false}
      />,
    );

    // Segmented control is unchanged by filesystem capabilities.
    const buttons = screen.getByTestId("toolbar-view-buttons").querySelectorAll("button");
    expect(buttons.length).toBe(3);
  });

  it("file name displays correctly", () => {
    renderWithTheme(
      <Toolbar
        activeView="view"
        onViewChange={() => {}}
        fileName="notes.md"
        hasFilesystem={false}
      />,
    );
    expect(screen.getByTestId("toolbar-filename").textContent).toBe("notes.md");
  });

  it("shows 'No file' when fileName is null", () => {
    renderWithTheme(
      <Toolbar
        activeView="view"
        onViewChange={() => {}}
        fileName={null}
        hasFilesystem={false}
      />,
    );
    expect(screen.getByTestId("toolbar-filename").textContent).toBe("No file");
  });
});

// ─── useViewMode tests ───────────────────────────────────────────────────
describe("useViewMode", () => {
  it("default view is view", () => {
    const { result } = renderHook(() => useViewMode());
    expect(result.current.viewMode).toBe("view");
  });

  it("can change to edit", () => {
    const { result } = renderHook(() => useViewMode());
    act(() => {
      result.current.setViewMode("edit");
    });
    expect(result.current.viewMode).toBe("edit");
  });

  it("can change to settings", () => {
    const { result } = renderHook(() => useViewMode());
    act(() => {
      result.current.setViewMode("settings");
    });
    expect(result.current.viewMode).toBe("settings");
  });

  it("can change to workspaces", () => {
    const { result } = renderHook(() => useViewMode());
    act(() => {
      result.current.setViewMode("workspaces");
    });
    expect(result.current.viewMode).toBe("workspaces");
  });
});

// ─── useKeyboardShortcuts tests ──────────────────────────────────────────
describe("useKeyboardShortcuts", () => {
  function KeyboardTestHarness({
    hasFilesystem = true,
  }: {
    hasFilesystem?: boolean;
  }) {
    const { viewMode, setViewMode } = useViewMode();
    useKeyboardShortcuts({
      onViewChange: setViewMode,
      hasFilesystem,
    });
    return <div data-testid="current-view">{viewMode}</div>;
  }

  it("Ctrl+1 triggers view", () => {
    renderWithTheme(<KeyboardTestHarness />);

    // First switch away from view
    fireEvent.keyDown(window, { key: "2", ctrlKey: true });
    expect(screen.getByTestId("current-view").textContent).toBe("edit");

    // Now Ctrl+1 back to view
    fireEvent.keyDown(window, { key: "1", ctrlKey: true });
    expect(screen.getByTestId("current-view").textContent).toBe("view");
  });

  it("Ctrl+2 triggers edit", () => {
    renderWithTheme(<KeyboardTestHarness />);
    fireEvent.keyDown(window, { key: "2", ctrlKey: true });
    expect(screen.getByTestId("current-view").textContent).toBe("edit");
  });

  it("Ctrl+, triggers settings", () => {
    renderWithTheme(<KeyboardTestHarness />);
    fireEvent.keyDown(window, { key: ",", ctrlKey: true });
    expect(screen.getByTestId("current-view").textContent).toBe("settings");
  });

  it("Ctrl+3 triggers workspaces when hasFilesystem is true", () => {
    renderWithTheme(<KeyboardTestHarness hasFilesystem={true} />);
    fireEvent.keyDown(window, { key: "3", ctrlKey: true });
    expect(screen.getByTestId("current-view").textContent).toBe("workspaces");
  });

  it("Ctrl+3 does NOT trigger workspaces when hasFilesystem is false", () => {
    renderWithTheme(<KeyboardTestHarness hasFilesystem={false} />);
    fireEvent.keyDown(window, { key: "3", ctrlKey: true });
    // Should still be on view (default)
    expect(screen.getByTestId("current-view").textContent).toBe("view");
  });
});

// ─── Preview tests ───────────────────────────────────────────────────────
describe("Preview", () => {
  it("renders markdown content as HTML", () => {
    renderWithTheme(<Preview source="# Hello World" engineId="markdown-it" />);
    const container = screen.getByTestId("preview-content");
    expect(container.querySelector("h1")).not.toBeNull();
    expect(container.querySelector("h1")!.textContent).toBe("Hello World");
  });

  it("handles empty string", () => {
    renderWithTheme(<Preview source="" engineId="markdown-it" />);
    const container = screen.getByTestId("preview-content");
    expect(container.innerHTML).toBe("");
  });

  it("renders with preview-content class", () => {
    renderWithTheme(<Preview source="test" engineId="markdown-it" />);
    const container = screen.getByTestId("preview-content");
    expect(container.classList.contains("preview-content")).toBe(true);
  });

  it("renders paragraphs", () => {
    renderWithTheme(
      <Preview source="This is a paragraph." engineId="markdown-it" />,
    );
    const container = screen.getByTestId("preview-content");
    expect(container.querySelector("p")).not.toBeNull();
    expect(container.querySelector("p")!.textContent).toBe("This is a paragraph.");
  });
});

describe("StatusBar", () => {
  it("renders engine display name", () => {
    renderWithTheme(<StatusBar activeEngine="markdown-it" />);
    expect(screen.getByTestId("status-bar-engine").textContent).toBe("markdown-it (GFM)");
  });

  it("renders version string", () => {
    renderWithTheme(<StatusBar activeEngine="marked" />);
    expect(screen.getByTestId("status-bar-version").textContent).toContain("Shruggie Markdown v");
  });
});

// ─── App integration tests ───────────────────────────────────────────────
describe("App integration", () => {
  it("App renders toolbar", async () => {
    const { App } = await import("../App");
    await act(async () => {
      render(<App />);
    });
    expect(screen.getByTestId("toolbar")).toBeInTheDocument();
    expect(screen.getByTestId("status-bar")).toBeInTheDocument();
  });

  it("default view shows preview area", async () => {
    const { App } = await import("../App");
    await act(async () => {
      render(<App />);
    });
    expect(screen.getByTestId("preview-content")).toBeInTheDocument();
  });

  it("can switch views via toolbar buttons", async () => {
    const { App } = await import("../App");
    await act(async () => {
      render(<App />);
    });

    const settingsButton = screen.getByRole("button", { name: "Settings (Ctrl+,)" });

    await act(async () => {
      fireEvent.click(settingsButton);
    });

    // Settings is a real component, no longer a placeholder
    expect(screen.getByTestId("settings-panel")).toBeInTheDocument();
  });

  it("can switch to edit", async () => {
    const { App } = await import("../App");
    await act(async () => {
      render(<App />);
    });

    const viewButtons = screen.getByTestId("toolbar-view-buttons").querySelectorAll("button");
    // Edit is the second button
    await act(async () => {
      fireEvent.click(viewButtons[1]);
    });

    // SplitView renders real editor and preview panes
    expect(screen.getByTestId("split-view")).toBeInTheDocument();
    expect(screen.getByTestId("editor-pane")).toBeInTheDocument();
    expect(screen.getByTestId("preview-pane")).toBeInTheDocument();
  });
});
