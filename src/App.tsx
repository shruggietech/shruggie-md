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
  useRemoteFetch,
  useLibrary,
  useCliArgs,
} from "./hooks";
import type { ViewMode } from "./hooks";
import { Toolbar } from "./components/Toolbar";
import { Preview } from "./components/Preview";
import { SplitView } from "./components/SplitView";
import { Settings } from "./components/Settings";
import { Library } from "./components/Library";
import { InstallPrompt } from "./components/common";
import { getPlatform } from "./platform/platform";
import type { PlatformAdapter, PlatformCapabilities } from "./platform/platform";
import { ConfigProvider, useConfig } from "./config";

const defaultContent = `# Welcome to Shruggie MD

Start by opening a file (**Ctrl+O** / **Cmd+O**) or just enjoy this preview.

## Features

- **Full view** — rendered markdown preview
- **Split view** — editor + preview side by side
- **Library** — browse your markdown files
- **Settings** — configure everything

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl/Cmd + 1 | Full view |
| Ctrl/Cmd + 2 | Split view |
| Ctrl/Cmd + 3 | Library |
| Ctrl/Cmd + , | Settings |
| Ctrl/Cmd + O | Open file |
| Ctrl/Cmd + S | Save |
| Ctrl/Cmd + Shift + H | Export HTML |
| Ctrl/Cmd + Shift + P | Export PDF |

---

> ¯\\\\_(ツ)_/¯
`;

