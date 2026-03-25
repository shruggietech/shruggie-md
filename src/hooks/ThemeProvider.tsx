import { type ReactNode } from "react";
import {
  ThemeContext,
  useThemeState,
  type ColorMode,
  type VisualStyle,
} from "./useTheme";

interface ThemeProviderProps {
  children: ReactNode;
  initialMode?: ColorMode;
  initialStyle?: VisualStyle;
}

export function ThemeProvider({
  children,
  initialMode = "dark",
  initialStyle = "default",
}: ThemeProviderProps) {
  const themeValue = useThemeState(initialMode, initialStyle);
  return <ThemeContext value={themeValue}>{children}</ThemeContext>;
}
