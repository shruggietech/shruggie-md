import { describe, it, expect } from "vitest";
import { defaultConfig } from "@/config/defaults";
import type { Config } from "@/types/config";
import type { MarkdownEngine } from "@/types/engine";
import type { LinterAdapter, LintDiagnostic } from "@/types/linter";
import type {
  PlatformCapabilities,
  PlatformAdapter,
} from "@/platform/platform";

describe("Foundation - Config Defaults", () => {
  it("has dark color mode as default", () => {
    expect(defaultConfig.appearance.colorMode).toBe("dark");
  });

  it("has default visual style", () => {
    expect(defaultConfig.appearance.visualStyle).toBe("default");
  });

  it("has markdown-it as default engine", () => {
    expect(defaultConfig.engine.activeEngine).toBe("markdown-it");
  });

  it("has linting disabled by default", () => {
    expect(defaultConfig.editor.lintingEnabled).toBe(false);
  });

  it("has markdownlint as default linter", () => {
    expect(defaultConfig.editor.activeLinter).toBe("markdownlint");
  });

  it("has correct default file extensions", () => {
    expect(defaultConfig.fileExtensions.recognized).toEqual([
      ".md",
      ".markdown",
      ".mdown",
      ".mkdn",
      ".mkd",
    ]);
  });

  it("has library defaults configured correctly", () => {
    expect(defaultConfig.library.mountPath).toBeNull();
    expect(defaultConfig.library.recursive).toBe(true);
    expect(defaultConfig.library.showHidden).toBe(false);
    expect(defaultConfig.library.useIndependentExtensions).toBe(false);
    expect(defaultConfig.library.independentExtensions).toEqual([]);
  });

  it("has correct editor defaults", () => {
    expect(defaultConfig.editor.fontSize).toBe(13);
    expect(defaultConfig.editor.lineHeight).toBe(1.6);
    expect(defaultConfig.editor.showLineNumbers).toBe(true);
    expect(defaultConfig.editor.wordWrap).toBe(true);
  });

  it("has correct preview defaults", () => {
    expect(defaultConfig.preview.fontSize).toBe(15);
    expect(defaultConfig.preview.lineHeight).toBe(1.7);
  });
});

describe("Foundation - Type Definitions", () => {
  it("Config interface is structurally valid", () => {
    const config: Config = defaultConfig;
    expect(config).toBeDefined();
    expect(config.appearance).toBeDefined();
    expect(config.editor).toBeDefined();
    expect(config.preview).toBeDefined();
    expect(config.engine).toBeDefined();
    expect(config.fileExtensions).toBeDefined();
    expect(config.library).toBeDefined();
  });

  it("MarkdownEngine interface can be implemented", () => {
    const engine: MarkdownEngine = {
      id: "test",
      name: "Test Engine",
      compile: (source: string) => `<p>${source}</p>`,
    };
    expect(engine.compile("hello")).toBe("<p>hello</p>");
  });

  it("LinterAdapter interface can be implemented", () => {
    const linter: LinterAdapter = {
      id: "test",
      name: "Test Linter",
      lint: async (_source: string): Promise<LintDiagnostic[]> => [],
    };
    expect(linter.id).toBe("test");
  });

  it("PlatformCapabilities interface can be instantiated", () => {
    const caps: PlatformCapabilities = {
      hasFilesystem: false,
      hasFileWatcher: false,
      hasNativeDialogs: false,
      hasCliArgs: false,
    };
    expect(caps.hasFilesystem).toBe(false);
  });
});

describe("Foundation - Platform Abstraction", () => {
  it("WebAdapter implements PlatformAdapter", async () => {
    const { WebAdapter } = await import("@/platform/web");
    const adapter: PlatformAdapter = new WebAdapter();
    const caps = adapter.getPlatformCapabilities();
    expect(caps.hasFilesystem).toBe(false);
    expect(caps.hasFileWatcher).toBe(false);
    expect(caps.hasNativeDialogs).toBe(false);
    expect(caps.hasCliArgs).toBe(false);
  });

  it("WebAdapter readFile returns empty string", async () => {
    const { WebAdapter } = await import("@/platform/web");
    const adapter = new WebAdapter();
    const content = await adapter.readFile("/some/path");
    expect(content).toBe("");
  });

  it("WebAdapter openFileDialog returns null", async () => {
    const { WebAdapter } = await import("@/platform/web");
    const adapter = new WebAdapter();
    const result = await adapter.openFileDialog([".md"]);
    expect(result).toBeNull();
  });

  it("WebAdapter watchFile returns unsubscribe function", async () => {
    const { WebAdapter } = await import("@/platform/web");
    const adapter = new WebAdapter();
    const unsub = adapter.watchFile("/some/path", () => {});
    expect(typeof unsub).toBe("function");
    unsub(); // should not throw
  });
});
