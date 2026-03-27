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

All platforms:

| Dependency | Minimum Version | Purpose |
|------------|-----------------|---------|
| [Node.js](https://nodejs.org/) | 22+ | Frontend build toolchain |
| [pnpm](https://pnpm.io/) | 9+ | Package manager (see `packageManager` in `package.json`) |
| [Rust](https://www.rust-lang.org/tools/install) | 1.77.2+ (stable) | Tauri desktop backend |
| [ImageMagick](https://imagemagick.org/) | 7+ | Icon generation (`scripts/generate-icons`) |

Windows (for desktop installer builds):

| Dependency | Version | Purpose |
|------------|---------|---------|
| [WiX Toolset v3](https://wixtoolset.org/docs/wix3/) | 3.14+ | MSI installer bundling |
| [NSIS](https://nsis.sourceforge.io/) | 3.x | NSIS installer bundling |
| [Microsoft Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) | 2022+ | Rust compilation (MSVC linker, Windows SDK) |
| [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) | Evergreen | Runtime for the Tauri webview (bundled on Windows 11, may need install on Windows 10) |

macOS (for desktop builds):

| Dependency | Purpose |
|------------|---------|
| Xcode Command Line Tools | C/C++ toolchain and macOS SDK |

Linux (for desktop builds):

| Dependency | Purpose |
|------------|---------|
| `build-essential` | C/C++ compiler toolchain |
| `libwebkit2gtk-4.1-dev` | WebView backend |
| `libgtk-3-dev` | GTK windowing |
| `libayatana-appindicator3-dev` | System tray support |
| `librsvg2-dev` | SVG icon rendering |
| `libssl-dev` | TLS support |

> **Note:** On Windows, `pnpm tauri:build` produces a standalone `.exe` without WiX or NSIS installed, but the MSI and NSIS installers will fail to bundle. Install both if you need to produce release installers.

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

## Contributors

Contributions are welcome! Before getting started, make sure you have the full set of [development prerequisites](#prerequisites) installed for your platform. See [RELEASING.md](RELEASING.md) for the release process.

### Setting Up a Dev Environment (Windows)

```powershell
# 1. Install Rust via rustup (https://rustup.rs/)
# 2. Install Node.js 22+ and pnpm 9+
# 3. Install WiX v3 and NSIS (for installer builds)
# 4. Clone and install
git clone https://github.com/shruggietech/shruggie-md.git
cd shruggie-md
pnpm install

# 5. Run in development mode (web only)
pnpm run dev

# 6. Run in development mode (desktop / Tauri)
pnpm tauri:dev

# 7. Build release binaries
pnpm tauri:build
```

### Setting Up a Dev Environment (Linux / macOS)

```bash
# 1. Install Rust via rustup (https://rustup.rs/)
# 2. Install platform dependencies (see Prerequisites table above)
# 3. Clone and install
git clone https://github.com/shruggietech/shruggie-md.git
cd shruggie-md
pnpm install

# 4. Run in development mode
pnpm run dev        # web only
pnpm tauri:dev      # desktop

# 5. Build release binaries
pnpm tauri:build
```

## Author

William Thompson, [ShruggieTech](https://shruggie.tech/) (Shruggie LLC)
