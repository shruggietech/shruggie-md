# Changelog

All notable changes to Shruggie Markdown will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.7] - 2026-04-11

### Fixed

- Windows "Open With > Shruggie Markdown" now opens the selected file directly instead of showing the welcome document. CLI and OS-association file-path arguments are resolved before last-session restoration runs; successful resolution prevents restoration from overriding the argument-provided file.
- Unordered and ordered list items now render with visible bullet and number markers in View and Edit modes. A global CSS reset was stripping `list-style`; the preview stylesheet now explicitly restores `disc/circle/square` for `ul` nesting levels and `decimal/lower-alpha/lower-roman` for `ol` nesting levels.
- Inline code spans (`code` not inside `pre`) now render in the dedicated `--color-inline-code` token color (muted green, distinct in both light and dark themes) instead of inheriting normal paragraph text color.
- Preview default styling now aligns with conventional GitHub markdown rendering: heading scale (`2em`/`1.5em`/…), `h1`/`h2` bottom borders, blockquote left-border with muted text, table zebra striping (transparent / `--color-bg-tertiary`), horizontal rule height, and paragraph spacing.

### Changed

- Settings > Preview > Font family is now a curated dropdown instead of a free-text input. The curated list contains 12 named options (Arial, Cambria, Consolas, Courier New, Georgia, Helvetica, Inter, JetBrains Mono, Roboto, System Default, Times New Roman, Verdana). The default is System Default. On load, any previously persisted value that does not match a curated entry is silently migrated to System Default.
- Markdown Engine audit: all three engines (markdown-it, marked, remark) are confirmed functional and wired end-to-end. The remark engine uses `remarkHtml` with `sanitize: false` because XSS sanitization is handled downstream by DOMPurify. Common markdown constructs produce near-identical output across all three engines; observable differences arise in engine-specific features (typographer output in markdown-it, footnote handling in marked, AST behavior in remark).

### Added

- Refresh toolbar button in the Actions zone (document modes only). Clicking Refresh re-reads the current file from disk (local files) and re-renders the preview. If unsaved changes exist, a modal dialog ("Unsaved Changes") warns the user that refreshing will discard edits; the user may cancel or confirm.
- `use-cli-args.test.ts`: 3 unit tests covering CLI argument handling (file path resolved, file path unresolvable, no argument).
- `refresh-flow.test.tsx`: 4 integration tests covering Refresh with clean document, Refresh with unsaved changes (modal shown), modal Cancel no-op, and modal confirm discards edits.
- `preview-fonts.test.tsx`: 17 tests covering font list completeness, default value, and Settings > Preview font family dropdown rendering and persistence.

## [0.3.6] - 2026-03-31

### Fixed

- PDF export now pre-fills the save dialog with the current document filename (or "Untitled") instead of leaving the filename field empty.
- PDF export no longer shows a duplicate print/save dialog after the first save completes.
- Workspaces empty state message updated from "No files found. Add a workspace to get started." to "No files found. Create a new file or add a workspace to get started."
- Workspace file list now correctly populates after application restart when navigating to the Workspaces view and clicking Refresh.
- Chrome Extension dark mode now correctly applies background color. CSS custom property selectors changed from `[data-theme]` to `:host([data-theme])` on the shadow host element.

### Changed

- View mode persistence now covers all five primary views (view, edit, edit-only, workspaces, settings) instead of only the three content modes.
- About section removed from Settings panel and relocated to a standalone About modal accessible via the Info toolbar dropdown.
- Welcome document redesigned with branding, feature overview, keyboard shortcuts, and links to the GitHub repository.

### Added

- Document state persistence: the application remembers the last-opened local file and restores it on relaunch. New config keys: `general.lastDocumentPath`, `general.lastDocumentSource`.
- New File button added to the Workspaces empty state area.
- Per-workspace settings modal restored with toggles for recursive traversal, show hidden files, independent extension rules, and extension whitelist.
- Info toolbar button with dropdown menu containing About and Help items.
- About modal displaying app name, version, platform, attribution, GitHub link, and license.
- Help view rendering the welcome document content in read-only Preview mode.
- Welcome document content extracted to shared constant (`src/constants/welcomeContent.ts`).

## [0.3.5] - 2026-03-30

### Fixed

- Tauri desktop capability set now explicitly allows window destroy (`core:window:allow-destroy`), fixing a permissions mismatch that could block the native close flow after `preventDefault`.

