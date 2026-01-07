"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { NotificationPreferences } from "@workspace/contracts";
import {
  notificationPreferencesRoutesGetPreferencesOptions,
  notificationPreferencesRoutesUpdatePreferencesMutation,
} from "@workspace/contracts/query";
import { Badge } from "@workspace/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Separator } from "@workspace/ui/components/separator";
import { Switch } from "@workspace/ui/components/switch";
import {
  Bell,
  Loader2,
  Mail,
  MessageCircle,
  Send,
  Smartphone,
} from "lucide-react";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";

export function NotificationsTab() {
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data: preferencesData, isLoading: preferencesLoading } = useQuery({
    ...notificationPreferencesRoutesGetPreferencesOptions({
      client: apiClient,
    }),
  });

  const updatePreferencesMutation = useMutation({
    ...notificationPreferencesRoutesUpdatePreferencesMutation({
      client: apiClient,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["notificationPreferencesRoutesGetPreferences"],
      });
    },
  });

  const preferences = (preferencesData as { data?: NotificationPreferences })
    ?.data;

  function handlePreferenceChange(
    key: keyof NotificationPreferences,
    value: boolean
  ) {
    updatePreferencesMutation.mutate({
      body: { [key]: value },
    });
  }

  // Only show loading state after component is mounted on client
  // to prevent hydration mismatch with server render
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
        <CardContent className="py-8 text-center text-muted-foreground">
          Failed to load preferences
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
        <CardDescription>
          Choose how you want to receive notifications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Channels Section */}
        <div>
          <h3 className="mb-4 font-medium text-lg">Notification Channels</h3>
          <div className="space-y-4">
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
              <Switch
                checked={preferences.emailEnabled}
                disabled={updatePreferencesMutation.isPending}
                onCheckedChange={(checked) =>
                  handlePreferenceChange("emailEnabled", checked)
                }
              />
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
              <Switch
                checked={preferences.smsEnabled}
                disabled={updatePreferencesMutation.isPending}
                onCheckedChange={(checked) =>
                  handlePreferenceChange("smsEnabled", checked)
                }
              />
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
              <Switch
                checked={preferences.whatsappEnabled}
                disabled={updatePreferencesMutation.isPending}
                onCheckedChange={(checked) =>
                  handlePreferenceChange("whatsappEnabled", checked)
                }
              />
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
              <Switch
                checked={preferences.telegramEnabled}
                disabled={updatePreferencesMutation.isPending}
                onCheckedChange={(checked) =>
                  handlePreferenceChange("telegramEnabled", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Push Notifications</p>
                  <p className="text-muted-foreground text-sm">
                    Receive browser push notifications
                  </p>
                </div>
              </div>
              <Switch
                checked={preferences.pushEnabled}
                disabled={updatePreferencesMutation.isPending}
                onCheckedChange={(checked) =>
                  handlePreferenceChange("pushEnabled", checked)
                }
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Categories Section */}
        <div>
          <h3 className="mb-4 font-medium text-lg">Notification Categories</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">Transactional</p>
                  <Badge variant="outline">Required</Badge>
                </div>
                <p className="text-muted-foreground text-sm">
                  Order confirmations, receipts, and account updates
                </p>
              </div>
              <Switch
                checked={preferences.transactionalEnabled}
                disabled={updatePreferencesMutation.isPending}
                onCheckedChange={(checked) =>
                  handlePreferenceChange("transactionalEnabled", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">Marketing</p>
                <p className="text-muted-foreground text-sm">
                  Promotions, newsletters, and product updates
                </p>
              </div>
              <Switch
                checked={preferences.marketingEnabled}
                disabled={updatePreferencesMutation.isPending}
                onCheckedChange={(checked) =>
                  handlePreferenceChange("marketingEnabled", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">Security</p>
                  <Badge variant="secondary">Recommended</Badge>
                </div>
                <p className="text-muted-foreground text-sm">
                  Login alerts, password changes, and security updates
                </p>
              </div>
              <Switch
                checked={preferences.securityEnabled}
                disabled={updatePreferencesMutation.isPending}
                onCheckedChange={(checked) =>
                  handlePreferenceChange("securityEnabled", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">System</p>
                <p className="text-muted-foreground text-sm">
                  Maintenance notices and system updates
                </p>
              </div>
              <Switch
                checked={preferences.systemEnabled}
                disabled={updatePreferencesMutation.isPending}
                onCheckedChange={(checked) =>
                  handlePreferenceChange("systemEnabled", checked)
                }
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
