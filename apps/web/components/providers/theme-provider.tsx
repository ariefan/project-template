"use client";

import {
  applyThemeToDOM,
  loadThemeFromStorage,
  parseThemeSettings,
  THEME_STORAGE_KEY,
} from "@workspace/ui/lib/theme-utils";
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import type * as React from "react";
import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth";

/**
 * Applies user's saved theme settings (colors, radius, font-size) to the DOM.
 * Also syncs the theme to a cookie for SSR to prevent FOUC on refresh.
 */
function ThemeApplicator() {
  const { data: session } = useSession();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const user = session?.user;
  // @ts-expect-error - appearance is not statically typed yet
  const appearanceStr = user?.appearance as string | undefined;

  useEffect(() => {
    if (!(mounted && resolvedTheme)) {
      return;
    }
    if (typeof window === "undefined") {
      return;
    }

    // 1. Try to load from user profile (server)
    let themeSettings = parseThemeSettings(appearanceStr);

    // 2. Fallback to localStorage if server data missing
    if (!themeSettings || Object.keys(themeSettings).length === 0) {
      themeSettings = loadThemeFromStorage();
    }

    // Apply styles
    if (themeSettings && Object.keys(themeSettings).length > 0) {
      applyThemeToDOM(themeSettings, resolvedTheme === "dark");

      // 3. Sync to cookie for SSR (prevents FOUC on next refresh)
      // Only set if we have valid settings from session or localStorage
      // biome-ignore lint/suspicious/noDocumentCookie: SSR theme flash prevention
      document.cookie = `${THEME_STORAGE_KEY}=${encodeURIComponent(JSON.stringify(themeSettings))}; path=/; max-age=31536000`;
    }
  }, [mounted, resolvedTheme, appearanceStr]);

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
