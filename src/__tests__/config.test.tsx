import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act, renderHook } from "@testing-library/react";
import { type ReactNode } from "react";
import { ThemeProvider } from "../hooks";
import { ConfigProvider } from "../config/ConfigProvider";
import { useConfig } from "../config/store";
import { defaultConfig } from "../config/defaults";
import { Settings } from "../components/Settings";
import { Toggle } from "../components/common/Toggle";
import { Select } from "../components/common/Select";
import type { PlatformAdapter, PlatformCapabilities } from "../platform/platform";

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

// ─── Mock platform ──────────────────────────────────────────────────────

function createMockPlatform(
  overrides?: Partial<PlatformAdapter>,
): PlatformAdapter {
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
      hasFilesystem: false,
      hasFileWatcher: false,
      hasNativeDialogs: false,
      hasCliArgs: false,
    } satisfies PlatformCapabilities),
    ...overrides,
  } as PlatformAdapter;
}

// ─── Helper wrappers ────────────────────────────────────────────────────

function Wrapper({
  children,
  platform,
}: {
  children: ReactNode;
  platform?: PlatformAdapter;
}) {
  return (
    <ThemeProvider>
      <ConfigProvider platform={platform ?? createMockPlatform()}>
        {children}
      </ConfigProvider>
    </ThemeProvider>
  );
}

function renderWithProviders(
  ui: ReactNode,
  platform?: PlatformAdapter,
) {
  return render(ui, {
    wrapper: ({ children }) => (
      <Wrapper platform={platform}>{children}</Wrapper>
    ),
  });
}

// ─── Config context consumer for tests ──────────────────────────────────