## [0.3.4] - 2026-03-30

### Fixed

- Native window close flow now uses explicit close handling (`preventDefault` + timeout-guarded save + `destroy`) to guarantee the Windows title-bar "X" exits reliably even when persistence operations stall.

## [0.3.3] - 2026-03-30

### Fixed

- Native close button (title bar "X") not closing the application on Windows when asynchronous `onCloseRequested` persistence operations stalled during shutdown.

### Changed

- Window geometry persistence now runs incrementally on move and resize with debounce, reducing reliance on close-time state writes.
- Updated gitignore handling for build/runtime artifacts: `Cargo.lock` is now tracked for the Tauri application while local verification artifacts are ignored.

### Added

- `useWindowState` regression tests covering close-handler timeout behavior and debounced move/resize persistence.

## [0.3.2] - 2026-03-29

### Fixed

- Workspace creation in the Open dialog failing due to malformed internal workspace path construction when app data directory lacked a trailing separator.
- `SplitButton` (Save / Save As) not rendering text labels when `appearance.showButtonLabels` was enabled.
- Toolbar tooltip rendering reliability by moving tooltip overlays to a body-level portal to avoid clipping/stacking issues.
- Settings panel scrollbar positioning by moving overflow scrolling to a full-width outer container so the scrollbar anchors to the right window edge.
- Workspace file discovery pipeline reliability by hardening extension normalization and using `stat()` directory metadata in the Tauri adapter.
- Recursive workspace traversal reliability by using stat-derived `isDirectory` values instead of relying solely on `readDir` metadata.

### Changed

- Toolbar redesigned into three zones: Navigation (content mode segmented control + chevron), Context (centered filename/workspace controls), and Actions (file operations + destinations).
- Content modes (View, Edit, Edit Only) are now visually grouped in a segmented control, while Workspaces and Settings are separate destination buttons.
- Toolbar brand label removed; attribution moved to Settings > About.
- Preview styling adjusted toward GitHub-flavored conventions for code blocks, tables, and blockquotes.

### Added

- Bottom status bar showing active markdown engine (left) and app version (right).
- Settings > About section with app name, runtime version, and developer attribution.
- Workspaces view management bar with workspace selector and New Workspace modal (Internal/External).
- Build-time `__APP_VERSION__` constant (with runtime-safe fallback for tests/dev).
- New/updated test coverage for SplitButton labels, StatusBar rendering, and Workspaces modal behavior.

## [0.3.1] - 2026-03-28

### Added

- `scripts/clean-dist.js`: lightweight cross-platform helper that deletes only `dist/` before a Tauri build. Used by the `tauri:dev` and `tauri:build` npm scripts to prevent stale frontend output from being packaged into desktop binaries.
- Playwright MCP server configuration for VS Code Copilot (`.vscode/mcp.json`), enabling agents to visually verify UI changes via browser screenshots.
- Visual verification standing rule in `CLAUDE.md` and `.github/copilot-instructions.md`.

### Changed

- `tauri:build` and `tauri:dev` npm scripts now delete `dist/` via `scripts/clean-dist.js` before invoking the Tauri CLI. This ensures no pre-existing `dist/` can be silently embedded in desktop binaries, regardless of how the build is invoked.
- RELEASING.md now includes a mandatory **Step 4 — Verify Clean Build** before the Commit and Tag step. Existing steps 4–7 renumbered to 5–8.

### Removed

- Orphaned `UrlInput` component (`src/components/Toolbar/UrlInput.tsx`) — superseded by the unified Open dialog in v0.3.0.
- Orphaned `useRemoteFetch` hook (`src/hooks/useRemoteFetch.ts`) — URL fetching now handled inside `OpenDialog` and CLI arg routing.

## [0.3.0] - 2026-03-27

### Changed

- **README Prerequisites overhaul**: expanded Development > Prerequisites from a brief bullet list to comprehensive per-platform dependency tables covering Windows (WiX v3, NSIS, MSVC Build Tools, WebView2), macOS (Xcode CLT), and Linux (`libwebkit2gtk-4.1-dev`, GTK, etc.) requirements for desktop builds.
- **README Contributors section**: added new Contributors section with step-by-step dev environment setup guides for Windows (PowerShell) and Linux/macOS (Bash), linking to the Prerequisites tables and RELEASING.md.

