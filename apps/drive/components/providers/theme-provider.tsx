"use client";

import {
  applyThemeToDOM,
  loadThemeFromStorage,
  THEME_STORAGE_KEY,
} from "@workspace/ui/lib/theme-utils";
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import type * as React from "react";
import { useEffect, useState } from "react";

/**
 * Applies user's saved theme settings (colors, radius, font-size) to the DOM.
 * Also syncs the theme to a cookie for SSR to prevent FOUC on refresh.
 */
function ThemeApplicator() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!(mounted && resolvedTheme)) {
      return;
    }
    if (typeof window === "undefined") {
      return;
    }

    // 1. Load from localStorage (Simplified without auth for now)
    const themeSettings = loadThemeFromStorage();

    // Apply styles
    if (themeSettings && Object.keys(themeSettings).length > 0) {
      applyThemeToDOM(themeSettings, resolvedTheme === "dark");

      // 2. Sync to cookie for SSR (prevents FOUC on next refresh)
      // biome-ignore lint/suspicious/noDocumentCookie: SSR theme flash prevention
      document.cookie = `${THEME_STORAGE_KEY}=${encodeURIComponent(JSON.stringify(themeSettings))}; path=/; max-age=31536000`;
    }
  }, [mounted, resolvedTheme]);

  return null;
}

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider {...props}>
      <ThemeApplicator />
      {children}
    </NextThemesProvider>
  );
}
