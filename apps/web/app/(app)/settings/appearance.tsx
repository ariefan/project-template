"use client";

import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Separator } from "@workspace/ui/components/separator";
import type { ThemeCustomizerHandle } from "@workspace/ui/composed/theme-customizer";
import { ThemeCustomizer } from "@workspace/ui/composed/theme-customizer";
import { THEME_STORAGE_KEY } from "@workspace/ui/lib/theme-utils";
import { Loader2, RotateCcw } from "lucide-react";
import { useTheme } from "next-themes";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { authClient, useSession } from "@/lib/auth";

// Theme mode values
type ThemeValue = "light" | "dark" | "system";

export function AppearanceTab() {
  const { data: session, isPending: sessionLoading, refetch } = useSession();
  const { setTheme: setNextTheme, theme: currentTheme } = useTheme();

  const user = session?.user;
  // @ts-expect-error - appearance is not typed yet
  const initialTheme = user?.appearance;

  // Refs
  const themeCustomizerRef = useRef<ThemeCustomizerHandle>(null);

  // Form state
  const [isSaving, setIsSaving] = useState(false);

  // Handle theme selection
  function handleThemeChange(newTheme: ThemeValue) {
    setNextTheme(newTheme);
  }

  function _handleReset() {
    themeCustomizerRef.current?.reset();
    toast.info("Theme reset to defaults. Save to persist.");
  }

  // Save preferences
  async function handleSave() {
    setIsSaving(true);
    try {
      // 1. Save theme customizations (Color/Font Size)
      themeCustomizerRef.current?.save();
      const themeSettings = themeCustomizerRef.current?.getTheme();

      // 2. Save theme mode and customizations to server
      // Using type assertion as theme/appearance are additionalFields not in Better Auth's TS types
      await authClient.updateUser({
        theme: currentTheme,
        appearance: JSON.stringify(themeSettings),
      } as Parameters<typeof authClient.updateUser>[0]);

      // 3. Set cookie for immediate server-side rendering (avoids FOUC)
      // biome-ignore lint/suspicious/noDocumentCookie: Needed for SSR theme flash prevention
      document.cookie = `${THEME_STORAGE_KEY}=${JSON.stringify(themeSettings)}; path=/; max-age=31536000`; // 1 year

      // Refetch session to get updated values
      await refetch();

      toast.success("Appearance settings saved successfully");
    } catch (error) {
      toast.error("Failed to save settings");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  }

  if (sessionLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <ThemeCustomizer
        config={{
          variables: ["primary", "primary-foreground", "radius"],
          showPresets: true,
          showMode: true,
          showExport: true,
          defaultPreset: "zinc",
          onModeChange: (mode: string) => handleThemeChange(mode as ThemeValue),
        }}
        initialTheme={initialTheme}
        ref={themeCustomizerRef}
      />

      <Separator />

      {/* Save Button */}
      {/* Footer Actions */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            disabled={isSaving}
            onClick={() => themeCustomizerRef.current?.resetToDefaults()}
            variant="outline"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset Default
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <p className="hidden text-muted-foreground text-sm sm:block">
            Theme colors apply live. Save to persist.
          </p>
          <Button disabled={isSaving} onClick={handleSave}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Appearance
          </Button>
        </div>
      </div>
    </div>
  );
}
