# Copilot Instructions — Shruggie Markdown

## Project Overview

Shruggie Markdown is a cross-platform markdown viewer, editor, and exporter built with Tauri 2, React 18, TypeScript (strict mode), and Vite. It ships as a desktop app (Windows, macOS, Linux), a Chrome Extension (Manifest V3), and a PWA from a single codebase. The authoritative specification is `shruggie-md-spec.md` at the repo root.

## Language and Compiler Settings

- TypeScript 6 with `strict: true`, target `ES2022`, module `ESNext`, bundler resolution.
- JSX transform: `react-jsx` (no manual React imports needed for JSX).
- Path aliases are configured in `tsconfig.json`:
  - `@/components/*`, `@/engines/*`, `@/linters/*`, `@/platform/*`
  - `@/hooks/*`, `@/types/*`, `@/styles/*`, `@/config/*`
  - `@/storage/*` and `@/storage` (barrel import)
- Prefer path aliases over deep relative imports when crossing module boundaries (e.g., `import { Button } from "@/components/common"` instead of `import { Button } from "../../components/common"`). Use relative imports only within the same module directory.

## React Patterns

- Functional components only. No class components.
- Use named exports, not default exports, for all components and hooks.
- Hooks: `useState`, `useEffect`, `useCallback`, `useRef`, `useMemo`. No third-party state libraries.
- Custom hooks are in `src/hooks/` and re-exported through `src/hooks/index.ts`. New hooks must be added to this barrel.
- Components are organized in directories: `src/components/ComponentName/ComponentName.tsx` with an `index.ts` barrel that re-exports the component and its types.
- Props interfaces are defined in the same file as the component, above the component function.
- Wrap components in `ThemeProvider` and `ConfigProvider` at the app root. Access config via `useConfig()`, theme via `useTheme()`, storage via `useStorage()`.

## Styling

This project uses **inline styles with CSS custom properties**. It does not use CSS modules, styled-components, or Tailwind utility classes in JSX.

- All colors, spacing, typography, radii, and transitions reference CSS custom property tokens defined in `src/styles/globals.css` and the spec (§4.3 through §4.6).
- Color tokens: `--color-bg-primary`, `--color-bg-secondary`, `--color-bg-tertiary`, `--color-bg-hover`, `--color-bg-active`, `--color-text-primary`, `--color-text-secondary`, `--color-accent`, `--color-accent-hover`, `--color-border-primary`, `--color-border-subtle`, `--color-error`.
- Spacing tokens: `--space-1` (4px) through `--space-8` (32px).
- Typography tokens: `--font-ui`, `--font-editor`, `--font-preview`, `--font-size-xs` through `--font-size-lg`.
- Radius tokens: `--radius-sm` (4px), `--radius-md` (8px), `--radius-lg` (12px).
- Transitions: use `120ms ease-out` for interactive state changes (hover, active). Use `200ms ease-in-out` for layout transitions (view mode changes, panel expand/collapse).
- Hover and focus states use `onMouseEnter`/`onMouseLeave` handlers that mutate `e.currentTarget.style` directly. Focus states use CSS `:focus-visible` via `globals.css`, not JS handlers.
- Global CSS (scrollbars, focus rings, transitions, print styles) lives in `src/styles/`. Component-specific styles are always inline.

Example of the standard button styling pattern:

```tsx
<button
  type="button"
  style={{
    display: "inline-flex",
    alignItems: "center",
    gap: "var(--space-1)",
    padding: "var(--space-1) var(--space-2)",
    borderRadius: "var(--radius-sm)",
    border: "none",
    backgroundColor: "transparent",
    color: "var(--color-text-secondary)",
    fontSize: "var(--font-size-sm)",
    fontFamily: "var(--font-ui)",
    cursor: "pointer",
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
```

## Icons

Use `lucide-react` for all icons. Import individual icons by name:

```tsx
import { File, Globe, Plus, ChevronDown } from "lucide-react";
```

Render icons at `size={16}` for toolbar buttons, `size={20}` for dialog elements. Use the project's `Icon` wrapper component (`src/components/common/Icon.tsx`) when consistent sizing and color inheritance are needed.

## Platform Abstraction

