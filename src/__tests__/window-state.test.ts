import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useWindowState } from "../hooks/useWindowState";
import type { StorageAdapter } from "../storage/types";

type CloseHandler = (event: { preventDefault: () => void }) => Promise<void> | void;
type WindowEventHandler = () => void;

let closeHandler: CloseHandler | null = null;
let movedHandler: WindowEventHandler | null = null;
let resizedHandler: WindowEventHandler | null = null;

const mockWindow = {
  setSize: vi.fn(async () => {}),
  setPosition: vi.fn(async () => {}),
  center: vi.fn(async () => {}),
  maximize: vi.fn(async () => {}),
  destroy: vi.fn(async () => {}),
  isMaximized: vi.fn(async () => false),
  outerSize: vi.fn(async () => ({ width: 1280, height: 720 })),
  outerPosition: vi.fn(async () => ({ x: 120, y: 80 })),
  onCloseRequested: vi.fn(async (handler: CloseHandler) => {
    closeHandler = handler;
    return () => {
      closeHandler = null;
    };
  }),
  onMoved: vi.fn(async (handler: WindowEventHandler) => {
    movedHandler = handler;
    return () => {
      movedHandler = null;
    };
  }),
  onResized: vi.fn(async (handler: WindowEventHandler) => {
    resizedHandler = handler;
    return () => {
      resizedHandler = null;
    };
  }),
};

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => mockWindow,
  availableMonitors: vi.fn(async () => []),
  LogicalSize: class LogicalSize {
    constructor(public width: number, public height: number) {}
  },
  LogicalPosition: class LogicalPosition {
    constructor(public x: number, public y: number) {}
  },
}));

function createStorageMock(setConfigValue?: (key: string, value: string) => Promise<void>) {
  return {
    getConfigValue: vi.fn(async () => null),
    setConfigValue: vi.fn(setConfigValue ?? (async () => {})),
  } as unknown as StorageAdapter;
}

async function flushInit(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("useWindowState", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    closeHandler = null;
    movedHandler = null;
    resizedHandler = null;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("resolves close handler within timeout when save hangs", async () => {
    const storage = createStorageMock(async () => {
      await new Promise(() => {});
    });

    renderHook(() => useWindowState(storage, true));

    await flushInit();
    expect(closeHandler).not.toBeNull();

    const preventDefault = vi.fn();
    const closePromise = closeHandler?.({ preventDefault });

    await vi.advanceTimersByTimeAsync(2100);
    await expect(closePromise).resolves.toBeUndefined();
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(mockWindow.destroy).toHaveBeenCalledTimes(1);
  });

  it("debounces move and resize saves", async () => {
    const storage = createStorageMock();

    renderHook(() => useWindowState(storage, true));

    await flushInit();
    expect(movedHandler).not.toBeNull();
    expect(resizedHandler).not.toBeNull();

    movedHandler?.();
    movedHandler?.();
    resizedHandler?.();

    await vi.advanceTimersByTimeAsync(999);
    const setConfigValueMock = storage.setConfigValue as unknown as ReturnType<typeof vi.fn>;
    expect(setConfigValueMock.mock.calls.length).toBe(0);

    await vi.advanceTimersByTimeAsync(1);

    expect(setConfigValueMock.mock.calls.length).toBe(5);
    expect(storage.setConfigValue).toHaveBeenCalledWith("window.maximized", "false");
  });
});
