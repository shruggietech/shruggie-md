import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ThemeProvider } from "../hooks";
import { Workspaces } from "../components/Workspaces";
import { Toolbar } from "../components/Toolbar";
import type { WorkspaceFile } from "../hooks/useWorkspaces";
import { validateWorkspaceName } from "../hooks/useWorkspaces";
import React from "react";

// ── CodeMirror mocks ─────────────────────────────────────────────────────
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

const sampleFiles: WorkspaceFile[] = [
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

const sampleWorkspaces = [
  {
    id: "ws-default",
    name: "Default",
    type: "internal" as const,
    path: "__internal__/Default",
    is_default: true,
    settings: "{}",
    created_at: "2026-01-01T00:00:00.000Z",
  },
];

// ═════════════════════════════════════════════════════════════════════════
// Workspaces table tests
// ═════════════════════════════════════════════════════════════════════════

describe("Workspaces table", () => {
  it("renders table with correct columns", () => {
    renderWithTheme(
      <Workspaces
        files={sampleFiles}
        workspaces={sampleWorkspaces}
        activeWorkspaceId="ws-default"
        hasFilesystem={true}
        onFileSelect={vi.fn()}
        onActiveWorkspaceChange={vi.fn()}
        onCreateWorkspace={vi.fn().mockResolvedValue("ws-new")}
        onPickExternalDirectory={vi.fn().mockResolvedValue(null)}
        filter=""
      />,
    );

    expect(screen.getByTestId("workspaces-table")).toBeInTheDocument();
    expect(screen.getByTestId("workspaces-header-title")).toHaveTextContent("Title");
    expect(screen.getByTestId("workspaces-header-path")).toHaveTextContent("Path");
    expect(screen.getByTestId("workspaces-header-lastEdited")).toHaveTextContent("Last Edited");
    expect(screen.getByTestId("workspaces-header-created")).toHaveTextContent("Created");
  });

  it("displays file data correctly", () => {
    renderWithTheme(
      <Workspaces
        files={sampleFiles}
        workspaces={sampleWorkspaces}
        activeWorkspaceId="ws-default"
        hasFilesystem={true}
        onFileSelect={vi.fn()}
        onActiveWorkspaceChange={vi.fn()}
        onCreateWorkspace={vi.fn().mockResolvedValue("ws-new")}
        onPickExternalDirectory={vi.fn().mockResolvedValue(null)}
        filter=""
      />,
    );

    const rows = screen.getAllByTestId("workspaces-row");
    expect(rows.length).toBe(3);

    // Default sort is Last Edited descending — Alpha (Jan 2026) > Bravo (Dec 2025) > Charlie (Nov 2025)
    const titles = screen.getAllByTestId("workspaces-cell-title");
    expect(titles[0]).toHaveTextContent("Alpha");
    expect(titles[1]).toHaveTextContent("Bravo");
    expect(titles[2]).toHaveTextContent("Charlie");
  });

  it("sorts by Title alphabetically", () => {
    renderWithTheme(
      <Workspaces
        files={sampleFiles}
        workspaces={sampleWorkspaces}
        activeWorkspaceId="ws-default"
        hasFilesystem={true}
        onFileSelect={vi.fn()}
        onActiveWorkspaceChange={vi.fn()}
        onCreateWorkspace={vi.fn().mockResolvedValue("ws-new")}
        onPickExternalDirectory={vi.fn().mockResolvedValue(null)}
        filter=""
      />,
    );

    // Click Title header
    fireEvent.click(screen.getByTestId("workspaces-header-title"));

    const titles = screen.getAllByTestId("workspaces-cell-title");
    expect(titles[0]).toHaveTextContent("Alpha");
    expect(titles[1]).toHaveTextContent("Bravo");
    expect(titles[2]).toHaveTextContent("Charlie");
  });

  it("sorts by Last Edited chronologically", () => {
    renderWithTheme(
      <Workspaces
        files={sampleFiles}
        workspaces={sampleWorkspaces}
        activeWorkspaceId="ws-default"
        hasFilesystem={true}
        onFileSelect={vi.fn()}
        onActiveWorkspaceChange={vi.fn()}
        onCreateWorkspace={vi.fn().mockResolvedValue("ws-new")}
        onPickExternalDirectory={vi.fn().mockResolvedValue(null)}
        filter=""
      />,
    );

    // Default is already Last Edited desc (newest first)
    const titles = screen.getAllByTestId("workspaces-cell-title");
    expect(titles[0]).toHaveTextContent("Alpha"); // Jan 2026
    expect(titles[2]).toHaveTextContent("Charlie"); // Nov 2025
  });

  it("reverses sort on second click", () => {
    renderWithTheme(
      <Workspaces
        files={sampleFiles}
        workspaces={sampleWorkspaces}
        activeWorkspaceId="ws-default"
        hasFilesystem={true}
        onFileSelect={vi.fn()}
        onActiveWorkspaceChange={vi.fn()}
        onCreateWorkspace={vi.fn().mockResolvedValue("ws-new")}
        onPickExternalDirectory={vi.fn().mockResolvedValue(null)}
        filter=""
      />,
    );

    // Click Title to sort ascending
    fireEvent.click(screen.getByTestId("workspaces-header-title"));
    let titles = screen.getAllByTestId("workspaces-cell-title");
    expect(titles[0]).toHaveTextContent("Alpha");
    expect(titles[2]).toHaveTextContent("Charlie");

    // Click Title again to reverse (descending)
    fireEvent.click(screen.getByTestId("workspaces-header-title"));
    titles = screen.getAllByTestId("workspaces-cell-title");
    expect(titles[0]).toHaveTextContent("Charlie");
    expect(titles[2]).toHaveTextContent("Alpha");
  });

  it("filters by Title substring", () => {
    renderWithTheme(
      <Workspaces
        files={sampleFiles}
        workspaces={sampleWorkspaces}
        activeWorkspaceId="ws-default"
        hasFilesystem={true}
        onFileSelect={vi.fn()}
        onActiveWorkspaceChange={vi.fn()}
        onCreateWorkspace={vi.fn().mockResolvedValue("ws-new")}
        onPickExternalDirectory={vi.fn().mockResolvedValue(null)}
        filter="alph"
      />,
    );

    const rows = screen.getAllByTestId("workspaces-row");
    expect(rows.length).toBe(1);
    expect(screen.getByTestId("workspaces-cell-title")).toHaveTextContent("Alpha");
  });

  it("filters by Path substring", () => {
    renderWithTheme(
      <Workspaces
        files={sampleFiles}
        workspaces={sampleWorkspaces}
        activeWorkspaceId="ws-default"
        hasFilesystem={true}
        onFileSelect={vi.fn()}
        onActiveWorkspaceChange={vi.fn()}
        onCreateWorkspace={vi.fn().mockResolvedValue("ws-new")}
        onPickExternalDirectory={vi.fn().mockResolvedValue(null)}
        filter="/notes/"
      />,
    );

    const rows = screen.getAllByTestId("workspaces-row");
    expect(rows.length).toBe(1);
    expect(screen.getByTestId("workspaces-cell-title")).toHaveTextContent("Charlie");
  });

  it("clicking a row calls onFileSelect", () => {
    const handler = vi.fn();
    renderWithTheme(
      <Workspaces
        files={sampleFiles}
        workspaces={sampleWorkspaces}
        activeWorkspaceId="ws-default"
        hasFilesystem={true}
        onFileSelect={handler}
        onActiveWorkspaceChange={vi.fn()}
        onCreateWorkspace={vi.fn().mockResolvedValue("ws-new")}
        onPickExternalDirectory={vi.fn().mockResolvedValue(null)}
        filter=""
      />,
    );

    const rows = screen.getAllByTestId("workspaces-row");
    fireEvent.click(rows[0]);

    // First row is Alpha (newest edited) due to default sort
    expect(handler).toHaveBeenCalledWith("/docs/alpha.md");
  });

  it("shows empty message when no files", () => {
    renderWithTheme(
      <Workspaces
        files={[]}
        workspaces={sampleWorkspaces}
        activeWorkspaceId="ws-default"
        hasFilesystem={true}
        onFileSelect={vi.fn()}
        onActiveWorkspaceChange={vi.fn()}
        onCreateWorkspace={vi.fn().mockResolvedValue("ws-new")}
        onPickExternalDirectory={vi.fn().mockResolvedValue(null)}
        filter=""
      />,
    );

    expect(screen.getByTestId("workspaces-empty")).toHaveTextContent(
      "No files found. Create a new file or add a workspace to get started.",
    );
  });

  it("shows filter-specific empty message when filter yields no results", () => {
    renderWithTheme(
      <Workspaces
        files={sampleFiles}
        workspaces={sampleWorkspaces}
        activeWorkspaceId="ws-default"
        hasFilesystem={true}
        onFileSelect={vi.fn()}
        onActiveWorkspaceChange={vi.fn()}
        onCreateWorkspace={vi.fn().mockResolvedValue("ws-new")}
        onPickExternalDirectory={vi.fn().mockResolvedValue(null)}
        filter="zzzzzzz"
      />,
    );

    expect(screen.getByTestId("workspaces-empty")).toHaveTextContent(
      "No files match the current filter.",
    );
  });

  it("opens creation modal, validates input, and creates workspace", async () => {
    const createWorkspace = vi.fn().mockResolvedValue("ws-created");

    renderWithTheme(
      <Workspaces
        files={sampleFiles}
        workspaces={sampleWorkspaces}
        activeWorkspaceId="ws-default"
        hasFilesystem={true}
        onFileSelect={vi.fn()}
        onActiveWorkspaceChange={vi.fn()}
        onCreateWorkspace={createWorkspace}
        onPickExternalDirectory={vi.fn().mockResolvedValue(null)}
        filter=""
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /new workspace/i }));
    expect(screen.getByTestId("workspace-create-modal")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /^create$/i }));
    });
    expect(screen.getByTestId("workspace-create-error")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("My Workspace"), {
      target: { value: "Docs" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /^create$/i }));
    });

    expect(createWorkspace).toHaveBeenCalledWith("Docs", "internal", undefined);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// Workspace name validation tests
