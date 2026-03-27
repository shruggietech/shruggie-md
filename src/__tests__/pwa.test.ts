import { describe, it, expect, vi, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import { createElement } from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import manifest from "../../public/manifest.json";

// ─── 1. PWA Adapter Tests ────────────────────────────────────────────────

describe("PwaAdapter", () => {
  // Reset IndexedDB between tests
  beforeEach(() => {
    // Delete the database before each test so state is clean
    indexedDB.deleteDatabase("shruggie-md-config");
  });

  it("readConfig returns empty object when no data stored", async () => {
    const { PwaAdapter } = await import("../platform/pwa");
    const adapter = new PwaAdapter();
    const config = await adapter.readConfig();
    expect(config).toEqual({});
  });

  it("writeConfig + readConfig round-trips correctly", async () => {
    const { PwaAdapter } = await import("../platform/pwa");
    const adapter = new PwaAdapter();

    const testConfig = {
      appearance: { colorMode: "dark", visualStyle: "warm" },
      editor: { fontSize: 16 },
    };

    await adapter.writeConfig(testConfig);
    const result = await adapter.readConfig();
    expect(result).toEqual(testConfig);
  });

  it("writeConfig overwrites previous data", async () => {
    const { PwaAdapter } = await import("../platform/pwa");
    const adapter = new PwaAdapter();

    await adapter.writeConfig({ old: true });
    await adapter.writeConfig({ new: true });

    const result = await adapter.readConfig();
    expect(result).toEqual({ new: true });
  });

  it("capabilities are all false", async () => {
    const { PwaAdapter } = await import("../platform/pwa");
    const adapter = new PwaAdapter();
    const caps = adapter.getPlatformCapabilities();
    expect(caps).toEqual({
      hasFilesystem: false,
      hasFileWatcher: false,
      hasNativeDialogs: false,
      hasCliArgs: false,
    });
  });

  it("readFile returns empty string", async () => {
    const { PwaAdapter } = await import("../platform/pwa");
    const adapter = new PwaAdapter();
    expect(await adapter.readFile("/test")).toBe("");
  });

  it("openFileDialog returns null", async () => {
    const { PwaAdapter } = await import("../platform/pwa");
    const adapter = new PwaAdapter();
    expect(await adapter.openFileDialog([".md"])).toBeNull();
  });

  it("listDirectory returns empty array", async () => {
    const { PwaAdapter } = await import("../platform/pwa");
    const adapter = new PwaAdapter();
    expect(await adapter.listDirectory("/", true)).toEqual([]);
  });

  it("getStoragePath returns empty string", async () => {
    const { PwaAdapter } = await import("../platform/pwa");
    const adapter = new PwaAdapter();
    expect(adapter.getStoragePath()).toBe("");
  });

  it("watchFile returns a no-op unsubscribe function", async () => {
    const { PwaAdapter } = await import("../platform/pwa");
    const adapter = new PwaAdapter();
    const unsub = adapter.watchFile("/test", () => {});
    expect(typeof unsub).toBe("function");
    // Should not throw
    unsub();
  });
});

// ─── 2. InstallPrompt Tests ─────────────────────────────────────────────

// Mock CodeMirror modules so React rendering doesn't break
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
    return {
      state: { doc: { toString: () => "" } },
      dispatch: vi.fn(),
      destroy: vi.fn(() => el.remove()),
    };
  }
  const ctor = EditorViewCtor as unknown as Record<string, unknown>;
  ctor.theme = vi.fn(() => []);
  ctor.lineWrapping = [];
  ctor.updateListener = { of: vi.fn(() => []) };
  return {
    EditorView: ctor,
    lineNumbers: vi.fn(() => []),
    highlightActiveLine: vi.fn(() => []),
    keymap: { of: vi.fn(() => []) },
  };
});
vi.mock("@codemirror/lang-markdown", () => ({
  markdown: vi.fn(() => []),
  markdownLanguage: {},
}));
vi.mock("@codemirror/language-data", () => ({ languages: [] }));
vi.mock("@codemirror/search", () => ({ search: vi.fn(() => []) }));
vi.mock("@codemirror/autocomplete", () => ({
  autocompletion: vi.fn(() => []),
}));
vi.mock("@codemirror/lint", () => ({ lintGutter: vi.fn(() => []) }));
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

