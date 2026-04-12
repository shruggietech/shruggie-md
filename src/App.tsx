import { useState, useEffect, useCallback, useRef } from "react";
import {
  ThemeProvider,
  useViewMode,
  useKeyboardShortcuts,
  useConfigEffects,
  useFileSave,
  useFileWatcher,
  useHtmlExport,
  usePdfExport,
  useWorkspaces,
  useCliArgs,
  useWindowState,
} from "./hooks";
import type { ViewMode } from "./hooks";
import { Toolbar, EditorToolbarPanel } from "./components/Toolbar";
import { OpenDialog } from "./components/OpenDialog";
import type { OpenDialogResult } from "./components/OpenDialog";
import { ExportDialog } from "./components/ExportDialog";
import type { ExportFormat } from "./components/ExportDialog";
import { Preview } from "./components/Preview";
import { SplitView } from "./components/SplitView";
import { Editor } from "./components/Editor";
import { Settings } from "./components/Settings";
import { Workspaces } from "./components/Workspaces";
import { StatusBar } from "./components/StatusBar";
import { AboutModal } from "./components/AboutModal";
import { InstallPrompt, Modal } from "./components/common";
import { getPlatform } from "./platform/platform";
import type { PlatformAdapter, PlatformCapabilities } from "./platform/platform";
import { ConfigProvider, useConfig } from "./config";
import { getStorage, initLogger, migrateConfig, StorageContext, useStorage } from "./storage";
import type { StorageAdapter } from "./storage";
import { welcomeContent } from "./constants/welcomeContent";

const defaultContent = welcomeContent;

