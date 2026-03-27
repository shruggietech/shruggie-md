import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import type { Config } from "../types/config";
import { defaultConfig } from "./defaults";
import type { PlatformAdapter } from "../platform/platform";
import type { StorageAdapter } from "../storage/types";
import { flattenConfig, unflattenConfig } from "../storage/config-utils";

export interface ConfigContextValue {
  config: Config;
  updateConfig: <K extends keyof Config>(section: K, values: Partial<Config[K]>) => void;
  resetConfig: () => void;
  isLoading: boolean;
}

export const ConfigContext = createContext<ConfigContextValue | null>(null);

/**
 * Deep-merge loaded config with defaults.
 * Only merges known top-level section keys from defaultConfig.
 * For each section, does a shallow merge (loaded values override defaults).
 */
function mergeWithDefaults(loaded: Record<string, unknown>): Config {
  const result = { ...defaultConfig };

  for (const key of Object.keys(defaultConfig) as (keyof Config)[]) {
    const loadedSection = loaded[key];
    if (loadedSection && typeof loadedSection === "object" && !Array.isArray(loadedSection)) {
      // Shallow merge: default values + loaded values for this section
      (result as Record<string, unknown>)[key] = {
        ...defaultConfig[key],
        ...(loadedSection as Record<string, unknown>),
      };
    }
  }

  // Migrate legacy view mode values
  const lvm = result.general.lastViewMode as string | null;
  if (lvm === "full-view") {
    result.general.lastViewMode = "view";
  } else if (lvm === "split-view") {
    result.general.lastViewMode = "edit";
  }

  return result;
}

/**
 * Internal hook that provides config state management.
 * Used by ConfigProvider. When a StorageAdapter is provided it takes
 * precedence over the PlatformAdapter for config persistence.
 */
export function useConfigState(
  platform: PlatformAdapter | null,
  storage: StorageAdapter | null = null,
): ConfigContextValue {
  const [config, setConfig] = useState<Config>(defaultConfig);
  const [isLoading, setIsLoading] = useState(true);
  const platformRef = useRef(platform);
  platformRef.current = platform;
  const storageRef = useRef(storage);
  storageRef.current = storage;

  // Load config on mount (or when platform/storage becomes available)
  useEffect(() => {
    if (!platform && !storage) return;
    let cancelled = false;

    const load = async () => {
      let loaded: Record<string, unknown>;
      if (storage) {
        const flat = await storage.getAllConfig();
        loaded = unflattenConfig(flat);
      } else if (platform) {
        loaded = await platform.readConfig();
      } else {
        loaded = {};
      }
      return loaded;
    };

    load().then((loaded) => {
      if (cancelled) return;
      const merged = mergeWithDefaults(loaded);
      setConfig(merged);
      setIsLoading(false);
    }).catch(() => {
      if (cancelled) return;
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [platform, storage]);

  // Persist config whenever it changes (skip initial default)
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    // Prefer storage adapter when available
    if (storageRef.current) {
      const flat = flattenConfig(config as unknown as Record<string, unknown>);
      const entries = Object.entries(flat).map(([key, value]) => ({
        key,
        value,
      }));
      storageRef.current.setConfigBulk(entries).catch(() => {
        // Silent failure — config write is best-effort
      });
    } else if (platformRef.current) {
      platformRef.current.writeConfig(
        config as unknown as Record<string, unknown>,
      );
    }
  }, [config]);

  const updateConfig = useCallback(<K extends keyof Config>(
    section: K,
    values: Partial<Config[K]>,
  ) => {
    setConfig((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        ...values,
      },
    }));
  }, []);

  const resetConfig = useCallback(() => {
    setConfig(defaultConfig);
  }, []);

  return useMemo(
    () => ({ config, updateConfig, resetConfig, isLoading }),
    [config, updateConfig, resetConfig, isLoading],
  );
}

export function useConfig(): ConfigContextValue {
  const ctx = useContext(ConfigContext);
  if (!ctx) {
    throw new Error("useConfig must be used within a ConfigProvider");
  }
  return ctx;
}
