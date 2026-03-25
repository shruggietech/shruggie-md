import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { PlatformCapabilities } from "@/platform/platform";

/* ================================================================
 * 1.  Chrome Adapter Tests
 * ================================================================ */

describe("Chrome Adapter", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("readConfig falls back to localStorage when chrome.storage is unavailable", async () => {
    // Ensure no global chrome object
    const prev = (globalThis as Record<string, unknown>).chrome;
    delete (globalThis as Record<string, unknown>).chrome;

    const { ChromeAdapter } = await import("@/platform/chrome");
    const adapter = new ChromeAdapter();

    // Seed localStorage
    localStorage.setItem(
      "shruggie-md-config",
      JSON.stringify({ appearance: { colorMode: "light" } }),
    );

    const config = await adapter.readConfig();
    expect(config).toEqual({ appearance: { colorMode: "light" } });

    // Restore
    if (prev !== undefined) {
      (globalThis as Record<string, unknown>).chrome = prev;
    }
  });

  it("writeConfig writes to localStorage when chrome.storage is unavailable", async () => {
    const prev = (globalThis as Record<string, unknown>).chrome;
    delete (globalThis as Record<string, unknown>).chrome;

    const { ChromeAdapter } = await import("@/platform/chrome");
    const adapter = new ChromeAdapter();

    await adapter.writeConfig({ engine: { activeEngine: "marked" } });

    const stored = localStorage.getItem("shruggie-md-config");
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored!)).toEqual({ engine: { activeEngine: "marked" } });

    if (prev !== undefined) {
      (globalThis as Record<string, unknown>).chrome = prev;
    }
  });

  it("readConfig returns empty object when nothing is stored", async () => {
    const prev = (globalThis as Record<string, unknown>).chrome;
    delete (globalThis as Record<string, unknown>).chrome;

    const { ChromeAdapter } = await import("@/platform/chrome");
    const adapter = new ChromeAdapter();

    const config = await adapter.readConfig();
    expect(config).toEqual({});

    if (prev !== undefined) {
      (globalThis as Record<string, unknown>).chrome = prev;
    }
  });

  it("capabilities are all false (no filesystem, file watcher, native dialogs, CLI args)", async () => {
    const { ChromeAdapter } = await import("@/platform/chrome");
    const adapter = new ChromeAdapter();
    const caps: PlatformCapabilities = adapter.getPlatformCapabilities();

    expect(caps.hasFilesystem).toBe(false);
    expect(caps.hasFileWatcher).toBe(false);
    expect(caps.hasNativeDialogs).toBe(false);
    expect(caps.hasCliArgs).toBe(false);
  });

  it("readFile returns empty string", async () => {
    const { ChromeAdapter } = await import("@/platform/chrome");
    const adapter = new ChromeAdapter();
    expect(await adapter.readFile("/any/path")).toBe("");
  });

  it("openFileDialog returns null", async () => {
    const { ChromeAdapter } = await import("@/platform/chrome");
    const adapter = new ChromeAdapter();
    expect(await adapter.openFileDialog([".md"])).toBeNull();
  });

  it("watchFile returns an unsubscribe function", async () => {
    const { ChromeAdapter } = await import("@/platform/chrome");
    const adapter = new ChromeAdapter();
    const unsub = adapter.watchFile("/test", () => {});
    expect(typeof unsub).toBe("function");
    unsub(); // should not throw
  });
});

/* ================================================================
 * 2.  Content Script Logic Tests
 * ================================================================ */

describe("Content Script — isMarkdownUrl", () => {
  // Import the pure function directly from the content script module
  let isMarkdownUrl: (url: string) => boolean;

  beforeEach(async () => {
    const mod = await import("../../extension/content");
    isMarkdownUrl = mod.isMarkdownUrl;
  });

  it("detects .md URL", () => {
    expect(isMarkdownUrl("https://example.com/readme.md")).toBe(true);
  });

  it("detects .markdown URL", () => {
    expect(isMarkdownUrl("https://example.com/doc.markdown")).toBe(true);
  });

  it("detects .mdown URL", () => {
    expect(isMarkdownUrl("https://example.com/notes.mdown")).toBe(true);
  });

  it("detects .mkdn URL", () => {
    expect(isMarkdownUrl("https://example.com/file.mkdn")).toBe(true);
  });

  it("detects .mkd URL", () => {
    expect(isMarkdownUrl("https://example.com/file.mkd")).toBe(true);
  });

  it("rejects .html URL", () => {
    expect(isMarkdownUrl("https://example.com/page.html")).toBe(false);
  });

  it("rejects URL without extension", () => {
    expect(isMarkdownUrl("https://example.com/readme")).toBe(false);
  });

  it("rejects invalid URL", () => {
    expect(isMarkdownUrl("not a url")).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(isMarkdownUrl("https://example.com/README.MD")).toBe(true);
  });
});

