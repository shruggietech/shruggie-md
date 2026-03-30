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
import { InstallPrompt } from "./components/common";
import { getPlatform } from "./platform/platform";
import type { PlatformAdapter, PlatformCapabilities } from "./platform/platform";
import { ConfigProvider, useConfig } from "./config";
import { getStorage, initLogger, migrateConfig, StorageContext, useStorage } from "./storage";
import type { StorageAdapter } from "./storage";

const defaultContent = `# Welcome to Shruggie MD

Start by opening a file (**Ctrl+O** / **Cmd+O**) or just enjoy this preview.

## Features

- **View** — rendered markdown preview
- **Edit** — editor + preview side by side
- **Edit Only** — full-screen editor
- **Workspaces** — browse your markdown files
- **Settings** — configure everything

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl/Cmd + 1 | View |
| Ctrl/Cmd + 2 | Edit |
| Ctrl/Cmd + 3 | Workspaces |
| Ctrl/Cmd + 4 | Edit Only |
| Ctrl/Cmd + , | Settings |
| Ctrl/Cmd + O | Open file |
| Ctrl/Cmd + S | Save |
| Ctrl/Cmd + Shift + E | Export |
| Ctrl/Cmd + Shift + H | Export HTML |
| Ctrl/Cmd + Shift + P | Export PDF |

---

> ¯\\\\_(ツ)_/¯
`;

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
  const [isRemote, setIsRemote] = useState(false);
  const [isOpenDialogOpen, setIsOpenDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [currentDocumentId, setCurrentDocumentId] = useState<string | null>(null);

  // Apply live CSS custom property updates from config
  useConfigEffects(config);

  const previousView = useRef<ViewMode>(viewMode);

  useEffect(() => {
    previousView.current = viewMode;
  }, [viewMode]);

  // Persist view mode when user switches to view, edit, or edit-only
  const handleViewChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    if (mode === "view" || mode === "edit" || mode === "edit-only") {
      updateConfig("general", { lastViewMode: mode });
    }
  }, [setViewMode, updateConfig]);

  // Pop-down toolbar panel toggle
  const handleToggleToolbarPanel = useCallback(() => {
    updateConfig("general", { editorToolbarExpanded: !config.general.editorToolbarExpanded });
  }, [config.general.editorToolbarExpanded, updateConfig]);

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
  } = useWorkspaces(platform, capabilities, storage);
  const [workspacesFilter, setWorkspacesFilter] = useState("");

  // CLI arguments: open file or URL from command line
  const handleCliFileOpen = useCallback(
    async (cliPath: string) => {
      if (!platform) return;
      try {
        const fileContent = await platform.readFile(cliPath);
        setContent(fileContent);
        setIsRemote(false);
        setFilePath(cliPath);
        const name = cliPath.replace(/\\/g, "/").split("/").pop() ?? cliPath;
        setFileName(name);
        startWatching(cliPath, (newContent) => {
          setContent(newContent);
        });
        setViewMode("view");

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
      } catch {
        // File not readable — stay on default content
      }
    },
    [platform, startWatching, setViewMode, storage],
  );

  const handleCliUrlFetch = useCallback(
    async (url: string) => {
      stopWatching();
      try {
        const response = await fetch(url);
        if (!response.ok) return;
        const contentType = response.headers.get("content-type") ?? "";
        const isText =
          contentType.includes("text/") ||
          contentType.includes("application/json") ||
          contentType.includes("application/xml") ||
          contentType === "";
        if (!isText) return;

        const fetchedContent = await response.text();
        setContent(fetchedContent);
        setIsRemote(true);
        setFilePath(null);
        const urlParts = url.split("/");
        const urlFileName = urlParts[urlParts.length - 1] || "remote.md";
        setFileName(urlFileName);
        setViewMode("view");

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
      } catch {
        // URL not fetchable — stay on default content
      }
    },
    [stopWatching, setViewMode, storage],
  );

  useCliArgs(
    { onFileOpen: handleCliFileOpen, onUrlFetch: handleCliUrlFetch },
    capabilities.hasCliArgs && platform !== null,
  );

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
    setFileName(result.fileName);
    setFilePath(result.filePath);
    setIsRemote(result.sourceType === "remote");

    // Start watching for local files
    if (result.filePath) {
      startWatching(result.filePath, (newContent) => {
        setContent(newContent);
      });
    } else {
      stopWatching();
    }

    if (result.workspaceId) {
      setActiveWorkspaceId(result.workspaceId);
    }

    setViewMode("view");
  }, [storage, startWatching, stopWatching, setViewMode, setActiveWorkspaceId]);

  const handlePickWorkspaceDirectory = useCallback(async () => {
    if (!platform || !capabilities.hasFilesystem) return null;
    return platform.openDirectoryDialog();
  }, [platform, capabilities.hasFilesystem]);

  // Save handler
  const handleSave = useCallback(async () => {
    if (isRemote || !filePath) return;
    saveFile(content, filePath);
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
      });
    }
  }, [content, fileName, isRemote, saveFileAs, startWatching]);

  // HTML export handler (for direct keyboard shortcut)
  const handleExportHtml = useCallback(() => {
    exportHtml(content, config.engine.activeEngine);
  }, [content, config.engine.activeEngine, exportHtml]);

  // PDF export handler (for direct keyboard shortcut)
  const handleExportPdf = useCallback(() => {
    exportPdf(content, config.engine.activeEngine);
  }, [content, config.engine.activeEngine, exportPdf]);

  // Export format dispatcher (from ExportDialog)
  const handleExportFormat = useCallback((format: ExportFormat) => {
    switch (format) {
      case "html":
        exportHtml(content, config.engine.activeEngine);
        break;
      case "pdf":
        exportPdf(content, config.engine.activeEngine);
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
    setFileName(null);
    setFilePath(null);
    setIsRemote(false);
    setCurrentDocumentId(null);
    setViewMode("edit");
  }, [stopWatching, setViewMode]);

  // Workspace file select handler
  const handleWorkspaceFileSelect = useCallback(
    async (selectedPath: string) => {
      if (!platform) return;

      try {
        const fileContent = await platform.readFile(selectedPath);
        setContent(fileContent);
        setIsRemote(false);
        setFilePath(selectedPath);

        const name = selectedPath.replace(/\\/g, "/").split("/").pop() ?? selectedPath;
        setFileName(name);

        startWatching(selectedPath, (newContent) => {
          setContent(newContent);
        });

        setViewMode("view");
      } catch {
        // File may have been deleted since scan
      }
    },
    [platform, setViewMode, startWatching],
  );

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
        hasFilePath={filePath !== null}
        canSave={canSave || canSaveAs}
        isSaving={isSaving}
        onExport={() => setIsExportDialogOpen(true)}
        isRefreshing={isRefreshing}
        onRefreshWorkspaces={scanWorkspace}
        workspacesFilter={workspacesFilter}
        onWorkspacesFilterChange={setWorkspacesFilter}
        isWorkspacesScanning={isWorkspacesScanning}
      />

      {/* Pop-down quick settings panel */}
      {config.general.editorToolbarExpanded && viewMode !== "workspaces" && viewMode !== "settings" && (
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
              source={content}
              engineId={config.engine.activeEngine}
            />
          )}
          {viewMode === "edit" && (
            <SplitView
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
              filter={workspacesFilter}
            />
          )}
          {viewMode === "settings" && (
            <Settings
              capabilities={capabilities}
            />
          )}
        </div>
      </main>

      <StatusBar activeEngine={config.engine.activeEngine} />

      <InstallPrompt />

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
