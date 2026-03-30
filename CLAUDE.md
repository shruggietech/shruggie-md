# Shruggie Markdown — Agent Context

## 1. Project Identity

- **Project:** Shruggie Markdown (`shruggie-md`)
- **Repository:** `github.com/shruggietech/shruggie-md`
- **License:** Apache-2.0
- **Owner:** William Thompson, Shruggie LLC (DBA ShruggieTech)
- **Frontend:** React 18, TypeScript, Vite, CodeMirror 6, Tailwind CSS 4
- **Backend:** Tauri 2 (Rust), tauri-plugin-fs, tauri-plugin-dialog, tauri-plugin-sql (SQLite)
- **Build targets:** Tauri desktop (Windows, macOS, Linux), Chrome Extension (MV3), PWA
- **Specification:** `shruggie-md-spec.md` at repo root (authoritative reference for all implementation decisions)

## 2. Standing Rules

These rules apply to every agent session regardless of sprint plan content. Sprint plans may add rules but may not override or weaken these.

1. **No release tagging by default.** Do not create git tags or GitHub releases unless the project owner explicitly asks you to perform the full release cut in this session. If the owner explicitly asks to "cut a release", treat tag creation and pushing as part of that request unless they exclude it.

2. **Verify before declaring done.** Every sprint ends with a verification task. Run the application (`pnpm tauri dev` at minimum) and visually confirm that changes work as intended. Typecheck-only and test-only verification is insufficient. If the sprint includes UI changes, you must see them rendered in the running application before reporting completion.

3. **Spec fidelity.** When a task references a spec section, read that section before implementing. Do not rely on cached knowledge or assumptions about spec content.

4. **No scope creep.** Complete only the tasks listed in the current sprint plan. Do not improve adjacent systems or refactor code outside the plan scope.

5. **Existing tests must pass.** At the end of every sprint, `pnpm run test` must report zero failures. If a change breaks existing tests, fix them within the same sprint.

6. **CHANGELOG accuracy.** Update `CHANGELOG.md` with an `[Unreleased]` section reflecting actual changes made. Do not fabricate test counts, feature completions, or metrics. If you did not verify something, do not report it as verified.

7. **Clean frontend build before Tauri build.** Before running any Tauri build command (`pnpm tauri build`, `pnpm tauri dev`, or equivalent), delete the `dist/` directory and run `pnpm run build` to regenerate it from the current source tree. Building Tauri against a pre-existing `dist/` is prohibited.

## 3. Build Procedure

The mandatory sequence for producing release artifacts:

```
pnpm install
pnpm run typecheck
pnpm run test
rm -rf dist                  # PowerShell: Remove-Item -Recurse -Force dist
pnpm run build
pnpm tauri build
```

After `pnpm tauri build` completes, launch the built artifact (the installed binary, not dev mode) and visually verify it reflects the current source.

Steps 4 and 5 (`rm -rf dist` and `pnpm run build`) are not optional. Tauri embeds the contents of `dist/` at compile time. If `dist/` contains output from a prior build, the binary will contain stale frontend code regardless of what the source tree says.

For dev-mode verification, the same principle applies in abbreviated form:

```
rm -rf dist
pnpm run build
pnpm tauri dev
```

## 4. File Conventions

- **Sprint plans:** `.handoff/plans/YYYYMMDD-NNN-Updates.md`
- **After-action reports:** `.handoff/reports/YYYYMMDD-NNN-Report.md`
- **Sprint plans and reports are AI-to-AI documents.** Use pure Markdown. No HTML tags, no anchor tags, no page-break rules, no inline styles.
- **Spec and overview documents are human-facing.** Follow the formatting rules in the active sprint plan's AI Agent Directives (anchors, page breaks, justified paragraphs).
- **Brand assets:** `assets/brand/` directory. Logo filenames use the exact format `Shruggie Tech2-01.png` through `Shruggie Tech2-06.png` (note the space before "Tech2"). The pre-made `.ico` file is used directly; do not regenerate it.
- **Version strings** must be updated in all four manifests simultaneously: `package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, `extension/manifest.json`. Use the bump-version script: `./scripts/bump-version.ps1 -Version "X.Y.Z"` or `./scripts/bump-version.sh X.Y.Z`.

## 5. Known Agent Failure Modes

Previous agent sessions have exhibited these failure patterns. Be aware of them and actively avoid repeating them.

- **Stale `dist/` builds.** Building Tauri without first regenerating `dist/` from the current source tree. The resulting binary appears to be the new version (correct version string) but contains old UI code. This is the most common and most damaging failure mode.
- **Typecheck-as-verification.** Declaring UI changes complete because `pnpm run typecheck` and `pnpm run test` pass, without ever launching the application to see the changes rendered. Typecheck proves the code compiles. It does not prove the code works.
- **Inaccurate after-action reports.** Reporting file paths that do not match actual file locations. Reporting features as "✅ Complete" without having tested them in a running application. Reporting fabricated test counts or metrics.
- **Destructive config edits.** Removing or overwriting `tauri.conf.json` configuration blocks (especially `bundle.windows`, `plugins.fs`, `security.csp`) without understanding the downstream effects on installer behavior and application startup.
- **Unauthorized release actions.** Creating git tags or GitHub releases without explicit instruction from the project owner. If explicit instruction is present (for example, "cut the release"), complete the full release flow including tag push unless the owner asks to stop short.
- **Silent scope expansion.** "Improving" systems adjacent to the sprint scope, or refactoring code not mentioned in the plan. This introduces untested changes and makes it harder to isolate regressions.
- **Always use `pnpm tauri:dev` or `pnpm tauri:build` to invoke Tauri.** These scripts delete `dist/` before running, preventing stale frontend output from being packaged. Never run `tauri dev`, `tauri build`, or `cargo build` directly.

## 6. After-Action Report Requirements

When writing an after-action report at the end of a sprint:

- Every file path mentioned in the report must correspond to an actual file at that exact path. Verify before writing.
- Every task marked as complete must have been verified by running the application, not just by running typecheck or tests.
- If a verification step was not performed (e.g., production build was not executed, or a platform was not tested), state that explicitly. Do not mark it as complete or imply it was verified.
- The "Commit Record" section must reflect actual commits. Run `git log --oneline` and copy the output rather than writing commit messages from memory.

## 7. Visual Verification via Playwright MCP

When operating in VS Code with the Playwright MCP server connected, agents
MUST use it to visually verify UI changes. The workflow is:

1. Start the dev server: `pnpm tauri:dev` (or `pnpm run dev` for web-only).
2. Use the Playwright MCP `browser_navigate` tool to open `http://localhost:1420`.
3. Use `browser_snapshot` or `browser_take_screenshot` to capture the current UI.
4. Confirm the rendered output matches the expected changes before reporting
	a task as complete.

Screenshot verification is mandatory for any task that modifies:

- Component layout or structure
- CSS / styling (including theme tokens)
- Toolbar, dialog, or panel content
- View mode behavior

Typecheck and test passage alone are not sufficient evidence that UI changes
are correct. If the Playwright MCP server is not available, note this in the
after-action report and flag the UI verification as pending.
