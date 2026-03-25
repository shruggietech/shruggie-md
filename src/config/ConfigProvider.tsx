import { type ReactNode } from "react";
import { ConfigContext, useConfigState } from "./store";
import type { PlatformAdapter } from "../platform/platform";

interface ConfigProviderProps {
  children: ReactNode;
  platform: PlatformAdapter | null;
}

export function ConfigProvider({ children, platform }: ConfigProviderProps) {
  const configValue = useConfigState(platform);
  return <ConfigContext value={configValue}>{children}</ConfigContext>;
}
