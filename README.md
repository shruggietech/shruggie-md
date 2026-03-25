<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/brand/logo-darkbg.png">
    <source media="(prefers-color-scheme: light)" srcset="assets/brand/logo-lightbg.png">
    <img alt="Shruggie Markdown" src="assets/brand/logo-darkbg.png" width="400">
  </picture>
</p>

# Shruggie Markdown

A cross-platform markdown viewer, editor, and converter built with Tauri, React, and CodeMirror.

<!-- TODO: add screenshots -->

## Features

**Viewing** — Live-rendered preview that updates as you type, automatic file reload on external changes, and remote URL fetching to view markdown from the web.

**Editing** — A CodeMirror 6 editor with split-view mode, full syntax highlighting, and integrated markdown linting.

**Converting** — Export to HTML with fully inlined styles for portable sharing, or export to PDF via the system print dialog.

**Library** — Flat file management for the desktop app with a sortable, filterable table for organizing your documents.

**Theming** — Light, dark, and system-follow modes with 4 distinct visual styles to choose from.

**Cross-platform** — Ships as a native desktop app (Windows, macOS, Linux), a Chrome Extension, and a Progressive Web App, all from a single codebase.

**Configurable** — Choose from 3 markdown rendering engines (markdown-it, marked, remark), customize file extension rules, and tune editor and preview settings to your workflow.

## Installation

### Desktop

Download the latest release for your platform from [GitHub Releases](https://github.com/shruggietech/shruggie-md/releases):

- **Windows** — MSI installer
- **macOS** — DMG disk image
- **Linux** — AppImage

### Chrome Extension

<!-- TODO: update when published on Chrome Web Store -->

### PWA

<!-- TODO: update when hosted -->

## Development

### Prerequisites

- Node.js 22+
- pnpm 9+
- Rust stable (for desktop builds)
- ImageMagick (for icon generation)

### Quick Start

```bash
git clone https://github.com/shruggietech/shruggie-md.git
cd shruggie-md
pnpm install
pnpm run dev
```

### Scripts

Helper scripts live in `scripts/` and are available as both `.sh` (Bash) and `.ps1` (PowerShell) variants.

| Script | Purpose |
|--------|---------|
| `dev` | Start Vite dev server |
| `build` | Full production build (web + extension) |
| `clean` | Delete build artifacts and caches |
| `rebuild` | Clean + install + build |
| `test` | Run test suite |
| `typecheck` | TypeScript type checking |
| `generate-icons` | Regenerate platform icons from master |
| `bump-version` | Update version across all manifests |

### Build Targets

| Target | Command | Output |
|--------|---------|--------|
| Web/PWA | `pnpm run build` | `dist/` |
| Chrome Extension | `pnpm run build:extension` | `extension/dist/` |
| Desktop | `pnpm tauri:build` | Platform installer |

### Testing

```bash
pnpm run test
```

258 tests powered by Vitest.

## Architecture

Shruggie Markdown uses a shared React frontend paired with platform-specific shells for desktop (Tauri), browser extension, and PWA targets. A platform abstraction layer isolates native capabilities — file system access, dialogs, window management — behind a common interface so that features work identically across all targets. The build pipeline produces separate bundles for each platform from the same source tree.

See [`shruggie-md-spec.md`](shruggie-md-spec.md) for the full technical specification.

## License

[Apache-2.0](LICENSE)

## Author

William Thompson, [ShruggieTech](https://shruggie.tech/) (Shruggie LLC)