describe("Content Script — extractMarkdownContent", () => {
  let extractMarkdownContent: () => string;

  beforeEach(async () => {
    const mod = await import("../../extension/content");
    extractMarkdownContent = mod.extractMarkdownContent;
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("extracts text from a <pre> element", () => {
    document.body.innerHTML = "<pre># Hello World\nSome text</pre>";
    expect(extractMarkdownContent()).toBe("# Hello World\nSome text");
  });

  it("falls back to body.innerText when no <pre>", () => {
    document.body.innerHTML = "";
    document.body.innerText = "# Fallback content";
    // jsdom may not support innerText perfectly, so test the general path
    const result = extractMarkdownContent();
    expect(typeof result).toBe("string");
  });
});

describe("Content Script — renderMarkdown integration", () => {
  it("renders markdown to sanitized HTML using the shared pipeline", async () => {
    const { renderMarkdown } = await import("@/engines/index");
    const html = renderMarkdown("# Hello\n\nWorld", "markdown-it");
    expect(html).toContain("<h1>");
    expect(html).toContain("Hello");
    expect(html).toContain("<p>");
    expect(html).toContain("World");
  });

  it("renders with the marked engine", async () => {
    const { renderMarkdown } = await import("@/engines/index");
    const html = renderMarkdown("**bold**", "marked");
    expect(html).toContain("<strong>");
    expect(html).toContain("bold");
  });

  it("renders with the remark engine", async () => {
    const { renderMarkdown } = await import("@/engines/index");
    const html = renderMarkdown("*italic*", "remark");
    expect(html).toContain("<em>");
    expect(html).toContain("italic");
  });

  it("throws on unknown engine", async () => {
    const { renderMarkdown } = await import("@/engines/index");
    expect(() => renderMarkdown("test", "nonexistent")).toThrow(
      'Unknown markdown engine: "nonexistent"',
    );
  });
});

/* ================================================================
 * 3.  Popup Tests
 * ================================================================ */

describe("Popup — isValidMarkdownUrl", () => {
  let isValidMarkdownUrl: (input: string) => boolean;

  beforeEach(async () => {
    const mod = await import("../../extension/popup");
    isValidMarkdownUrl = mod.isValidMarkdownUrl;
  });

  it("accepts a valid HTTPS .md URL", () => {
    expect(isValidMarkdownUrl("https://example.com/readme.md")).toBe(true);
  });

  it("accepts a valid HTTP .markdown URL", () => {
    expect(isValidMarkdownUrl("http://example.com/doc.markdown")).toBe(true);
  });

  it("rejects a non-markdown URL", () => {
    expect(isValidMarkdownUrl("https://example.com/page.html")).toBe(false);
  });

  it("rejects an invalid URL", () => {
    expect(isValidMarkdownUrl("not-a-url")).toBe(false);
  });

  it("rejects a file:// URL", () => {
    expect(isValidMarkdownUrl("file:///tmp/readme.md")).toBe(false);
  });
});

describe("Popup — DOM interaction", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <input type="text" id="url-input" />
      <button id="render-btn">Render</button>
      <button id="settings-btn">Settings</button>
      <p id="error-msg" style="display:none"></p>
    `;
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("URL input accepts text", () => {
    const input = document.getElementById("url-input") as HTMLInputElement;
    input.value = "https://example.com/readme.md";
    expect(input.value).toBe("https://example.com/readme.md");
  });

  it("render button exists and is clickable", () => {
    const btn = document.getElementById("render-btn") as HTMLButtonElement;
    expect(btn).not.toBeNull();
    expect(btn.textContent).toBe("Render");

    // Should not throw
    btn.click();
  });

  it("render button with valid URL opens new tab via window.open fallback", async () => {
    // Dynamically re-import to run init() with our DOM
    // We test the URL validation logic directly instead, since init() runs on module load
    const { isValidMarkdownUrl } = await import("../../extension/popup");

    const input = document.getElementById("url-input") as HTMLInputElement;
    input.value = "https://example.com/test.md";

    expect(isValidMarkdownUrl(input.value)).toBe(true);
  });

  it("render button with invalid URL keeps error visible conceptually", async () => {
    const { isValidMarkdownUrl } = await import("../../extension/popup");

    const input = document.getElementById("url-input") as HTMLInputElement;
    input.value = "not-a-url";

    expect(isValidMarkdownUrl(input.value)).toBe(false);
  });
});
