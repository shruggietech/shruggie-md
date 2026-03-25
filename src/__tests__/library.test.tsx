import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act, renderHook, waitFor } from "@testing-library/react";
import { ThemeProvider } from "../hooks";
import { Library } from "../components/Library";
import { Toolbar } from "../components/Toolbar";
import { useLibrary } from "../hooks/useLibrary";
import type { LibraryFile } from "../hooks/useLibrary";
import type { PlatformAdapter, PlatformCapabilities, DirectoryEntry } from "../platform/platform";
import { ConfigProvider } from "../config";
import React from "react";

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

// ── matchMedia mock ──────────────────────────────────────────────────────
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

// ── Helpers ──────────────────────────────────────────────────────────────

function renderWithTheme(ui: React.ReactNode) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

const sampleFiles: LibraryFile[] = [
  {
    title: "Bravo",
    path: "/docs/bravo.md",
    lastEdited: "2025-12-15T10:00:00.000Z",
    created: "2025-01-10T08:00:00.000Z",
  },
  {
    title: "Alpha",
    path: "/docs/alpha.md",
    lastEdited: "2026-01-20T15:30:00.000Z",
    created: "2025-06-01T12:00:00.000Z",
  },
  {
    title: "Charlie",
    path: "/notes/charlie.md",
    lastEdited: "2025-11-01T09:00:00.000Z",
    created: "2024-12-25T00:00:00.000Z",
  },
];

function createMockPlatform(overrides?: Partial<PlatformAdapter>): PlatformAdapter {
  return {
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
      hasFilesystem: true,
      hasFileWatcher: true,
      hasNativeDialogs: true,
      hasCliArgs: false,
    } satisfies PlatformCapabilities),
    ...overrides,
  } as PlatformAdapter;
}

function HookWrapper({
  platform,
  capabilities,
  children,
}: {
  platform: PlatformAdapter;
  capabilities: PlatformCapabilities;
  children: (result: ReturnType<typeof useLibrary>) => React.ReactNode;
}) {
  const result = useLibrary(platform, capabilities);
  return <>{children(result)}</>;
}

function renderUseLibrary(
  platform: PlatformAdapter,
  capabilities: PlatformCapabilities = {
    hasFilesystem: true,
    hasFileWatcher: true,
    hasNativeDialogs: true,
    hasCliArgs: false,
  },
) {
  return renderHook(
    () => useLibrary(platform, capabilities),
    {
      wrapper: ({ children }) => (
        <ThemeProvider>
          <ConfigProvider platform={platform}>
            {children}
          </ConfigProvider>
        </ThemeProvider>
      ),
    },
  );
}

// ═════════════════════════════════════════════════════════════════════════
// Library table tests
// ═════════════════════════════════════════════════════════════════════════

