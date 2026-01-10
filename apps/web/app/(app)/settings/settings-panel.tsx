"use client";

import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";
import { Bell, Loader2, Palette, Settings, Shield, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth";
import { AppearanceTab } from "./appearance";
import { GeneralTab } from "./general";
import { NotificationsTab } from "./notifications";
import { ProfileTab } from "./profile";
import { SecurityTab } from "./security";

type SettingsTab =
  | "general"
  | "profile"
  | "appearance"
  | "notifications"
  | "security";

export function SettingsPanel() {
  const { isPending: sessionLoading } = useSession();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Only show loading state after component is mounted on client
  // to prevent hydration mismatch with server render
  if (mounted && sessionLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // During SSR or before mount, show a skeleton/placeholder
  if (!mounted) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 px-4 md:px-0">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>

        <div className="flex flex-col gap-8 md:flex-row">
          <aside className="w-full flex-shrink-0 md:w-64">
            <div className="flex space-x-2 overflow-x-auto pb-2 md:flex-col md:space-x-0 md:space-y-1 md:overflow-visible md:pb-0">
              {Array.from({ length: 5 }).map((_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton list
                <Skeleton className="h-10 w-full" key={i} />
              ))}
            </div>
          </aside>
          <div className="min-w-0 flex-1 space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  const navItems = [
    {
      id: "profile",
      label: "Profile",
      icon: User,
    },
    {
      id: "general",
      label: "General",
      icon: Settings,
    },
    {
      id: "appearance",
      label: "Appearance",
      icon: Palette,
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: Bell,
    },
    {
      id: "security",
      label: "Security",
      icon: Shield,
    },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 px-4 md:px-0">
        <Settings className="h-8 w-8 text-primary" />
        <div>
          <h1 className="font-bold text-2xl">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account settings and preferences
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-8 md:flex-row">
        {/* Sidebar Navigation */}
        <aside className="w-full flex-shrink-0 md:w-64">
          <nav className="flex space-x-2 overflow-x-auto pb-2 md:flex-col md:space-x-0 md:space-y-1 md:overflow-visible md:pb-0">
            {navItems.map((item) => (
              <Button
                className={cn(
                  "justify-start",
                  activeTab === item.id && "bg-muted font-medium"
                )}
                key={item.id}
                onClick={() => setActiveTab(item.id as SettingsTab)}
                variant={activeTab === item.id ? "secondary" : "ghost"}
              >
                <item.icon className="mr-2 h-4 w-4" />
                {item.label}
              </Button>
            ))}
          </nav>
        </aside>

        {/* Main Content Area */}
        <div className="min-w-0 flex-1">
          {activeTab === "profile" && <ProfileTab />}
          {activeTab === "general" && <GeneralTab />}
          {activeTab === "appearance" && <AppearanceTab />}
          {activeTab === "notifications" && <NotificationsTab />}
          {activeTab === "security" && <SecurityTab />}
        </div>
      </div>
    </div>
  );
}
