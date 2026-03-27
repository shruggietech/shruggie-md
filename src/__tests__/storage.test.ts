import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import "fake-indexeddb/auto";
import { IndexedDbStorageAdapter } from "../storage/indexeddb";
import { flattenConfig, unflattenConfig } from "../storage/config-utils";
import { Logger } from "../storage/logger";
import type { StorageAdapter, DocumentRecord, WorkspaceRecord } from "../storage/types";

// ── Config Utils ──────────────────────────────────────────────────────

describe("flattenConfig", () => {
  it("flattens a nested object to dotted paths with JSON values", () => {
    const config = {
      editor: { fontSize: 13, wordWrap: true },
      appearance: { colorMode: "dark" },
    };
    const flat = flattenConfig(config);
    expect(flat["editor.fontSize"]).toBe("13");
    expect(flat["editor.wordWrap"]).toBe("true");
    expect(flat["appearance.colorMode"]).toBe('"dark"');
  });

  it("handles null values", () => {
    const config = { general: { lastViewMode: null } };
    const flat = flattenConfig(config);
    expect(flat["general.lastViewMode"]).toBe("null");
  });

  it("handles arrays as leaf values", () => {
    const config = { fileExtensions: { recognized: [".md", ".markdown"] } };
    const flat = flattenConfig(config);
    expect(flat["fileExtensions.recognized"]).toBe('[".md",".markdown"]');
  });
});

describe("unflattenConfig", () => {
  it("reconstructs a nested object from dotted paths", () => {
    const flat = {
      "editor.fontSize": "13",
      "editor.wordWrap": "true",
      "appearance.colorMode": '"dark"',
    };
    const config = unflattenConfig(flat);
    expect(config).toEqual({
      editor: { fontSize: 13, wordWrap: true },
      appearance: { colorMode: "dark" },
    });
  });

  it("round-trips through flatten/unflatten", () => {
    const original = {
      editor: { fontSize: 13, wordWrap: true, fontFamily: "monospace" },
      appearance: { colorMode: "dark", showButtonLabels: true },
      general: { lastViewMode: null, editorToolbarExpanded: false },
      fileExtensions: { recognized: [".md", ".markdown"] },
    };
    const result = unflattenConfig(flattenConfig(original));
    expect(result).toEqual(original);
  });
});

// ── IndexedDB Storage Adapter ─────────────────────────────────────────