### Fixed

- **Cargo.lock regenerated**: lock file updated to include resolved dependency tree for `tauri-plugin-sql` SQLite feature and transitive dependencies added in v0.3.0.

### Added

- **Edit Only mode** (`Ctrl+4`): full-screen editor without preview pane, for focused writing.
- **EditorToolbarPanel** component: collapsible quick-settings panel below the toolbar with context-sensitive controls per view mode.
- **Button labels toggle** (`appearance.showButtonLabels`): toolbar buttons can now display text labels alongside icons. Controlled via a new toggle in Settings > Appearance.
- **Scrollbar theming**: all scrollable containers use thin, theme-aware scrollbars (6 px track matching design tokens) on both WebKit and Firefox.
- `general.editorToolbarExpanded` config setting to persist pop-down panel state.
- **Storage abstraction layer** (`StorageAdapter` interface) with platform-specific backends: SQLite on desktop (via `tauri-plugin-sql`), IndexedDB on Chrome Extension and PWA. Provides unified CRUD access for config, documents, workspaces, edit history, and logs.
- **Config migration**: on first launch after upgrading from a JSON-config release, legacy `config.json` (desktop) or old IndexedDB/localStorage stores are automatically migrated to the new storage backend. The old file is renamed to `config.json.bak`.
- **Structured logging system**: module-level singleton logger that persists entries to the `logs` table/store when at or above the configured verbosity threshold. Entries include timestamp, level, module, message, and optional details.
- **Window state persistence** (desktop only): main window size, position, and maximised state are saved on close and restored on next launch. Off-screen positions are detected via `availableMonitors()` and fall back to centering.
- **Advanced settings section** in the Settings panel with a log verbosity dropdown (`debug` / `info` / `warning` / `error`).
- `advanced.logVerbosity` config key (default `"warning"`) controlling minimum severity for persisted log entries.
- **Workspace system**: replaces the former Library mode with a multi-workspace architecture supporting internal (app-managed) and external (user-chosen directory) workspaces.
- **Default workspace**: auto-created on first launch when no workspaces exist, with `is_default` flag and deletion protection.
- **Workspace CRUD**: create, delete, and manage workspaces from the Workspaces view. Internal workspace directories are created/removed automatically; external workspaces reference existing directories.
- **Per-workspace settings**: each workspace stores its own settings (recursive traversal, show hidden files, independent extension rules, extension whitelist) as JSON in the `settings` column.
- **PlatformAdapter extensions**: `getAppDataDir()`, `createDirectory(path)`, `removeDirectory(path)` methods added across all platform adapters (functional on Tauri, no-op stubs on web/PWA/Chrome).
- `fs:allow-remove` permission added to Tauri capabilities for workspace directory cleanup.
- **Unified Open dialog** (`Ctrl/Cmd+O`): tabbed dialog with File and URL source tabs, workspace selector with inline workspace creation, optional document name override. Replaces the separate file-open button and URL input toggle.
- **Export dialog** (`Ctrl/Cmd+Shift+E`): format selection dialog offering HTML, PDF, and Markdown export. Replaces separate toolbar buttons for HTML and PDF export.
- **New Document** toolbar button: creates a blank editor buffer, clears file path and document association, switches to edit mode.
- **Document model integration**: opened files (local, remote, CLI) are registered in the `documents` table with source type, path/URL, and workspace ID. Save operations create edit history snapshots and update `updated_at` timestamps.
- **Markdown export**: raw editor content can be exported/saved via the Export dialog's Markdown option.
- **`Ctrl/Cmd+Shift+E` keyboard shortcut**: opens the Export dialog. Direct shortcuts `Ctrl/Cmd+Shift+H` (HTML) and `Ctrl/Cmd+Shift+P` (PDF) still bypass the dialog.

### Changed

