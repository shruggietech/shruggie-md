# Releasing Shruggie Markdown

This document describes the process for cutting a new release of Shruggie Markdown.

## Version Bump Locations

Every release requires updating the version string in these files:

| File | Field |
|------|-------|
| `package.json` | `"version"` |
| `src-tauri/tauri.conf.json` | `"version"` |
| `src-tauri/Cargo.toml` | `version` (under `[package]`) |
| `extension/manifest.json` | `"version"` |

All four files must contain the same version string. The version follows [Semantic Versioning](https://semver.org/): `MAJOR.MINOR.PATCH`.

## Release Procedure

### 1. Prepare the Release Branch

```bash
git checkout main
git pull origin main
git checkout -b release/vX.Y.Z
```

### 2. Update Version Numbers

Update the version string in all four files listed above. Use find-and-replace or the version bump script:

```bash
# PowerShell
./scripts/bump-version.ps1 -Version "X.Y.Z"

# Bash
./scripts/bump-version.sh X.Y.Z
```

### 3. Update the Changelog

Edit `CHANGELOG.md`:

1. Move items from `[Unreleased]` into a new version section: `## [X.Y.Z] - YYYY-MM-DD`
2. Create a fresh empty `## [Unreleased]` section at the top.
3. Add the comparison link at the bottom: `[X.Y.Z]: https://github.com/shruggietech/shruggie-md/compare/vPREVIOUS...vX.Y.Z`
4. Update the `[Unreleased]` link to compare against the new tag.

### 4. Commit and Tag

```bash
git add -A
git commit -m "release: vX.Y.Z"
git tag vX.Y.Z
```

### 5. Push

```bash
git push origin release/vX.Y.Z
git push origin vX.Y.Z
```

Pushing the tag triggers the GitHub Actions release workflow, which:

- Runs the full test suite.
- Builds desktop installers for Windows (MSI), macOS (DMG), and Linux (AppImage).
- Creates a GitHub Release with the built artifacts attached.
- Extracts the changelog entry for the version and uses it as the release notes.

### 6. Merge

After the release workflow completes and artifacts are verified:

```bash
git checkout main
git merge release/vX.Y.Z
git push origin main
```

### 7. Post-Release

- Verify the GitHub Release page has all expected artifacts.
- Upload the Chrome extension build (`extension/dist/`) to the Chrome Web Store (manual process).
- Deploy the PWA build (`dist/`) to the hosting provider (manual process or separate workflow).

## Tag Format

Tags use the format `vX.Y.Z` (e.g., `v0.1.0`, `v1.0.0`). The leading `v` is required; the GitHub Actions release workflow triggers on tags matching `v*`.

## Chrome Web Store and PWA Deployment

These are currently manual processes:

- **Chrome Web Store:** Zip `extension/dist/`, upload via the Chrome Web Store Developer Dashboard.
- **PWA:** Deploy `dist/` to a static hosting provider (e.g., Cloudflare Pages, Netlify, Vercel).

Automated deployment for these targets is a future consideration.
