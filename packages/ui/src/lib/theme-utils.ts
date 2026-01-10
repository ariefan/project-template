/**
 * Theme utilities for manipulating CSS variables live
 * Based on shadcn/ui theming system with oklch colors
 */

/**
 * All customizable CSS variables in shadcn/ui
 */
export const THEME_VARIABLES = {
  // Base radius
  radius: "--radius",

  // Core colors
  background: "--background",
  foreground: "--foreground",
  primary: "--primary",
  "primary-foreground": "--primary-foreground",
  secondary: "--secondary",
  "secondary-foreground": "--secondary-foreground",
  muted: "--muted",
  "muted-foreground": "--muted-foreground",
  accent: "--accent",
  "accent-foreground": "--accent-foreground",
  destructive: "--destructive",
  border: "--border",
  input: "--input",
  ring: "--ring",

  // Component colors
  card: "--card",
  "card-foreground": "--card-foreground",
  popover: "--popover",
  "popover-foreground": "--popover-foreground",

  // Chart colors
  "chart-1": "--chart-1",
  "chart-2": "--chart-2",
  "chart-3": "--chart-3",
  "chart-4": "--chart-4",
  "chart-5": "--chart-5",

  // Sidebar colors
  sidebar: "--sidebar",
  "sidebar-foreground": "--sidebar-foreground",
  "sidebar-primary": "--sidebar-primary",
  "sidebar-primary-foreground": "--sidebar-primary-foreground",
  "sidebar-accent": "--sidebar-accent",
  "sidebar-accent-foreground": "--sidebar-accent-foreground",
  "sidebar-border": "--sidebar-border",
  "sidebar-ring": "--sidebar-ring",
} as const;

export type ThemeVariable = keyof typeof THEME_VARIABLES;

/**
 * Default theme values (zinc base color)
 */
export const DEFAULT_THEME = {
  radius: "0.625rem",
  background: "oklch(1 0 0)",
  foreground: "oklch(0.141 0.005 285.823)",
  card: "oklch(1 0 0)",
  "card-foreground": "oklch(0.141 0.005 285.823)",
  popover: "oklch(1 0 0)",
  "popover-foreground": "oklch(0.141 0.005 285.823)",
  primary: "oklch(0.21 0.006 285.885)",
  "primary-foreground": "oklch(0.985 0 0)",
  secondary: "oklch(0.967 0.001 286.375)",
  "secondary-foreground": "oklch(0.21 0.006 285.885)",
  muted: "oklch(0.967 0.001 286.375)",
  "muted-foreground": "oklch(0.552 0.016 285.938)",
  accent: "oklch(0.967 0.001 286.375)",
  "accent-foreground": "oklch(0.21 0.006 285.885)",
  destructive: "oklch(0.577 0.245 27.325)",
  border: "oklch(0.92 0.004 286.32)",
  input: "oklch(0.92 0.004 286.32)",
  ring: "oklch(0.705 0.015 286.067)",
  "chart-1": "oklch(0.646 0.222 41.116)",
  "chart-2": "oklch(0.6 0.118 184.704)",
  "chart-3": "oklch(0.398 0.07 227.392)",
  "chart-4": "oklch(0.828 0.189 84.429)",
  "chart-5": "oklch(0.769 0.188 70.08)",
  sidebar: "oklch(0.985 0 0)",
  "sidebar-foreground": "oklch(0.141 0.005 285.823)",
  "sidebar-primary": "oklch(0.21 0.006 285.885)",
  "sidebar-primary-foreground": "oklch(0.985 0 0)",
  "sidebar-accent": "oklch(0.967 0.001 286.375)",
  "sidebar-accent-foreground": "oklch(0.21 0.006 285.885)",
  "sidebar-border": "oklch(0.92 0.004 286.32)",
  "sidebar-ring": "oklch(0.705 0.015 286.067)",
} as const;

/**
 * Dark mode defaults
 */
