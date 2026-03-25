import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider, useTheme } from "../hooks";
import { Button, Input, Modal, Tooltip, Divider } from "../components/common";

// Helper to render with ThemeProvider
function renderWithTheme(ui: React.ReactNode, initialMode?: "light" | "dark" | "system") {
  return render(
    <ThemeProvider initialMode={initialMode}>{ui}</ThemeProvider>,
  );
}

// Helper component to access theme context
function ThemeConsumer() {
  const theme = useTheme();
  return (
    <div>
      <span data-testid="color-mode">{theme.colorMode}</span>
      <span data-testid="resolved-theme">{theme.resolvedTheme}</span>
      <span data-testid="visual-style">{theme.visualStyle}</span>
      <span data-testid="reduced-motion">{String(theme.prefersReducedMotion)}</span>
      <button onClick={() => theme.setColorMode("light")} data-testid="set-light">
        Light
      </button>
      <button onClick={() => theme.setColorMode("dark")} data-testid="set-dark">
        Dark
      </button>
      <button onClick={() => theme.setColorMode("system")} data-testid="set-system">
        System
      </button>
    </div>
  );
}

// ─── matchMedia mock ─────────────────────────────────────────────────────
type MediaQueryCallback = (e: MediaQueryListEvent) => void;

const mediaQueryListeners: Record<string, MediaQueryCallback[]> = {};
let darkModeMatches = true;
let reducedMotionMatches = false;