describe("Library table", () => {
  it("renders table with correct columns", () => {
    renderWithTheme(
      <Library
        files={sampleFiles}
        onFileSelect={vi.fn()}
        filter=""
        onFilterChange={vi.fn()}
      />,
    );

    expect(screen.getByTestId("library-table")).toBeInTheDocument();
    expect(screen.getByTestId("library-header-title")).toHaveTextContent("Title");
    expect(screen.getByTestId("library-header-path")).toHaveTextContent("Path");
    expect(screen.getByTestId("library-header-lastEdited")).toHaveTextContent("Last Edited");
    expect(screen.getByTestId("library-header-created")).toHaveTextContent("Created");
  });

  it("displays file data correctly", () => {
    renderWithTheme(
      <Library
        files={sampleFiles}
        onFileSelect={vi.fn()}
        filter=""
        onFilterChange={vi.fn()}
      />,
    );

    const rows = screen.getAllByTestId("library-row");
    expect(rows.length).toBe(3);

    // Default sort is Last Edited descending — Alpha (Jan 2026) > Bravo (Dec 2025) > Charlie (Nov 2025)
    const titles = screen.getAllByTestId("library-cell-title");
    expect(titles[0]).toHaveTextContent("Alpha");
    expect(titles[1]).toHaveTextContent("Bravo");
    expect(titles[2]).toHaveTextContent("Charlie");
  });

  it("sorts by Title alphabetically", () => {
    renderWithTheme(
      <Library
        files={sampleFiles}
        onFileSelect={vi.fn()}
        filter=""
        onFilterChange={vi.fn()}
      />,
    );

    // Click Title header
    fireEvent.click(screen.getByTestId("library-header-title"));

    const titles = screen.getAllByTestId("library-cell-title");
    expect(titles[0]).toHaveTextContent("Alpha");
    expect(titles[1]).toHaveTextContent("Bravo");
    expect(titles[2]).toHaveTextContent("Charlie");
  });

  it("sorts by Last Edited chronologically", () => {
    renderWithTheme(
      <Library
        files={sampleFiles}
        onFileSelect={vi.fn()}
        filter=""
        onFilterChange={vi.fn()}
      />,
    );

    // Default is already Last Edited desc (newest first)
    const titles = screen.getAllByTestId("library-cell-title");
    expect(titles[0]).toHaveTextContent("Alpha"); // Jan 2026
    expect(titles[2]).toHaveTextContent("Charlie"); // Nov 2025
  });

  it("reverses sort on second click", () => {
    renderWithTheme(
      <Library
        files={sampleFiles}
        onFileSelect={vi.fn()}
        filter=""
        onFilterChange={vi.fn()}
      />,
    );

    // Click Title to sort ascending
    fireEvent.click(screen.getByTestId("library-header-title"));
    let titles = screen.getAllByTestId("library-cell-title");
    expect(titles[0]).toHaveTextContent("Alpha");
    expect(titles[2]).toHaveTextContent("Charlie");

    // Click Title again to reverse (descending)
    fireEvent.click(screen.getByTestId("library-header-title"));
    titles = screen.getAllByTestId("library-cell-title");
    expect(titles[0]).toHaveTextContent("Charlie");
    expect(titles[2]).toHaveTextContent("Alpha");
  });

  it("filters by Title substring", () => {
    renderWithTheme(
      <Library
        files={sampleFiles}
        onFileSelect={vi.fn()}
        filter="alph"
        onFilterChange={vi.fn()}
      />,
    );

    const rows = screen.getAllByTestId("library-row");
    expect(rows.length).toBe(1);
    expect(screen.getByTestId("library-cell-title")).toHaveTextContent("Alpha");
  });

  it("filters by Path substring", () => {
    renderWithTheme(
      <Library
        files={sampleFiles}
        onFileSelect={vi.fn()}
        filter="/notes/"
        onFilterChange={vi.fn()}
      />,
    );

    const rows = screen.getAllByTestId("library-row");
    expect(rows.length).toBe(1);
    expect(screen.getByTestId("library-cell-title")).toHaveTextContent("Charlie");
  });

  it("clicking a row calls onFileSelect", () => {
    const handler = vi.fn();
    renderWithTheme(
      <Library
        files={sampleFiles}
        onFileSelect={handler}
        filter=""
        onFilterChange={vi.fn()}
      />,
    );

    const rows = screen.getAllByTestId("library-row");
    fireEvent.click(rows[0]);

    // First row is Alpha (newest edited) due to default sort
    expect(handler).toHaveBeenCalledWith("/docs/alpha.md");
  });

  it("shows empty message when no files", () => {
    renderWithTheme(
      <Library
        files={[]}
        onFileSelect={vi.fn()}
        filter=""
        onFilterChange={vi.fn()}
      />,
    );

    expect(screen.getByTestId("library-empty")).toHaveTextContent(
      "No files found. Mount a directory to get started.",
    );
  });

  it("shows filter-specific empty message when filter yields no results", () => {
    renderWithTheme(
      <Library
        files={sampleFiles}
        onFileSelect={vi.fn()}
        filter="zzzzzzz"
        onFilterChange={vi.fn()}
      />,
    );

    expect(screen.getByTestId("library-empty")).toHaveTextContent(
      "No files match the current filter.",
    );
  });
});

// ═════════════════════════════════════════════════════════════════════════
// useLibrary hook tests
// ═════════════════════════════════════════════════════════════════════════

