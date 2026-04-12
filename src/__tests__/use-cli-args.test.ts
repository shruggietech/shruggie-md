import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useCliArgs } from "../hooks/useCliArgs";

const { invokeMock } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: invokeMock,
}));

describe("useCliArgs", () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it("handles a valid startup file path", async () => {
    const startupPath = "C:/docs/readme.md";
    const startupContent = "# Hello World";
    invokeMock.mockResolvedValue([startupPath, null, startupContent]);

    const onFileOpen = vi.fn().mockResolvedValue(true);
    const onUrlFetch = vi.fn().mockResolvedValue(false);
    const onResolved = vi.fn();

    renderHook(() =>
      useCliArgs({ onFileOpen, onUrlFetch, onResolved }, true),
    );

    await waitFor(() => {
      expect(onFileOpen).toHaveBeenCalledWith(startupPath, startupContent);
    });

    expect(onResolved).toHaveBeenCalledWith({
      source: "file",
      filePath: startupPath,
      handled: true,
    });
    expect(onUrlFetch).not.toHaveBeenCalled();
  });

  it("reports fallback when startup file path is missing or unreadable", async () => {
    const startupPath = "C:/docs/missing.md";
    invokeMock.mockResolvedValue([startupPath, null, null]);

    const onFileOpen = vi.fn().mockResolvedValue(false);
    const onUrlFetch = vi.fn().mockResolvedValue(false);
    const onResolved = vi.fn();

    renderHook(() =>
      useCliArgs({ onFileOpen, onUrlFetch, onResolved }, true),
    );

    await waitFor(() => {
      expect(onResolved).toHaveBeenCalledWith({
        source: "file",
        filePath: startupPath,
        handled: false,
      });
    });

    expect(onFileOpen).toHaveBeenCalledWith(startupPath, null);
    expect(onUrlFetch).not.toHaveBeenCalled();
  });

  it("reports no startup argument when path is absent", async () => {
    invokeMock.mockResolvedValue([null, null, null]);

    const onFileOpen = vi.fn().mockResolvedValue(false);
    const onUrlFetch = vi.fn().mockResolvedValue(false);
    const onResolved = vi.fn();

    renderHook(() =>
      useCliArgs({ onFileOpen, onUrlFetch, onResolved }, true),
    );

    await waitFor(() => {
      expect(onResolved).toHaveBeenCalledWith({
        source: "none",
        handled: false,
      });
    });

    expect(onFileOpen).not.toHaveBeenCalled();
    expect(onUrlFetch).not.toHaveBeenCalled();
  });
});
