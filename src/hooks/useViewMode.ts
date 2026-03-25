import { useState, useCallback, useMemo } from "react";

export type ViewMode = "full-view" | "split-view" | "library" | "settings";

export interface UseViewModeReturn {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}

export function useViewMode(
  initialMode: ViewMode = "full-view",
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