describe("IndexedDbStorageAdapter", () => {
  let storage: StorageAdapter;

  beforeEach(async () => {
    storage = new IndexedDbStorageAdapter();
    await storage.initialize();
  });

  afterEach(async () => {
    await storage.close();
    // Clean up the database
    indexedDB.deleteDatabase("shruggie-md");
  });

  // ── Config ────────────────────────────────────────────────────────

  describe("config operations", () => {
    it("returns null for missing config key", async () => {
      const value = await storage.getConfigValue("nonexistent");
      expect(value).toBeNull();
    });

    it("sets and gets a config value", async () => {
      await storage.setConfigValue("editor.fontSize", "14");
      const value = await storage.getConfigValue("editor.fontSize");
      expect(value).toBe("14");
    });

    it("overwrites an existing config value", async () => {
      await storage.setConfigValue("editor.fontSize", "14");
      await storage.setConfigValue("editor.fontSize", "16");
      const value = await storage.getConfigValue("editor.fontSize");
      expect(value).toBe("16");
    });

    it("getAllConfig returns all entries", async () => {
      await storage.setConfigValue("a.b", "1");
      await storage.setConfigValue("c.d", '"hello"');
      const all = await storage.getAllConfig();
      expect(all).toEqual({ "a.b": "1", "c.d": '"hello"' });
    });

    it("setConfigBulk writes multiple entries", async () => {
      await storage.setConfigBulk([
        { key: "x.y", value: "true" },
        { key: "x.z", value: '"abc"' },
      ]);
      expect(await storage.getConfigValue("x.y")).toBe("true");
      expect(await storage.getConfigValue("x.z")).toBe('"abc"');
    });

    it("deleteConfigValue removes a key", async () => {
      await storage.setConfigValue("temp.key", "val");
      await storage.deleteConfigValue("temp.key");
      expect(await storage.getConfigValue("temp.key")).toBeNull();
    });
  });

  // ── Documents ─────────────────────────────────────────────────────

  describe("document operations", () => {
    const doc: DocumentRecord = {
      id: "doc-1",
      title: "Test Document",
      source_type: "local",
      source_path: "/path/to/test.md",
      source_url: null,
      workspace_id: "ws-1",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    };

    it("creates and retrieves a document", async () => {
      await storage.createDocument(doc);
      const retrieved = await storage.getDocument("doc-1");
      expect(retrieved).toEqual(doc);
    });

    it("returns null for missing document", async () => {
      expect(await storage.getDocument("nonexistent")).toBeNull();
    });

    it("updates a document", async () => {
      await storage.createDocument(doc);
      await storage.updateDocument("doc-1", { title: "Updated Title" });
      const updated = await storage.getDocument("doc-1");
      expect(updated?.title).toBe("Updated Title");
    });

    it("deletes a document and its related records", async () => {
      await storage.createDocument(doc);
      await storage.appendEditHistory({
        document_id: "doc-1",
        content_snapshot: "# Test",
        created_at: "2026-01-01T00:00:00.000Z",
      });
      await storage.deleteDocument("doc-1");
      expect(await storage.getDocument("doc-1")).toBeNull();
      expect(await storage.getEditHistory("doc-1")).toEqual([]);
    });

    it("lists documents by workspace", async () => {
      await storage.createDocument(doc);
      await storage.createDocument({
        ...doc,
        id: "doc-2",
        title: "Other",
        workspace_id: "ws-2",
      });
      const ws1Docs = await storage.listDocuments("ws-1");
      expect(ws1Docs).toHaveLength(1);
      expect(ws1Docs[0].id).toBe("doc-1");
    });

    it("lists all documents without filter", async () => {
      await storage.createDocument(doc);
      await storage.createDocument({ ...doc, id: "doc-2", workspace_id: "ws-2" });
      const allDocs = await storage.listDocuments();
      expect(allDocs).toHaveLength(2);
    });
  });

  // ── Workspaces ────────────────────────────────────────────────────

  describe("workspace operations", () => {
    const ws: WorkspaceRecord = {
      id: "ws-1",
      name: "Default",
      type: "internal",
      path: "/data/workspaces/Default",
      is_default: true,
      created_at: "2026-01-01T00:00:00.000Z",
      settings: "{}",
    };

    it("creates and retrieves a workspace", async () => {
      await storage.createWorkspace(ws);
      const retrieved = await storage.getWorkspace("ws-1");
      expect(retrieved).toEqual(ws);
    });

    it("returns null for missing workspace", async () => {
      expect(await storage.getWorkspace("nonexistent")).toBeNull();
    });

    it("updates a workspace", async () => {
      await storage.createWorkspace(ws);
      await storage.updateWorkspace("ws-1", { name: "My Workspace" });
      const updated = await storage.getWorkspace("ws-1");
      expect(updated?.name).toBe("My Workspace");
    });

    it("deletes a workspace", async () => {
      await storage.createWorkspace(ws);
      await storage.deleteWorkspace("ws-1");
      expect(await storage.getWorkspace("ws-1")).toBeNull();
    });

    it("lists workspaces with default first", async () => {
      await storage.createWorkspace(ws);
      await storage.createWorkspace({
        id: "ws-2",
        name: "Zebra",
        type: "external",
        path: "/external",
        is_default: false,
        created_at: "2026-01-01T00:00:00.000Z",
        settings: "{}",
      });
      const list = await storage.listWorkspaces();
      expect(list[0].is_default).toBe(true);
      expect(list[1].name).toBe("Zebra");
    });

    it("getDefaultWorkspace returns the default", async () => {
      await storage.createWorkspace(ws);
      const def = await storage.getDefaultWorkspace();
      expect(def?.id).toBe("ws-1");
    });

    it("getDefaultWorkspace returns null when none exists", async () => {
      expect(await storage.getDefaultWorkspace()).toBeNull();
    });
  });

  // ── Edit History ──────────────────────────────────────────────────

  describe("edit history operations", () => {
    it("appends and retrieves edit history", async () => {
      await storage.appendEditHistory({
        document_id: "doc-1",
        content_snapshot: "# Version 1",
        created_at: "2026-01-01T00:00:00.000Z",
      });
      await storage.appendEditHistory({
        document_id: "doc-1",
        content_snapshot: "# Version 2",
        created_at: "2026-01-01T01:00:00.000Z",
      });
      const history = await storage.getEditHistory("doc-1");
      expect(history).toHaveLength(2);
      // Most recent first
      expect(history[0].content_snapshot).toBe("# Version 2");
    });

    it("respects limit parameter", async () => {
      for (let i = 0; i < 5; i++) {
        await storage.appendEditHistory({
          document_id: "doc-1",
          content_snapshot: `# Version ${i}`,
          created_at: `2026-01-01T0${i}:00:00.000Z`,
        });
      }
      const limited = await storage.getEditHistory("doc-1", 2);
      expect(limited).toHaveLength(2);
    });

    it("prunes old entries beyond maxSnapshots", async () => {
      for (let i = 0; i < 5; i++) {
        await storage.appendEditHistory({
          document_id: "doc-1",
          content_snapshot: `# Version ${i}`,
          created_at: `2026-01-01T0${i}:00:00.000Z`,
        });
      }
      await storage.pruneEditHistory("doc-1", 2);
      const remaining = await storage.getEditHistory("doc-1");
      expect(remaining).toHaveLength(2);
      expect(remaining[0].content_snapshot).toBe("# Version 4");
      expect(remaining[1].content_snapshot).toBe("# Version 3");
    });
  });

  // ── Logs ──────────────────────────────────────────────────────────

  describe("log operations", () => {
    it("appends and queries logs", async () => {
      await storage.appendLog({
        level: "info",
        source: "test",
        message: "Test message",
        metadata: null,
        created_at: "2026-01-01T00:00:00.000Z",
      });
      const logs = await storage.queryLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toBe("Test message");
    });

    it("filters by level", async () => {
      await storage.appendLog({
        level: "info",
        source: "a",
        message: "info msg",
        metadata: null,
        created_at: "2026-01-01T00:00:00.000Z",
      });
      await storage.appendLog({
        level: "error",
        source: "b",
        message: "error msg",
        metadata: null,
        created_at: "2026-01-01T01:00:00.000Z",
      });
      const errors = await storage.queryLogs({ level: "error" });
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toBe("error msg");
    });

    it("filters by source", async () => {
      await storage.appendLog({
        level: "info",
        source: "migration",
        message: "migrated",
        metadata: null,
        created_at: "2026-01-01T00:00:00.000Z",
      });
      await storage.appendLog({
        level: "info",
        source: "editor",
        message: "opened",
        metadata: null,
        created_at: "2026-01-01T01:00:00.000Z",
      });
      const migration = await storage.queryLogs({ source: "migration" });
      expect(migration).toHaveLength(1);
    });

    it("respects limit filter", async () => {
      for (let i = 0; i < 10; i++) {
        await storage.appendLog({
          level: "debug",
          source: "test",
          message: `msg ${i}`,
          metadata: null,
          created_at: `2026-01-01T0${i}:00:00.000Z`,
        });
      }
      const limited = await storage.queryLogs({ limit: 3 });
      expect(limited).toHaveLength(3);
    });
  });
});

