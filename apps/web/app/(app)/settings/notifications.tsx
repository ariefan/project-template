"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { NotificationPreferences } from "@workspace/contracts";
import {
  notificationPreferencesRoutesGetPreferencesOptions,
  notificationPreferencesRoutesUpdatePreferencesMutation,
} from "@workspace/contracts/query";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Switch } from "@workspace/ui/components/switch";
import {
  Bell,
  Clock,
  Loader2,
  Mail,
  MessageCircle,
  Moon,
  Send,
  Smartphone,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Notifications component is complex
export function NotificationsTab() {
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  const queryOptions = notificationPreferencesRoutesGetPreferencesOptions({
    client: apiClient,
  });

  const {
    data: preferencesData,
    isLoading: preferencesLoading,
    error,
  } = useQuery({
    ...queryOptions,
    retry: false,
  });

  const updatePreferencesMutation = useMutation({
    ...notificationPreferencesRoutesUpdatePreferencesMutation({
      client: apiClient,
    }),
    onMutate: async (newPreference) => {
      await queryClient.cancelQueries({ queryKey: queryOptions.queryKey });
      const previousData = queryClient.getQueryData(queryOptions.queryKey);

      // biome-ignore lint/suspicious/noExplicitAny: React Query cache update
      queryClient.setQueryData(queryOptions.queryKey, (old: any) => {
        if (!old?.data) {
          return old;
        }
        return {
          ...old,
          data: {
            ...old.data,
            ...newPreference.body,
          },
        };
      });

      return { previousData };
    },
    onError: (_err, _newTodo, context) => {
      queryClient.setQueryData(queryOptions.queryKey, context?.previousData);
      toast.error("Failed to update preferences");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryOptions.queryKey });
    },
    onSuccess: () => {
      toast.success("Preferences updated");
    },
  });

  const preferences = (preferencesData as { data?: NotificationPreferences })
    ?.data;

  function handleToggleChange(
    key: keyof NotificationPreferences,
    value: boolean
  ) {
    updatePreferencesMutation.mutate({
      body: { [key]: value },
    });
  }

  const isUpdating = (key: keyof NotificationPreferences) => {
    return (
      updatePreferencesMutation.isPending &&
      updatePreferencesMutation.variables?.body &&
      key in updatePreferencesMutation.variables.body
    );
  };

  // Contact Info Form
  const {
    register: registerContact,
    handleSubmit: handleSubmitContact,
    reset: resetContact,
  } = useForm({
    values: {
      preferredEmail: preferences?.preferredEmail || "",
      preferredPhone: preferences?.preferredPhone || "",
      preferredTelegramId: preferences?.preferredTelegramId || "",
    },
  });

  // Quiet Hours Form
  const {
    register: registerQuiet,
    handleSubmit: handleSubmitQuiet,
    watch: watchQuiet,
    setValue: setValueQuiet,
    reset: resetQuiet,
  } = useForm({
    values: {
      quietHoursStart: preferences?.quietHoursStart || "22:00",
      quietHoursEnd: preferences?.quietHoursEnd || "08:00",
      quietHoursTimezone:
        preferences?.quietHoursTimezone ||
        Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  });

  // Reset forms when preferences load
  useEffect(() => {
    if (preferences) {
      resetContact({
        preferredEmail: preferences.preferredEmail || "",
        preferredPhone: preferences.preferredPhone || "",
        preferredTelegramId: preferences.preferredTelegramId || "",
      });
      resetQuiet({
        quietHoursStart: preferences.quietHoursStart || "22:00",
        quietHoursEnd: preferences.quietHoursEnd || "08:00",
        quietHoursTimezone:
          preferences.quietHoursTimezone ||
          Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
    }
  }, [preferences, resetContact, resetQuiet]);

  // biome-ignore lint/suspicious/noExplicitAny: Form data type
  const onSaveContactInfo = (data: any) => {
    updatePreferencesMutation.mutate({
      body: {
        preferredEmail: data.preferredEmail || null,
        preferredPhone: data.preferredPhone || null,
        preferredTelegramId: data.preferredTelegramId || null,
      },
    });
  };

  // biome-ignore lint/suspicious/noExplicitAny: Form data type
  const onSaveQuietHours = (data: any) => {
    updatePreferencesMutation.mutate({
      body: {
        quietHoursStart: data.quietHoursStart,
        quietHoursEnd: data.quietHoursEnd,
        quietHoursTimezone: data.quietHoursTimezone,
      },
    });
  };

  // Only show loading state after component is mounted on client
  if (mounted && preferencesLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!(mounted && preferences)) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
          <p>Failed to load preferences</p>
          {error && (
            <pre className="mt-2 w-full overflow-auto rounded bg-muted p-2 text-left text-destructive text-xs">
              {error instanceof Error
                ? error.message
                : JSON.stringify(error, null, 2)}
            </pre>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Channels & Categories Card */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>
            Choose how you want to receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Channels Section */}
          <div>
            <h3 className="mb-4 font-medium text-lg">Notification Channels</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Email</p>
                    <p className="text-muted-foreground text-sm">
                      Receive notifications via email
                    </p>
                  </div>
                </div>
                {isUpdating("emailEnabled") ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : (
                  <Switch
                    checked={preferences.emailEnabled}
                    disabled={updatePreferencesMutation.isPending}
                    onCheckedChange={(checked) =>
                      handleToggleChange("emailEnabled", checked)
                    }
                  />
                )}
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <Smartphone className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">SMS</p>
                    <p className="text-muted-foreground text-sm">
                      Receive text message notifications
                    </p>
                  </div>
                </div>
                {isUpdating("smsEnabled") ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : (
                  <Switch
                    checked={preferences.smsEnabled}
                    disabled={updatePreferencesMutation.isPending}
                    onCheckedChange={(checked) =>
                      handleToggleChange("smsEnabled", checked)
                    }
                  />
                )}
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <MessageCircle className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">WhatsApp</p>
                    <p className="text-muted-foreground text-sm">
                      Receive WhatsApp messages
                    </p>
                  </div>
                </div>
                {isUpdating("whatsappEnabled") ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : (
                  <Switch
                    checked={preferences.whatsappEnabled}
                    disabled={updatePreferencesMutation.isPending}
                    onCheckedChange={(checked) =>
                      handleToggleChange("whatsappEnabled", checked)
                    }
                  />
                )}
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <Send className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Telegram</p>
                    <p className="text-muted-foreground text-sm">
                      Receive Telegram messages
                    </p>
                  </div>
                </div>
                {isUpdating("telegramEnabled") ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : (
                  <Switch
                    checked={preferences.telegramEnabled}
                    disabled={updatePreferencesMutation.isPending}
                    onCheckedChange={(checked) =>
                      handleToggleChange("telegramEnabled", checked)
                    }
                  />
                )}
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4 md:col-span-2">
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Push Notifications</p>
                    <p className="text-muted-foreground text-sm">
                      Receive browser push notifications
                    </p>
                  </div>
                </div>
                {isUpdating("pushEnabled") ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : (
                  <Switch
                    checked={preferences.pushEnabled}
                    disabled={updatePreferencesMutation.isPending}
                    onCheckedChange={(checked) =>
                      handleToggleChange("pushEnabled", checked)
                    }
                  />
                )}
              </div>
            </div>
          </div>

          {/* Categories Section */}
          <div>
            <h3 className="mb-4 font-medium text-lg">
              Notification Categories
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">Transactional</p>
                    <Badge className="text-xs" variant="outline">
                      Required
                    </Badge>
                  </div>
                  <p className="mt-1 text-muted-foreground text-sm">
                    Order confirmations, receipts, and account updates
                  </p>
                </div>
                <Switch
                  checked={preferences.transactionalEnabled}
                  disabled={true} // Always mandatory
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium">Marketing</p>
                  <p className="mt-1 text-muted-foreground text-sm">
                    Promotions, newsletters, and product updates
                  </p>
                </div>
                {isUpdating("marketingEnabled") ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : (
                  <Switch
                    checked={preferences.marketingEnabled}
                    disabled={updatePreferencesMutation.isPending}
                    onCheckedChange={(checked) =>
                      handleToggleChange("marketingEnabled", checked)
                    }
                  />
                )}
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">Security</p>
                    <Badge className="text-xs" variant="secondary">
                      Recommended
                    </Badge>
                  </div>
                  <p className="mt-1 text-muted-foreground text-sm">
                    Login alerts, password changes, and security updates
                  </p>
                </div>
                {isUpdating("securityEnabled") ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : (
                  <Switch
                    checked={preferences.securityEnabled}
                    disabled={updatePreferencesMutation.isPending}
                    onCheckedChange={(checked) =>
                      handleToggleChange("securityEnabled", checked)
                    }
                  />
                )}
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium">System</p>
                  <p className="mt-1 text-muted-foreground text-sm">
                    Maintenance notices and system updates
                  </p>
                </div>
                {isUpdating("systemEnabled") ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : (
                  <Switch
                    checked={preferences.systemEnabled}
                    disabled={updatePreferencesMutation.isPending}
                    onCheckedChange={(checked) =>
                      handleToggleChange("systemEnabled", checked)
                    }
                  />
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
          <CardDescription>
            Where should we send your notifications?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={handleSubmitContact(onSaveContactInfo)}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="preferredEmail">Preferred Email</Label>
                <Input
                  id="preferredEmail"
                  placeholder="name@example.com"
                  type="email"
                  {...registerContact("preferredEmail")}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="preferredPhone">Preferred Phone</Label>
                <Input
                  id="preferredPhone"
                  placeholder="+1234567890"
                  type="tel"
                  {...registerContact("preferredPhone")}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="preferredTelegramId">Telegram ID</Label>
                <Input
                  id="preferredTelegramId"
                  placeholder="123456789"
                  {...registerContact("preferredTelegramId")}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                disabled={updatePreferencesMutation.isPending}
                type="submit"
              >
                Save Contact Info
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Quiet Hours Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Moon className="h-5 w-5" /> Quiet Hours
              </CardTitle>
              <CardDescription>
                Pause notifications during specific times
              </CardDescription>
            </div>
            <Switch
              checked={preferences.quietHoursEnabled}
              disabled={updatePreferencesMutation.isPending}
              onCheckedChange={(checked) =>
                handleToggleChange("quietHoursEnabled", checked)
              }
            />
          </div>
        </CardHeader>
        {preferences.quietHoursEnabled && (
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={handleSubmitQuiet(onSaveQuietHours)}
            >
              <div className="grid gap-4 md:grid-cols-3">
                <div className="grid gap-2">
                  <Label
                    className="flex items-center gap-2"
                    htmlFor="quietHoursStart"
                  >
                    <Clock className="h-4 w-4" /> Start Time
                  </Label>
                  <Input
                    id="quietHoursStart"
                    type="time"
                    {...registerQuiet("quietHoursStart")}
                  />
                </div>
                <div className="grid gap-2">
                  <Label
                    className="flex items-center gap-2"
                    htmlFor="quietHoursEnd"
                  >
                    <Clock className="h-4 w-4" /> End Time
                  </Label>
                  <Input
                    id="quietHoursEnd"
                    type="time"
                    {...registerQuiet("quietHoursEnd")}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="quietHoursTimezone">Timezone</Label>
                  {/* Using a simple select for now, could be a combobox in future */}
                  <Select
                    defaultValue={watchQuiet("quietHoursTimezone")}
                    onValueChange={(val) =>
                      setValueQuiet("quietHoursTimezone", val)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      {Intl.supportedValuesOf("timeZone").map((tz) => (
                        <SelectItem key={tz} value={tz}>
                          {tz}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  disabled={updatePreferencesMutation.isPending}
                  type="submit"
                >
                  Save Quiet Hours
                </Button>
              </div>
            </form>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