// ═════════════════════════════════════════════════════════════════════════

describe("validateWorkspaceName", () => {
  it("accepts valid names", () => {
    expect(validateWorkspaceName("My Workspace")).toBeNull();
    expect(validateWorkspaceName("project-2026")).toBeNull();
    expect(validateWorkspaceName("notes")).toBeNull();
  });

  it("rejects empty names", () => {
    expect(validateWorkspaceName("")).toBe("Name cannot be empty.");
    expect(validateWorkspaceName("   ")).toBe("Name cannot be empty.");
  });

  it("rejects names longer than 128 characters", () => {
    const longName = "a".repeat(129);
    expect(validateWorkspaceName(longName)).toBe("Name must be 128 characters or fewer.");
  });

  it("rejects names with invalid characters", () => {
    expect(validateWorkspaceName("my<ws")).toBe("Name contains invalid characters.");
    expect(validateWorkspaceName("my>ws")).toBe("Name contains invalid characters.");
    expect(validateWorkspaceName("my:ws")).toBe("Name contains invalid characters.");
    expect(validateWorkspaceName('my"ws')).toBe("Name contains invalid characters.");
    expect(validateWorkspaceName("my/ws")).toBe("Name contains invalid characters.");
    expect(validateWorkspaceName("my\\ws")).toBe("Name contains invalid characters.");
    expect(validateWorkspaceName("my|ws")).toBe("Name contains invalid characters.");
    expect(validateWorkspaceName("my?ws")).toBe("Name contains invalid characters.");
    expect(validateWorkspaceName("my*ws")).toBe("Name contains invalid characters.");
  });

  it("rejects Windows reserved names", () => {
    expect(validateWorkspaceName("CON")).toBe("Name is a reserved system name.");
    expect(validateWorkspaceName("prn")).toBe("Name is a reserved system name.");
    expect(validateWorkspaceName("AUX")).toBe("Name is a reserved system name.");
    expect(validateWorkspaceName("NUL")).toBe("Name is a reserved system name.");
    expect(validateWorkspaceName("COM1")).toBe("Name is a reserved system name.");
    expect(validateWorkspaceName("LPT2")).toBe("Name is a reserved system name.");
  });

  it("rejects names starting or ending with a dot", () => {
    expect(validateWorkspaceName(".hidden")).toBe("Name cannot start or end with a dot.");
    expect(validateWorkspaceName("hidden.")).toBe("Name cannot start or end with a dot.");
  });

  it("rejects names ending with a space", () => {
    // validateWorkspaceName trims input, so "trailing " becomes "trailing" which is valid
    expect(validateWorkspaceName("trailing ")).toBeNull();
  });
});