describe("InstallPrompt", () => {
  beforeEach(() => {
    localStorage.clear();
    // Reset matchMedia for display-mode
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      media: "",
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    });
  });

  it("is not visible by default (no beforeinstallprompt event)", async () => {
    const { InstallPrompt } = await import(
      "../components/common/InstallPrompt"
    );
    render(createElement(InstallPrompt));
    expect(screen.queryByTestId("install-prompt")).toBeNull();
  });

  it("shows when beforeinstallprompt fires", async () => {
    const { InstallPrompt } = await import(
      "../components/common/InstallPrompt"
    );
    const { container } = render(createElement(InstallPrompt));

    // Simulate the browser event
    await act(async () => {
      const event = new Event("beforeinstallprompt", {
        bubbles: true,
        cancelable: true,
      });
      Object.assign(event, {
        prompt: vi.fn().mockResolvedValue(undefined),
        userChoice: Promise.resolve({ outcome: "dismissed" }),
      });
      window.dispatchEvent(event);
    });

    expect(screen.getByTestId("install-prompt")).toBeInTheDocument();
    expect(
      screen.getByText("Install Shruggie Markdown for offline use"),
    ).toBeInTheDocument();
    container.remove();
  });

  it("hides on dismiss and persists in localStorage", async () => {
    const { InstallPrompt } = await import(
      "../components/common/InstallPrompt"
    );
    const { container } = render(createElement(InstallPrompt));

    // Fire beforeinstallprompt
    await act(async () => {
      const event = new Event("beforeinstallprompt", {
        bubbles: true,
        cancelable: true,
      });
      Object.assign(event, {
        prompt: vi.fn().mockResolvedValue(undefined),
        userChoice: Promise.resolve({ outcome: "dismissed" }),
      });
      window.dispatchEvent(event);
    });

    expect(screen.getByTestId("install-prompt")).toBeInTheDocument();

    // Click dismiss
    await act(async () => {
      fireEvent.click(screen.getByTestId("install-prompt-dismiss"));
    });

    expect(screen.queryByTestId("install-prompt")).toBeNull();
    expect(localStorage.getItem("shruggie-md-install-dismissed")).toBe("true");
    container.remove();
  });

  it("does not show if previously dismissed", async () => {
    localStorage.setItem("shruggie-md-install-dismissed", "true");

    const { InstallPrompt } = await import(
      "../components/common/InstallPrompt"
    );
    render(createElement(InstallPrompt));

    // Fire beforeinstallprompt — should still not show
    await act(async () => {
      const event = new Event("beforeinstallprompt", {
        bubbles: true,
        cancelable: true,
      });
      Object.assign(event, {
        prompt: vi.fn().mockResolvedValue(undefined),
        userChoice: Promise.resolve({ outcome: "dismissed" }),
      });
      window.dispatchEvent(event);
    });

    expect(screen.queryByTestId("install-prompt")).toBeNull();
  });

  it("calls prompt() on install button click", async () => {
    const { InstallPrompt } = await import(
      "../components/common/InstallPrompt"
    );
    const { container } = render(createElement(InstallPrompt));

    const mockPrompt = vi.fn().mockResolvedValue(undefined);

    await act(async () => {
      const event = new Event("beforeinstallprompt", {
        bubbles: true,
        cancelable: true,
      });
      Object.assign(event, {
        prompt: mockPrompt,
        userChoice: Promise.resolve({ outcome: "accepted" }),
      });
      window.dispatchEvent(event);
    });

    expect(screen.getByTestId("install-prompt")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByTestId("install-prompt-install"));
    });

    expect(mockPrompt).toHaveBeenCalled();
    // After acceptance, prompt should hide
    expect(screen.queryByTestId("install-prompt")).toBeNull();
    container.remove();
  });
});

// ─── 3. Manifest Validation ─────────────────────────────────────────────

describe("Manifest validation", () => {
  it("public/manifest.json has correct fields", () => {
    expect(manifest.name).toBe("Shruggie Markdown");
    expect(manifest.short_name).toBe("Shruggie MD");
    expect(manifest.display).toBe("standalone");
    expect(manifest.theme_color).toBe("#1a1a1a");
    expect(manifest.background_color).toBe("#1a1a1a");
    expect(manifest.start_url).toBe("/");
    expect(manifest.icons).toBeDefined();
    expect(manifest.icons.length).toBeGreaterThan(0);
  });

  it("manifest icons reference valid PNG icons", () => {
    const icon192 = manifest.icons.find(
      (i: { sizes: string }) => i.sizes === "192x192",
    );
    expect(icon192).toBeDefined();
    expect(icon192!.src).toBe("/icons/icon-192.png");
    expect(icon192!.type).toBe("image/png");

    const icon512 = manifest.icons.find(
      (i: { sizes: string }) => i.sizes === "512x512",
    );
    expect(icon512).toBeDefined();
    expect(icon512!.src).toBe("/icons/icon-512.png");
    expect(icon512!.type).toBe("image/png");
    expect(icon512!.purpose).toBe("any maskable");
  });
});
