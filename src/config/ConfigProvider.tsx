import { type ReactNode } from "react";
import { ConfigContext, useConfigState } from "./store";
import type { PlatformAdapter } from "../platform/platform";
import type { StorageAdapter } from "../storage/types";

interface ConfigProviderProps {
  children: ReactNode;
  platform: PlatformAdapter | null;
  storage?: StorageAdapter | null;
}

export function ConfigProvider({ children, platform, storage }: ConfigProviderProps) {
  const configValue = useConfigState(platform, storage ?? null);
  return <ConfigContext value={configValue}>{children}</ConfigContext>;
}