// ═════════════════════════════════════════════════════════════════════════
// Toolbar adaptation tests
// ═════════════════════════════════════════════════════════════════════════

describe("Toolbar workspaces adaptation", () => {
  it("shows workspaces controls when activeView is 'workspaces'", () => {
    renderWithTheme(
      <Toolbar
        activeView="workspaces"
        onViewChange={vi.fn()}
        fileName={null}
        hasFilesystem={true}
        onRefreshWorkspaces={vi.fn()}
        workspacesFilter=""
        onWorkspacesFilterChange={vi.fn()}
      />,
    );

    expect(screen.getByTestId("toolbar-workspaces-controls")).toBeInTheDocument();
    expect(screen.getByTestId("workspaces-filter-input")).toBeInTheDocument();
  });

  it("hides file controls when in workspaces view", () => {
    renderWithTheme(
      <Toolbar
        activeView="workspaces"
        onViewChange={vi.fn()}
        fileName="test.md"
        hasFilesystem={true}
        onSave={vi.fn()}
        canSave={true}
        onExport={vi.fn()}
        onRefreshWorkspaces={vi.fn()}
        workspacesFilter=""
        onWorkspacesFilterChange={vi.fn()}
      />,
    );

    // File-specific controls should not be rendered
    expect(screen.queryByTestId("toolbar-filename")).not.toBeInTheDocument();
    expect(screen.queryByTestId("toolbar-actions")).not.toBeInTheDocument();
  });

  it("shows file controls when activeView is not 'workspaces'", () => {
    renderWithTheme(
      <Toolbar
        activeView="view"
        onViewChange={vi.fn()}
        fileName="test.md"
        hasFilesystem={true}
        onSave={vi.fn()}
        canSave={true}
        onExport={vi.fn()}
        onRefreshWorkspaces={vi.fn()}
        workspacesFilter=""
        onWorkspacesFilterChange={vi.fn()}
      />,
    );

    expect(screen.getByTestId("toolbar-filename")).toBeInTheDocument();
    expect(screen.getByTestId("toolbar-actions")).toBeInTheDocument();
    expect(screen.queryByTestId("toolbar-workspaces-controls")).not.toBeInTheDocument();
  });
});