function createMockMatchMedia() {
  return (query: string): MediaQueryList => {
    if (!mediaQueryListeners[query]) {
      mediaQueryListeners[query] = [];
    }

    const getMatches = () => {
      if (query === "(prefers-color-scheme: dark)") return darkModeMatches;
      if (query === "(prefers-reduced-motion: reduce)") return reducedMotionMatches;
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

function fireMediaQueryChange(query: string, matches: boolean) {
  if (query === "(prefers-color-scheme: dark)") darkModeMatches = matches;
  if (query === "(prefers-reduced-motion: reduce)") reducedMotionMatches = matches;
  const listeners = mediaQueryListeners[query] || [];
  for (const cb of listeners) {
    cb({ matches } as MediaQueryListEvent);
  }
}

beforeEach(() => {
  darkModeMatches = true;
  reducedMotionMatches = false;
  for (const key of Object.keys(mediaQueryListeners)) {
    mediaQueryListeners[key] = [];
  }
  window.matchMedia = createMockMatchMedia();
  // Reset data-theme attribute
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.removeAttribute("data-style");
});

// ─── ThemeProvider / useTheme tests ──────────────────────────────────────
describe("ThemeProvider / useTheme", () => {
  it("defaults to dark theme", () => {
    renderWithTheme(<ThemeConsumer />);
    expect(screen.getByTestId("color-mode").textContent).toBe("dark");
    expect(screen.getByTestId("resolved-theme").textContent).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("can switch to light theme", async () => {
    renderWithTheme(<ThemeConsumer />);
    await act(async () => {
      fireEvent.click(screen.getByTestId("set-light"));
    });
    expect(screen.getByTestId("color-mode").textContent).toBe("light");
    expect(screen.getByTestId("resolved-theme").textContent).toBe("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("system mode tracks matchMedia", async () => {
    darkModeMatches = false;
    window.matchMedia = createMockMatchMedia();
    renderWithTheme(<ThemeConsumer />);

    await act(async () => {
      fireEvent.click(screen.getByTestId("set-system"));
    });
    // OS is light (darkModeMatches=false)
    expect(screen.getByTestId("resolved-theme").textContent).toBe("light");

    // Simulate OS switching to dark
    await act(async () => {
      fireMediaQueryChange("(prefers-color-scheme: dark)", true);
    });
    expect(screen.getByTestId("resolved-theme").textContent).toBe("dark");
  });

  it("detects prefers-reduced-motion", async () => {
    reducedMotionMatches = true;
    window.matchMedia = createMockMatchMedia();
    renderWithTheme(<ThemeConsumer />);
    expect(screen.getByTestId("reduced-motion").textContent).toBe("true");
  });

  it("throws when useTheme is used outside ThemeProvider", () => {
    // Suppress React error boundary console output
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<ThemeConsumer />)).toThrow(
      "useTheme must be used within a ThemeProvider",
    );
    spy.mockRestore();
  });
});

// ─── Button tests ────────────────────────────────────────────────────────
describe("Button", () => {
  it("renders ghost variant by default", () => {
    renderWithTheme(<Button>Click me</Button>);
    const button = screen.getByRole("button", { name: /click me/i });
    expect(button).toBeInTheDocument();
    expect(button.style.backgroundColor).toBe("transparent");
  });

  it("renders accent variant", () => {
    renderWithTheme(<Button variant="accent">Accent</Button>);
    const button = screen.getByRole("button", { name: /accent/i });
    expect(button.style.backgroundColor).toBe("var(--color-accent)");
  });

  it("click handler fires", async () => {
    const handler = vi.fn();
    renderWithTheme(<Button onClick={handler}>Click</Button>);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /click/i }));
    });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("disabled state prevents clicks", async () => {
    const handler = vi.fn();
    renderWithTheme(
      <Button onClick={handler} disabled>
        Disabled
      </Button>,
    );
    const button = screen.getByRole("button", { name: /disabled/i });
    await act(async () => {
      fireEvent.click(button);
    });
    expect(handler).not.toHaveBeenCalled();
    expect(button).toBeDisabled();
  });

  it("has correct minimum size", () => {
    renderWithTheme(<Button>X</Button>);
    const button = screen.getByRole("button", { name: /x/i });
    expect(button.style.minWidth).toBe("32px");
    expect(button.style.minHeight).toBe("32px");
  });
});

// ─── Input tests ─────────────────────────────────────────────────────────
describe("Input", () => {
  it("renders with placeholder", () => {
    renderWithTheme(
      <Input value="" onChange={() => {}} placeholder="Type here..." />,
    );
    expect(screen.getByPlaceholderText("Type here...")).toBeInTheDocument();
  });

  it("onChange fires on input", async () => {
    const handler = vi.fn();
    renderWithTheme(
      <Input value="" onChange={handler} placeholder="input" />,
    );
    const input = screen.getByPlaceholderText("input");
    await act(async () => {
      fireEvent.change(input, { target: { value: "hello" } });
    });
    expect(handler).toHaveBeenCalled();
  });

  it("value is controlled", () => {
    renderWithTheme(
      <Input value="controlled" onChange={() => {}} placeholder="test" />,
    );
    const input = screen.getByPlaceholderText("test") as HTMLInputElement;
    expect(input.value).toBe("controlled");
  });
});

// ─── Modal tests ─────────────────────────────────────────────────────────
describe("Modal", () => {
  it("not visible when isOpen=false", () => {
    renderWithTheme(
      <Modal isOpen={false} onClose={() => {}} title="Test Modal">
        <p>Content</p>
      </Modal>,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("visible when isOpen=true", () => {
    renderWithTheme(
      <Modal isOpen={true} onClose={() => {}} title="Test Modal">
        <p>Content</p>
      </Modal>,
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Test Modal")).toBeInTheDocument();
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("escape key calls onClose", () => {
    const onClose = vi.fn();
    renderWithTheme(
      <Modal isOpen={true} onClose={onClose} title="Test">
        <p>body</p>
      </Modal>,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("backdrop click calls onClose", () => {
    const onClose = vi.fn();
    renderWithTheme(
      <Modal isOpen={true} onClose={onClose} title="Test">
        <p>body</p>
      </Modal>,
    );
    fireEvent.click(screen.getByTestId("modal-backdrop"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("clicking modal content does not close", () => {
    const onClose = vi.fn();
    renderWithTheme(
      <Modal isOpen={true} onClose={onClose} title="Test">
        <p>body</p>
      </Modal>,
    );
    fireEvent.click(screen.getByRole("dialog"));
    expect(onClose).not.toHaveBeenCalled();
  });
});

// ─── Tooltip tests ───────────────────────────────────────────────────────
describe("Tooltip", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("not initially visible", () => {
    renderWithTheme(
      <Tooltip content="Tooltip text">
        <button>Hover me</button>
      </Tooltip>,
    );
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("shows on hover after delay", async () => {
    renderWithTheme(
      <Tooltip content="Tooltip text">
        <button>Hover me</button>
      </Tooltip>,
    );
    const trigger = screen.getByText("Hover me").parentElement!;
    fireEvent.mouseEnter(trigger);

    // Should not be visible yet
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    // Advance past the 400ms delay
    await act(async () => {
      vi.advanceTimersByTime(400);
    });

    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    expect(screen.getByRole("tooltip").textContent).toBe("Tooltip text");
  });

  it("hides on mouse leave", async () => {
    renderWithTheme(
      <Tooltip content="Tooltip text">
        <button>Hover me</button>
      </Tooltip>,
    );
    const trigger = screen.getByText("Hover me").parentElement!;

    fireEvent.mouseEnter(trigger);
    await act(async () => {
      vi.advanceTimersByTime(400);
    });
    expect(screen.getByRole("tooltip")).toBeInTheDocument();

    fireEvent.mouseLeave(trigger);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });
});

// ─── Divider tests ───────────────────────────────────────────────────────
describe("Divider", () => {
  it("renders a divider element", () => {
    renderWithTheme(<Divider onResize={() => {}} />);
    const divider = screen.getByTestId("divider");
    expect(divider).toBeInTheDocument();
    expect(divider.getAttribute("role")).toBe("separator");
  });

  it("has col-resize cursor", () => {
    renderWithTheme(<Divider onResize={() => {}} />);
    const divider = screen.getByTestId("divider");
    expect(divider.style.cursor).toBe("col-resize");
  });
});