All platform-specific behavior goes through the `PlatformAdapter` interface (`src/platform/platform.ts`). There are four implementations: `TauriAdapter`, `WebAdapter`, `ChromeAdapter`, `PwaAdapter`. The factory function `getPlatform()` auto-detects the environment.

Never call Tauri APIs, `chrome.*` APIs, or browser-specific APIs directly from components. Always go through the platform adapter or check `capabilities` flags:

```tsx
const capabilities = platform.getPlatformCapabilities();
if (capabilities.hasFilesystem) {
  // Safe to call platform.readFile(), platform.writeFile(), etc.
}
```

## Storage Abstraction

All persistent data (config, documents, workspaces, logs, edit history) goes through the `StorageAdapter` interface (`src/storage/types.ts`). Two backends: `SqliteStorage` (Tauri/desktop) and `IndexedDbStorage` (Chrome/PWA). The factory function `getStorage()` auto-detects. Access storage in components via the `useStorage()` hook.

Config values are stored as dotted-path key-value pairs (e.g., `appearance.colorMode` = `"dark"`). Use `flattenConfig()` and `unflattenConfig()` from `src/storage/config-utils.ts` for conversion.

## Testing

- Framework: Vitest with jsdom environment.
- Test files: `src/__tests__/*.test.tsx` or `src/__tests__/*.test.ts`.
- Use `@testing-library/react` for component tests: `render`, `screen`, `fireEvent`, `act`, `renderHook`.
- Mock `window.matchMedia` in every test file that renders themed components. The standard mock pattern is in existing test files; copy it rather than reinventing.
- Mock the platform adapter via `vi.mock("../platform/platform")` returning a fake `getPlatform()` with all methods stubbed.
- Mock CodeMirror modules (`@codemirror/state`, `@codemirror/view`, `@codemirror/language`, `@lezer/highlight`) when testing editor-related components. jsdom cannot run CodeMirror's DOM measurement APIs.
- Mock the storage module when testing components that depend on `useStorage()`.
- Use `data-testid` attributes for test selectors. Follow the existing naming convention: `settings-panel`, `settings-appearance`, `mode-light`, `export-format-html`, etc.

## Tauri Backend

- Rust source is in `src-tauri/src/`. Entry point is `lib.rs`.
- Plugins: `tauri-plugin-fs`, `tauri-plugin-dialog`, `tauri-plugin-log`, `tauri-plugin-sql`.
- The `tauri.conf.json` file is sensitive. Do not remove or restructure the `bundle.windows`, `plugins`, or `security` sections without understanding the downstream effects on installer behavior and app startup.
- The `plugins.fs` config accepts only `requireLiteralLeadingDot`; it does not accept a `scope` field (Tauri 2 schema).

## Common Pitfalls

- Do not use `localStorage` or `sessionStorage` for persistence. Use the storage abstraction layer.
- Do not import from `react` just for JSX; the `react-jsx` transform handles it. Only import React when you need hooks or types.
- Do not use Tailwind utility classes in component JSX. Tailwind is used only in `globals.css` via `@tailwind` directives and `@apply` (sparingly). Component styles are inline with CSS custom properties.
- Do not use `default export`. All exports are named.
- Do not add new dependencies without verifying they work across all three targets (Tauri webview, Chrome extension content script, PWA service worker).

## Commit and Build

- Package manager: pnpm (version 10.x). Do not use npm or yarn.
- Before committing, run: `pnpm run typecheck && pnpm run test`.
- Before building Tauri artifacts, always delete `dist/` and run `pnpm run build` first. Tauri embeds the contents of `dist/` at compile time; stale `dist/` output produces binaries with old frontend code.
- Version strings must match across four files: `package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, `extension/manifest.json`. Use the bump-version scripts in `scripts/`.

## File Encoding

- All source files: UTF-8 without BOM.
- Line endings: LF (Unix-style). Do not introduce CRLF.

## Corporate Identity

- Legal name: Shruggie LLC
- DBA: ShruggieTech
- Do not refer to the entity as "ShruggieTech LLC".

## Visual Verification

This project has the Playwright MCP server configured in `.vscode/mcp.json`.
When the server is connected, use `browser_navigate` to open `http://localhost:1420`
and `browser_take_screenshot` to verify UI changes visually. Do not report UI
tasks as complete without a screenshot confirming the rendered result.
