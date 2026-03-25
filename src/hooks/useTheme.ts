import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";

export type ColorMode = "light" | "dark" | "system";
export type VisualStyle = "default" | "warm" | "cool" | "monochrome";

export interface ThemeContextValue {
  colorMode: ColorMode;
  setColorMode: (mode: ColorMode) => void;
  visualStyle: VisualStyle;
  setVisualStyle: (style: VisualStyle) => void;
  /** The resolved theme — always 'light' or 'dark' (never 'system') */
  resolvedTheme: "light" | "dark";
  /** Whether the user has prefers-reduced-motion enabled */
  prefersReducedMotion: boolean;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}

/**
 * Internal hook that encapsulates all theme logic.
 * Consumed by ThemeProvider.
 */
export function useThemeState(
  initialMode: ColorMode = "dark",
  initialStyle: VisualStyle = "default",
): ThemeContextValue {
  const [colorMode, setColorMode] = useState<ColorMode>(initialMode);
  const [visualStyle, setVisualStyle] = useState<VisualStyle>(initialStyle);
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  const [prefersReducedMotion, setPrefersReducedMotion] =
    useState<boolean>(() => {
      if (typeof window === "undefined") return false;
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    });

  // Track OS dark mode preference
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  // Track prefers-reduced-motion
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) =>
      setPrefersReducedMotion(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  const resolvedTheme: "light" | "dark" = useMemo(() => {
    if (colorMode === "system") {
      return systemPrefersDark ? "dark" : "light";
    }
    return colorMode;
  }, [colorMode, systemPrefersDark]);

  // Apply data-theme and data-style to documentElement
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.setAttribute("data-theme", resolvedTheme);
  }, [resolvedTheme]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.setAttribute("data-style", visualStyle);
  }, [visualStyle]);

  const setColorModeCb = useCallback((mode: ColorMode) => {
    setColorMode(mode);
  }, []);

  const setVisualStyleCb = useCallback((style: VisualStyle) => {
    setVisualStyle(style);
  }, []);

  return useMemo(
    () => ({
      colorMode,
      setColorMode: setColorModeCb,
      visualStyle,
      setVisualStyle: setVisualStyleCb,
      resolvedTheme,
      prefersReducedMotion,
    }),
    [
      colorMode,
      setColorModeCb,
      visualStyle,
      setVisualStyleCb,
      resolvedTheme,
      prefersReducedMotion,
    ],
  );
}
