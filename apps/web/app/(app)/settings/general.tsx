"use client";

import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Globe, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { authClient, useSession } from "@/lib/auth";

// Available timezones
const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Moscow",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Singapore",
  "Asia/Kolkata",
  "Asia/Jakarta",
  "Asia/Seoul",
  "Australia/Sydney",
  "Pacific/Auckland",
];

// Available locales
const LOCALES = [
  { value: "en", label: "English", native: "English" },
  { value: "es", label: "Spanish", native: "Español" },
  { value: "fr", label: "French", native: "Français" },
  { value: "de", label: "German", native: "Deutsch" },
  { value: "it", label: "Italian", native: "Italiano" },
  { value: "pt", label: "Portuguese", native: "Português" },
  { value: "ru", label: "Russian", native: "Русский" },
  { value: "zh", label: "Chinese", native: "中文" },
  { value: "ja", label: "Japanese", native: "日本語" },
  { value: "ko", label: "Korean", native: "한국어" },
  { value: "id", label: "Indonesian", native: "Bahasa Indonesia" },
  { value: "ar", label: "Arabic", native: "العربية" },
  { value: "hi", label: "Hindi", native: "हिन्दी" },
];

export function GeneralTab() {
  const { data: session, isPending: sessionLoading, refetch } = useSession();
  const user = session?.user;

  // Form state
  const [locale, setLocale] = useState("en");
  const [timezone, setTimezone] = useState("UTC");
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form when user loads
  useEffect(() => {
    if (user) {
      const userLocale =
        ((user as Record<string, unknown>).locale as string) ?? "en";
      const userTimezone =
        ((user as Record<string, unknown>).timezone as string) ?? "UTC";

      setLocale(userLocale);
      setTimezone(userTimezone);
    }
  }, [user]);

  // Save preferences
  async function handleSave() {
    setIsSaving(true);
    try {
      // @ts-expect-error - locale is not a standard Better Auth field
      await authClient.updateUser({ locale });
      // @ts-expect-error - timezone is not a standard Better Auth field
      await authClient.updateUser({ timezone });

      // Refetch session to get updated values
      await refetch();

      toast.success("General settings saved successfully");
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
      {/* Locale & Timezone */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Language & Region
          </CardTitle>
          <CardDescription>
            Set your language and timezone preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Locale */}
          <div className="space-y-2">
            <Label htmlFor="locale">Language</Label>
            <Select onValueChange={setLocale} value={locale}>
              <SelectTrigger id="locale">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                {LOCALES.map((localeOption) => (
                  <SelectItem
                    key={localeOption.value}
                    value={localeOption.value}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <span>{localeOption.label}</span>
                      <span className="text-muted-foreground text-xs">
                        {localeOption.native}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">
              This affects the language used in the interface
            </p>
          </div>

          {/* Timezone */}
          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Select onValueChange={setTimezone} value={timezone}>
              <SelectTrigger id="timezone">
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">
              Used for scheduling and displaying timestamps
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex items-center justify-end gap-3">
        <Button disabled={isSaving} onClick={handleSave}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save General Settings
        </Button>
      </div>
    </div>
  );
}
