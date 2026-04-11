import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { type ReactNode } from "react";
import { ThemeProvider } from "../hooks/ThemeProvider";
import { ConfigProvider } from "../config/ConfigProvider";
import { useConfig } from "../config/store";
import { useConfigEffects } from "../hooks/useConfigEffects";
import { defaultConfig } from "../config/defaults";
import { PREVIEW_FONTS, SYSTEM_DEFAULT_FONT_VALUE } from "../config/previewFonts";
import { Settings } from "../components/Settings";
import type { PlatformAdapter, PlatformCapabilities } from "../platform/platform";

// ─── matchMedia mock ─────────────────────────────────────────────────────

type MediaQueryCallback = (e: MediaQueryListEvent) => void;
const mediaQueryListeners: Record<string, MediaQueryCallback[]> = {};

function createMockMatchMedia() {
  return (query: string): MediaQueryList => {
    if (!mediaQueryListeners[query]) {
      mediaQueryListeners[query] = [];
    }
    return {
      matches: false,
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
  document.documentElement.style.removeProperty("--font-preview");
});

// ─── Mock platform ────────────────────────────────────────────────────────

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
      hasFilesystem: false,
      hasFileWatcher: false,
      hasNativeDialogs: false,
      hasCliArgs: false,
    } satisfies PlatformCapabilities),
    ...overrides,
  } as PlatformAdapter;
}

// ─── Helper wrappers ──────────────────────────────────────────────────────

function Wrapper({ children, platform }: { children: ReactNode; platform?: PlatformAdapter }) {
  return (
    <ThemeProvider>
      <ConfigProvider platform={platform ?? createMockPlatform()}>{children}</ConfigProvider>
    </ThemeProvider>
  );
}

function renderWithProviders(ui: ReactNode, platform?: PlatformAdapter) {
  return render(ui, {
    wrapper: ({ children }) => <Wrapper platform={platform}>{children}</Wrapper>,
  });
}

// ─── Component that exposes config values and applies effects ─────────────

