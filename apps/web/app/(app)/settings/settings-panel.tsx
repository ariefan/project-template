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
import { Separator } from "@workspace/ui/components/separator";
import { Switch } from "@workspace/ui/components/switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import {
  Bell,
  Loader2,
  Mail,
  MessageCircle,
  Send,
  Settings,
  Shield,
  Smartphone,
  User,
} from "lucide-react";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { useSession } from "@/lib/auth";

export function SettingsPanel() {
  const queryClient = useQueryClient();
  const { data: session, isPending: sessionLoading } = useSession();
  const user = session?.user;

  const [profileForm, setProfileForm] = useState({
    name: "",
    email: "",
  });
  const [profileSaved, setProfileSaved] = useState(false);

  // Initialize form when user loads
  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name ?? "",
        email: user.email ?? "",
      });
    }
  }, [user]);

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

  function handleProfileSave() {
    // Profile update would go through Better Auth
    // For now, just show a saved indicator
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  }

  function renderPreferencesContent() {
    if (preferencesLoading) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (!preferences) {
      return (
        <div className="py-8 text-center text-muted-foreground">
          Failed to load preferences
        </div>
      );
    }

    return (
      <div className="space-y-6">
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
      </div>
    );
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
      <div className="flex items-center gap-3">
        <Settings className="h-8 w-8 text-primary" />
        <div>
          <h1 className="font-bold text-2xl">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account settings and preferences
          </p>
        </div>
      </div>

      <Tabs className="space-y-6" defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">
            <User className="mr-2 h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="mr-2 h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="mr-2 h-4 w-4" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, name: e.target.value })
                    }
                    placeholder="Your name"
                    value={profileForm.name}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    disabled
                    id="email"
                    type="email"
                    value={profileForm.email}
                  />
                  <p className="text-muted-foreground text-xs">
                    Email cannot be changed here
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <Button onClick={handleProfileSave}>Save Changes</Button>
                {profileSaved && (
                  <span className="text-green-600 text-sm">Saved!</span>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Choose how you want to receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent>{renderPreferencesContent()}</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Manage your security preferences and authentication methods
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium">Two-Factor Authentication</p>
                    <p className="text-muted-foreground text-sm">
                      Add an extra layer of security to your account
                    </p>
                  </div>
                  <Button variant="outline">Configure</Button>
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium">Passkeys</p>
                    <p className="text-muted-foreground text-sm">
                      Use biometric authentication for passwordless login
                    </p>
                  </div>
                  <Button variant="outline">Manage</Button>
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium">Change Password</p>
                    <p className="text-muted-foreground text-sm">
                      Update your account password
                    </p>
                  </div>
                  <Button variant="outline">Update</Button>
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium">Active Sessions</p>
                    <p className="text-muted-foreground text-sm">
                      View and manage your active sessions
                    </p>
                  </div>
                  <Button variant="outline">View All</Button>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="mb-4 font-medium text-destructive text-lg">
                  Danger Zone
                </h3>
                <div className="flex items-center justify-between rounded-lg border border-destructive/50 p-4">
                  <div>
                    <p className="font-medium">Delete Account</p>
                    <p className="text-muted-foreground text-sm">
                      Permanently delete your account and all data
                    </p>
                  </div>
                  <Button variant="destructive">Delete Account</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