export const DEFAULT_DARK_THEME = {
  background: "oklch(0.141 0.005 285.823)",
  foreground: "oklch(0.985 0 0)",
  card: "oklch(0.21 0.006 285.885)",
  "card-foreground": "oklch(0.985 0 0)",
  popover: "oklch(0.21 0.006 285.885)",
  "popover-foreground": "oklch(0.985 0 0)",
  primary: "oklch(0.92 0.004 286.32)",
  "primary-foreground": "oklch(0.21 0.006 285.885)",
  secondary: "oklch(0.274 0.006 286.033)",
  "secondary-foreground": "oklch(0.985 0 0)",
  muted: "oklch(0.274 0.006 286.033)",
  "muted-foreground": "oklch(0.705 0.015 286.067)",
  accent: "oklch(0.274 0.006 286.033)",
  "accent-foreground": "oklch(0.985 0 0)",
  destructive: "oklch(0.704 0.191 22.216)",
  border: "oklch(1 0 0 / 10%)",
  input: "oklch(1 0 0 / 15%)",
  ring: "oklch(0.552 0.016 285.938)",
  "chart-1": "oklch(0.488 0.243 264.376)",
  "chart-2": "oklch(0.696 0.17 162.48)",
  "chart-3": "oklch(0.769 0.188 70.08)",
  "chart-4": "oklch(0.627 0.265 303.9)",
  "chart-5": "oklch(0.645 0.246 16.439)",
  sidebar: "oklch(0.21 0.006 285.885)",
  "sidebar-foreground": "oklch(0.985 0 0)",
  "sidebar-primary": "oklch(0.488 0.243 264.376)",
  "sidebar-primary-foreground": "oklch(0.985 0 0)",
  "sidebar-accent": "oklch(0.274 0.006 286.033)",
  "sidebar-accent-foreground": "oklch(0.985 0 0)",
  "sidebar-border": "oklch(1 0 0 / 10%)",
  "sidebar-ring": "oklch(0.552 0.016 285.938)",
} as const;

export type ThemeValues = Record<ThemeVariable, string>;

const OKLCH_REGEX =
  /oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.%]+))?\s*\)/;

/**
 * Get the current value of a CSS variable
 */
export function getCssVariable(name: ThemeVariable): string {
  if (typeof window === "undefined") {
    return DEFAULT_THEME[name];
  }
  const varName = THEME_VARIABLES[name];
  return getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim();
}

/**
 * Set a CSS variable live on the document
 * Works for both light and dark mode by setting at document level
 */
export function setCssVariable(name: ThemeVariable, value: string): void {
  if (typeof window === "undefined") {
    return;
  }
  const varName = THEME_VARIABLES[name];
  // Set as inline style - this works with both :root and .dark
  // The !important ensures it overrides the CSS class definitions
  document.documentElement.style.setProperty(varName, value);
}

/**
 * Set multiple CSS variables at once
 */
export function setCssVariables(values: Partial<ThemeValues>): void {
  if (typeof window === "undefined") {
    return;
  }
  for (const [name, value] of Object.entries(values)) {
    if (value) {
      setCssVariable(name as ThemeVariable, value);
    }
  }
}

/**
 * Reset a CSS variable to its default value
 * This removes the inline style so :root or .dark class defaults apply
 */
export function resetCssVariable(name: ThemeVariable, _dark = false): void {
  if (typeof window === "undefined") {
    return;
  }
  const varName = THEME_VARIABLES[name];
  // Remove inline style to let CSS defaults take effect
  document.documentElement.style.removeProperty(varName);
}

/**
 * Reset all CSS variables to defaults
 */
export function resetAllCssVariables(_dark = false): void {
  if (typeof window === "undefined") {
    return;
  }
  for (const varName of Object.values(THEME_VARIABLES)) {
    document.documentElement.style.removeProperty(varName);
  }
}

/**
 * Get all current CSS variables as an object
 */