function PreviewFontConsumer() {
  const { config, updateConfig } = useConfig();
  useConfigEffects(config);
  return (
    <div>
      <span data-testid="preview-font">{config.preview.fontFamily}</span>
      {PREVIEW_FONTS.map((font) => (
        <button
          key={font.value}
          data-testid={`set-font-${font.label.replace(/\s+/g, "-").toLowerCase()}`}
          onClick={() => updateConfig("preview", { fontFamily: font.value })}
        >
          {font.label}
        </button>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. PREVIEW_FONTS module structure
// ═══════════════════════════════════════════════════════════════════════════

describe("PREVIEW_FONTS module", () => {
  it("exports 12 font options", () => {
    expect(PREVIEW_FONTS).toHaveLength(12);
  });

  it("every entry has a non-empty label and value", () => {
    for (const font of PREVIEW_FONTS) {
      expect(font.label.trim().length).toBeGreaterThan(0);
      expect(font.value.trim().length).toBeGreaterThan(0);
    }
  });

  it("is sorted alphabetically by label", () => {
    const labels = PREVIEW_FONTS.map((f) => f.label);
    const sorted = [...labels].sort((a, b) => a.localeCompare(b));
    expect(labels).toEqual(sorted);
  });

  it("includes a System Default entry", () => {
    const entry = PREVIEW_FONTS.find((f) => f.label === "System Default");
    expect(entry).toBeDefined();
    expect(entry!.value).toBe(SYSTEM_DEFAULT_FONT_VALUE);
  });

  it("all values are unique", () => {
    const values = PREVIEW_FONTS.map((f) => f.value);
    expect(new Set(values).size).toBe(values.length);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. Default selection on first run
// ═══════════════════════════════════════════════════════════════════════════

describe("Default font on first run", () => {
  it("defaultConfig uses SYSTEM_DEFAULT_FONT_VALUE", () => {
    expect(defaultConfig.preview.fontFamily).toBe(SYSTEM_DEFAULT_FONT_VALUE);
  });

  it("config.preview.fontFamily is SYSTEM_DEFAULT_FONT_VALUE when no stored value", async () => {
    await act(async () => {
      renderWithProviders(<PreviewFontConsumer />);
    });
    expect(screen.getByTestId("preview-font").textContent).toBe(SYSTEM_DEFAULT_FONT_VALUE);
  });

  it("Settings preview Select defaults to System Default option", async () => {
    const caps: PlatformCapabilities = {
      hasFilesystem: false,
      hasFileWatcher: false,
      hasNativeDialogs: false,
      hasCliArgs: false,
    };

    await act(async () => {
      renderWithProviders(<Settings capabilities={caps} />);
    });

    const previewSection = screen.getByTestId("settings-preview");
    const select = previewSection.querySelector("select") as HTMLSelectElement;
    expect(select).toBeTruthy();
    expect(select.value).toBe(SYSTEM_DEFAULT_FONT_VALUE);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. Settings preview Select structure
// ═══════════════════════════════════════════════════════════════════════════

describe("Settings preview font Select", () => {
  const caps: PlatformCapabilities = {
    hasFilesystem: false,
    hasFileWatcher: false,
    hasNativeDialogs: false,
    hasCliArgs: false,
  };

  it("contains exactly 12 options", async () => {
    await act(async () => {
      renderWithProviders(<Settings capabilities={caps} />);
    });

    const previewSection = screen.getByTestId("settings-preview");
    const select = previewSection.querySelector("select") as HTMLSelectElement;
    expect(select.querySelectorAll("option")).toHaveLength(12);
  });

  it("option values match PREVIEW_FONTS values", async () => {
    await act(async () => {
      renderWithProviders(<Settings capabilities={caps} />);
    });

    const previewSection = screen.getByTestId("settings-preview");
    const select = previewSection.querySelector("select") as HTMLSelectElement;
    const optionValues = Array.from(select.querySelectorAll("option")).map(
      (o) => (o as HTMLOptionElement).value,
    );
    expect(optionValues).toEqual(PREVIEW_FONTS.map((f) => f.value));
  });

  it("changing the select updates config.preview.fontFamily", async () => {
    const georgiaPlatform = createMockPlatform();
    const georgiaFont = PREVIEW_FONTS.find((f) => f.label === "Georgia")!;

    await act(async () => {
      renderWithProviders(<Settings capabilities={caps} />, georgiaPlatform);
    });

    const previewSection = screen.getByTestId("settings-preview");
    const select = previewSection.querySelector("select") as HTMLSelectElement;

    await act(async () => {
      fireEvent.change(select, { target: { value: georgiaFont.value } });
    });

    expect(select.value).toBe(georgiaFont.value);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. Persistence round-trip
// ═══════════════════════════════════════════════════════════════════════════

describe("Persistence round-trip", () => {
  it("loads a stored valid font family value from platform config", async () => {
    const georgiaFont = PREVIEW_FONTS.find((f) => f.label === "Georgia")!;
    const platform = createMockPlatform({
      readConfig: vi.fn().mockResolvedValue({
        preview: { fontFamily: georgiaFont.value },
      }),
    });

    await act(async () => {
      renderWithProviders(<PreviewFontConsumer />, platform);
    });

    expect(screen.getByTestId("preview-font").textContent).toBe(georgiaFont.value);
  });

  it("falls back to System Default when stored value is not in the curated list", async () => {
    const platform = createMockPlatform({
      readConfig: vi.fn().mockResolvedValue({
        preview: { fontFamily: '"My Custom Font", sans-serif' },
      }),
    });

    await act(async () => {
      renderWithProviders(<PreviewFontConsumer />, platform);
    });

    expect(screen.getByTestId("preview-font").textContent).toBe(SYSTEM_DEFAULT_FONT_VALUE);
  });

  it("falls back to System Default when stored value was the old Inter-prefixed default", async () => {
    const oldDefault = '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';
    const platform = createMockPlatform({
      readConfig: vi.fn().mockResolvedValue({
        preview: { fontFamily: oldDefault },
      }),
    });

    await act(async () => {
      renderWithProviders(<PreviewFontConsumer />, platform);
    });

    expect(screen.getByTestId("preview-font").textContent).toBe(SYSTEM_DEFAULT_FONT_VALUE);
  });

  it("persists updated font selection via writeConfig", async () => {
    const writeMock = vi.fn().mockResolvedValue(undefined);
    const platform = createMockPlatform({ writeConfig: writeMock });
    const verdanaFont = PREVIEW_FONTS.find((f) => f.label === "Verdana")!;

    await act(async () => {
      renderWithProviders(<PreviewFontConsumer />, platform);
    });

    await act(async () => {
      fireEvent.click(
        screen.getByTestId("set-font-verdana"),
      );
    });

    expect(writeMock).toHaveBeenCalled();
    const savedConfig = writeMock.mock.calls[writeMock.mock.calls.length - 1][0] as Record<string, unknown>;
    const preview = savedConfig["preview"] as { fontFamily: string };
    expect(preview.fontFamily).toBe(verdanaFont.value);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. CSS custom property applied to preview surface
// ═══════════════════════════════════════════════════════════════════════════

describe("Preview font CSS custom property", () => {
  it("sets --font-preview on document root on first render", async () => {
    await act(async () => {
      renderWithProviders(<PreviewFontConsumer />);
    });

    expect(
      document.documentElement.style.getPropertyValue("--font-preview"),
    ).toBe(SYSTEM_DEFAULT_FONT_VALUE);
  });

  it("updates --font-preview when font selection changes", async () => {
    const interFont = PREVIEW_FONTS.find((f) => f.label === "Inter")!;

    await act(async () => {
      renderWithProviders(<PreviewFontConsumer />);
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("set-font-inter"));
    });

    expect(
      document.documentElement.style.getPropertyValue("--font-preview"),
    ).toBe(interFont.value);
  });
});
