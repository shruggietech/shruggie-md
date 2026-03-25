# Changelog

All notable changes to Shruggie Markdown will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
- Library mode for flat file management on desktop (sortable, filterable table).
- Light, dark, and system color modes with four visual styles (default, warm, cool, monochrome).
- Markdown-to-HTML export with inlined styles.
- Markdown-to-PDF export via browser print with custom print stylesheet and automatic page breaks at horizontal rules.
- Remote URL fetching for publicly accessible raw markdown content.
- Live file reload on desktop via filesystem watcher (300ms debounce).
- Configurable file extension rules (global and library-independent).
- Settings panel: Appearance, Editor, Preview, Markdown Engine, File Extensions, Library.
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

[Unreleased]: https://github.com/shruggietech/shruggie-md/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/shruggietech/shruggie-md/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/shruggietech/shruggie-md/releases/tag/v0.1.0