function AppShell() {
  const { viewMode, setViewMode } = useViewMode("full-view");
  const [fileName, setFileName] = useState<string | null>(null);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [content, setContent] = useState(defaultContent);
  const [isRemote, setIsRemote] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [platform, setPlatform] = useState<PlatformAdapter | null>(null);
  const [capabilities, setCapabilities] = useState<PlatformCapabilities>({
    hasFilesystem: false,
    hasFileWatcher: false,
    hasNativeDialogs: false,
    hasCliArgs: false,
  });

  const { config } = useConfig();

  // Apply live CSS custom property updates from config
  useConfigEffects(config);

  const previousView = useRef<ViewMode>(viewMode);

  useEffect(() => {
    previousView.current = viewMode;
  }, [viewMode]);

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

  // File operations hooks
  const { saveFile, isSaving, lastSaved } = useFileSave(platform, capabilities);
  const { startWatching, stopWatching, isRefreshing } = useFileWatcher(platform, capabilities);
  const { exportHtml } = useHtmlExport(platform, capabilities);
  const { exportPdf } = usePdfExport();
  const { fetchUrl, isFetching: isFetchingUrl } = useRemoteFetch();

  // Library
  const { files: libraryFiles, isScanning: isLibraryScanning, scan: scanLibrary, mountDirectory } = useLibrary(platform, capabilities);
  const [libraryFilter, setLibraryFilter] = useState("");

  // CLI arguments: open file or URL from command line
  const handleCliFileOpen = useCallback(
    async (cliPath: string) => {
      if (!platform) return;
      try {
        const fileContent = await platform.readFile(cliPath);
        setContent(fileContent);
        setIsRemote(false);
        setFetchError(null);
        setFilePath(cliPath);
        const name = cliPath.replace(/\\/g, "/").split("/").pop() ?? cliPath;
        setFileName(name);
        startWatching(cliPath, (newContent) => {
          setContent(newContent);
        });
        setViewMode("full-view");
      } catch {
        // File not readable — stay on default content
      }
    },
    [platform, startWatching, setViewMode],
  );

  const handleCliUrlFetch = useCallback(
    async (url: string) => {
      stopWatching();
      const result = await fetchUrl(url);
      if (result.error) {
        setFetchError(result.error);
        return;
      }
      setContent(result.content);
      setIsRemote(true);
      setFilePath(null);
      setFetchError(null);
      const urlParts = url.split("/");
      const urlFileName = urlParts[urlParts.length - 1] || "remote.md";
      setFileName(urlFileName);
      setViewMode("full-view");
    },
    [fetchUrl, stopWatching, setViewMode],
  );

  useCliArgs(
    { onFileOpen: handleCliFileOpen, onUrlFetch: handleCliUrlFetch },
    capabilities.hasCliArgs && platform !== null,
  );

  // File open handler
  const handleOpenFile = useCallback(async () => {
    if (!platform) return;

    const recognized = config.fileExtensions.recognized;
    const selectedPath = await platform.openFileDialog(recognized);
    if (!selectedPath) return;

    // Validate extension
    const ext = selectedPath.substring(selectedPath.lastIndexOf("."));
    if (!recognized.includes(ext.toLowerCase())) {
      window.alert(
        `Unsupported file type "${ext}". Recognized extensions: ${recognized.join(", ")}`,
      );
      return;
    }

    const fileContent = await platform.readFile(selectedPath);
    setContent(fileContent);
    setIsRemote(false);
    setFetchError(null);

    // Store full path for saving
    setFilePath(selectedPath);

    // Extract just the file name from the path
    const name = selectedPath.replace(/\\/g, "/").split("/").pop() ?? selectedPath;
    setFileName(name);

    // Start watching for file changes (desktop only)
    startWatching(selectedPath, (newContent) => {
      setContent(newContent);
    });

    // Switch to full-view when opening a file
    setViewMode("full-view");
  }, [platform, setViewMode, config.fileExtensions.recognized, startWatching]);

  // Save handler
  const handleSave = useCallback(() => {
    if (isRemote || !filePath) return;
    saveFile(content, filePath);
  }, [content, filePath, isRemote, saveFile]);

  // HTML export handler
  const handleExportHtml = useCallback(() => {
    exportHtml(content, config.engine.activeEngine);
  }, [content, config.engine.activeEngine, exportHtml]);

  // PDF export handler
  const handleExportPdf = useCallback(() => {
    exportPdf(content, config.engine.activeEngine);
  }, [content, config.engine.activeEngine, exportPdf]);

  // Remote URL fetch handler
  const handleFetchUrl = useCallback(
    async (url: string) => {
      // Stop any file watcher
      stopWatching();

      const result = await fetchUrl(url);
      if (result.error) {
        setFetchError(result.error);
        return;
      }

      setContent(result.content);
      setIsRemote(true);
      setFilePath(null);
      setFetchError(null);

      // Extract filename from URL
      const urlParts = url.split("/");
      const urlFileName = urlParts[urlParts.length - 1] || "remote.md";
      setFileName(urlFileName);

      // Switch to full-view
      setViewMode("full-view");
    },
    [fetchUrl, stopWatching, setViewMode],
  );

  // Library file select handler
  const handleLibraryFileSelect = useCallback(
    async (selectedPath: string) => {
      if (!platform) return;

      try {
        const fileContent = await platform.readFile(selectedPath);
        setContent(fileContent);
        setIsRemote(false);
        setFetchError(null);
        setFilePath(selectedPath);

        const name = selectedPath.replace(/\\/g, "/").split("/").pop() ?? selectedPath;
        setFileName(name);

        startWatching(selectedPath, (newContent) => {
          setContent(newContent);
        });

        setViewMode("full-view");
      } catch {
        // File may have been deleted since scan
      }
    },
    [platform, setViewMode, startWatching],
  );

  // Can save: local file only (not remote, must have a file path)
  const canSave = !isRemote && filePath !== null;

  useKeyboardShortcuts({
    onViewChange: setViewMode,
    onOpenFile: handleOpenFile,
    onSave: canSave ? handleSave : undefined,
    onExportHtml: handleExportHtml,
    onExportPdf: handleExportPdf,
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
        onViewChange={setViewMode}
        fileName={fileName}
        hasFilesystem={capabilities.hasFilesystem}
        onSave={handleSave}
        canSave={canSave}
        isSaving={isSaving}
        lastSaved={lastSaved}
        onExportHtml={handleExportHtml}
        onExportPdf={handleExportPdf}
        onFetchUrl={handleFetchUrl}
        isFetchingUrl={isFetchingUrl}
        fetchUrlError={fetchError}
        isRefreshing={isRefreshing}
        onMountDirectory={mountDirectory}
        onRefreshLibrary={scanLibrary}
        libraryFilter={libraryFilter}
        onLibraryFilterChange={setLibraryFilter}
        isLibraryScanning={isLibraryScanning}
      />

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
          {viewMode === "full-view" && (
            <Preview
              source={content}
              engineId={config.engine.activeEngine}
            />
          )}
          {viewMode === "split-view" && (
            <SplitView
              source={content}
              onSourceChange={setContent}
              engineId={config.engine.activeEngine}
              lintingEnabled={config.editor.lintingEnabled}
              activeLinter={config.editor.activeLinter}
            />
          )}
          {viewMode === "library" && (
            <Library
              files={libraryFiles}
              onFileSelect={handleLibraryFileSelect}
              filter={libraryFilter}
              onFilterChange={setLibraryFilter}
            />
          )}
          {viewMode === "settings" && (
            <Settings
              capabilities={capabilities}
              platform={platform}
            />
          )}
        </div>
      </main>

      <InstallPrompt />
    </div>
  );
}

function AppShellWithConfig() {
  const [platform, setPlatform] = useState<PlatformAdapter | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPlatform().then((adapter) => {
      if (cancelled) return;
      setPlatform(adapter);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ConfigProvider platform={platform}>
      <AppShell />
    </ConfigProvider>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <AppShellWithConfig />
    </ThemeProvider>
  );
}
