"use client";

import { Button } from "@workspace/ui/components/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Separator } from "@workspace/ui/components/separator";
import { Bell } from "lucide-react";
import { useState } from "react";

interface Notification {
  id: string;
  title: string;
  description: string;
  time: string;
  read: boolean;
}

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: "1",
    title: "New message",
    description: "You have a new message from the support team.",
    time: "5m ago",
    read: false,
  },
  {
    id: "2",
    title: "System update",
    description: "A new version is available for download.",
    time: "1h ago",
    read: false,
  },
  {
    id: "3",
    title: "Task completed",
    description: "Your export task has finished processing.",
    time: "2h ago",
    read: true,
  },
];

export function NotificationMenu() {
  const [notifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button className="relative h-9 w-9 p-0" variant="outline">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive font-medium text-[10px] text-white">
              {unreadCount}
            </span>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between p-4">
          <h3 className="font-semibold text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <Button className="h-auto p-0 text-xs" size="sm" variant="ghost">
              Mark all as read
            </Button>
          )}
        </div>
        <Separator />
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <Bell className="mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-muted-foreground text-sm">
                No notifications yet
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <button
                  className="flex w-full flex-col gap-1 p-4 text-left transition-colors hover:bg-muted"
                  key={notification.id}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-sm leading-none">
                      {notification.title}
                    </p>
                    {!notification.read && (
                      <span className="mt-0.5 h-2 w-2 rounded-full bg-primary" />
                    )}
                  </div>
                  <p className="text-muted-foreground text-sm">
                    {notification.description}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {notification.time}
                  </p>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
        <Separator />
        <div className="p-2">
          <Button className="w-full justify-center text-sm" variant="ghost">
            View all notifications
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
