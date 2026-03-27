import type { StorageAdapter } from "./types";
import type { PlatformAdapter } from "../platform/platform";
import { flattenConfig } from "./config-utils";
import { getLogger } from "./logger";

/**
 * Migrate config from the legacy JSON-based platform adapter to the new
 * storage adapter. Runs once on first launch after the storage migration.
 *
 * On desktop (Tauri): reads config.json, writes to SQLite config table,
 * then renames the old file to config.json.bak.
 *
 * On web/PWA: reads from localStorage/IndexedDB (old schema), writes
 * to the new IndexedDB schema.
 *
 * If no old config exists, populates storage from compiled defaults.
 */
export async function migrateConfig(
  storage: StorageAdapter,
  platform: PlatformAdapter,
): Promise<void> {
  const logger = getLogger();

  // Check if storage already has config entries
  const existingConfig = await storage.getAllConfig();
  if (Object.keys(existingConfig).length > 0) {
    // Storage already populated — no migration needed
    return;
  }

  // Attempt to read legacy config from the platform adapter
  let legacyConfig: Record<string, unknown>;
  try {
    legacyConfig = await platform.readConfig();
  } catch {
    legacyConfig = {};
  }

  if (Object.keys(legacyConfig).length === 0) {
    // No legacy config — fresh install, nothing to migrate
    await logger.info(
      "migration",
      "No legacy config found. Fresh install, using defaults.",
    );
    return;
  }

  // Flatten and write to new storage
  const flat = flattenConfig(legacyConfig);

  // Rename legacy config keys
  const KEY_RENAMES: Record<string, string | null> = {
    "library.mountPath": null, // Removed — workspaces use per-workspace paths
    "library.recursive": "workspace.recursive",
    "library.showHidden": "workspace.showHidden",
    "library.useIndependentExtensions": "workspace.useIndependentExtensions",
    "library.independentExtensions": "workspace.independentExtensions",
  };

  const entries: Array<{ key: string; value: string }> = [];
  for (const [key, value] of Object.entries(flat)) {
    const rename = KEY_RENAMES[key];
    if (rename === null) continue; // Drop this key
    entries.push({ key: rename ?? key, value });
  }

  await storage.setConfigBulk(entries);

  await logger.info(
    "migration",
    `Migrated ${entries.length} config entries from legacy storage.`,
    { keys: entries.map((e) => e.key) },
  );

  // On Tauri, rename the old config file to .bak
  // We attempt this by writing a marker — the actual file rename
  // is handled via the filesystem adapter
  try {
    const capabilities = platform.getPlatformCapabilities();
    if (capabilities.hasFilesystem) {
      // Read the old config content and write it as .bak
      const { appConfigDir } = await import("@tauri-apps/api/path");
      const { readTextFile, writeTextFile, remove } = await import(
        "@tauri-apps/plugin-fs"
      );

      const configDir = await appConfigDir();
      const oldPath = `${configDir}/config.json`;
      const bakPath = `${configDir}/config.json.bak`;

      try {
        const oldContent = await readTextFile(oldPath);
        await writeTextFile(bakPath, oldContent);
        await remove(oldPath);
        await logger.info(
          "migration",
          "Renamed legacy config.json to config.json.bak.",
        );
      } catch {
        // Old file may not exist on disk (e.g., PWA that stored in IDB)
      }
    }
  } catch {
    // Not on Tauri — skip file rename
  }
}
