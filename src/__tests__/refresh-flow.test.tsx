import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act, within } from "@testing-library/react";

const previewRenderSpy = vi.fn();
const splitViewRenderSpy = vi.fn();

vi.mock("../platform/platform", () => ({
  getPlatform: vi.fn().mockResolvedValue({
    readFile: vi.fn().mockResolvedValue(""),
    writeFile: vi.fn().mockResolvedValue(undefined),
    watchFile: vi.fn().mockReturnValue(() => {}),
    openFileDialog: vi.fn().mockResolvedValue(null),
    openDirectoryDialog: vi.fn().mockResolvedValue(null),
    listDirectory: vi.fn().mockResolvedValue([]),
    saveFileDialog: vi.fn().mockResolvedValue(null),
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

vi.mock("../components/Preview", () => ({
  Preview: ({ source }: { source: string; engineId: string }) => {
    previewRenderSpy(source);
    return <div data-testid="preview-content">{source}</div>;
  },
}));

vi.mock("../components/SplitView", () => ({
  SplitView: ({ source, onSourceChange }: { source: string; onSourceChange: (value: string) => void }) => {
    splitViewRenderSpy(source);
    return (
      <div data-testid="split-view">
        <div data-testid="editor-pane">
          <button type="button" data-testid="split-edit" onClick={() => onSourceChange("dirty content")}>
            Make Dirty
          </button>
        </div>
        <div data-testid="preview-pane">
          <span data-testid="split-source">{source}</span>
        </div>
      </div>
    );
  },
}));

// matchMedia mock required by themed app rendering
function createMockMatchMedia() {
  return (): MediaQueryList => ({
    matches: false,
    media: "",
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  } as unknown as MediaQueryList);
}

beforeEach(() => {
  previewRenderSpy.mockClear();
  splitViewRenderSpy.mockClear();
  window.matchMedia = createMockMatchMedia();
});

describe("Refresh flow", () => {
  it("refresh with clean document triggers re-render", async () => {
    const { App } = await import("../App");

    await act(async () => {
      render(<App />);
    });

    const rendersBefore = previewRenderSpy.mock.calls.length;
    const refreshButton = screen.getByRole("button", { name: "Refresh preview" });

    await act(async () => {
      fireEvent.click(refreshButton);
    });

    expect(previewRenderSpy.mock.calls.length).toBeGreaterThan(rendersBefore);
    expect(screen.queryByRole("dialog", { name: "Unsaved Changes" })).not.toBeInTheDocument();
  });

  it("refresh with dirty document opens unsaved changes modal", async () => {
    const { App } = await import("../App");

    await act(async () => {
      render(<App />);
    });

    const viewButtons = screen.getByTestId("toolbar-view-buttons").querySelectorAll("button");
    await act(async () => {
      fireEvent.click(viewButtons[1]);
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("split-edit"));
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Refresh preview" }));
    });

    expect(screen.getByRole("dialog", { name: "Unsaved Changes" })).toBeInTheDocument();
    expect(screen.getByText("Refreshing will discard your unsaved edits and reload the current document.")).toBeInTheDocument();
  });

  it("modal cancel is a no-op", async () => {
    const { App } = await import("../App");

    await act(async () => {
      render(<App />);
    });

    const viewButtons = screen.getByTestId("toolbar-view-buttons").querySelectorAll("button");
    await act(async () => {
      fireEvent.click(viewButtons[1]);
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("split-edit"));
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Refresh preview" }));
    });

    const dialog = screen.getByRole("dialog", { name: "Unsaved Changes" });
    const cancelButton = within(dialog).getByRole("button", { name: "Cancel" });

    await act(async () => {
      fireEvent.click(cancelButton);
    });

    expect(screen.queryByRole("dialog", { name: "Unsaved Changes" })).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Refresh preview" }));
    });

    expect(screen.getByRole("dialog", { name: "Unsaved Changes" })).toBeInTheDocument();
  });

  it("modal refresh discards edits and re-renders", async () => {
    const { App } = await import("../App");

    await act(async () => {
      render(<App />);
    });

    const viewButtons = screen.getByTestId("toolbar-view-buttons").querySelectorAll("button");
    await act(async () => {
      fireEvent.click(viewButtons[1]);
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("split-edit"));
    });

    expect(screen.getByTestId("split-source").textContent).toBe("dirty content");

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Refresh preview" }));
    });

    const rendersBefore = splitViewRenderSpy.mock.calls.length;
    const dialog = screen.getByRole("dialog", { name: "Unsaved Changes" });
    const refreshButton = within(dialog).getByRole("button", { name: "Refresh" });

    await act(async () => {
      fireEvent.click(refreshButton);
    });

    expect(screen.queryByRole("dialog", { name: "Unsaved Changes" })).not.toBeInTheDocument();
    expect(screen.getByTestId("split-source").textContent).not.toBe("dirty content");
    expect(splitViewRenderSpy.mock.calls.length).toBeGreaterThan(rendersBefore);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Refresh preview" }));
    });

    expect(screen.queryByRole("dialog", { name: "Unsaved Changes" })).not.toBeInTheDocument();
  });
});