describe("useLibrary", () => {
  it("returns empty array when no mount path", async () => {
    const platform = createMockPlatform({
      readConfig: vi.fn().mockResolvedValue({}),
    });

    const { result } = renderUseLibrary(platform);

    // Wait for initial config load
    await waitFor(() => {
      expect(result.current.files).toEqual([]);
    });
  });

  it("scan() populates files when mount path set", async () => {
    const entries: DirectoryEntry[] = [
      {
        name: "readme.md",
        path: "/docs/readme.md",
        isDirectory: false,
        mtime: "2025-12-15T10:00:00.000Z",
        birthtime: "2025-01-10T08:00:00.000Z",
      },
      {
        name: "notes.md",
        path: "/docs/notes.md",
        isDirectory: false,
        mtime: "2026-01-20T15:30:00.000Z",
        birthtime: "2025-06-01T12:00:00.000Z",
      },
      {
        name: "images",
        path: "/docs/images",
        isDirectory: true,
        mtime: "2025-11-01T09:00:00.000Z",
        birthtime: "2024-12-25T00:00:00.000Z",
      },
    ];

    const platform = createMockPlatform({
      readConfig: vi.fn().mockResolvedValue({
        library: { mountPath: "/docs", recursive: true, showHidden: false, useIndependentExtensions: false, independentExtensions: [] },
      }),
      listDirectory: vi.fn().mockResolvedValue(entries),
    });

    const { result } = renderUseLibrary(platform);

    // Wait for auto-scan triggered by mountPath
    await waitFor(() => {
      expect(result.current.files.length).toBe(2);
    });

    expect(result.current.files[0].title).toBe("readme");
    expect(result.current.files[1].title).toBe("notes");
  });

  it("filters by extensions", async () => {
    const entries: DirectoryEntry[] = [
      {
        name: "readme.md",
        path: "/docs/readme.md",
        isDirectory: false,
        mtime: "2025-12-15T10:00:00.000Z",
        birthtime: "2025-01-10T08:00:00.000Z",
      },
      {
        name: "data.json",
        path: "/docs/data.json",
        isDirectory: false,
        mtime: "2025-11-01T09:00:00.000Z",
        birthtime: "2024-12-25T00:00:00.000Z",
      },
      {
        name: "style.css",
        path: "/docs/style.css",
        isDirectory: false,
        mtime: "2025-11-01T09:00:00.000Z",
        birthtime: "2024-12-25T00:00:00.000Z",
      },
    ];

    const platform = createMockPlatform({
      readConfig: vi.fn().mockResolvedValue({
        library: { mountPath: "/docs", recursive: true, showHidden: false, useIndependentExtensions: false, independentExtensions: [] },
      }),
      listDirectory: vi.fn().mockResolvedValue(entries),
    });

    const { result } = renderUseLibrary(platform);

    await waitFor(() => {
      expect(result.current.files.length).toBe(1);
    });

    // Only .md files should pass the default extension filter
    expect(result.current.files[0].title).toBe("readme");
  });
});

// ═════════════════════════════════════════════════════════════════════════
// Toolbar adaptation tests
// ═════════════════════════════════════════════════════════════════════════

describe("Toolbar library adaptation", () => {
  it("shows library controls when activeView is 'library'", () => {
    renderWithTheme(
      <Toolbar
        activeView="library"
        onViewChange={vi.fn()}
        fileName={null}
        hasFilesystem={true}
        onMountDirectory={vi.fn()}
        onRefreshLibrary={vi.fn()}
        libraryFilter=""
        onLibraryFilterChange={vi.fn()}
      />,
    );

    expect(screen.getByTestId("toolbar-library-controls")).toBeInTheDocument();
    expect(screen.getByTestId("library-filter-input")).toBeInTheDocument();
  });

  it("hides file controls when in library view", () => {
    renderWithTheme(
      <Toolbar
        activeView="library"
        onViewChange={vi.fn()}
        fileName="test.md"
        hasFilesystem={true}
        onSave={vi.fn()}
        canSave={true}
        onExportHtml={vi.fn()}
        onExportPdf={vi.fn()}
        onFetchUrl={vi.fn()}
        onMountDirectory={vi.fn()}
        onRefreshLibrary={vi.fn()}
        libraryFilter=""
        onLibraryFilterChange={vi.fn()}
      />,
    );

    // File-specific controls should not be rendered
    expect(screen.queryByTestId("toolbar-filename")).not.toBeInTheDocument();
    expect(screen.queryByTestId("toolbar-actions")).not.toBeInTheDocument();
  });

  it("shows file controls when activeView is not 'library'", () => {
    renderWithTheme(
      <Toolbar
        activeView="full-view"
        onViewChange={vi.fn()}
        fileName="test.md"
        hasFilesystem={true}
        onSave={vi.fn()}
        canSave={true}
        onExportHtml={vi.fn()}
        onExportPdf={vi.fn()}
        onMountDirectory={vi.fn()}
        onRefreshLibrary={vi.fn()}
        libraryFilter=""
        onLibraryFilterChange={vi.fn()}
      />,
    );

    expect(screen.getByTestId("toolbar-filename")).toBeInTheDocument();
    expect(screen.getByTestId("toolbar-actions")).toBeInTheDocument();
    expect(screen.queryByTestId("toolbar-library-controls")).not.toBeInTheDocument();
  });
});
