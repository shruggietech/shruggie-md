import { useState, useCallback, useMemo } from "react";

export type ViewMode = "view" | "edit" | "edit-only" | "workspaces" | "settings" | "help";

export interface UseViewModeReturn {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}

export function useViewMode(
  initialMode: ViewMode = "view",
): UseViewModeReturn {
  const [viewMode, setViewModeState] = useState<ViewMode>(initialMode);

  const setViewMode = useCallback((mode: ViewMode) => {
    setViewModeState(mode);
  }, []);

  return useMemo(
    () => ({ viewMode, setViewMode }),
    [viewMode, setViewMode],
  );
}
