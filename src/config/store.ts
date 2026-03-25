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

  return result;
}

/**
 * Internal hook that provides config state management.
 * Used by ConfigProvider.
 */
export function useConfigState(platform: PlatformAdapter | null): ConfigContextValue {
  const [config, setConfig] = useState<Config>(defaultConfig);
  const [isLoading, setIsLoading] = useState(true);
  const platformRef = useRef(platform);
  platformRef.current = platform;

  // Load config on mount (or when platform becomes available)
  useEffect(() => {
    if (!platform) return;
    let cancelled = false;

    platform.readConfig().then((loaded) => {
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
  }, [platform]);

  // Persist config whenever it changes (skip initial default)
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (!platformRef.current) return;
    platformRef.current.writeConfig(config as unknown as Record<string, unknown>);
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