function AppShell() {
  const { config, updateConfig } = useConfig();
  const storage = useStorage();

  const [platform, setPlatform] = useState<PlatformAdapter | null>(null);
  const [capabilities, setCapabilities] = useState<PlatformCapabilities>({
    hasFilesystem: false,
    hasFileWatcher: false,
    hasNativeDialogs: false,
    hasCliArgs: false,
  });

  // Initialize platform
  useEffect(() => {
    let cancelled = false;
    getPlatform().then((adapter) => {
      if (cancelled) return;
      setPlatform(adapter);
      setCapabilities(adapter.getPlatformCapabilities());
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Compute initial view mode: persisted preference > platform-aware default
  const resolvedInitialView = config.general.lastViewMode
    ?? (capabilities.hasFilesystem ? "edit" : "view");

  const { viewMode, setViewMode } = useViewMode(resolvedInitialView);

  // Persist and restore window state (desktop only)
  useWindowState(storage, capabilities.hasFilesystem);

  const [fileName, setFileName] = useState<string | null>(null);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [content, setContent] = useState(defaultContent);
  const [syncedContent, setSyncedContent] = useState(defaultContent);
  const [isRemote, setIsRemote] = useState(false);
  const [isOpenDialogOpen, setIsOpenDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isUnsavedChangesOpen, setIsUnsavedChangesOpen] = useState(false);
  const [previewRenderNonce, setPreviewRenderNonce] = useState(0);
  const [currentDocumentId, setCurrentDocumentId] = useState<string | null>(null);
  const [cliArgsResolution, setCliArgsResolution] = useState<"pending" | "none" | "handled" | "fallback">("pending");

  // Apply live CSS custom property updates from config
  useConfigEffects(config);

  const previousView = useRef<ViewMode>(viewMode);

  useEffect(() => {
    previousView.current = viewMode;
  }, [viewMode]);

  // Persist view mode when user switches views
  // All five modes are persisted except transient views (about, help)
  const handleViewChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    if (mode === "view" || mode === "edit" || mode === "edit-only" || mode === "workspaces" || mode === "settings") {
      updateConfig("general", { lastViewMode: mode });
    }
  }, [setViewMode, updateConfig]);

  // Pop-down toolbar panel toggle
  const handleToggleToolbarPanel = useCallback(() => {
    updateConfig("general", { editorToolbarExpanded: !config.general.editorToolbarExpanded });
  }, [config.general.editorToolbarExpanded, updateConfig]);

  // Persist last-opened document path/source to config
  const persistDocumentRef = useCallback((docPath: string | null, source: "local" | "remote" | null) => {
    updateConfig("general", {
      lastDocumentPath: docPath,
      lastDocumentSource: source,
    });
  }, [updateConfig]);

  // File operations hooks
  const { saveFile, saveFileAs, isSaving } = useFileSave(platform, capabilities);
  const { startWatching, stopWatching, isRefreshing } = useFileWatcher(platform, capabilities);
  const { exportHtml } = useHtmlExport(platform, capabilities);
  const { exportPdf } = usePdfExport();

  // Workspaces
  const {
    files: workspaceFiles,
    isScanning: isWorkspacesScanning,
    scan: scanWorkspace,
    workspaces,
    activeWorkspace,
    setActiveWorkspaceId,
    createWorkspace,
    updateWorkspaceSettings,
  } = useWorkspaces(platform, capabilities, storage);
  const [workspacesFilter, setWorkspacesFilter] = useState("");

  // CLI arguments: open file or URL from command line
  const handleCliFileOpen = useCallback(
    async (cliPath: string, preReadContent: string | null) => {
      if (!platform) return false;
      try {
        // Use pre-read content from Rust backend (bypasses FS plugin scope)
        // or fall back to platform.readFile (works if scope was granted).
        const fileContent = preReadContent ?? await platform.readFile(cliPath);
        setContent(fileContent);
        setSyncedContent(fileContent);
        setIsRemote(false);
        setFilePath(cliPath);
        const name = cliPath.replace(/\\/g, "/").split("/").pop() ?? cliPath;
        setFileName(name);
        startWatching(cliPath, (newContent) => {
          setContent(newContent);
          setSyncedContent(newContent);
        });
        setViewMode("view");

        // Persist last-opened document
        persistDocumentRef(cliPath, "local");

        // Register in document model
        if (storage) {
          const defaultWs = await storage.getDefaultWorkspace();
          if (defaultWs) {
            const docId = crypto.randomUUID();
            await storage.createDocument({
              id: docId,
              title: name.replace(/\.[^.]+$/, ""),
              source_type: "local",
              source_path: cliPath,
              source_url: null,
              workspace_id: defaultWs.id,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
            setCurrentDocumentId(docId);
          }
        }
        return true;
      } catch {
        // File not readable — stay on default content
        return false;
      }
    },
    [platform, startWatching, setViewMode, storage],
  );

  const handleCliUrlFetch = useCallback(
    async (url: string) => {
      stopWatching();
      try {
        const response = await fetch(url);
        if (!response.ok) return false;
        const contentType = response.headers.get("content-type") ?? "";
        const isText =
          contentType.includes("text/") ||
          contentType.includes("application/json") ||
          contentType.includes("application/xml") ||
          contentType === "";
        if (!isText) return false;

        const fetchedContent = await response.text();
        setContent(fetchedContent);
        setSyncedContent(fetchedContent);
        setIsRemote(true);
        setFilePath(null);
        const urlParts = url.split("/");
        const urlFileName = urlParts[urlParts.length - 1] || "remote.md";
        setFileName(urlFileName);
        setViewMode("view");

        // Persist last-opened document (remote)
        persistDocumentRef(null, "remote");

        // Register in document model
        if (storage) {
          const defaultWs = await storage.getDefaultWorkspace();
          if (defaultWs) {
            const docId = crypto.randomUUID();
            await storage.createDocument({
              id: docId,
              title: urlFileName.replace(/\.[^.]+$/, ""),
              source_type: "remote",
              source_path: null,
              source_url: url,
              workspace_id: defaultWs.id,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
            setCurrentDocumentId(docId);
          }
        }
        return true;
      } catch {
        // URL not fetchable — stay on default content
        return false;
      }
    },
    [stopWatching, setViewMode, storage],
  );

  useCliArgs(
    {
      onFileOpen: handleCliFileOpen,
      onUrlFetch: handleCliUrlFetch,
      onResolved: (result) => {
        if (result.handled) {
          setCliArgsResolution("handled");
        } else if (result.source === "none") {
          setCliArgsResolution("none");
        } else {
          setCliArgsResolution("fallback");
        }
      },
    },
    capabilities.hasCliArgs && platform !== null,
  );

  // Restore last-opened document on startup
  const restorationDone = useRef(false);
  useEffect(() => {
    if (restorationDone.current) return;
    if (!platform || !capabilities.hasFilesystem) return;

    // Wait for CLI argument resolution so startup file paths can take precedence.
    if (capabilities.hasCliArgs && cliArgsResolution === "pending") return;

    // Startup argument was handled successfully; skip last-session restoration.
    if (cliArgsResolution === "handled") {
      restorationDone.current = true;
      return;
    }

    const lastPath = config.general.lastDocumentPath;
    const lastSource = config.general.lastDocumentSource;
    if (!lastPath || lastSource !== "local") return;
    restorationDone.current = true;

    (async () => {
      try {
        const fileContent = await platform.readFile(lastPath);
        setContent(fileContent);
        setSyncedContent(fileContent);
        setIsRemote(false);
        setFilePath(lastPath);
        const name = lastPath.replace(/\\/g, "/").split("/").pop() ?? lastPath;
        setFileName(name);
        startWatching(lastPath, (newContent) => {
          setContent(newContent);
          setSyncedContent(newContent);
        });
      } catch {
        // File no longer accessible — clear persisted path
        persistDocumentRef(null, null);
      }
    })();
  }, [platform, capabilities.hasFilesystem, capabilities.hasCliArgs, cliArgsResolution, config.general.lastDocumentPath, config.general.lastDocumentSource, startWatching, persistDocumentRef]);

  // Open dialog result handler
  const handleOpenDialogResult = useCallback(async (result: OpenDialogResult) => {
    // Register document in storage
    if (storage) {
      const docId = crypto.randomUUID();
      await storage.createDocument({
        id: docId,
        title: result.fileName.replace(/\.[^.]+$/, ""),
        source_type: result.sourceType,
        source_path: result.filePath,
        source_url: result.sourceUrl,
        workspace_id: result.workspaceId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      setCurrentDocumentId(docId);
    }

    setContent(result.content);
    setSyncedContent(result.content);
    setFileName(result.fileName);
    setFilePath(result.filePath);
    setIsRemote(result.sourceType === "remote");

    // Start watching for local files
    if (result.filePath) {
      startWatching(result.filePath, (newContent) => {
        setContent(newContent);
        setSyncedContent(newContent);
      });
    } else {
      stopWatching();
    }

    if (result.workspaceId) {
      setActiveWorkspaceId(result.workspaceId);
    }

    // Persist last-opened document
    persistDocumentRef(result.filePath, result.sourceType === "remote" ? "remote" : "local");

    setViewMode("view");
  }, [storage, startWatching, stopWatching, setViewMode, setActiveWorkspaceId, persistDocumentRef]);

  const handlePickWorkspaceDirectory = useCallback(async () => {
    if (!platform || !capabilities.hasFilesystem) return null;
    return platform.openDirectoryDialog();
  }, [platform, capabilities.hasFilesystem]);

  // Save handler
  const handleSave = useCallback(async () => {
    if (isRemote || !filePath) return;
    await saveFile(content, filePath);
    setSyncedContent(content);
    if (storage && currentDocumentId) {
      await storage.updateDocument(currentDocumentId, {
        updated_at: new Date().toISOString(),
      });
      await storage.appendEditHistory({
        document_id: currentDocumentId,
        content_snapshot: content,
        created_at: new Date().toISOString(),
      });
    }
  }, [content, filePath, isRemote, saveFile, storage, currentDocumentId]);

  // Save As handler
  const handleSaveAs = useCallback(async () => {
    if (isRemote) return;
    const chosenPath = await saveFileAs(content, fileName ?? "untitled.md");
    if (chosenPath) {
      setFilePath(chosenPath);
      const name = chosenPath.replace(/\\/g, "/").split("/").pop() ?? chosenPath;
      setFileName(name);
      startWatching(chosenPath, (newContent) => {
        setContent(newContent);
        setSyncedContent(newContent);
      });
      persistDocumentRef(chosenPath, "local");
      setSyncedContent(content);
      return;
    }

    if (!capabilities.hasFilesystem) {
      setSyncedContent(content);
    }
  }, [content, fileName, isRemote, saveFileAs, startWatching, persistDocumentRef, capabilities.hasFilesystem]);

  // HTML export handler (for direct keyboard shortcut)
  const handleExportHtml = useCallback(() => {
    exportHtml(content, config.engine.activeEngine);
  }, [content, config.engine.activeEngine, exportHtml]);

  // PDF export handler (for direct keyboard shortcut)
  const handleExportPdf = useCallback(() => {
    exportPdf(content, config.engine.activeEngine, fileName);
  }, [content, config.engine.activeEngine, exportPdf, fileName]);

  // Export format dispatcher (from ExportDialog)
  const handleExportFormat = useCallback((format: ExportFormat) => {
    switch (format) {
      case "html":
        exportHtml(content, config.engine.activeEngine);
        break;
      case "pdf":
        exportPdf(content, config.engine.activeEngine, fileName);
        break;
      case "markdown":
        saveFileAs(content, fileName ?? "untitled.md");
        break;
    }
  }, [content, config.engine.activeEngine, exportHtml, exportPdf, saveFileAs, fileName]);

  // New document handler
  const handleNewDocument = useCallback(() => {
    stopWatching();
    setContent("");
    setSyncedContent("");
    setFileName(null);
    setFilePath(null);
    setIsRemote(false);
    setCurrentDocumentId(null);
    persistDocumentRef(null, null);
    setViewMode("edit");
  }, [stopWatching, setViewMode, persistDocumentRef]);

  // Workspace file select handler
  const handleWorkspaceFileSelect = useCallback(
    async (selectedPath: string) => {
      if (!platform) return;

      try {
        const fileContent = await platform.readFile(selectedPath);
        setContent(fileContent);
        setSyncedContent(fileContent);
        setIsRemote(false);
        setFilePath(selectedPath);

        const name = selectedPath.replace(/\\/g, "/").split("/").pop() ?? selectedPath;
        setFileName(name);

        startWatching(selectedPath, (newContent) => {
          setContent(newContent);
          setSyncedContent(newContent);
        });

        // Persist last-opened document
        persistDocumentRef(selectedPath, "local");

        setViewMode("view");
      } catch {
        // File may have been deleted since scan
      }
    },
    [platform, setViewMode, startWatching, persistDocumentRef],
  );

  const performRefreshPreview = useCallback(async () => {
    let refreshedContent = syncedContent;

    if (!isRemote && filePath && platform && capabilities.hasFilesystem) {
      try {
        refreshedContent = await platform.readFile(filePath);
      } catch {
        refreshedContent = syncedContent;
      }
    }

    setContent(refreshedContent);
    setSyncedContent(refreshedContent);
    setPreviewRenderNonce((prev) => prev + 1);
  }, [syncedContent, isRemote, filePath, platform, capabilities.hasFilesystem]);

  const hasUnsavedChanges = content !== syncedContent;

  const handleRefreshPreview = useCallback(() => {
    if (hasUnsavedChanges) {
      setIsUnsavedChangesOpen(true);
      return;
    }
    void performRefreshPreview();
  }, [hasUnsavedChanges, performRefreshPreview]);

  const handleConfirmRefresh = useCallback(() => {
    setIsUnsavedChangesOpen(false);
    void performRefreshPreview();
  }, [performRefreshPreview]);

  // Can save: existing local file (not remote, must have a file path)
  const canSave = !isRemote && filePath !== null;
  // Can Save As: any local content (not remote)
  const canSaveAs = !isRemote;

  useKeyboardShortcuts({
    onViewChange: handleViewChange,
    onOpenFile: () => setIsOpenDialogOpen(true),
    onSave: canSave ? handleSave : undefined,
    onSaveAs: canSaveAs ? handleSaveAs : undefined,
    onExportHtml: handleExportHtml,
    onExportPdf: handleExportPdf,
    onExportDialog: () => setIsExportDialogOpen(true),
    hasFilesystem: capabilities.hasFilesystem,
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
        backgroundColor: "var(--color-bg-primary)",
        color: "var(--color-text-primary)",
        fontFamily: "var(--font-ui)",
      }}
    >
      <Toolbar
        activeView={viewMode}
        onViewChange={handleViewChange}
        fileName={fileName}
        filePath={filePath}
        hasFilesystem={capabilities.hasFilesystem}
        showButtonLabels={config.appearance.showButtonLabels}
        toolbarPanelExpanded={config.general.editorToolbarExpanded}
        onToggleToolbarPanel={handleToggleToolbarPanel}
        onOpen={() => setIsOpenDialogOpen(true)}
        onNewDocument={handleNewDocument}
        onSave={handleSave}
        onSaveAs={canSaveAs ? handleSaveAs : undefined}
        onRefreshPreview={handleRefreshPreview}
        hasFilePath={filePath !== null}
        canSave={canSave || canSaveAs}
        isSaving={isSaving}
        onExport={() => setIsExportDialogOpen(true)}
        isRefreshing={isRefreshing}
        onRefreshWorkspaces={scanWorkspace}
        workspacesFilter={workspacesFilter}
        onWorkspacesFilterChange={setWorkspacesFilter}
        isWorkspacesScanning={isWorkspacesScanning}
        onAbout={() => setIsAboutOpen(true)}
        onHelp={() => handleViewChange("help")}
      />

      {/* Pop-down quick settings panel */}
      {config.general.editorToolbarExpanded && viewMode !== "workspaces" && viewMode !== "settings" && viewMode !== "help" && (
        <EditorToolbarPanel
          viewMode={viewMode}
          config={config}
          updateConfig={updateConfig}
        />
      )}

      <main
        style={{
          flex: 1,
          display: "flex",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          key={viewMode}
          style={{
            flex: 1,
            display: "flex",
            animation: "fadeIn 200ms ease-in-out",
            backgroundColor: isRefreshing
              ? "var(--color-accent-subtle)"
              : undefined,
            transition: "background-color 200ms ease-out",
          }}
        >
          {viewMode === "view" && (
            <Preview
              key={`preview-${previewRenderNonce}`}
              source={content}
              engineId={config.engine.activeEngine}
            />
          )}
          {viewMode === "edit" && (
            <SplitView
              key={`split-view-${previewRenderNonce}`}
              source={content}
              onSourceChange={setContent}
              engineId={config.engine.activeEngine}
              lintingEnabled={config.editor.lintingEnabled}
              activeLinter={config.editor.activeLinter}
              showLineNumbers={config.editor.showLineNumbers}
              wordWrap={config.editor.wordWrap}
            />
          )}
          {viewMode === "edit-only" && (
            <Editor
              value={content}
              onChange={setContent}
              showLineNumbers={config.editor.showLineNumbers}
              wordWrap={config.editor.wordWrap}
            />
          )}
          {viewMode === "workspaces" && (
            <Workspaces
              files={workspaceFiles}
              workspaces={workspaces}
              activeWorkspaceId={activeWorkspace?.id ?? null}
              hasFilesystem={capabilities.hasFilesystem}
              onFileSelect={handleWorkspaceFileSelect}
              onActiveWorkspaceChange={setActiveWorkspaceId}
              onCreateWorkspace={createWorkspace}
              onPickExternalDirectory={handlePickWorkspaceDirectory}
              onNewDocument={handleNewDocument}
              onUpdateWorkspaceSettings={updateWorkspaceSettings}
              filter={workspacesFilter}
            />
          )}
          {viewMode === "settings" && (
            <Settings
              capabilities={capabilities}
            />
          )}
          {viewMode === "help" && (
            <Preview
              source={welcomeContent}
              engineId={config.engine.activeEngine}
            />
          )}
        </div>
      </main>

      <StatusBar activeEngine={config.engine.activeEngine} />

      <InstallPrompt />

      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
      />

      <Modal
        isOpen={isUnsavedChangesOpen}
        onClose={() => setIsUnsavedChangesOpen(false)}
        title="Unsaved Changes"
      >
        <div
          data-testid="unsaved-changes-modal-content"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-4)",
          }}
        >
          <p
            style={{
              margin: 0,
              color: "var(--color-text-secondary)",
              fontSize: "var(--font-size-sm)",
              fontFamily: "var(--font-ui)",
            }}
          >
            Refreshing will discard your unsaved edits and reload the current document.
          </p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-2)" }}>
            <button
              type="button"
              aria-label="Cancel"
              onClick={() => setIsUnsavedChangesOpen(false)}
              className="shruggie-btn"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: 32,
                minHeight: 32,
                padding: "var(--space-1) var(--space-2)",
                borderRadius: "var(--radius-sm)",
                border: "none",
                backgroundColor: "transparent",
                color: "var(--color-text-secondary)",
                cursor: "pointer",
                fontSize: "var(--font-size-sm)",
                fontFamily: "var(--font-ui)",
                transition: "background-color 120ms ease-out, color 120ms ease-out",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--color-bg-hover)";
                e.currentTarget.style.color = "var(--color-text-primary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = "var(--color-text-secondary)";
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmRefresh}
              className="shruggie-btn"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: 32,
                minHeight: 32,
                padding: "var(--space-1) var(--space-2)",
                borderRadius: "var(--radius-sm)",
                border: "none",
                backgroundColor: "var(--color-error)",
                color: "#ffffff",
                cursor: "pointer",
                fontSize: "var(--font-size-sm)",
                fontFamily: "var(--font-ui)",
                transition: "background-color 120ms ease-out",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.filter = "brightness(0.92)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.filter = "none";
              }}
            >
              Refresh
            </button>
          </div>
        </div>
      </Modal>

      <OpenDialog
        isOpen={isOpenDialogOpen}
        onClose={() => setIsOpenDialogOpen(false)}
        onOpen={handleOpenDialogResult}
        platform={platform}
        capabilities={capabilities}
        storage={storage}
        recognizedExtensions={config.fileExtensions.recognized}
      />

      <ExportDialog
        isOpen={isExportDialogOpen}
        onClose={() => setIsExportDialogOpen(false)}
        onExport={handleExportFormat}
      />
    </div>
  );
}

function AppShellWithConfig() {
  const [platform, setPlatform] = useState<PlatformAdapter | null>(null);
  const [storage, setStorage] = useState<StorageAdapter | null>(null);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      // 1. Initialize platform adapter
      const adapter = await getPlatform();
      if (cancelled) return;
      setPlatform(adapter);

      // 2. Initialize storage adapter
      try {
        const store = await getStorage();
        await store.initialize();
        if (cancelled) return;

        // 3. Run config migration (legacy JSON → storage)
        await migrateConfig(store, adapter);

        // 4. Initialize logger
        const { unflattenConfig } = await import("./storage/config-utils");
        const flat = await store.getAllConfig();
        const loaded = unflattenConfig(flat);
        const verbosity =
          (loaded?.advanced as Record<string, unknown>)?.logVerbosity as
            | "debug"
            | "info"
            | "warning"
            | "error"
            | undefined;
        initLogger(store, verbosity ?? "warning");

        if (cancelled) return;
        setStorage(store);
      } catch {
        // Storage initialization failed — fall back to platform-only config
        if (cancelled) return;
      }
    };

    init();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <StorageContext value={storage}>
      <ConfigProvider platform={platform} storage={storage}>
        <AppShell />
      </ConfigProvider>
    </StorageContext>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <AppShellWithConfig />
    </ThemeProvider>
  );
}