export function getCurrentTheme(dark = false): Partial<ThemeValues> {
  const theme: Partial<ThemeValues> = {};
  const defaults = dark ? DEFAULT_DARK_THEME : DEFAULT_THEME;

  for (const key of Object.keys(THEME_VARIABLES)) {
    const name = key as ThemeVariable;
    const current = getCssVariable(name);
    // Only include if different from default
    const defaultVal = defaults[name as keyof typeof defaults];
    if (current && current !== defaultVal) {
      theme[name] = current;
    }
  }

  return theme;
}

/**
 * Parse oklch color to components
 */
export function parseOklch(color: string): {
  l: number;
  c: number;
  h: number;
  a?: number;
} | null {
  // Match oklch(l c h / alpha) or oklch(l c h)
  const match = color.match(OKLCH_REGEX);
  if (!match) {
    return null;
  }

  const [, l, c, h, a] = match;
  if (!(l && c && h)) {
    return null;
  }
  return {
    l: Number.parseFloat(l),
    c: Number.parseFloat(c),
    h: Number.parseFloat(h),
    a: a ? Number.parseFloat(a.replace("%", "")) / 100 : undefined,
  };
}

/**
 * Convert oklch components back to string
 */
export function toOklch(l: number, c: number, h: number, a?: number): string {
  return a !== undefined
    ? `oklch(${l} ${c} ${h} / ${a * 100}%)`
    : `oklch(${l} ${c} ${h})`;
}

/**
 * Check if a color string is valid oklch
 */
export function isValidOklch(color: string): boolean {
  return parseOklch(color) !== null;
}

import { converter, formatHex } from "culori";

// Color converters
const toOklchC = converter("oklch");

/**
 * Generate shades for a color by varying lightness
 */
export function generateColorShades(
  baseColor: string,
  shades: number[] = [0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2]
): string[] {
  const parsed = parseOklch(baseColor);
  if (!parsed) {
    return [];
  }

  return shades.map((lightness) =>
    toOklch(lightness, parsed.c, parsed.h, parsed.a)
  );
}

/**
 * Convert Hex to OKLCH string
 * Uses culori for accurate conversion
 */
export function hexToOklch(hex: string): string {
  const color = toOklchC(hex);
  if (!color) {
    return "";
  }

  // Manual formatting for 2-digit precision
  const l = color.l !== undefined ? color.l.toFixed(2) : "0";
  const c = color.c !== undefined ? color.c.toFixed(2) : "0";
  const h = color.h !== undefined ? color.h.toFixed(2) : "0";

  return `oklch(${l} ${c} ${h})`;
}

/**
 * Convert OKLCH string to Hex
 * Uses culori for accurate conversion
 */
export function oklchToHex(oklch: string): string {
  return formatHex(oklch) || "#000000";
}

/**
 * Generate light and dark variants from a single source color.
 * Used for "Custom Color" automatic adaptation.
 */
