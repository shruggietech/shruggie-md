# Shruggie Markdown — Technical Specification

| **Attribute** | **Value** |
|---------------|-----------|
| Project Name | Shruggie Markdown |
| Project Slug | `shruggie-md` |
| CLI Command | `shruggie-md` |
| Repository | [github.com/shruggietech/shruggie-md](https://github.com/shruggietech/shruggie-md) |
| License | Apache-2.0 |
| Version | Pre-release (0.1.0 target) |
| Author | William Thompson (Shruggie LLC, DBA ShruggieTech) |
| Latest Revision Date | 2026-03-24 |
| Document Status | DRAFT |
| Audience | AI-first, Human-second |

---

<a name="table-of-contents" id="table-of-contents"></a>

## Table of Contents

- [1. Document Information](#1-document-information)
  - [1.1. Purpose](#11-purpose)
  - [1.2. Scope](#12-scope)
  - [1.3. Terminology](#13-terminology)
- [2. Project Overview](#2-project-overview)
  - [2.1. Project Identity](#21-project-identity)
  - [2.2. Design Goals](#22-design-goals)
  - [2.3. Non-Goals](#23-non-goals)
- [3. Architecture](#3-architecture)
  - [3.1. Technology Stack](#31-technology-stack)
  - [3.2. Build Targets](#32-build-targets)
  - [3.3. Shared Core Architecture](#33-shared-core-architecture)
- [4. Visual Design Language](#4-visual-design-language)
  - [4.1. Design Philosophy](#41-design-philosophy)
  - [4.2. Design References](#42-design-references)
  - [4.3. Color System](#43-color-system)
  - [4.4. Typography](#44-typography)
  - [4.5. Spacing and Layout](#45-spacing-and-layout)
  - [4.6. Component Styling](#46-component-styling)
  - [4.7. Motion and Transitions](#47-motion-and-transitions)
  - [4.8. Iconography](#48-iconography)
- [5. Application Layout](#5-application-layout)
  - [5.1. View Modes](#51-view-modes)
  - [5.2. Full-View Mode](#52-full-view-mode)
  - [5.3. Split-View Mode](#53-split-view-mode)
  - [5.4. Workspaces View](#54-workspaces-view)
  - [5.5. Settings View](#55-settings-view)
- [6. Core Features](#6-core-features)
  - [6.1. Opening Files](#61-viewing)
  - [6.2. Editing](#62-editing)
  - [6.3. Exporting](#63-exporting)
  - [6.4. Remote Content](#64-remote-content)
- [7. Editor Engine](#7-editor-engine)
  - [7.1. CodeMirror Integration](#71-codemirror-integration)
  - [7.2. Syntax Highlighting](#72-syntax-highlighting)
  - [7.3. Markdown Linting](#73-markdown-linting)
- [8. Markdown Rendering](#8-markdown-rendering)
  - [8.1. Rendering Pipeline](#81-rendering-pipeline)
  - [8.2. Selectable Engines](#82-selectable-engines)
  - [8.3. Rendered Content Styling](#83-rendered-content-styling)
- [9. Workspaces](#9-workspaces)
  - [9.1. Purpose](#91-purpose)
  - [9.2. Default Workspace](#92-default-workspace)
  - [9.3. Workspace Types](#93-workspace-types)
  - [9.4. Workspace CRUD](#94-workspace-crud)
  - [9.5. Workspace File Table](#95-workspace-file-table)
  - [9.6. Per-Workspace Settings](#96-per-workspace-settings)
  - [9.7. Traversal and Filtering](#97-traversal-and-filtering)
- [10. Configuration and Preferences](#10-configuration-and-preferences)
  - [10.1. Configuration Architecture](#101-configuration-architecture)
  - [10.2. Theme and Appearance](#102-theme-and-appearance)
  - [10.3. Editor Preferences](#103-editor-preferences)
  - [10.4. File Extension Rules](#104-file-extension-rules)
  - [10.5. Storage Locations](#105-storage-locations)
- [11. Platform Targets](#11-platform-targets)
  - [11.1. Desktop Application](#111-desktop-application)
  - [11.2. Chrome Extension](#112-chrome-extension)
  - [11.3. Progressive Web App](#113-progressive-web-app)
- [12. Repository Structure](#12-repository-structure)
- [13. Future Considerations](#13-future-considerations)

---

<a name="1-document-information" id="1-document-information"></a>
<hr class="print-page-break">

## 1. Document Information

<a name="11-purpose" id="11-purpose"></a>

### 1.1. Purpose

<div style="text-align:justify">

This document is the authoritative technical specification for Shruggie Markdown, a cross-platform markdown viewer, editor, and exporter. It is written for an AI-first, Human-second audience. Its primary consumers are AI implementation agents operating within isolated context windows. Every section provides sufficient detail for an AI agent to produce correct implementation decisions without requiring interactive clarification.

</div>

<a name="12-scope" id="12-scope"></a>

### 1.2. Scope

**In Scope:**

- Desktop application for Windows 11, macOS, and Linux via Tauri.
- Chrome extension for the Chrome Web Store.
- Progressive Web App (PWA) installable from the browser.
- Markdown viewing with live preview, theming, and syntax highlighting.
- Markdown editing with split-view, linting, and configurable engines.
- Markdown-to-HTML and markdown-to-PDF conversion.
- Workspace system for organizing markdown documents across internal and external directories.
- Configuration and preference persistence.

**Out of Scope:**

- Authenticated remote URL fetching (see [§13](#13-future-considerations)).
- Collaborative or multi-user editing.
- Cloud sync or account systems.
- Mobile-native applications (Android/iOS).

<a name="13-terminology" id="13-terminology"></a>

### 1.3. Terminology

| Term | Definition |
|------|------------|
| **Full-view** | The default display mode showing only the rendered markdown preview. |
| **Split-view** | A side-by-side display mode showing the editor pane alongside the rendered preview pane. |
| **Workspace** | A named container for markdown documents. Each workspace maps to a directory on disk (desktop) or a logical partition in IndexedDB (web/PWA/Chrome). |
| **Internal workspace** | A workspace whose directory is managed by the application inside `{app_data_dir}/workspaces/{name}/`. |
| **External workspace** | A workspace that references a user-chosen directory on disk. The application does not manage the directory lifecycle. |
| **Engine** | The markdown compilation library used to transform markdown source into HTML. |
| **Linter** | A static analysis tool that checks markdown source for style and correctness issues. |

---

<a name="2-project-overview" id="2-project-overview"></a>
<hr class="print-page-break">

## 2. Project Overview

<a name="21-project-identity" id="21-project-identity"></a>

### 2.1. Project Identity

| Property | Value |
|----------|-------|
| Product name | Shruggie Markdown |
| Organization | ShruggieTech (Shruggie LLC) |
| Author | William Thompson |
| Repository | `github.com/shruggietech/shruggie-md` |
| CLI command | `shruggie-md` |

**Shruggie Markdown** is the product name. It is what users install, what the documentation refers to, and what appears in the application title bar and store listings. **shruggie-md** is the project slug used for the repository name, CLI command, and package identifier.

<a name="22-design-goals" id="22-design-goals"></a>

### 2.2. Design Goals

- **G1 — Clean and intuitive.** The UI prioritizes clarity, whitespace, and quiet confidence over feature density. Every visible element earns its place.
- **G2 — Cross-platform from one codebase.** Desktop, Chrome extension, and PWA targets share a single frontend codebase with platform-specific shells.
- **G3 — Fast and responsive.** File opens, preview renders, and view toggles feel instantaneous. Heavy operations (PDF export, large file rendering) show non-blocking progress indicators.
- **G4 — Configurable without complexity.** Sensible defaults for casual users, deeper configuration available for power users. No setting requires documentation to understand.
- **G5 — Offline-capable.** The desktop application and PWA are fully functional without network access. The Chrome extension requires network access only when fetching remote URLs.

<a name="23-non-goals" id="23-non-goals"></a>

### 2.3. Non-Goals

Shruggie Markdown is explicitly not:

- A full-featured IDE or code editor.
- A note-taking application with organizational hierarchy (folders, tags, backlinks).
- A real-time collaboration tool.
- A CMS or publishing platform.

---

<a name="3-architecture" id="3-architecture"></a>
<hr class="print-page-break">

## 3. Architecture

<a name="31-technology-stack" id="31-technology-stack"></a>

### 3.1. Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Desktop shell | Tauri 2 | Native window, filesystem access, CLI registration, system tray |
| Frontend framework | React 18+ with TypeScript | UI components, state management, rendering logic |
| Styling | Tailwind CSS 4 | Utility-first styling with custom design tokens |
| Editor | CodeMirror 6 | Markdown editing, syntax highlighting, linting integration |
| Markdown rendering | markdown-it (default) | Markdown-to-HTML compilation |
| PDF export | Browser print API with custom print stylesheet | HTML-to-PDF conversion pipeline |
| Build tooling | Vite | Frontend bundling for all targets |
| Chrome extension | Manifest V3 | Chrome Web Store distribution |
| PWA | Vite PWA plugin + Workbox | Service worker, offline caching, install prompt |

<a name="32-build-targets" id="32-build-targets"></a>

### 3.2. Build Targets

| Target | Shell | Distribution |
|--------|-------|-------------|
| Windows 11 (x64) | Tauri | GitHub Releases (`.msi` installer) |
| macOS (arm64) | Tauri | GitHub Releases (`.dmg` image) |
| Linux (x64) | Tauri | GitHub Releases (`.AppImage`) |
| Chrome extension | Manifest V3 | Chrome Web Store |
| PWA | Service worker | Hosted static site |

<a name="33-shared-core-architecture" id="33-shared-core-architecture"></a>

### 3.3. Shared Core Architecture

<div style="text-align:justify">

The application is structured as a shared React frontend with platform-specific integration layers. The frontend contains all UI, rendering, editing, and conversion logic. Each build target wraps this frontend in a thin shell that provides platform capabilities (filesystem access on desktop, extension APIs in Chrome, service worker caching for PWA).

</div>

```
shared frontend (React + TypeScript)
    ├── UI components (viewer, editor, settings, workspaces)
    ├── markdown engine abstraction
    ├── theme system
    └── configuration state management
        │
        ├── Tauri shell (desktop)
        │   ├── native filesystem access
        │   ├── CLI entry point
        │   ├── file watcher (live reload)
        │   └── system preferences integration
        │
        ├── Manifest V3 shell (Chrome extension)
        │   ├── content script injection
        │   ├── browser action popup
        │   └── chrome.storage API
        │
        └── PWA shell
            ├── service worker (Workbox)
            ├── web app manifest
            └── install prompt handling
```

<div style="text-align:justify">

Platform-specific code is isolated behind a thin abstraction layer (`platform.ts`) that exposes a uniform API for file I/O, preference storage, and capability detection. The frontend queries platform capabilities at startup and conditionally enables features (e.g., workspace features are enabled only when the platform reports filesystem access).

</div>

---

<a name="4-visual-design-language" id="4-visual-design-language"></a>
<hr class="print-page-break">

## 4. Visual Design Language

<a name="41-design-philosophy" id="41-design-philosophy"></a>

### 4.1. Design Philosophy

<div style="text-align:justify">

Shruggie Markdown adopts a design philosophy rooted in restraint. The interface should feel like a calm, focused environment where the user's content is the centerpiece and the application chrome recedes. Controls appear when needed and stay out of the way otherwise. Visual hierarchy is established through spacing and typography rather than heavy borders, color blocks, or decorative elements.

</div>

The following principles govern all visual design decisions:

- **Content over chrome.** The rendered markdown preview occupies maximum available space. Toolbars, sidebars, and controls are minimal in height and visual weight.
- **Quiet surfaces.** Backgrounds are flat and muted. No gradients, no drop shadows on content areas, no textured backgrounds.
- **Purposeful contrast.** Color is used sparingly and intentionally: to indicate interactivity (buttons, links), to signal state changes (active tabs, hover states), and to differentiate the editor pane from the preview pane.
- **Typographic clarity.** Font choices, sizes, and line heights are optimized for sustained reading of both rendered markdown and raw source.

<a name="42-design-references" id="42-design-references"></a>

### 4.2. Design References

The following design systems inform the visual language. No single reference is copied wholesale; each contributes a specific quality.

| Reference | Contribution |
|-----------|-------------|
| Apple Human Interface Guidelines | Spacing rhythm (8pt grid), control sizing, subtle depth cues via thin borders rather than shadows, respect for system-level appearance preferences. |
| Linear | Information density without clutter, monochromatic palette with a single accent color, keyboard-first interaction patterns, smooth state transitions. |
| Notion | Clean typographic rendering of structured content, comfortable reading column widths, restrained use of UI elements around content areas. |
| Obsidian | Markdown-native editing experience, comfortable split-view proportions, respect for power users through configurable engine and theme options. |

<a name="43-color-system" id="43-color-system"></a>

### 4.3. Color System

<div style="text-align:justify">

The color system is built on CSS custom properties defined at the `:root` level and scoped by a `data-theme` attribute on the document element. Three modes are supported: light, dark, and system (which follows `prefers-color-scheme`). Dark mode is the default.

</div>

All colors are defined as semantic tokens, never as raw hex values in component styles. The token vocabulary is deliberately small to enforce visual consistency.

**Surface tokens:**

| Token | Purpose | Dark Value | Light Value |
|-------|---------|------------|-------------|
| `--color-bg-primary` | Main application background | `#1a1a1a` | `#ffffff` |
| `--color-bg-secondary` | Sidebar, settings panels | `#222222` | `#f5f5f7` |
| `--color-bg-tertiary` | Editor pane background | `#1e1e1e` | `#fafafa` |
| `--color-bg-hover` | Interactive element hover state | `#2a2a2a` | `#ebebeb` |
| `--color-bg-active` | Active/selected element | `#333333` | `#e0e0e0` |

**Border tokens:**

| Token | Purpose | Dark Value | Light Value |
|-------|---------|------------|-------------|
| `--color-border-primary` | Panel dividers, input borders | `#333333` | `#e0e0e0` |
| `--color-border-subtle` | Faint separators, table rules | `#2a2a2a` | `#eeeeee` |

**Text tokens:**

| Token | Purpose | Dark Value | Light Value |
|-------|---------|------------|-------------|
| `--color-text-primary` | Body text, headings | `#e8e8e8` | `#1d1d1f` |
| `--color-text-secondary` | Subdued labels, metadata | `#999999` | `#6e6e73` |
| `--color-text-tertiary` | Placeholders, disabled text | `#666666` | `#aeaeb2` |

**Accent tokens:**

| Token | Purpose | Dark Value | Light Value |
|-------|---------|------------|-------------|
| `--color-accent` | Primary interactive elements, links | `#5e9eff` | `#0071e3` |
| `--color-accent-hover` | Hovered interactive elements | `#7bb3ff` | `#0077ed` |
| `--color-accent-subtle` | Soft accent backgrounds (badges, tags) | `rgba(94,158,255,0.12)` | `rgba(0,113,227,0.08)` |

**Status tokens:**

| Token | Purpose | Dark Value | Light Value |
|-------|---------|------------|-------------|
| `--color-success` | Lint pass, success states | `#30d158` | `#248a3d` |
| `--color-warning` | Lint warnings | `#ffd60a` | `#b25000` |
| `--color-error` | Lint errors, validation failures | `#ff453a` | `#d70015` |

<a name="44-typography" id="44-typography"></a>

### 4.4. Typography

**UI typography** (toolbars, settings labels, buttons):

| Token | Value |
|-------|-------|
| `--font-ui` | `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif` |
| `--font-size-xs` | `11px` |
| `--font-size-sm` | `12px` |
| `--font-size-base` | `13px` |
| `--font-size-lg` | `15px` |
| `--font-weight-normal` | `400` |
| `--font-weight-medium` | `500` |
| `--font-weight-semibold` | `600` |

**Editor typography** (raw markdown source in the CodeMirror pane):

| Token | Value |
|-------|-------|
| `--font-editor` | `"JetBrains Mono", "Fira Code", "SF Mono", "Cascadia Code", "Consolas", monospace` |
| `--font-size-editor` | `13px` |
| `--line-height-editor` | `1.6` |

**Preview typography** (rendered markdown output):

| Token | Value |
|-------|-------|
| `--font-preview` | `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif` |
| `--font-preview-mono` | `"JetBrains Mono", "Fira Code", monospace` |
| `--font-size-preview` | `15px` |
| `--line-height-preview` | `1.7` |

<div style="text-align:justify">

Font preferences for both editor and preview are user-configurable. The values above are compiled defaults. Users may select from a curated list of font stacks (including serif options for preview rendering) or supply a custom font-family string. Font files are not bundled with the application; the system's installed fonts are used.

</div>

<a name="45-spacing-and-layout" id="45-spacing-and-layout"></a>

### 4.5. Spacing and Layout

<div style="text-align:justify">

All spacing values are multiples of a 4px base unit, following an 8pt-grid-aligned system. This produces a consistent visual rhythm across all components.

</div>

| Token | Value | Usage |
|-------|-------|-------|
| `--space-1` | `4px` | Tight internal padding (icon-to-label gap) |
| `--space-2` | `8px` | Standard internal padding, small component gaps |
| `--space-3` | `12px` | Input field padding, list item padding |
| `--space-4` | `16px` | Section padding, card padding |
| `--space-6` | `24px` | Panel margins, large section gaps |
| `--space-8` | `32px` | Page-level margins |
| `--radius-sm` | `4px` | Buttons, inputs, small cards |
| `--radius-md` | `8px` | Panels, modals, dropdown menus |
| `--radius-lg` | `12px` | Application window corners (where supported) |

<a name="46-component-styling" id="46-component-styling"></a>

### 4.6. Component Styling

**Toolbar.** A single horizontal bar at the top of the viewport. Height: `40px`. Background: `--color-bg-secondary`. Bottom border: `1px solid --color-border-primary`. The toolbar is organized into three zones: **Navigation** (left), **Context** (center), and **Actions** (right).

**Navigation zone.** Contains a segmented control for the three content modes (View, Edit, Edit Only), plus the chevron toggle for the pop-down quick-settings panel. The segmented control has `1px solid --color-border-subtle` boundary, `--color-bg-tertiary` background, and 2px inner padding. The active content mode button uses `--color-bg-active`.

**Context zone.** Shows centered document context with ellipsis overflow. In document modes this is the filename (`text-align: center`, `white-space: nowrap`, `overflow: hidden`, `text-overflow: ellipsis`) with a native `title` attribute for full-path hover. In Workspaces mode this region is replaced by workspace controls (refresh + filter input + scanning state). In Settings mode it shows a centered Settings label.

**Actions zone.** Contains file actions (Open, New, Save/Save As SplitButton, Export) followed by a subtle vertical separator (`1px`, `--color-border-subtle`) and destination buttons (Workspaces, Settings, Info). Workspaces and Settings are not part of the segmented content-mode control; they are standalone destination buttons and use `--color-bg-active` when selected. The **Info** button opens a dropdown menu with two items: **About** (opens the About modal) and **Help** (switches to the Help view).

**Pop-Down Quick-Settings Panel.** A collapsible panel that slides down from the toolbar when the user clicks the chevron (`ChevronDown` / `ChevronUp`) button. Animation: slide down over 150ms ease-out. The panel's visibility state is persisted in `general.editorToolbarExpanded` (default `false`). The panel is hidden when Workspaces or Settings views are active. Content varies by active view mode:

- *View mode:* Preview font size and line height inputs.
- *Edit mode:* Editor section (font size, line height, line numbers toggle, word wrap toggle, linting toggle, linter dropdown) separated by a vertical divider from a Preview section (font size, line height).
- *Edit Only mode:* Editor section only (font size, line height, line numbers toggle, word wrap toggle, linting toggle, linter dropdown).

All controls in the pop-down panel have tooltips. Changes apply immediately and update the same config keys used by the Settings page.

**Buttons.** Two visual variants:

- *Ghost* (default): transparent background, `--color-text-secondary` foreground. On hover: `--color-bg-hover` background, `--color-text-primary` foreground.
- *Accent*: `--color-accent` background, white foreground. On hover: `--color-accent-hover` background. Used sparingly (primary conversion actions, confirm dialogs).

All buttons use `--radius-sm` border radius. Minimum tap target: `32px` square. Focus states use a `2px` outline offset with `--color-accent` via `:focus-visible`; no JavaScript focus/blur handlers are used for focus ring management.

**Scrollbars.** All scrollable containers use thin scrollbars styled to match the active theme. Width: `6px`. Track color: `--color-bg-secondary`. Thumb color: `--color-bg-active`; on hover: `--color-bg-hover`. Firefox receives `scrollbar-width: thin` with matching `scrollbar-color`. WebKit browsers receive custom `::-webkit-scrollbar` pseudo-element styling.

**Inputs.** Background: `--color-bg-tertiary`. Border: `1px solid --color-border-primary`. On focus: border transitions to `--color-accent`. Padding: `--space-2` horizontal, `--space-1` vertical. Text: `--font-size-base`.

**Panels and dividers.** Pane dividers (e.g., the split-view separator) are `1px solid --color-border-primary`. The divider is draggable in split-view to resize pane proportions. Drag affordance: on hover, the divider thickens to `3px` and changes color to `--color-accent-subtle`.

**Tooltips.** Background: `--color-bg-active`. Text: `--color-text-primary`. Font size: `--font-size-xs`. Border radius: `--radius-sm`. Padding: `--space-1` vertical, `--space-2` horizontal. Appear after a 400ms hover delay, fade in over 120ms. **Every interactive element** (buttons, toggles, icon-buttons, extension-chip remove buttons) must be wrapped in a tooltip. No interactive control may exist without a discoverable label.

**Modals.** Centered overlay with a backdrop of `rgba(0,0,0,0.5)`. Modal surface: `--color-bg-secondary`, `--radius-md` border radius, `1px solid --color-border-primary`. Max width: `480px`. Content padding: `--space-6`. Entrance animation: fade in + scale from 0.97 to 1.0 over 150ms.

**SplitButton.** A compound button used for Save / Save As. When a file path is established, the button renders as a split: the primary region triggers Save (`Ctrl/Cmd+S`), and a chevron dropdown exposes a "Save As…" menu item (`Ctrl/Cmd+Shift+S`). When no file path is established, the button renders as a plain Save As action button. SplitButton respects `appearance.showButtonLabels`: when enabled it renders "Save" / "Save As" text alongside icons.

**StatusBar.** A persistent bar at the bottom of the application window. Height: `24px`. Background: `--color-bg-secondary`. Top border: `1px solid --color-border-primary`. Typography: `--font-size-xs`, `--font-ui`, `--color-text-tertiary`. Left side shows active markdown engine display name. Right side shows `Shruggie Markdown v{version}`.

<a name="47-motion-and-transitions" id="47-motion-and-transitions"></a>

### 4.7. Motion and Transitions

<div style="text-align:justify">

Motion is functional, not decorative. Transitions exist to maintain spatial continuity (e.g., pane resizing) and to signal state changes (e.g., theme switching). No animation should draw attention to itself.

</div>

| Context | Duration | Easing | Property |
|---------|----------|--------|----------|
| Hover state changes | `120ms` | `ease-out` | `background-color`, `color`, `border-color` |
| View mode toggle | `200ms` | `ease-in-out` | `width`, `opacity` |
| Theme switch | `250ms` | `ease-in-out` | All color tokens via CSS transition on `[data-theme]` |
| Modal entrance | `150ms` | `cubic-bezier(0.16, 1, 0.3, 1)` | `opacity`, `transform` |
| Tooltip appearance | `120ms` | `ease-out` | `opacity` |
| Pane resize (drag) | `0ms` | — | `width` (immediate, no transition during active drag) |

Users who enable `prefers-reduced-motion` at the OS level receive instant state changes with no transitions. The application MUST respect this preference.

<a name="48-iconography" id="48-iconography"></a>

### 4.8. Iconography

<div style="text-align:justify">

Icons use the Lucide icon set (the fork of Feather Icons). All icons render at `16px` with a `1.5px` stroke weight for the default toolbar size. Icons inherit the current text color via `currentColor`. No filled icon variants are used; the entire icon language is outlined/stroked for visual consistency.

</div>

---

<a name="5-application-layout" id="5-application-layout"></a>
<hr class="print-page-break">

## 5. Application Layout

<a name="51-view-modes" id="51-view-modes"></a>

### 5.1. View Modes

The application has five top-level views, three of which are content modes and two of which are navigation overlays:

| View | Shortcut | Description |
|------|----------|-------------|
| View | `Ctrl/Cmd+1` | Rendered markdown preview only. Default on web/PWA/Chrome Extension. |
| Edit | `Ctrl/Cmd+2` | Side-by-side editor and preview with draggable divider. Default on desktop. |
| Edit Only | `Ctrl/Cmd+4` | Full-window CodeMirror editor, no preview pane. |
| Workspaces | `Ctrl/Cmd+3` | Workspace file management. Desktop only. |
| Settings | `Ctrl/Cmd+,` | Configuration panel. |

The toolbar separates content modes from destinations: View, Edit, and Edit Only are grouped in the segmented control, while Workspaces (desktop only) and Settings are standalone destination buttons in the actions zone. Active content mode and active destination each use `--color-bg-active` highlighting in their respective groups.

The initial view mode is platform-aware: desktop (Tauri) defaults to Edit; web, PWA, and Chrome extension default to View. If the user has previously selected a content mode, that choice is persisted in `general.lastViewMode` (valid values: `"view"`, `"edit"`, `"edit-only"`) and restored on next launch. Workspaces and Settings are transient navigation overlays and are never persisted. Legacy config values `"full-view"` and `"split-view"` are silently migrated to `"view"` and `"edit"` respectively.

<a name="52-full-view-mode" id="52-full-view-mode"></a>

### 5.2. View Mode

<div style="text-align:justify">

View mode is the default on web and PWA targets. On desktop (Tauri), the default is Edit mode unless overridden by a persisted `general.lastViewMode` preference. The rendered markdown fills the viewport below the toolbar. Content is horizontally centered with a maximum reading width of `720px` and horizontal padding of `--space-8` on each side. This produces a comfortable, Notion-like reading column that prevents excessively long line lengths on wide displays.

</div>

When viewing a local file on desktop, the application watches the file for changes on disk. If the source file is modified externally, the preview re-renders automatically with no user action required. A subtle flash indicator (a brief `200ms` pulse of `--color-accent-subtle` on the document background) signals that the content has refreshed.

<a name="53-split-view-mode" id="53-split-view-mode"></a>

### 5.3. Edit Mode

<div style="text-align:justify">

Edit mode places the CodeMirror editor on the left and the rendered preview on the right. The default split ratio is 50/50. A draggable divider allows the user to resize the panes. The minimum width for either pane is `280px`. Pane proportions are persisted in configuration and restored on next launch.

</div>

Scroll synchronization: the preview pane scroll position tracks the editor cursor position. When the cursor moves in the editor, the preview scrolls to bring the corresponding rendered content into view. This synchronization uses a proportional mapping (editor scroll percentage maps to preview scroll percentage) rather than per-line tracking, which avoids visual jitter with content that expands during rendering (tables, code blocks, images).

#### 5.3.1. Edit Only Mode

<div style="text-align:justify">

Edit Only mode renders the CodeMirror editor at full viewport width (minus toolbar height). No preview pane or divider is displayed. The editor respects all editor settings (font family, font size, line height, line numbers, word wrap, linting). Save, Save As, and all keyboard shortcuts work identically to Edit mode.

</div>

<a name="54-workspaces-view" id="54-workspaces-view"></a>

### 5.4. Workspaces View

The workspaces view replaces the editor/preview area with a workspace management interface. A collapsible workspace list panel on the right lists all workspaces, with the default workspace pinned at the top. Selecting a workspace displays its files in a sortable, filterable data table. See [§9](#9-workspaces) for full workspace behavior. The toolbar adapts to show workspace-specific controls (refresh, filter input).

<a name="55-settings-view" id="55-settings-view"></a>

### 5.5. Settings View

<div style="text-align:justify">

Settings are presented as a single scrollable panel organized into labeled sections. Each section is a card-like region with a section heading, a brief description, and the associated controls. Every individual setting field includes an inline description (small hint text below the label) explaining what it does. The visual treatment follows the Apple System Settings / Linear Settings pattern: clean vertical stacking with generous whitespace between sections and no tab navigation within settings.

</div>

Settings sections (in order of appearance):

1. **Appearance** — Color mode toggle (Light / Dark / System), visual style selection.
2. **Editor** — Font selection, font size, linting toggle, linter selection.
3. **Preview** — Font selection, font size, line height.
4. **Markdown Engine** — Engine selection dropdown.
5. **File Extensions** — Extension whitelist editor.
6. **Advanced** — Log verbosity setting.

The About information has been moved to a standalone modal accessible from the Info toolbar button dropdown. Per-workspace settings (recursion, hidden files, independent extensions) are managed through the workspace settings modal, not the global Settings view.

### 5.6. About Modal

The About modal is opened from the Info toolbar dropdown > About. It is a centered modal dialog (not a full view) displaying:

- Application name: "Shruggie Markdown"
- Current version (from the `__APP_VERSION__` build-time constant)
- Build platform (Tauri Desktop, Chrome Extension, or PWA, detected at runtime)
- Attribution: "Built by Shruggie LLC (DBA ShruggieTech)"
- Link to the GitHub repository
- License: Apache-2.0

The About modal is transient; it does not affect view mode persistence.

### 5.7. Help View

The Help view is opened from the Info toolbar dropdown > Help. It renders the application's welcome/onboarding content in read-only mode using the Preview component. The Help view:

- Is **not editable**. No editor is rendered.
- Is **not a document**. It does not set `fileName`, `filePath`, or `content` state. It does not affect the file watcher and cannot be saved or exported.
- Uses the same static content string as the default welcome document shown on first launch (sourced from `src/constants/welcomeContent.ts`).
- Displays a minimal toolbar state (no Save, Export, or file-related controls), similar to the Settings view.
- Is a transient view: the `"help"` view mode is not persisted to `general.lastViewMode`.

---

<a name="6-core-features" id="6-core-features"></a>
<hr class="print-page-break">

## 6. Core Features

<a name="61-viewing" id="61-viewing"></a>

### 6.1. Opening Files

Files are opened through a unified **Open dialog** (`Ctrl/Cmd+O` or the toolbar Open button). The dialog provides two source tabs:

- **File tab.** Opens a native file picker limited to [recognized extensions](#105-file-extension-settings). The selected file is validated, read from disk, and its content is loaded into the editor/preview. If the file resides outside the selected workspace's directory, it is opened in-place (the workspace records the external path).
- **URL tab.** Accepts a public URL. The application sends a plain `GET` request; if the response content-type is not a text type, the dialog displays an error. Content is loaded in read-only mode.

The dialog also includes:

- **Workspace selector.** A dropdown of all workspaces. The last option, "Add a new workspace…", expands inline workspace-creation fields (name input, Create/Cancel buttons). The default workspace is pre-selected.
- **Name override.** An optional text field to override the document title derived from the file name or URL.

**Document model.** Every opened file is registered in the documents table with a unique ID, source type (`local`, `remote`, or `internal`), source path/URL, and the selected workspace ID. This metadata is used for edit history, workspace browsing, and save-path tracking.

**CLI and OS associations.** Files opened via CLI (`shruggie-md <filepath>`) or OS file association (double-click) bypass the dialog. The file is opened directly into the default workspace. URL arguments (`shruggie-md --url <url>`) are fetched and registered the same way.

**Live reload.** On desktop, a filesystem watcher (Tauri's `watch` API) monitors the open file. When the file's modification timestamp changes, the source is re-read and the preview re-renders. The watcher debounces rapid successive changes with a 300ms delay to avoid unnecessary render cycles during active external editing.

<a name="62-editing" id="62-editing"></a>

### 6.2. Editing

<div style="text-align:justify">

Editing is available in split-view and edit-only modes. The CodeMirror editor provides the editing surface with full markdown syntax highlighting, configurable linting, and standard editor conveniences (undo/redo, find/replace, line numbers). Changes in the editor are reflected in the preview pane in real-time with a 150ms debounce on the render cycle.

</div>

**New Document.** The toolbar New Document button creates a blank editor buffer, clears the file path and document association, and switches to edit mode.

**Saving.** On desktop, edits can be saved back to the source file via `Ctrl/Cmd+S` (Save) or written to a new location via `Ctrl/Cmd+Shift+S` (Save As). Save overwrites the current file atomically (write to temp file, then rename). Save As opens a native file dialog to choose a destination; on success the working file path updates to the new location. In the Chrome extension and PWA targets, Save As triggers a browser download. A context-aware SplitButton in the toolbar adapts its presentation: when a file path is established it shows Save (primary) + Save As (dropdown); when no path is established it shows a single Save As icon button.

**Edit history.** When a file is saved, the application creates an edit history snapshot via `storage.appendEditHistory()` and updates the document's `updated_at` timestamp. This enables future undo/version-tracking features.

<a name="63-exporting" id="63-exporting"></a>

### 6.3. Exporting

Export is accessed through a unified **Export dialog** (`Ctrl/Cmd+Shift+E` or the toolbar Export button). The dialog presents three format options:

| Format | Description | Shortcut |
|--------|-------------|----------|
| **HTML** | Self-contained HTML file with all styles inlined. No external stylesheet references. | `Ctrl/Cmd+Shift+H` (direct) |
| **PDF** | Print to PDF via the browser's native print dialog / Tauri PDF write. | `Ctrl/Cmd+Shift+P` (direct) |
| **Markdown** | Raw markdown file (.md) saved via Save As. | — |

The direct keyboard shortcuts (`Ctrl/Cmd+Shift+H` and `Ctrl/Cmd+Shift+P`) bypass the dialog and invoke the corresponding export immediately.

**PDF default filename.** The PDF export sets the HTML `<title>` of the generated document to the current filename (without extension) if a file is open, or `"Untitled"` if no file is open. This title is used by the browser's print dialog as the default filename for the saved PDF. A guard flag prevents the print dialog from appearing twice per export invocation.

**HTML export** produces the same compiled HTML that is rendered in the preview pane, wrapped in a self-contained document with inlined theme styles.

**PDF export** uses the browser's native print pathway:

1. The markdown is compiled to HTML.
2. A print-specific stylesheet is applied (standard print margins, page numbers in the footer, no URL footers, appropriate page-break behavior).
3. `<hr>` elements in the source markdown are replaced with CSS `page-break-before: always` rules.
4. The print dialog is invoked (or, on desktop via Tauri, a direct PDF write operation if available).

**Markdown export** writes the raw editor content via Save As with a `.md` extension.

<a name="64-remote-content" id="64-remote-content"></a>

### 6.4. Remote Content

Remote URL fetching supports only publicly accessible endpoints. The application sends a plain HTTP `GET` request. CORS restrictions apply in browser contexts (Chrome extension, PWA). The Chrome extension uses the `host_permissions` declaration in the manifest to bypass CORS for user-specified URLs.

Remote content is registered in the document model with `source_type: "remote"` and the original URL. The editor is available for inspection, but save operations are disabled for remote content. The toolbar Save button is disabled; only Export and Save As are available.

---

<a name="7-editor-engine" id="7-editor-engine"></a>
<hr class="print-page-break">

## 7. Editor Engine

<a name="71-codemirror-integration" id="71-codemirror-integration"></a>

### 7.1. CodeMirror Integration

<div style="text-align:justify">

The editor pane is a CodeMirror 6 instance configured for markdown editing. CodeMirror is chosen for its modular architecture, excellent TypeScript support, accessibility compliance, and extensibility for syntax highlighting and linting integration.

</div>

Required CodeMirror extensions:

| Extension | Purpose |
|-----------|---------|
| `@codemirror/lang-markdown` | Markdown language mode with syntax tree |
| `@codemirror/language-data` | Language detection for fenced code blocks |
| `@codemirror/search` | Find and replace |
| `@codemirror/autocomplete` | Optional completion hints |
| `@codemirror/lint` | Lint integration framework |
| `@codemirror/view` (line numbers, highlight active line) | Core editor features |
| `@codemirror/state` | Editor state management |

The editor theme is derived from the application's color tokens. A custom CodeMirror theme is constructed at runtime from the active CSS custom property values, ensuring the editor appearance always matches the selected application theme.

The `showLineNumbers` and `wordWrap` editor settings ([§10.3](#103-editor-preferences)) are wired to the CodeMirror instance via `Compartment`-based dynamic reconfiguration. When the user toggles these settings, the editor reconfigures in place without recreating the entire `EditorView`. Each setting is controlled by its own `Compartment` ref, and a `useEffect` dispatches a reconfigure transaction whenever the prop changes.

<a name="72-syntax-highlighting" id="72-syntax-highlighting"></a>

### 7.2. Syntax Highlighting

Markdown syntax highlighting in the editor MUST clearly distinguish:

| Element | Styling Approach |
|---------|-----------------|
| Headings (`#`, `##`, etc.) | Bold, scaled font size, `--color-text-primary` |
| Bold / italic markers | Dimmed marker characters (`--color-text-tertiary`), styled content text |
| Links | URL portion in `--color-text-secondary`, link text in `--color-accent` |
| Code spans and fenced blocks | `--font-editor` (monospace), `--color-bg-hover` background |
| Blockquotes | Left border accent, slightly dimmed text |
| List markers | `--color-accent` for bullet/number characters |
| Horizontal rules | `--color-border-primary` styled line |

<div style="text-align:justify">

Fenced code blocks receive language-specific syntax highlighting via `@codemirror/language-data`, which provides grammar definitions for common programming languages. The highlighting inside fenced code blocks uses the same color palette as the surrounding markdown but with language-aware token coloring.

</div>

<a name="73-markdown-linting" id="73-markdown-linting"></a>

### 7.3. Markdown Linting

Linting is optional and disabled by default. When enabled, lint diagnostics appear as:

- Inline underlines (wavy for errors, dotted for warnings) beneath the offending text.
- A tooltip popup on hover showing the rule ID, severity, and a human-readable description of the issue.
- A summary count (errors/warnings) in the toolbar's status area.

**Available linters:**

| Linter | Package | Description |
|--------|---------|-------------|
| markdownlint | `markdownlint` (via `markdownlint-rule-helpers`) | The widely adopted standard. Strong default rule set covering heading style, list consistency, line length, and more. |
| remark-lint | `remark-lint` (via the unified/remark ecosystem) | Plugin-based linter with fine-grained rule composition. Integrates naturally with the remark markdown engine if selected. |

<div style="text-align:justify">

Users may switch between linters in the Editor section of settings. Both linters are bundled; switching is instant and does not require a reload. The active linter's diagnostics are piped into CodeMirror's lint extension via a custom lint source function that adapts each linter's output format to the CodeMirror `Diagnostic` interface.

</div>

---

<a name="8-markdown-rendering" id="8-markdown-rendering"></a>
<hr class="print-page-break">

## 8. Markdown Rendering

<a name="81-rendering-pipeline" id="81-rendering-pipeline"></a>

### 8.1. Rendering Pipeline

The rendering pipeline transforms markdown source into styled HTML displayed in the preview pane:

1. Raw markdown source (from file, editor buffer, or remote fetch).
2. Markdown engine compiles source to an HTML string.
3. HTML is sanitized (DOMPurify) to prevent XSS from untrusted content.
4. Sanitized HTML is injected into the preview container.
5. Post-render hooks apply syntax highlighting to code blocks (via highlight.js or Shiki, configurable).

<a name="82-selectable-engines" id="82-selectable-engines"></a>

### 8.2. Selectable Engines

<div style="text-align:justify">

The markdown engine is selectable in the technical options section of settings. This is an advanced feature; the default engine (markdown-it) is suitable for the vast majority of users. Engine selection is exposed to support power users who have specific rendering requirements or preferences.

</div>

| Engine | Package | Default | Notes |
|--------|---------|---------|-------|
| markdown-it | `markdown-it` | Yes | Fast, CommonMark-compliant, rich plugin ecosystem. Supports GFM tables, task lists, footnotes via plugins. |
| marked | `marked` | No | Lightweight and fast. Fewer extension points than markdown-it. |
| remark (unified) | `remark` + `remark-html` | No | AST-based pipeline. Maximum extensibility. Pairs naturally with remark-lint. |

<div style="text-align:justify">

All engines MUST produce output that passes through the same sanitization and styling pipeline. Engine selection affects parsing behavior (e.g., how edge-case markdown constructs are interpreted), not the visual presentation of the rendered output.

</div>

<a name="83-rendered-content-styling" id="83-rendered-content-styling"></a>

### 8.3. Rendered Content Styling

The preview pane applies a dedicated stylesheet to rendered HTML. This stylesheet is independent of the editor theme and is designed for comfortable reading.

Key rendered content styles:

- **Headings.** `h1` through `h6` use `--font-preview` with descending sizes (28px, 22px, 18px, 16px, 15px, 13px). Bottom border on `h1` and `h2` (`1px solid --color-border-subtle`). Margin top: `1.5em`, margin bottom: `0.5em`.
- **Paragraphs.** `--font-size-preview`, `--line-height-preview`. Margin bottom: `1em`.
- **Code blocks.** Background: `--color-bg-tertiary`. Padding: `--space-4`. Border radius: `6px` (GitHub-aligned). Font: `--font-preview-mono`. Overflow: horizontal scroll.
- **Inline code.** Background: `--color-bg-hover`. Padding: `2px 6px`. Border radius: `3px`.
- **Blockquotes.** Left border: `4px solid --color-border-primary`. Padding left: `--space-4`. Text color: `--color-text-secondary`.
- **Tables.** Full width. Header row: `--color-bg-secondary` background, `--font-weight-semibold`. Cell padding: `--space-2` vertical, `--space-3` horizontal. Borders: `1px solid --color-border-primary`. Body rows use alternating backgrounds (`transparent` / `--color-bg-tertiary`) for GitHub-style scanability.
- **Links.** Color: `--color-accent`. No underline by default; underline on hover.
- **Images.** Max width: `100%`. Border radius: `--radius-sm`. Centered within the reading column.
- **Horizontal rules.** `1px solid --color-border-subtle`. Margin: `--space-6` vertical.
- **Task lists.** Custom checkbox styling matching the application's visual language (accent color when checked, subtle border when unchecked).

---

<a name="9-workspaces" id="9-workspaces"></a>
<hr class="print-page-break">

## 9. Workspaces

<a name="91-purpose" id="91-purpose"></a>

### 9.1. Purpose

<div style="text-align:justify">

The workspace system provides a document management interface for organizing markdown files into named containers. Each workspace maps to a directory on the filesystem (desktop) or a logical partition in IndexedDB (Chrome Extension / PWA). Multiple workspaces can exist simultaneously, each with independent settings.

</div>

<a name="92-default-workspace" id="92-default-workspace"></a>

### 9.2. Default Workspace

On first launch (or when no workspaces exist in the database), the application creates a default workspace:

- **Type:** Internal.
- **Name:** "Default" (read-only, cannot be renamed).
- **Path (desktop):** `{app_data_dir}/workspaces/Default/`. Created on disk if it does not exist.
- **Path (Chrome Extension / PWA):** `__internal__/Default` (logical identifier backed by IndexedDB).
- **`is_default` flag:** `true` (`1` in SQLite).
- The default workspace cannot be deleted.

<a name="93-workspace-types" id="93-workspace-types"></a>

### 9.3. Workspace Types

**Internal workspaces** are created and managed by the application. Their directories reside under `{app_data_dir}/workspaces/{name}/`. The application creates the directory when the workspace is created and removes it when the workspace is deleted.

**External workspaces** reference a user-chosen directory on the filesystem. The directory must already exist. The application does not create, move, or delete external workspace directories. Only the workspace record in the database is affected by workspace management operations.

On Chrome Extension and PWA platforms, only internal workspaces are available (no filesystem access for external directories).

<a name="94-workspace-crud" id="94-workspace-crud"></a>

### 9.4. Workspace CRUD

**Creating a workspace:**

- Primary entry point: the user clicks "Add Workspace" from the Workspaces view management bar.
- Secondary convenience entry point: inline creation from the Open dialog workspace selector.
- Options: Internal (name only) or External (name + directory picker on desktop).
- Name validation enforces: no empty names, 128-character maximum, no OS-disallowed characters (`< > : " / \ | ? *`, null bytes), no Windows reserved names (`CON`, `PRN`, `AUX`, `NUL`, `COM1`–`COM9`, `LPT1`–`LPT9`), no leading/trailing dots.
- Name uniqueness is enforced (case-insensitive comparison).

**Deleting a workspace:**

- Internal: removes the workspace record and its directory (with contents) from disk. A confirmation dialog warns the user.
- External: removes only the workspace record. The directory on disk is not touched.
- The default workspace cannot be deleted.

**Workspace list panel:** Displayed as a collapsible right-aligned panel on the Workspaces view. The default workspace is always listed first. Each row shows the workspace name and an ellipsis button for settings.

<a name="95-workspace-file-table" id="95-workspace-file-table"></a>

### 9.5. Workspace File Table

When a workspace is selected, the main content area displays a sortable data table:

| Column | Content | Sort Behavior |
|--------|---------|---------------|
| Title | Filename without extension | Alphabetical (case-insensitive) |
| Path | Absolute path to the file | Alphabetical |
| Last Edited | ISO 8601 date-time with UTC offset (`mtime`) | Chronological (newest first default) |
| Created | ISO 8601 date-time with UTC offset (`birthtime`) | Chronological |

<div style="text-align:justify">

Clicking a row opens the file in full-view mode. The table supports multi-column sorting (click a column header to sort; shift-click to add a secondary sort). A text filter input in the toolbar performs substring matching against the Title and Path columns.

</div>

**Empty state.** When the active workspace contains no recognized files, the file table area displays the message: "No files found. Create a new file or add a workspace to get started." Two action buttons are presented: a "New File" button (triggers the same new-document handler as the toolbar's New Document button, switching to edit mode with a blank buffer) and the existing workspace management controls.

<a name="96-per-workspace-settings" id="96-per-workspace-settings"></a>

### 9.6. Per-Workspace Settings

Each workspace has its own settings, accessible via the ellipsis button on the workspace list panel. Settings open in a modal dialog.

| Setting | Type | Default | Notes |
|---------|------|---------|-------|
| Recursive traversal | boolean | `true` | Whether to scan subdirectories |
| Show hidden files | boolean | `false` | Whether to include dotfiles |
| Independent extension rules | boolean | `false` | When enabled, this workspace uses its own extension whitelist |
| Extension whitelist | string[] | (global default) | Only visible when independent extension rules is enabled |

Per-workspace settings are stored as a JSON string in the `settings` TEXT column of the `workspaces` table.

<a name="97-traversal-and-filtering" id="97-traversal-and-filtering"></a>

### 9.7. Traversal and Filtering

- By default, each workspace recursively traverses all subdirectories within its root.
- The per-workspace recursion toggle disables recursion, limiting the scan to top-level files only.
- The per-workspace hidden files toggle controls whether dotfiles are included. Default: hidden items are excluded.
- Non-markdown files (as determined by the active extension rules — global or per-workspace) are silently ignored.

---

<a name="10-configuration-and-preferences" id="10-configuration-and-preferences"></a>
<hr class="print-page-break">

## 10. Configuration and Preferences

<a name="101-configuration-architecture" id="101-configuration-architecture"></a>

### 10.1. Configuration Architecture

<div style="text-align:justify">

Configuration is persisted via a **storage abstraction layer** that selects the appropriate backend per platform:

- **Desktop (Tauri):** SQLite database (`shruggie-md.db`) located in the platform-standard application data directory ([§10.5](#105-storage-locations)), accessed through `tauri-plugin-sql`. Configuration entries are stored in a `config` table as key-value pairs with dotted paths (e.g., `editor.fontSize`) and JSON-encoded values.
- **Chrome Extension / PWA:** IndexedDB database named `shruggie-md`, version 1. The `config` object store uses the same dotted-path key-value schema. The Chrome Extension retains `chrome.storage.sync` only as a legacy fallback; the primary store is IndexedDB.

</div>

The storage abstraction (`StorageAdapter` interface in `src/storage/`) exposes methods for:

- **Config** — key-value read/write (replaces legacy JSON config persistence).
- **Documents** — CRUD for the document registry.
- **Workspaces** — CRUD for the workspace registry.
- **Logs** — append and query with filters ([§10.6](#106-logging)).
- **Edit History** — append, query, and prune per-document snapshots.

All configuration keys have compiled defaults in the application source. User-set values override defaults. Unknown keys in persisted configuration are silently ignored for forward compatibility.

**Migration:** On first launch after upgrading from a JSON-config release, the application detects the old `config.json` (desktop) or legacy IndexedDB/localStorage store and migrates its contents into the new `config` table. After a successful migration the old file is renamed to `config.json.bak`. An `info`-level log entry records the migration. If no old config exists (fresh install), defaults are used.

### 10.1.1. General Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| Last view mode | `"view"` \| `"edit"` \| `"edit-only"` \| `"workspaces"` \| `"settings"` \| `null` | `null` | Persisted user preference for the initial view mode. All five primary view modes are persisted. Transient views (`"help"`) are never stored. When `null`, the platform-aware default applies (Edit on desktop, View on web). Legacy values `"full-view"` and `"split-view"` are silently migrated to `"view"` and `"edit"`. |
| Editor toolbar expanded | `boolean` | `false` | Whether the pop-down quick-settings panel below the toolbar is expanded on launch. |
| Log verbosity | `"debug"` \| `"info"` \| `"warning"` \| `"error"` | `"warning"` | Controls the minimum severity level for persisted log entries. Entries below this threshold are still written to the browser console during development but are not stored. Exposed in the **Advanced** section of the Settings panel ([§10.6](#106-logging)). |
| Last document path | `string` \| `null` | `null` | The filesystem path of the last-opened local document. Used for document restoration on launch. |
| Last document source | `"local"` \| `"remote"` \| `null` | `null` | Whether the last document was local or remote. Remote documents are not restored on launch (they require a fresh fetch). |

<a name="102-theme-and-appearance" id="102-theme-and-appearance"></a>

### 10.2. Theme and Appearance

| Setting | Type | Default | Options |
|---------|------|---------|---------|
| Color mode | enum | `dark` | `light`, `dark`, `system` |
| Visual style | enum | `default` | A small curated set of named styles (e.g., `default`, `warm`, `cool`, `monochrome`) || Show button labels | boolean | `true` | When enabled, toolbar buttons display a text label alongside their icon. When disabled, buttons show the icon only (with tooltips). |
<div style="text-align:justify">

Visual styles adjust the color token values within the active color mode. For example, the `warm` style shifts surface colors toward amber tones, while the `monochrome` style reduces the accent palette to grayscale. The style system is implemented as named sets of CSS custom property overrides layered on top of the base light/dark tokens.

</div>

<a name="103-editor-preferences" id="103-editor-preferences"></a>

### 10.3. Editor Preferences

| Setting | Type | Default |
|---------|------|---------|
| Font family | string (font stack) | `"JetBrains Mono", "Fira Code", monospace` |
| Font size | number (px) | `13` |
| Line height | number | `1.6` |
| Show line numbers | boolean | `true` |
| Word wrap | boolean | `true` |
| Linting enabled | boolean | `false` |
| Active linter | enum | `markdownlint` |

<a name="104-file-extension-rules" id="104-file-extension-rules"></a>

### 10.4. File Extension Rules

<div style="text-align:justify">

The application maintains a configurable set of file extensions it recognizes as markdown. The default set is: `.md`, `.markdown`, `.mdown`, `.mkdn`, `.mkd`. Files that do not match any extension in the set are rejected with a user-visible error message suggesting that the user modify the recognized extensions in settings.

</div>

These rules apply in file viewing mode and (by default) in the workspace file table. Each workspace may optionally override these rules with its own independent extension whitelist ([§9.6](#96-per-workspace-settings)).

<a name="105-storage-locations" id="105-storage-locations"></a>

### 10.5. Storage Locations

| Platform | Config / Data Path | Database |
|----------|-------------------|----------|
| Windows | `%LOCALAPPDATA%\shruggie-tech\shruggie-md\` | `shruggie-md.db` (SQLite) |
| Linux | `$XDG_CONFIG_HOME/shruggie-md/` (default: `~/.config/shruggie-md/`) | `shruggie-md.db` (SQLite) |
| macOS | `~/Library/Application Support/shruggie-md/` | `shruggie-md.db` (SQLite) |
| Chrome extension | Origin-scoped browser storage | IndexedDB `shruggie-md` |
| PWA | Origin-scoped browser storage | IndexedDB `shruggie-md` |

On desktop, the SQLite database file is created automatically by `tauri-plugin-sql` inside the platform config directory. The app data directory also contains a `workspaces/` subdirectory for internal workspace storage (e.g., `{app_data_dir}/workspaces/Default/`). On Chrome Extension and PWA targets the IndexedDB database is origin-scoped and managed by the browser.

<a name="106-logging" id="106-logging"></a>

### 10.6. Logging

The application maintains a structured log via the `logs` table (SQLite) or `logs` object store (IndexedDB). Each entry records:

| Column | Type | Description |
|--------|------|-------------|
| `id` | auto-increment | Primary key. |
| `timestamp` | ISO-8601 string | When the event occurred. |
| `level` | `"debug"` \| `"info"` \| `"warning"` \| `"error"` | Severity. |
| `module` | string | Source module (e.g., `"migration"`, `"storage"`). |
| `message` | string | Human-readable description. |
| `details` | string \| `null` | Optional JSON-encoded context. |

Entries are **persisted only when** their severity is at or above the configured `advanced.logVerbosity` threshold ([§10.1.1](#1011-general-settings)). In development builds (`import.meta.env.DEV`), all entries are additionally written to the browser console regardless of the threshold setting.

The logger is a module-level singleton initialised during the application boot sequence via `initLogger(storage, verbosity)`. Application code retrieves it via `getLogger()`.

<a name="107-window-state-persistence" id="107-window-state-persistence"></a>

### 10.7. Window State Persistence

<div style="text-align:justify">

On desktop platforms the application persists the main window's geometry between sessions. The following config keys are written during runtime window movement/resizing (debounced) and on window close, then restored on the next launch:

</div>

| Key | Type | Description |
|-----|------|-------------|
| `window.width` | number (px) | Outer width of the window. |
| `window.height` | number (px) | Outer height of the window. |
| `window.x` | number (px) | Horizontal screen offset. |
| `window.y` | number (px) | Vertical screen offset. |
| `window.maximized` | boolean | Whether the window was maximised. |

<div style="text-align:justify">

On restore, the saved position is validated against the set of currently connected monitors (via `availableMonitors()`). If the saved position would place the window entirely off-screen, the application falls back to centering the window on the primary monitor. When the window was maximised at close, the non-maximised dimensions are restored first and then the window is re-maximised, ensuring a sensible size if the user later un-maximises.

Window geometry writes occur in two paths: (1) debounced incremental saves on move/resize events and (2) a best-effort close-time save guarded by a 2-second timeout. If the close-time save fails or times out, the most recently persisted move/resize geometry is used on next launch.

</div>

These keys are stored in the config table but are **not** part of the React `Config` type — they are read and written directly by the `useWindowState` hook and are invisible to the Settings UI.

### 10.8. Document State Restoration

On application startup, after config and storage are loaded, the application reads `general.lastDocumentPath` and `general.lastDocumentSource` from the persisted config:

- If the source is `"local"` and the path is non-null, the application attempts to read the file via the platform adapter's `readFile`. On success, it populates `content`, `fileName`, `filePath`, and starts the file watcher. On failure (file deleted, moved, or inaccessible), the persisted keys are cleared and the application proceeds with the default welcome document.
- If the source is `"remote"` or `null`, no restoration is attempted.

Document path persistence is updated whenever a file is opened (via Open dialog, workspace file click, CLI argument, or Save As) and cleared when the user creates a new blank document.

---

<a name="11-platform-targets" id="11-platform-targets"></a>
<hr class="print-page-break">

## 11. Platform Targets

<a name="111-desktop-application" id="111-desktop-application"></a>

### 11.1. Desktop Application

All desktop targets share the following requirements:

- The system PATH includes a CLI-invocable `shruggie-md` command that launches the application.
- Preferences are stored in the platform-standard application data location ([§10.5](#105-storage-locations)).
- Workspace system is available (internal and external workspaces).
- File watching (live reload) is available.

**Windows 11** (primary target):

- Installer offers a desktop icon.
- Installer prompts the user to set the application as the default handler for `.md` and `.markdown` files.
- MSI-based installer via Tauri's WiX integration.

**macOS** (arm64):

- DMG distribution with standard drag-to-Applications install.
- Application registers as a handler for `.md` and `.markdown` file types via `Info.plist`.

**Linux** (x64):

- AppImage distribution for maximum compatibility across distributions.
- `.desktop` file included for desktop environment integration.

<a name="112-chrome-extension" id="112-chrome-extension"></a>

### 11.2. Chrome Extension

<div style="text-align:justify">

The Chrome extension renders markdown files opened in the browser. When the user navigates to a URL ending in a recognized markdown extension, the extension intercepts the raw content and renders it using the Shruggie Markdown preview. The extension also provides a browser action popup for pasting or typing a URL to fetch and render.

</div>

Manifest V3 configuration:

- `content_scripts`: match patterns for recognized markdown file extensions.
- `host_permissions`: user-configurable URL patterns for remote fetch (to bypass CORS).
- `action`: browser action popup for URL input and settings access.
- `storage`: `chrome.storage.sync` for configuration persistence.

The Chrome extension does NOT support the workspace system or file watching. These features require filesystem access unavailable in the extension context.

**Dark mode in the content script.** The content script injects a shadow DOM to isolate its styles from the host page. Theme color tokens (CSS custom properties) are defined on the `:host([data-theme="dark"])` and `:host([data-theme="light"])` selectors so that the background and text colors cascade correctly within the shadow tree. The `data-theme` attribute is set on the shadow host element itself, not on a child element, to ensure proper scoping.

<a name="113-progressive-web-app" id="113-progressive-web-app"></a>

### 11.3. Progressive Web App

<div style="text-align:justify">

The PWA is a hosted static site that serves the Shruggie Markdown frontend with a service worker for offline capability and a web app manifest for installability. The PWA supports markdown viewing, editing, and conversion. It does not support the workspace system or file watching.

</div>

PWA configuration:

- Service worker (Workbox): precaches the application shell and core assets. Runtime caching for fetched remote markdown content.
- Web app manifest: `name`, `short_name`, `icons`, `start_url`, `display: standalone`, `theme_color` matching the dark mode primary background.
- Install prompt: a subtle, non-intrusive banner on first visit offering installation.

---

<a name="12-repository-structure" id="12-repository-structure"></a>
<hr class="print-page-break">

## 12. Repository Structure

```
shruggie-md/
├── src/
│   ├── components/          # React UI components
│   │   ├── Editor/          # CodeMirror editor pane
│   │   ├── Preview/         # Markdown preview pane
│   │   ├── Workspaces/       # Workspace file table view
│   │   ├── Settings/        # Settings panel
│   │   ├── Toolbar/         # Top toolbar
│   │   └── common/          # Shared UI primitives (Button, Input, Modal, Tooltip)
│   ├── engines/             # Markdown engine abstraction and implementations
│   ├── linters/             # Linter adapter layer
│   ├── platform/            # Platform abstraction (filesystem, storage, capabilities)
│   ├── styles/              # Global CSS, design tokens, print stylesheet
│   ├── hooks/               # React hooks (useConfig, useTheme, useFileWatcher, etc.)
│   ├── storage/             # Storage abstraction (SQLite, IndexedDB, migration)
│   ├── types/               # TypeScript type definitions
│   ├── App.tsx              # Root application component
│   └── main.tsx             # Entry point
├── src-tauri/               # Tauri backend (Rust)
│   ├── src/
│   │   └── main.rs          # Tauri application entry, CLI registration, file watcher
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   └── icons/
├── extension/               # Chrome extension manifest and content scripts
│   ├── manifest.json
│   ├── content.ts
│   └── popup.html
├── public/                  # Static assets, PWA manifest, service worker registration
│   ├── manifest.json
│   └── icons/
├── index.html               # Vite entry HTML
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── LICENSE
├── README.md
└── shruggie-md-spec.md
```

---

<a name="13-future-considerations" id="13-future-considerations"></a>
<hr class="print-page-break">

## 13. Future Considerations

The following capabilities are deferred from the MVP and may be pursued in future releases:

- **Authenticated remote URL fetching.** Support for bearer tokens, API keys, or basic auth when fetching markdown from private endpoints.
- **Chrome OS targeting.** Investigation into whether the Chrome extension works natively on Chrome OS or requires a separate build.
- **Additional visual styles.** Expanding the curated style set beyond the initial four.
- **Custom themes.** A theme editor allowing users to define their own color token values.
- **Plugin system.** An extension mechanism for custom markdown-it plugins, custom linter rules, or post-processing hooks.
- **Export to additional formats.** DOCX, EPUB, or LaTeX export pipelines.
- **File tagging and search.** Full-text search across workspace contents, with optional tag/label metadata. The storage schema already includes stub `tags` and `document_tags` tables/stores to support a future tagging and browsing interface.
- **Vim/Emacs keybindings.** Alternative keybinding modes in the CodeMirror editor.

---

## Document History

| Date | Version | Change |
|------|---------|--------|
| 2026-03-24 | DRAFT | Initial specification. Derived from the product brainstorm document (`20260324-001-Brainstorm.md`). Establishes architecture, visual design language, feature set, and platform targets for MVP development. |
