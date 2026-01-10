"use client";

import { Check, Laptop, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import * as React from "react";
import { HexColorPicker } from "react-colorful";
import { Button } from "../../components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/card";
import { Input } from "../../components/input";
import { Label } from "../../components/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/popover";
import { Slider } from "../../components/slider";
import { ToggleGroup, ToggleGroupItem } from "../../components/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../components/tooltip";
import {
  applyThemeToDOM,
  COLOR_PRESETS,
  type ColorPreset,
  DEFAULT_THEME,
  generateColorVariants,
  hexToOklch,
  loadThemeFromStorage,
  oklchToHex,
  resetAllCssVariables,
  saveThemeToStorage,
  type ThemeSettings,
  type ThemeVariable,
} from "../../lib/theme-utils";
import { cn } from "../../lib/utils";

export interface ThemeCustomizerConfig {
  variables?: ThemeVariable[];
  showPresets?: boolean;
  showMode?: boolean;
  showExport?: boolean;
  defaultPreset?: ColorPreset;
  onModeChange?: (mode: string) => void;
}

export interface ThemeCustomizerHandle {
  reset: () => void;
  resetToDefaults: () => void;
  save: () => void;
  getTheme: () => Partial<ThemeSettings>;
}

interface ThemeCustomizerProps {
  config?: ThemeCustomizerConfig;
  initialTheme?: string | null;
  className?: string;
}

/**
 * Gets the resolved background color for a preset button.
 * Handles both oklch and hsl color formats.
 */
function getPresetBackgroundColor(
  presetColors: { light: { primary: string }; dark: { primary: string } },
  isDark: boolean
): string {
  const primaryColor = isDark
    ? presetColors.dark.primary
    : presetColors.light.primary;

  if (primaryColor.startsWith("oklch")) {
    return primaryColor;
  }
  return `hsl(${primaryColor})`;
}

/**
 * Parses initialTheme JSON and merges with saved theme.
 * Returns null if parsing fails.
 */
function parseInitialTheme(
  initialTheme: string | null | undefined,
  saved: Partial<ThemeSettings>
): Partial<ThemeSettings> | null {
  if (!initialTheme) {
    return null;
  }
  try {
    const parsed = JSON.parse(initialTheme);
    return { ...saved, ...parsed };
  } catch {
    return null;
  }
}

/**
 * Determines which preset should be active based on parsed theme and config.
 */
function determineActivePreset(
  parsedTheme: { selectedPreset?: string } | null,
  defaultPreset?: ColorPreset
): ColorPreset | "custom" {
  if (parsedTheme?.selectedPreset) {
    return parsedTheme.selectedPreset as ColorPreset;
  }
  return defaultPreset ?? "zinc";
}

export const ThemeCustomizer = React.forwardRef<
  ThemeCustomizerHandle,
  ThemeCustomizerProps
>(({ config, initialTheme, className }, ref) => {
  const { theme: mode, setTheme: setMode, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Theme state
  const [theme, setTheme] = React.useState<Partial<ThemeSettings>>({});
  const [activePreset, setActivePreset] = React.useState<
    ColorPreset | "custom"
  >((config?.defaultPreset as ColorPreset) || "zinc");

  // Custom color state (synced with theme)
  const [customPrimary, setCustomPrimary] = React.useState("");
  const [customPrimaryForeground, setCustomPrimaryForeground] =
    React.useState("");

  // Refs for cleanup and persistent state tracking
  const committedThemeRef = React.useRef<Partial<ThemeSettings>>({});
  const modeRef = React.useRef(mode);

  // Keep mode ref updated
  React.useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  // Initialize state
  React.useEffect(() => {
    setMounted(true);
    const saved = loadThemeFromStorage();
    const parsedTheme = parseInitialTheme(initialTheme, saved);
    const startTheme = parsedTheme ?? saved;

    setTheme(startTheme);
    committedThemeRef.current = startTheme;

    // Init custom colors if present
    const colors =
      mode === "dark" ? startTheme.darkColors : startTheme.lightColors;
    if (colors?.primary) {
      setCustomPrimary(colors.primary);
    }
    if (colors?.["primary-foreground"]) {
      setCustomPrimaryForeground(colors["primary-foreground"]);
    }

    // Determine active preset
    setActivePreset(
      determineActivePreset(parsedTheme, config?.defaultPreset as ColorPreset)
    );

    // Cleanup function to revert unsaved changes
    return () => {
      resetAllCssVariables();
      document.documentElement.style.removeProperty("font-size");

      const stateToRestore = committedThemeRef.current;
      if (Object.keys(stateToRestore).length > 0) {
        applyThemeToDOM(stateToRestore, modeRef.current === "dark");
      }
    };
  }, [config?.defaultPreset, initialTheme, mode]); // Run once on mount/unmount
  // Update custom color inputs when theme changes externally or via preset
  React.useEffect(() => {
    const colors = mode === "dark" ? theme.darkColors : theme.lightColors;
    if (!colors) {
      return;
    }
    if (colors.primary !== customPrimary) {
      setCustomPrimary(colors.primary || "");
    }
    if (colors["primary-foreground"] !== customPrimaryForeground) {
      setCustomPrimaryForeground(colors["primary-foreground"] || "");
    }
  }, [theme, mode, customPrimary, customPrimaryForeground]);

  // Expose methods
  React.useImperativeHandle(ref, () => ({
    reset: () => {
      // Restore user's saved preference or defaults
      const restoredSettings = parseInitialTheme(initialTheme, {}) ?? {};

      // Clear DOM and apply restored settings
      resetAllCssVariables();
      document.documentElement.style.removeProperty("font-size");
      if (Object.keys(restoredSettings).length > 0) {
        applyThemeToDOM(restoredSettings, mode === "dark");
      }

      // Update React state
      setTheme(restoredSettings);
      setActivePreset(
        determineActivePreset(
          restoredSettings,
          config?.defaultPreset as ColorPreset
        )
      );

      // Restore custom color inputs
      const colors =
        mode === "dark"
          ? restoredSettings.darkColors
          : restoredSettings.lightColors;
      setCustomPrimary(colors?.primary ?? "");
      setCustomPrimaryForeground(colors?.["primary-foreground"] ?? "");

      saveThemeToStorage(restoredSettings);
    },
    resetToDefaults: () => {
      // 1. Determine default preset (Zinc)
      const defaultPresetName =
        (config?.defaultPreset as ColorPreset) || "zinc";
      const presetConfig = COLOR_PRESETS[defaultPresetName];

      // 2. Set React State to Default Preset values
      setTheme({
        selectedPreset: defaultPresetName,
        lightColors: presetConfig?.light,
        darkColors: presetConfig?.dark,
        radius: DEFAULT_THEME.radius, // Reset radius to default
        // Font size defaults are handled by removal
      });
      setActivePreset(defaultPresetName);
      setCustomPrimary("");
      setCustomPrimaryForeground("");

      // 3. Clear all CSS variables first
      resetAllCssVariables();
      document.documentElement.style.removeProperty("font-size");

      // 4. IMPORTANT: Apply the default preset colors to DOM immediately
      // This ensures "Live Preview" works and matches "Selecting Zinc" behavior
      if (presetConfig) {
        const colors = mode === "dark" ? presetConfig.dark : presetConfig.light;
        applyThemeToDOM(
          { ...colors, radius: DEFAULT_THEME.radius },
          mode === "dark"
        );
      }

      // 5. Clear Local Storage (or save defaults? User asked for "same behavior as selecting",
      // which usually SAVES the selection. But "Reset to Defaults" usually clears storage.
      // However, to ensure consistency with "Selecting", we should probably SAVE the explicit default state
      // so it persists if the user reloads.
      // But the previous requirement was "Reset button reverts to saved, Default button resets to Factory".
      // If we save here, we overwrite the "User's previous saved state" effectively.
      saveThemeToStorage({});
    },
    save: () => {
      const stateToSave = {
        ...theme,
        selectedPreset: activePreset,
      };

      // Update committed ref so we don't revert valid changes
      committedThemeRef.current = stateToSave;

      saveThemeToStorage(stateToSave);
    },
    getTheme: () => ({
      ...theme,
      selectedPreset: activePreset,
    }),
  }));

  // Apply changes to DOM
  React.useEffect(() => {
    if (mounted) {
      // Don't apply font size live, only colors and radius
      // We use the saved/initial font size to keep the rest of the UI stable
      const { fontSize, ...rest } = theme;

      // If we want to ensure the *initial* font size is applied/maintained, we could pass it here,
      // but applyThemeToDOM only applies what's passed.
      // If we omit fontSize, it leaves the current document style alone (which matches initial).
      applyThemeToDOM(rest, mode === "dark");
    }
  }, [theme, mode, mounted]);

  const handleColorChange = (preset: ColorPreset) => {
    setActivePreset(preset);
    const presetConfig = COLOR_PRESETS[preset];
    if (!presetConfig) {
      return;
    }

    setTheme((prev) => ({
      ...prev,
      lightColors: {
        ...prev.lightColors,
        ...presetConfig.light,
      },
      darkColors: {
        ...prev.darkColors,
        ...presetConfig.dark,
      },
    }));
  };

  const handlePrimaryColorChange = (value: string) => {
    setActivePreset("custom");
    setCustomPrimary(value);

    const isDark = mode === "dark" || resolvedTheme === "dark";
    const variants = generateColorVariants(value, isDark ? "dark" : "light");

    if (variants) {
      const currentModeColors = isDark ? variants.dark : variants.light;
      setCustomPrimaryForeground(currentModeColors["primary-foreground"]);
      setTheme((prev) => ({
        ...prev,
        lightColors: { ...prev.lightColors, ...variants.light },
        darkColors: { ...prev.darkColors, ...variants.dark },
      }));
      return;
    }

    // Fallback if no variants generated
    setTheme((prev) => ({
      ...prev,
      lightColors: { ...prev.lightColors, primary: value },
      darkColors: { ...prev.darkColors, primary: value },
    }));
  };

  const handleForegroundColorChange = (value: string) => {
    setActivePreset("custom");
    setCustomPrimaryForeground(value);
    setTheme((prev) => ({
      ...prev,
      lightColors: { ...prev.lightColors, "primary-foreground": value },
      darkColors: { ...prev.darkColors, "primary-foreground": value },
    }));
  };

  const handleCustomColorChange = (
    key: "primary" | "primary-foreground",
    value: string
  ) => {
    if (key === "primary") {
      handlePrimaryColorChange(value);
    } else {
      handleForegroundColorChange(value);
    }
  };

  const handleRadiusChange = (value: number[]) => {
    setTheme((prev) => ({
      ...prev,
      radius: `${value[0]}rem`,
    }));
  };

  const handleFontSizeChange = (value: number[]) => {
    // Assuming 16px (1rem) is base.
    // Slider 12 to 24?
    setTheme((prev) => ({
      ...prev,
      fontSize: `${value[0]}px`,
    }));
  };

  // Current values for sliders
  const currentRadius = Number.parseFloat(
    theme.radius?.replace("rem", "") || DEFAULT_THEME.radius.replace("rem", "")
  );
  const currentFontSize = Number.parseFloat(
    theme.fontSize?.replace("px", "") || "16"
  );

  if (!mounted) {
    return null;
  }

  return (
    <div className={cn("grid gap-4 md:grid-cols-2", className)}>
      {/* 1. Theme (Mode and Preset) */}
      <Card>
        <CardHeader>
          <CardTitle>Theme & Preset</CardTitle>
          <CardDescription>
            Select your preferred mode and color theme.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Mode */}
          <div className="space-y-2">
            <Label>Mode</Label>
            <ToggleGroup
              className="w-full justify-start border"
              onValueChange={(value) => {
                if (value) {
                  setMode(value);
                  config?.onModeChange?.(value);
                }
              }}
              type="single"
              value={mode}
            >
              <ToggleGroupItem
                aria-label="Light Mode"
                className="flex-1"
                value="light"
              >
                <Sun className="mr-2 h-4 w-4" />
                Light
              </ToggleGroupItem>
              <ToggleGroupItem
                aria-label="Dark Mode"
                className="flex-1 border"
                value="dark"
              >
                <Moon className="mr-2 h-4 w-4" />
                Dark
              </ToggleGroupItem>
              <ToggleGroupItem
                aria-label="System Mode"
                className="flex-1"
                value="system"
              >
                <Laptop className="mr-2 h-4 w-4" />
                System
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {/* Presets */}
          <div className="space-y-2">
            <Label>Preset</Label>
            <div className="flex flex-wrap gap-3">
              {Object.entries(COLOR_PRESETS).map(([key, value]) => {
                const isActive = activePreset === key;
                const isDark = resolvedTheme === "dark" || mode === "dark";
                return (
                  <TooltipProvider key={key}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          className={cn(
                            "flex h-9 w-9 items-center justify-center rounded-full border-2 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                            isActive ? "border-primary" : "border-border"
                          )}
                          onClick={() => handleColorChange(key as ColorPreset)}
                          style={{
                            backgroundColor: getPresetBackgroundColor(
                              value,
                              isDark
                            ),
                          }}
                          type="button"
                        >
                          {isActive && (
                            <Check className="h-4 w-4 text-white mix-blend-difference" />
                          )}
                          <span className="sr-only">{value.name}</span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>{value.name}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Custom Color */}
      <Card>
        <CardHeader>
          <CardTitle>Custom Color</CardTitle>
          <CardDescription>Fine-tune primary colors.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Primary Color</Label>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className="relative flex aspect-square h-10 w-10 items-center justify-center rounded-md border shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    style={{
                      backgroundColor: customPrimary.startsWith("oklch")
                        ? customPrimary
                        : "",
                    }}
                    type="button"
                  >
                    <span className="sr-only">Pick primary color</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3">
                  <HexColorPicker
                    color={
                      customPrimary.startsWith("oklch")
                        ? oklchToHex(customPrimary)
                        : customPrimary
                    }
                    onChange={(hex) =>
                      handleCustomColorChange("primary", hexToOklch(hex))
                    }
                  />
                </PopoverContent>
              </Popover>
              <Input
                className="flex-1 font-mono"
                onChange={(e) =>
                  // Accept direct input if it looks like a color?
                  // For now treating as raw string unless validated but user requested OKLCH utilization
                  // Best to let them type hex and convert?
                  // Let's stick to state value for now. Use oklchToHex for display if needed.
                  // Actually, user might paste in OKLCH directly.
                  handleCustomColorChange("primary", e.target.value)
                }
                placeholder="oklch(...) or #hex"
                value={customPrimary}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Foreground Color</Label>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className="relative flex aspect-square h-10 w-10 items-center justify-center rounded-md border shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    style={{
                      backgroundColor: customPrimaryForeground.startsWith(
                        "oklch"
                      )
                        ? customPrimaryForeground
                        : "",
                    }}
                    type="button"
                  >
                    <span className="sr-only">Pick foreground color</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3">
                  <HexColorPicker
                    color={
                      customPrimaryForeground.startsWith("oklch")
                        ? oklchToHex(customPrimaryForeground)
                        : customPrimaryForeground
                    }
                    onChange={(hex) =>
                      handleCustomColorChange(
                        "primary-foreground",
                        hexToOklch(hex)
                      )
                    }
                  />
                </PopoverContent>
              </Popover>
              <Input
                className="flex-1 font-mono"
                onChange={(e) =>
                  handleCustomColorChange("primary-foreground", e.target.value)
                }
                placeholder="oklch(...) or #hex"
                value={customPrimaryForeground}
              />
            </div>
            <p className="text-[0.8rem] text-muted-foreground">
              Text/Icon color on top of primary.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 3. Font Size */}
      <Card>
        <CardHeader>
          <CardTitle>Font Size</CardTitle>
          <CardDescription>Adjust the base font size.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Base Size</Label>
              <span className="text-muted-foreground text-sm">
                {currentFontSize}px
              </span>
            </div>
            <Slider
              max={24}
              min={12}
              onValueChange={handleFontSizeChange}
              step={1}
              value={[currentFontSize]}
            />
            <div className="space-y-2">
              <Label className="font-normal text-muted-foreground text-xs uppercase tracking-wider">
                Preview
              </Label>
              <div className="rounded-md border p-4">
                <p
                  className="text-muted-foreground leading-relaxed"
                  style={{ fontSize: `${currentFontSize}px` }}
                >
                  The quick brown fox jumps over the lazy dog.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. Border Radius */}
      <Card>
        <CardHeader>
          <CardTitle>Border Radius</CardTitle>
          <CardDescription>Adjust global corner roundness.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Radius</Label>
              <span className="text-muted-foreground text-sm">
                {currentRadius}rem
              </span>
            </div>
            <Slider
              max={2.0}
              min={0}
              onValueChange={handleRadiusChange}
              step={0.1}
              value={[currentRadius]}
            />
            <div className="space-y-2 pt-2">
              <Label className="font-normal text-muted-foreground text-xs uppercase tracking-wider">
                Preview
              </Label>
              <div className="flex items-center gap-4 rounded-lg border bg-accent/20 p-2">
                <Button>Button</Button>
                <Input
                  className="w-full max-w-[150px]"
                  placeholder="Input"
                  readOnly
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

ThemeCustomizer.displayName = "ThemeCustomizer";