function ConfigConsumer() {
  const { config, updateConfig, resetConfig, isLoading } = useConfig();
  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="engine">{config.engine.activeEngine}</span>
      <span data-testid="color-mode">{config.appearance.colorMode}</span>
      <span data-testid="font-size">{config.editor.fontSize}</span>
      <span data-testid="extensions">
        {config.fileExtensions.recognized.join(",")}
      </span>
      <button
        data-testid="update-engine"
        onClick={() => updateConfig("engine", { activeEngine: "marked" })}
      >
        Set Marked
      </button>
      <button
        data-testid="update-editor"
        onClick={() => updateConfig("editor", { fontSize: 18 })}
      >
        Set FontSize 18
      </button>
      <button data-testid="reset" onClick={resetConfig}>
        Reset
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. Config Store Tests
// ═══════════════════════════════════════════════════════════════════════════

describe("Config Store", () => {
  it("provides default config when platform returns empty", async () => {
    await act(async () => {
      renderWithProviders(<ConfigConsumer />);
    });

    expect(screen.getByTestId("engine").textContent).toBe("markdown-it");
    expect(screen.getByTestId("color-mode").textContent).toBe("dark");
    expect(screen.getByTestId("font-size").textContent).toBe("13");
  });

  it("updateConfig updates a section", async () => {
    await act(async () => {
      renderWithProviders(<ConfigConsumer />);
    });

    expect(screen.getByTestId("engine").textContent).toBe("markdown-it");

    await act(async () => {
      fireEvent.click(screen.getByTestId("update-engine"));
    });

    expect(screen.getByTestId("engine").textContent).toBe("marked");
  });

  it("updateConfig shallow-merges within a section", async () => {
    await act(async () => {
      renderWithProviders(<ConfigConsumer />);
    });

    // Default editor fontSize is 13
    expect(screen.getByTestId("font-size").textContent).toBe("13");

    await act(async () => {
      fireEvent.click(screen.getByTestId("update-editor"));
    });

    // fontSize updated but engine should still be default
    expect(screen.getByTestId("font-size").textContent).toBe("18");
    expect(screen.getByTestId("engine").textContent).toBe("markdown-it");
  });

  it("merges persisted config with defaults", async () => {
    const mockPlatform = createMockPlatform({
      readConfig: vi.fn().mockResolvedValue({
        engine: { activeEngine: "remark" },
        // editor section not provided — should use defaults
      }),
    });

    await act(async () => {
      renderWithProviders(<ConfigConsumer />, mockPlatform);
    });

    expect(screen.getByTestId("engine").textContent).toBe("remark");
    // Editor font size should still be default
    expect(screen.getByTestId("font-size").textContent).toBe("13");
  });

  it("resetConfig restores defaults", async () => {
    await act(async () => {
      renderWithProviders(<ConfigConsumer />);
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("update-engine"));
    });
    expect(screen.getByTestId("engine").textContent).toBe("marked");

    await act(async () => {
      fireEvent.click(screen.getByTestId("reset"));
    });
    expect(screen.getByTestId("engine").textContent).toBe("markdown-it");
  });

  it("throws when useConfig is used outside ConfigProvider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<ConfigConsumer />)).toThrow(
      "useConfig must be used within a ConfigProvider",
    );
    spy.mockRestore();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. Settings UI Tests
// ═══════════════════════════════════════════════════════════════════════════

describe("Settings UI", () => {
  const noFsCaps: PlatformCapabilities = {
    hasFilesystem: false,
    hasFileWatcher: false,
    hasNativeDialogs: false,
    hasCliArgs: false,
  };

  const fsCaps: PlatformCapabilities = {
    hasFilesystem: true,
    hasFileWatcher: true,
    hasNativeDialogs: true,
    hasCliArgs: true,
  };

  it("renders 7 sections when no filesystem", async () => {
    await act(async () => {
      renderWithProviders(
        <Settings capabilities={noFsCaps} />,
      );
    });

    expect(screen.getByTestId("settings-appearance")).toBeInTheDocument();
    expect(screen.getByTestId("settings-editor")).toBeInTheDocument();
    expect(screen.getByTestId("settings-preview")).toBeInTheDocument();
    expect(screen.getByTestId("settings-engine")).toBeInTheDocument();
    expect(screen.getByTestId("settings-extensions")).toBeInTheDocument();
    expect(screen.getByTestId("settings-advanced")).toBeInTheDocument();
    expect(screen.getByTestId("settings-about")).toBeInTheDocument();
  });

  it("renders 7 sections when filesystem is available", async () => {
    await act(async () => {
      renderWithProviders(
        <Settings capabilities={fsCaps} />,
      );
    });

    expect(screen.getByTestId("settings-appearance")).toBeInTheDocument();
    expect(screen.getByTestId("settings-editor")).toBeInTheDocument();
    expect(screen.getByTestId("settings-preview")).toBeInTheDocument();
    expect(screen.getByTestId("settings-engine")).toBeInTheDocument();
    expect(screen.getByTestId("settings-extensions")).toBeInTheDocument();
    expect(screen.getByTestId("settings-advanced")).toBeInTheDocument();
    expect(screen.getByTestId("settings-about")).toBeInTheDocument();
  });

  it("appearance section shows color mode toggle buttons", async () => {
    await act(async () => {
      renderWithProviders(
        <Settings capabilities={noFsCaps} />,
      );
    });

    expect(screen.getByTestId("mode-light")).toBeInTheDocument();
    expect(screen.getByTestId("mode-dark")).toBeInTheDocument();
    expect(screen.getByTestId("mode-system")).toBeInTheDocument();
  });

  it("engine dropdown shows 3 options", async () => {
    await act(async () => {
      renderWithProviders(
        <Settings capabilities={noFsCaps} />,
      );
    });

    const engineSection = screen.getByTestId("settings-engine");
    const select = engineSection.querySelector("select")!;
    expect(select).toBeTruthy();

    const options = select.querySelectorAll("option");
    expect(options.length).toBe(3);
    expect(options[0].value).toBe("markdown-it");
    expect(options[1].value).toBe("marked");
    expect(options[2].value).toBe("remark");
  });

  it("extension editor adds extensions on Enter", async () => {
    await act(async () => {
      renderWithProviders(
        <Settings capabilities={noFsCaps} />,
      );
    });

    const input = screen.getByTestId("extension-input");

    // Initially should have default extensions
    const chipsBefore = screen.getAllByTestId("extension-chip");
    const initialCount = chipsBefore.length;
    expect(initialCount).toBe(defaultConfig.fileExtensions.recognized.length);

    // Add a new extension
    await act(async () => {
      fireEvent.change(input, { target: { value: ".txt" } });
    });
    await act(async () => {
      fireEvent.keyDown(input, { key: "Enter" });
    });

    const chipsAfter = screen.getAllByTestId("extension-chip");
    expect(chipsAfter.length).toBe(initialCount + 1);
  });

  it("extension editor removes extensions", async () => {
    await act(async () => {
      renderWithProviders(
        <Settings capabilities={noFsCaps} />,
      );
    });

    const chipsBefore = screen.getAllByTestId("extension-chip");
    const initialCount = chipsBefore.length;
    expect(initialCount).toBeGreaterThan(0);

    // Click the remove button on the first chip
    const removeBtn = chipsBefore[0].querySelector("button")!;
    await act(async () => {
      fireEvent.click(removeBtn);
    });

    const chipsAfter = screen.getAllByTestId("extension-chip");
    expect(chipsAfter.length).toBe(initialCount - 1);
  });

  it("extension validation rejects input without leading dot", async () => {
    await act(async () => {
      renderWithProviders(
        <Settings capabilities={noFsCaps} />,
      );
    });

    const input = screen.getByTestId("extension-input");

    await act(async () => {
      fireEvent.change(input, { target: { value: "txt" } });
    });
    await act(async () => {
      fireEvent.keyDown(input, { key: "Enter" });
    });

    expect(screen.getByTestId("extension-error")).toBeInTheDocument();
  });

  it("extension validation rejects input with special characters", async () => {
    await act(async () => {
      renderWithProviders(
        <Settings capabilities={noFsCaps} />,
      );
    });

    const input = screen.getByTestId("extension-input");

    await act(async () => {
      fireEvent.change(input, { target: { value: ".m@d" } });
    });
    await act(async () => {
      fireEvent.keyDown(input, { key: "Enter" });
    });

    expect(screen.getByTestId("extension-error")).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. Toggle Component Tests
// ═══════════════════════════════════════════════════════════════════════════

describe("Toggle", () => {
  it("renders unchecked state", () => {
    render(<Toggle checked={false} onChange={() => {}} />);
    const checkbox = screen.getByRole("switch") as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
  });

  it("renders checked state", () => {
    render(<Toggle checked={true} onChange={() => {}} />);
    const checkbox = screen.getByRole("switch") as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });

  it("calls onChange on click", async () => {
    const handler = vi.fn();
    render(<Toggle checked={false} onChange={handler} label="Test toggle" />);

    const label = screen.getByText("Test toggle");
    await act(async () => {
      fireEvent.click(label);
    });

    expect(handler).toHaveBeenCalledWith(true);
  });

  it("renders with label", () => {
    render(<Toggle checked={false} onChange={() => {}} label="My Label" />);
    expect(screen.getByText("My Label")).toBeInTheDocument();
  });

  it("disabled state prevents changes", () => {
    const handler = vi.fn();
    render(<Toggle checked={false} onChange={handler} disabled />);
    const checkbox = screen.getByRole("switch") as HTMLInputElement;
    expect(checkbox.disabled).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. Select Component Tests
// ═══════════════════════════════════════════════════════════════════════════

describe("Select", () => {
  const options = [
    { value: "a", label: "Option A" },
    { value: "b", label: "Option B" },
    { value: "c", label: "Option C" },
  ];

  it("renders all options", () => {
    render(<Select value="a" onChange={() => {}} options={options} />);
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    const optionEls = select.querySelectorAll("option");
    expect(optionEls.length).toBe(3);
    expect(optionEls[0].textContent).toBe("Option A");
    expect(optionEls[1].textContent).toBe("Option B");
    expect(optionEls[2].textContent).toBe("Option C");
  });

  it("has correct selected value", () => {
    render(<Select value="b" onChange={() => {}} options={options} />);
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.value).toBe("b");
  });

  it("calls onChange on selection", async () => {
    const handler = vi.fn();
    render(<Select value="a" onChange={handler} options={options} />);
    const select = screen.getByRole("combobox");

    await act(async () => {
      fireEvent.change(select, { target: { value: "c" } });
    });

    expect(handler).toHaveBeenCalledWith("c");
  });

  it("disabled state", () => {
    render(
      <Select value="a" onChange={() => {}} options={options} disabled />,
    );
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.disabled).toBe(true);
  });
});