// ── Logger ────────────────────────────────────────────────────────────

describe("Logger", () => {
  it("writes to storage when at or above verbosity threshold", async () => {
    const mockStorage = {
      appendLog: vi.fn().mockResolvedValue(undefined),
    } as unknown as StorageAdapter;

    const logger = new Logger(mockStorage, "warning");
    await logger.error("test", "an error");
    expect(mockStorage.appendLog).toHaveBeenCalledTimes(1);
  });

  it("skips storage when below verbosity threshold", async () => {
    const mockStorage = {
      appendLog: vi.fn().mockResolvedValue(undefined),
    } as unknown as StorageAdapter;

    const logger = new Logger(mockStorage, "error");
    await logger.info("test", "info message");
    expect(mockStorage.appendLog).not.toHaveBeenCalled();
  });

  it("updates verbosity dynamically", async () => {
    const mockStorage = {
      appendLog: vi.fn().mockResolvedValue(undefined),
    } as unknown as StorageAdapter;

    const logger = new Logger(mockStorage, "error");
    await logger.warning("test", "should skip");
    expect(mockStorage.appendLog).not.toHaveBeenCalled();

    logger.setVerbosity("debug");
    await logger.warning("test", "should persist");
    expect(mockStorage.appendLog).toHaveBeenCalledTimes(1);
  });

  it("does not throw when storage is null", async () => {
    const logger = new Logger(null);
    await expect(logger.error("test", "no storage")).resolves.toBeUndefined();
  });
});

// ── Config Migration (integration via IndexedDB) ──────────────────────

describe("config migration", () => {
  it("migrates legacy config to storage via flatten/unflatten", async () => {
    const storage = new IndexedDbStorageAdapter();
    await storage.initialize();

    // Simulate migration: flatten legacy config and write to storage
    const legacyConfig = {
      editor: { fontSize: 15, wordWrap: false },
      appearance: { colorMode: "light" },
    };
    const flat = flattenConfig(legacyConfig);
    await storage.setConfigBulk(
      Object.entries(flat).map(([key, value]) => ({ key, value })),
    );

    // Read back and unflatten
    const stored = await storage.getAllConfig();
    const restored = unflattenConfig(stored);
    expect(restored).toEqual(legacyConfig);

    await storage.close();
    indexedDB.deleteDatabase("shruggie-md");
  });
});