export function generateColorVariants(
  sourceColor: string,
  sourceMode: "light" | "dark"
): {
  light: { primary: string; "primary-foreground": string };
  dark: { primary: string; "primary-foreground": string };
} | null {
  const parsed = parseOklch(sourceColor);
  if (!parsed) {
    return null;
  }

  // Helper to determine best foreground (white or black)
  const getForeground = (l: number) => {
    return l > 0.65 ? "oklch(0 0 0)" : "oklch(0.98 0 0)";
  };

  // 1. Establish the "Source" mode values
  const sourcePrimary = sourceColor;
  const sourceForeground = getForeground(parsed.l);

  // 2. Generate the "Target" mode values
  let targetPrimary = sourceColor;
  let targetForeground = sourceForeground;

  if (sourceMode === "light") {
    // Generating Dark Mode from Light Mode Source
    // Target: Usually Lighter (~0.6-0.7) for visibility on dark background
    // If source L is very low (black/dark blue), lift it significantly
    // If source L is already high (pastel), keep it or slight adjust
    let targetL = parsed.l;

    if (targetL < 0.6) {
      targetL = 0.6 + targetL * 0.1; // Lift dark colors
    }

    // Reduce chroma slightly for dark mode to look more "premium" and less neon
    const targetC = Math.max(0, parsed.c * 0.85);

    targetPrimary = `oklch(${targetL.toFixed(2)} ${targetC.toFixed(2)} ${parsed.h.toFixed(2)})`;
    targetForeground = getForeground(targetL);

    return {
      light: { primary: sourcePrimary, "primary-foreground": sourceForeground },
      dark: { primary: targetPrimary, "primary-foreground": targetForeground },
    };
  }
  // Generating Light Mode from Dark Mode Source
  // Target: Usually Darker (~0.45-0.55) to contrast with white background
  // If source L is high (pastels), darken it
  let targetL = parsed.l;

  if (targetL > 0.55) {
    targetL = 0.5;
  }

  // Increase chroma slightly if it was muted for dark mode? Or keep as is.
  const targetC = parsed.c;

  targetPrimary = `oklch(${targetL.toFixed(2)} ${targetC.toFixed(2)} ${parsed.h.toFixed(2)})`;
  targetForeground = getForeground(targetL);

  return {
    light: { primary: targetPrimary, "primary-foreground": targetForeground },
    dark: { primary: sourcePrimary, "primary-foreground": sourceForeground },
  };
}

/**
 * Preset color palettes
 */
export const COLOR_PRESETS = {
  zinc: {
    name: "Zinc",
    light: {
      primary: "oklch(0.21 0.006 285.885)",
      "primary-foreground": "oklch(0.985 0 0)",
    },
    dark: {
      primary: "oklch(0.92 0.004 286.32)",
      "primary-foreground": "oklch(0.21 0.006 285.885)",
    },
  },
  blue: {
    name: "Blue",
    light: {
      primary: "oklch(0.5 0.2 250)",
      "primary-foreground": "oklch(0.98 0 0)",
    },
    dark: {
      primary: "oklch(0.6 0.15 250)",
      "primary-foreground": "oklch(0.98 0 0)",
    },
  },
  green: {
    name: "Green",
    light: {
      primary: "oklch(0.5 0.15 145)",
      "primary-foreground": "oklch(0.98 0 0)",
    },
    dark: {
      primary: "oklch(0.6 0.15 145)",
      "primary-foreground": "oklch(0.98 0 0)",
    },
  },
  purple: {
    name: "Purple",
    light: {
      primary: "oklch(0.5 0.18 280)",
      "primary-foreground": "oklch(0.98 0 0)",
    },
    dark: {
      primary: "oklch(0.6 0.18 280)",
      "primary-foreground": "oklch(0.98 0 0)",
    },
  },
  orange: {
    name: "Orange",
    light: {
      primary: "oklch(0.6 0.18 45)",
      "primary-foreground": "oklch(0.98 0 0)",
    },
    dark: {
      primary: "oklch(0.7 0.18 45)",
      "primary-foreground": "oklch(0.98 0 0)",
    },
  },
  red: {
    name: "Red",
    light: {
      primary: "oklch(0.55 0.22 25)",
      "primary-foreground": "oklch(0.98 0 0)",
    },
    dark: {
      primary: "oklch(0.65 0.22 25)",
      "primary-foreground": "oklch(0.98 0 0)",
    },
  },
  rose: {
    name: "Rose",
    light: {
      primary: "oklch(0.55 0.22 350)",
      "primary-foreground": "oklch(0.98 0 0)",
    },
    dark: {
      primary: "oklch(0.65 0.22 350)",
      "primary-foreground": "oklch(0.98 0 0)",
    },
  },
} as const;

export type ColorPreset = keyof typeof COLOR_PRESETS;

// ============================================================================
// Shared Theme Settings Utilities
// ============================================================================

/**
 * Storage key used for both cookies and localStorage.
 * Using a consistent key prevents confusion and makes the code easier to maintain.
 */
