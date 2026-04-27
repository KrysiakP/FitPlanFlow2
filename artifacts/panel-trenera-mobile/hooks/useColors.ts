import { useTheme } from "@/context/ThemeContext";

import colors from "@/constants/colors";

/**
 * Returns the design tokens for the current color scheme.
 * Reads from ThemeContext which supports light / dark / system preference.
 */
export function useColors() {
  const { resolvedTheme } = useTheme();
  const darkPalette: typeof colors.light | undefined =
    "dark" in colors ? (colors as { light: typeof colors.light; dark: typeof colors.light }).dark : undefined;
  const palette = resolvedTheme === "dark" && darkPalette ? darkPalette : colors.light;
  return { ...palette, radius: colors.radius };
}