- **Three-mode view system**: view modes renamed and expanded — `full-view` → `view`, `split-view` → `edit`, plus new `edit-only` mode. Legacy config values are silently migrated on load.
- **Toolbar segmented control**: mode switcher now shows five buttons — View (`Ctrl+1`), Edit (`Ctrl+2`), Edit Only (`Ctrl+4`), Workspaces (`Ctrl+3`), Settings (`Ctrl+,`) — with the active mode highlighted.
- **Pop-down quick-settings panel**: a chevron toggle below the toolbar reveals context-sensitive controls (font size, tab size, word wrap, line numbers for editor; engine, theme for preview) that adapt to the current view mode.
- **Editor settings reactivity**: `showLineNumbers` and `wordWrap` editor preferences now reconfigure the CodeMirror instance in place via `Compartment`-based dispatch instead of requiring a full editor rebuild.
- **Focus state management**: button focus rings now use CSS `:focus-visible` exclusively, removing JavaScript `onFocus`/`onBlur` handlers from `Button` and `SplitButton`.
- Spec updated: §4.6 (toolbar mode switcher, pop-down panel, scrollbar styling, button labels, focus-visible), §5.1–§5.3.1 (three-mode view system), §7.1 (Compartment-based reactivity), §10.1.1 (editorToolbarExpanded, lastViewMode migration), §10.2 (showButtonLabels setting).
- **Config persistence rewritten**: `useConfigState` now reads/writes configuration through the `StorageAdapter` when available, falling back to legacy platform adapter JSON I/O for backwards compatibility. Config values are flattened to dotted-path key-value pairs for storage.
- Spec updated: §10.1 (storage architecture rewrite — SQLite/IndexedDB, StorageAdapter, migration), §10.1.1 (logVerbosity setting), §10.5 (storage locations with database filenames), new §10.6 (Logging), new §10.7 (Window State Persistence), §13 (tags stub tables noted).
- **Library → Workspaces terminology migration**: all UI labels, component names, data-testids, config keys, types, and hook names renamed from `Library`/`library` to `Workspaces`/`workspaces`.
- **Config key migration**: `library.recursive` → `workspace.recursive`, `library.showHidden` → `workspace.showHidden`, `library.useIndependentExtensions` → `workspace.useIndependentExtensions`, `library.independentExtensions` → `workspace.independentExtensions`. `library.mountPath` dropped (replaced by per-workspace paths).
- **Settings panel**: removed Library section; Settings now has 6 sections (Appearance, Editor, Preview, Markdown Engine, File Extensions, Advanced).
- **ViewMode type**: `"library"` → `"workspaces"` across all source and test files.
- Spec updated: §1.3 (terminology), §5.4 (Workspaces View), §5.5 (Settings sections), §9 (complete rewrite from Library Mode to Workspaces with §9.1–§9.7), §10.5 (workspaces subdirectory), §12 (project structure), plus all scattered Library references throughout.
- **I/O overhaul**: toolbar action buttons replaced — Open, New, Save/SaveAs, Export instead of Save/SaveAs + HTML + PDF + URL input. `UrlInput` component no longer used from toolbar.
- **CLI URL fetching**: rewritten to use direct `fetch()` instead of the `useRemoteFetch` hook, with document model registration in the default workspace.
- Spec updated: §6.1 "Viewing" → "Opening Files" (Open dialog, document model, CLI routing, live reload), §6.2 "Editing" (New Document, edit history), §6.3 "Converting" → "Exporting" (Export dialog, format table, direct shortcuts), §6.4 "Remote URL Fetching" → "Remote Content" (document model integration). TOC updated accordingly. "converter" → "exporter" in spec preamble.

## [0.2.0] - 2026-03-25

### Added

- **Save As** support with native file dialog on desktop (Tauri) and browser download fallback on web/PWA/extension targets. New keyboard shortcut: `Ctrl/Cmd+Shift+S`.
- **SplitButton** component for context-aware Save / Save As toolbar action. Shows split button with dropdown when a file path is established; shows a single Save As icon when no path exists.
- **Platform-aware default view mode**: desktop (Tauri) defaults to split-view; web, PWA, and Chrome extension default to full-view. User preference is persisted in `general.lastViewMode` config and restored on launch.
- `saveFileDialog` method on the `PlatformAdapter` interface with implementations across all four adapters.
- Inline descriptions (hint text) for every setting field in the Settings panel.
- Tooltips on all interactive elements in Settings (color mode buttons, Choose directory button, Reset to defaults, extension chip remove buttons) and UrlInput (info button).

### Changed

- Toolbar Save button replaced with `SplitButton` for unified Save / Save As behavior.
- HTML export now opens a native save dialog on desktop before falling back to browser download.
- Spec updated: §4.6 (universal tooltip requirement, SplitButton), §5.1/§5.2 (platform-aware defaults), §5.5 (field descriptions), §6.2 (Save/Save As semantics), §6.3 (export save dialog), §10.1.1 (general.lastViewMode).

