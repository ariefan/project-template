"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Notification, NotificationChannel } from "@workspace/contracts";
import { notificationsSend } from "@workspace/contracts";
import { notificationsListOptions } from "@workspace/contracts/query";
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
import { Textarea } from "@workspace/ui/components/textarea";
import { formatDistanceToNow } from "date-fns";
import { Bell, Circle, Code2, Send } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { apiClient } from "@/lib/api-client";

const CATEGORY_COLORS = {
  transactional: "default" as const,
  marketing: "secondary" as const,
  security: "destructive" as const,
  system: "outline" as const,
};

export function NotificationsTester() {
  const queryClient = useQueryClient();
  const [channel, setChannel] = useState<NotificationChannel>("none");
  const [email, setEmail] = useState("test@example.com");
  const [subject, setSubject] = useState("Test Notification");
  const [body, setBody] = useState(
    "This is a test notification from the developer tools."
  );

  const { data } = useQuery({
    ...notificationsListOptions({
      client: apiClient,
      query: { page: 1, pageSize: 10 },
    }),
    refetchInterval: 3000,
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      return await notificationsSend({
        client: apiClient,
        body: {
          channel,
          category: "system",
          recipient: { email },
          subject,
          body,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          if (typeof key === "object" && key !== null && "_id" in key) {
            const id = (key as { _id: string })._id;
            return (
              id === "notificationsList" || id === "notificationsGetUnreadCount"
            );
          }
          return false;
        },
      });
    },
  });

  const notifications = (data as { data?: Notification[] })?.data ?? [];
  const unreadCount = notifications.filter((n) => !n.readAt).length;

  const codeExample = `import { notificationsSend } from "@workspace/contracts";
import { apiClient } from "@/lib/api-client";

await notificationsSend({
  client: apiClient,
  body: {
    channel: "${channel}",
    category: "system",
    recipient: { email: "${email}" },
    subject: "${subject}",
    body: "${body}",
  },
});`;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="size-5 text-primary" />
              Send Test Notification
            </CardTitle>
            <CardDescription>
              Demonstrate how to send notifications via the API
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="channel">Channel</Label>
              <Select
                onValueChange={(value) =>
                  setChannel(value as NotificationChannel)
                }
                value={channel}
              >
                <SelectTrigger id="channel">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">In-App Only</SelectItem>
                  <SelectItem disabled value="email">
                    Email
                  </SelectItem>
                  <SelectItem disabled value="sms">
                    SMS
                  </SelectItem>
                  <SelectItem disabled value="push">
                    Push
                  </SelectItem>
                  <SelectItem disabled value="whatsapp">
                    WhatsApp
                  </SelectItem>
                  <SelectItem disabled value="telegram">
                    Telegram
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                <strong>In-App Only:</strong> Perfect for testing (database
                only, no delivery). To enable other channels, add API keys in{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">
                  apps/api/.env
                </code>{" "}
                (Email: Get free{" "}
                <a
                  className="underline"
                  href="https://resend.com"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Resend API key
                </a>
                )
              </p>
            </div>

            {channel !== "none" && (
              <div className="space-y-2">
                <Label htmlFor="email">Recipient Email</Label>
                <Input
                  id="email"
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="recipient@example.com"
                  type="email"
                  value={email}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Notification subject"
                value={subject}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">Body</Label>
              <Textarea
                id="body"
                onChange={(e) => setBody(e.target.value)}
                placeholder="Notification body"
                rows={3}
                value={body}
              />
            </div>

            <Button
              className="w-full"
              disabled={sendMutation.isPending || !email || !subject || !body}
              onClick={() => sendMutation.mutate()}
            >
              <Send className="mr-2 size-4" />
              Send Notification
            </Button>

            {sendMutation.isSuccess && (
              <div className="rounded-lg bg-green-50 p-3 text-center text-green-800 text-sm dark:bg-green-950 dark:text-green-200">
                Notification sent successfully!
              </div>
            )}

            {sendMutation.isError && (
              <div className="rounded-lg bg-red-50 p-3 text-center text-red-800 text-sm dark:bg-red-950 dark:text-red-200">
                Failed to send notification. Check console for details.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code2 className="size-5 text-primary" />
              Code Example
            </CardTitle>
            <CardDescription>
              TypeScript code to send notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-xs">
              <code>{codeExample}</code>
            </pre>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="size-5 text-primary" />
            Recent Notifications
            {unreadCount > 0 && (
              <Badge className="ml-2" variant="default">
                {unreadCount} unread
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Latest notifications (auto-refreshes every 3s). View all in the{" "}
            <Link className="font-medium underline" href="/notifications">
              Notifications
            </Link>{" "}
            page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No notifications found. Send a test notification to see it
                appear here.
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  className="flex items-start gap-3 rounded-lg border p-3"
                  key={notification.id}
                >
                  {!notification.readAt && (
                    <Circle className="mt-1 size-2 shrink-0 fill-primary text-primary" />
                  )}
                  {notification.readAt && <div className="w-2 shrink-0" />}
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={CATEGORY_COLORS[notification.category]}>
                        {notification.category}
                      </Badge>
                      <p
                        className={
                          notification.readAt
                            ? "font-normal text-sm"
                            : "font-semibold text-sm"
                        }
                      >
                        {notification.subject || notification.category}
                      </p>
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {notification.body || "No content"}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {formatDistanceToNow(new Date(notification.createdAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