export const THEME_STORAGE_KEY = "theme-settings";

/**
 * Theme settings structure saved to storage.
 */
export interface ThemeSettings {
  lightColors: Record<string, string>;
  darkColors: Record<string, string>;
  radius: string;
  fontSize: string;
  selectedPreset: ColorPreset | "custom";
}

/**
 * Parse theme settings from a JSON string.
 * Returns null if the input is invalid or empty.
 *
 * @example
 * ```ts
 * const settings = parseThemeSettings(user.appearance);
 * if (settings) {
 *   applyThemeToDOM(settings, "dark");
 * }
 * ```
 */
export function parseThemeSettings(
  input: string | null | undefined
): Partial<ThemeSettings> | null {
  if (!input) {
    return null;
  }

  try {
    const parsed = JSON.parse(input);
    if (parsed && typeof parsed === "object") {
      return parsed as Partial<ThemeSettings>;
    }
  } catch {
    // Invalid JSON
  }

  return null;
}

/**
 * Load theme settings from localStorage.
 * Returns an empty object if nothing is saved or on error.
 *
 * NOTE: This should only be called on the client.
 */
export function loadThemeFromStorage(): Partial<ThemeSettings> {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved) {
      const parsed = parseThemeSettings(saved);
      return parsed ?? {};
    }
  } catch {
    // Ignore localStorage errors
  }

  return {};
}

/**
 * Save theme settings to localStorage.
 *
 * NOTE: This should only be called on the client.
 */
export function saveThemeToStorage(settings: Partial<ThemeSettings>): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Apply theme settings to the DOM.
 * This sets CSS custom properties on document.documentElement.
 *
 * @param settings - The theme settings to apply
 * @param isDark - Whether dark mode is active (determines which color set to use)
 *
 * @example
 * ```ts
 * const settings = parseThemeSettings(user.appearance);
 * if (settings) {
 *   applyThemeToDOM(settings, resolvedTheme === "dark");
 * }
 * ```
 */
export function applyThemeToDOM(
  settings: Partial<ThemeSettings>,
  isDark: boolean
): void {
  if (typeof window === "undefined") {
    return;
  }

  const { lightColors, darkColors, radius, fontSize } = settings;

  // Apply radius
  if (radius) {
    document.documentElement.style.setProperty("--radius", radius);
  }

  // Apply font size
  if (fontSize) {
    document.documentElement.style.fontSize = fontSize;
  }

  // Apply custom colors for current theme
  const colors = isDark ? darkColors : lightColors;
  if (colors) {
    for (const [key, value] of Object.entries(colors)) {
      document.documentElement.style.setProperty(`--${key}`, value);
    }
  }
}

/**
 * Generate CSS string from theme settings.
 * Used for SSR to inject styles in <head> to prevent FOUC.
 *
 * @param settings - The theme settings
 * @returns CSS string or null if no settings
 */
export function generateThemeCss(
  settings: Partial<ThemeSettings>
): string | null {
  if (Object.keys(settings).length === 0) {
    return null;
  }

  const { lightColors, darkColors, radius, fontSize } = settings;
  const cssLines: string[] = [];

  // Root variables (Radius, Font Size, Light Colors)
  cssLines.push(":root {");
  if (radius) {
    cssLines.push(`  --radius: ${radius};`);
  }
  if (fontSize) {
    cssLines.push(`  font-size: ${fontSize};`);
  }
  if (lightColors) {
    for (const [key, value] of Object.entries(lightColors)) {
      cssLines.push(`  --${key}: ${value};`);
    }
  }
  cssLines.push("}");

  // Dark mode overrides
  if (darkColors) {
    cssLines.push(".dark {");
    for (const [key, value] of Object.entries(darkColors)) {
      cssLines.push(`  --${key}: ${value};`);
    }
    cssLines.push("}");
  }

  return cssLines.join("\n");
}