### Fixed

- Workspaces table not populating on desktop: added missing `fs:allow-stat` permission to Tauri capabilities.

## [0.1.1] - 2026-03-25

### Fixed

- Application launch failure on Windows: replaced invalid Tauri v1-style `plugins.fs.scope` config with Tauri 2-compatible `requireLiteralLeadingDot` field, resolving a deserialization panic during plugin initialization.
- Windows install path: corrected Tauri identifier to `com.shruggie-tech.shruggie-md` so NSIS installs to `%LOCALAPPDATA%\shruggie-tech\shruggie-md\`.
- Added `bundle.windows` config with NSIS installer settings and WebView2 download bootstrapper.
- Removed unused `features = ["unstable"]` from tauri crate dependency.
- Removed unused `use tauri::Manager` import in `lib.rs`.
- Corrected `Cargo.toml` authors from placeholder to `William Thompson`.
- Updated spec §10.5 Windows storage path to match install directory convention.

## [0.1.0] - 2026-03-25

### Added

- Cross-platform markdown viewer, editor, and converter.
- Three build targets: Desktop (Tauri 2), Chrome Extension (Manifest V3), PWA.
- Three selectable markdown engines: markdown-it (default), marked, remark.
- Full-view and split-view modes with draggable pane divider.
- CodeMirror 6 editor with markdown syntax highlighting.
- Markdown linting integration with markdownlint and remark-lint adapters.
- Workspaces mode for file management on desktop (sortable, filterable table).
- Light, dark, and system color modes with four visual styles (default, warm, cool, monochrome).
- Markdown-to-HTML export with inlined styles.
- Markdown-to-PDF export via browser print with custom print stylesheet and automatic page breaks at horizontal rules.
- Remote URL fetching for publicly accessible raw markdown content.
- Live file reload on desktop via filesystem watcher (300ms debounce).
- Configurable file extension rules (global and per-workspace).
- Settings panel: Appearance, Editor, Preview, Markdown Engine, File Extensions, Advanced.
- Platform abstraction layer with adapters for Tauri, Chrome, PWA, and Web.
- Keyboard shortcuts: view modes (Ctrl/Cmd+1/2/3/,), save (Ctrl+S), HTML export (Ctrl+Shift+H), PDF export (Ctrl+Shift+P), file open (Ctrl+O).
- 258 automated tests across 11 test files.
- PWA with Workbox service worker, offline caching, and install prompt.
- Chrome extension with shadow DOM isolation, content scripts, and browser action popup.
- Accessibility: ARIA attributes, keyboard navigation, prefers-reduced-motion support.
- Code splitting: main chunk 253 KB, vendor chunks lazy-loaded.
- Branded ShruggieTech icons across all targets (Tauri, PWA, Chrome extension).
- Developer scripts (PowerShell and Bash) for build, test, clean, and icon generation.
- GitHub Actions CI/CD for automated testing and multi-platform release builds.
- CHANGELOG.md and RELEASING.md for release process documentation.

### Known Limitations

- CodeMirror language-data includes all ~100 language grammars (~1.6 MB vendor chunk). A curated subset would reduce bundle size.

[Unreleased]: https://github.com/shruggietech/shruggie-md/compare/v0.3.7...HEAD
[0.3.7]: https://github.com/shruggietech/shruggie-md/compare/v0.3.6...v0.3.7
[0.3.6]: https://github.com/shruggietech/shruggie-md/compare/v0.3.5...v0.3.6
[0.3.5]: https://github.com/shruggietech/shruggie-md/compare/v0.3.4...v0.3.5
[0.3.4]: https://github.com/shruggietech/shruggie-md/compare/v0.3.3...v0.3.4
[0.3.3]: https://github.com/shruggietech/shruggie-md/compare/v0.3.2...v0.3.3
[0.3.2]: https://github.com/shruggietech/shruggie-md/compare/v0.3.1...v0.3.2
[0.3.1]: https://github.com/shruggietech/shruggie-md/compare/v0.3.0...v0.3.1
[0.2.0]: https://github.com/shruggietech/shruggie-md/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/shruggietech/shruggie-md/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/shruggietech/shruggie-md/releases/tag/v0.1.0
