"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  Notification,
  NotificationChannel,
  PreviewEmailResponse,
} from "@workspace/contracts";
import {
  notificationsPreviewEmail,
  notificationsSend,
} from "@workspace/contracts";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import { Textarea } from "@workspace/ui/components/textarea";
import { formatDistanceToNow } from "date-fns";
import {
  Bell,
  Circle,
  Code2,
  Eye,
  FileText,
  Loader2,
  Mail,
  Send,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { apiClient } from "@/lib/api-client";

const CATEGORY_COLORS = {
  transactional: "default" as const,
  marketing: "secondary" as const,
  security: "destructive" as const,
  system: "outline" as const,
};

type TemplateId =
  | "welcome"
  | "password-reset"
  | "verification"
  | "security-alert"
  | "team-invite"
  | "invoice-receipt"
  | "payment-failed"
  | "generic-notification";

interface TemplateConfig {
  id: TemplateId;
  name: string;
  description: string;
  defaultProps: Record<string, string>;
  requiredFields: string[];
}

const EMAIL_TEMPLATES: TemplateConfig[] = [
  {
    id: "welcome",
    name: "Welcome Email",
    description: "Welcome message sent to new users",
    defaultProps: {
      userName: "John Doe",
      loginUrl: "https://example.com/login",
    },
    requiredFields: ["userName"],
  },
  {
    id: "verification",
    name: "Email Verification",
    description: "Verify email address for new accounts",
    defaultProps: {
      userName: "John Doe",
      verificationUrl: "https://example.com/verify?token=abc123",
      expiresIn: "24 hours",
    },
    requiredFields: ["userName", "verificationUrl"],
  },
  {
    id: "password-reset",
    name: "Password Reset",
    description: "Request to reset account password",
    defaultProps: {
      userName: "John Doe",
      resetUrl: "https://example.com/reset?token=xyz789",
      expiresIn: "1 hour",
    },
    requiredFields: ["userName", "resetUrl"],
  },
  {
    id: "security-alert",
    name: "Security Alert",
    description: "Security-related notifications",
    defaultProps: {
      userName: "John Doe",
      alertType: "login",
      alertMessage: "New login detected from Chrome on Windows",
      timestamp: new Date().toLocaleString(),
      location: "San Francisco, CA",
      ipAddress: "192.168.1.1",
    },
    requiredFields: ["userName", "alertType", "alertMessage"],
  },
  {
    id: "team-invite",
    name: "Team Invite",
    description: "Invitation to join a team",
    defaultProps: {
      inviterName: "Sarah Connor",
      teamName: "Resistance Tech",
      inviteLink: "https://example.com/join/123",
      role: "Member",
    },
    requiredFields: ["inviterName", "teamName", "inviteLink"],
  },
  {
    id: "invoice-receipt",
    name: "Invoice Receipt",
    description: "Payment receipt",
    defaultProps: {
      invoiceId: "INV-001",
      date: "Jan 01, 2024",
      totalAmount: "$29.00",
      items: JSON.stringify([{ description: "Pro Plan", amount: "$29.00" }]),
    },
    requiredFields: ["invoiceId", "totalAmount"],
  },
  {
    id: "payment-failed",
    name: "Payment Failed",
    description: "Notice of failed payment",
    defaultProps: {
      last4: "4242",
      amount: "$29.00",
      actionUrl: "https://example.com/billing",
    },
    requiredFields: ["amount", "actionUrl"],
  },
  {
    id: "generic-notification",
    name: "Generic Notification",
    description: "General purpose system notification",
    defaultProps: {
      title: "System Update",
      body: "We have updated our terms of service.",
      actionLabel: "Read More",
      actionUrl: "https://example.com/terms",
    },
    requiredFields: ["title", "body"],
  },
];

// Custom notification form
function CustomForm({
  channel,
  setChannel,
  email,
  setEmail,
  subject,
  setSubject,
  body,
  setBody,
}: {
  channel: NotificationChannel;
  setChannel: (c: NotificationChannel) => void;
  email: string;
  setEmail: (e: string) => void;
  subject: string;
  setSubject: (s: string) => void;
  body: string;
  setBody: (b: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="channel">Channel</Label>
        <Select
          onValueChange={(v) => setChannel(v as NotificationChannel)}
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
          <strong>In-App Only:</strong> Database only, no delivery. Add API keys
          in{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            apps/api/.env
          </code>{" "}
          for other channels.
        </p>
      </div>

      {channel !== "none" && (
        <div className="space-y-2">
          <Label htmlFor="email">Recipient Email</Label>
          <Input
            id="email"
            onChange={(e) => setEmail(e.target.value)}
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
          value={subject}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="body">Body</Label>
        <Textarea
          id="body"
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          value={body}
        />
      </div>
    </div>
  );
}

// Template form
function TemplateForm({
  email,
  setEmail,
  selectedTemplate,
  handleTemplateChange,
  templateData,
  handleTemplateDataChange,
  currentTemplate,
}: {
  email: string;
  setEmail: (e: string) => void;
  selectedTemplate: TemplateId;
  handleTemplateChange: (t: TemplateId) => void;
  templateData: Record<string, string>;
  handleTemplateDataChange: (key: string, value: string) => void;
  currentTemplate: TemplateConfig | undefined;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="template">Email Template</Label>
        <Select
          onValueChange={(v) => handleTemplateChange(v as TemplateId)}
          value={selectedTemplate}
        >
          <SelectTrigger id="template">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {EMAIL_TEMPLATES.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {currentTemplate && (
          <p className="text-muted-foreground text-sm">
            {currentTemplate.description}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="template-email">Recipient Email</Label>
        <Input
          id="template-email"
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          value={email}
        />
      </div>

      <div className="space-y-3">
        <Label>Template Data</Label>
        {currentTemplate?.defaultProps &&
          Object.entries(currentTemplate.defaultProps).map(
            ([key, defaultValue]) => (
              <div className="space-y-1" key={key}>
                <div className="flex items-center gap-2">
                  <Label className="text-sm" htmlFor={key}>
                    {key}
                  </Label>
                  {currentTemplate.requiredFields.includes(key) && (
                    <Badge variant="secondary">Required</Badge>
                  )}
                </div>
                <Input
                  id={key}
                  onChange={(e) =>
                    handleTemplateDataChange(key, e.target.value)
                  }
                  placeholder={defaultValue}
                  value={templateData[key] || ""}
                />
              </div>
            )
          )}
      </div>

      <p className="text-muted-foreground text-xs">
        Templates require <strong>Resend</strong> or <strong>Nodemailer</strong>{" "}
        in{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">
          apps/api/.env
        </code>
      </p>
    </div>
  );
}

// Preview panel
function PreviewPanel({
  previewHtml,
  isPending,
  onLoadPreview,
}: {
  previewHtml: string;
  isPending: boolean;
  onLoadPreview: () => void;
}) {
  if (previewHtml) {
    return (
      <div className="overflow-hidden rounded-lg border bg-white">
        <iframe
          className="h-125 w-full"
          sandbox="allow-same-origin"
          srcDoc={previewHtml}
          title="Email Preview"
        />
      </div>
    );
  }

  return (
    <div className="flex h-80 flex-col items-center justify-center rounded-lg border border-dashed text-center">
      <Eye className="mb-3 size-10 text-muted-foreground" />
      <p className="text-muted-foreground text-sm">
        Click Preview to render the email template
      </p>
      <p className="mt-1 text-muted-foreground text-xs">
        The template will be rendered with your current data
      </p>
      <Button
        className="mt-4"
        disabled={isPending}
        onClick={onLoadPreview}
        size="sm"
        variant="outline"
      >
        {isPending ? (
          <Loader2 className="mr-2 size-4 animate-spin" />
        ) : (
          <Eye className="mr-2 size-4" />
        )}
        Load Preview
      </Button>
    </div>
  );
}

// Code panel
function CodePanel({
  codeExample,
  showTemplateInfo,
}: {
  codeExample: string;
  showTemplateInfo: boolean;
}) {
  return (
    <div className="space-y-4">
      <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-xs">
        <code>{codeExample}</code>
      </pre>
      {showTemplateInfo && (
        <div className="space-y-2">
          <p className="font-medium text-sm">Template Location</p>
          <code className="block rounded bg-muted p-2 text-xs">
            packages/notifications/src/templates/email/
          </code>
          <div className="flex flex-wrap gap-2 pt-2">
            <Badge variant="secondary">React Email</Badge>
            <Badge variant="secondary">Resend</Badge>
            <Badge variant="secondary">Nodemailer</Badge>
          </div>
        </div>
      )}
    </div>
  );
}

// Activity panel
function ActivityPanel({ notifications }: { notifications: Notification[] }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          Latest notifications (auto-refreshes)
        </p>
        <Link
          className="text-primary text-sm hover:underline"
          href="/notifications"
        >
          View all
        </Link>
      </div>
      <div className="space-y-2">
        {notifications.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <Bell className="mx-auto mb-3 size-10 text-muted-foreground/50" />
            <p className="text-sm">No notifications yet</p>
            <p className="text-xs">Send a test notification to see it here</p>
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
    </div>
  );
}

// Right column with tabs
function RightColumn({
  mode,
  rightTab,
  setRightTab,
  previewHtml,
  previewIsPending,
  onLoadPreview,
  codeExample,
  notifications,
  unreadCount,
}: {
  mode: "custom" | "template";
  rightTab: "preview" | "code" | "activity";
  setRightTab: (tab: "preview" | "code" | "activity") => void;
  previewHtml: string;
  previewIsPending: boolean;
  onLoadPreview: () => void;
  codeExample: string;
  notifications: Notification[];
  unreadCount: number;
}) {
  return (
    <Card>
      <CardHeader className="pb-0">
        <Tabs
          onValueChange={(v) => setRightTab(v as typeof rightTab)}
          value={rightTab}
        >
          <TabsList
            className={`grid w-full ${mode === "template" ? "grid-cols-3" : "grid-cols-2"}`}
          >
            {mode === "template" && (
              <TabsTrigger className="gap-2" value="preview">
                <Eye className="size-4" />
                Preview
                {previewHtml && (
                  <span className="size-2 rounded-full bg-green-500" />
                )}
              </TabsTrigger>
            )}
            <TabsTrigger className="gap-2" value="code">
              <Code2 className="size-4" />
              Code
            </TabsTrigger>
            <TabsTrigger className="gap-2" value="activity">
              <Bell className="size-4" />
              Activity
              {unreadCount > 0 && (
                <Badge className="ml-1 px-1.5 py-0" variant="default">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent className="pt-4">
        {rightTab === "preview" && mode === "template" && (
          <PreviewPanel
            isPending={previewIsPending}
            onLoadPreview={onLoadPreview}
            previewHtml={previewHtml}
          />
        )}

        {rightTab === "code" && (
          <CodePanel
            codeExample={codeExample}
            showTemplateInfo={mode === "template"}
          />
        )}

        {rightTab === "activity" && (
          <ActivityPanel notifications={notifications} />
        )}
      </CardContent>
    </Card>
  );
}

export function NotificationsTester() {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"custom" | "template">("custom");
  const [channel, setChannel] = useState<NotificationChannel>("none");
  const [email, setEmail] = useState("test@example.com");
  const [subject, setSubject] = useState("Test Notification");
  const [body, setBody] = useState(
    "This is a test notification from the developer tools."
  );
  const [selectedTemplate, setSelectedTemplate] =
    useState<TemplateId>("welcome");
  const [templateData, setTemplateData] = useState<Record<string, string>>(
    EMAIL_TEMPLATES[0]?.defaultProps ?? {}
  );
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [rightTab, setRightTab] = useState<"preview" | "code" | "activity">(
    "code"
  );

  const currentTemplate = EMAIL_TEMPLATES.find(
    (t) => t.id === selectedTemplate
  );

  const handleTemplateChange = (templateId: TemplateId) => {
    setSelectedTemplate(templateId);
    const template = EMAIL_TEMPLATES.find((t) => t.id === templateId);
    setTemplateData(template?.defaultProps ?? {});
    setPreviewHtml("");
  };

  const handleTemplateDataChange = (key: string, value: string) => {
    setTemplateData((prev) => ({ ...prev, [key]: value }));
  };

  const { data } = useQuery({
    ...notificationsListOptions({
      client: apiClient,
      query: { page: 1, pageSize: 10 },
    }),
    refetchInterval: 3000,
  });

  const invalidateNotifications = () => {
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
  };

  const sendMutation = useMutation({
    mutationFn: () => {
      const baseBody = { category: "system" as const, recipient: { email } };
      if (mode === "template") {
        return notificationsSend({
          client: apiClient,
          body: {
            ...baseBody,
            channel: "email",
            templateId: selectedTemplate,
            templateData,
          },
        });
      }
      return notificationsSend({
        client: apiClient,
        body: { ...baseBody, channel, subject, body },
      });
    },
    onSuccess: invalidateNotifications,
  });

  const previewMutation = useMutation({
    mutationFn: () => {
      return notificationsPreviewEmail({
        client: apiClient,
        body: {
          templateId: selectedTemplate,
          templateData,
        },
      });
    },
    onSuccess: (result) => {
      const response = result.data as PreviewEmailResponse;
      if (response?.data?.html) {
        setPreviewHtml(response.data.html);
        setRightTab("preview");
      }
    },
  });

  const notifications = (data as { data?: Notification[] })?.data ?? [];
  const unreadCount = notifications.filter((n) => !n.readAt).length;
  const canSubmit =
    mode === "custom" ? Boolean(subject && body) : Boolean(email);

  const codeExample =
    mode === "template"
      ? `await notificationsSend({
  client: apiClient,
  body: {
    channel: "email",
    category: "system",
    recipient: { email: "${email}" },
    templateId: "${selectedTemplate}",
    templateData: ${JSON.stringify(templateData, null, 2).split("\n").join("\n    ")},
  },
});`
      : `await notificationsSend({
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
      {/* Left Column: Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="size-5 text-primary" />
            Send Test Notification
          </CardTitle>
          <CardDescription>
            Test notifications with custom content or email templates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs
            onValueChange={(v) => {
              setMode(v as "custom" | "template");
              if (v === "template" && !previewHtml) {
                setRightTab("code");
              }
            }}
            value={mode}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger className="gap-2" value="custom">
                <Mail className="size-4" />
                Custom
              </TabsTrigger>
              <TabsTrigger className="gap-2" value="template">
                <FileText className="size-4" />
                Template
              </TabsTrigger>
            </TabsList>

            <TabsContent className="pt-4" value="custom">
              <CustomForm
                body={body}
                channel={channel}
                email={email}
                setBody={setBody}
                setChannel={setChannel}
                setEmail={setEmail}
                setSubject={setSubject}
                subject={subject}
              />
            </TabsContent>

            <TabsContent className="pt-4" value="template">
              <TemplateForm
                currentTemplate={currentTemplate}
                email={email}
                handleTemplateChange={handleTemplateChange}
                handleTemplateDataChange={handleTemplateDataChange}
                selectedTemplate={selectedTemplate}
                setEmail={setEmail}
                templateData={templateData}
              />
            </TabsContent>
          </Tabs>

          <div className="flex gap-2">
            <Button
              className="flex-1"
              disabled={sendMutation.isPending || !canSubmit}
              onClick={() => sendMutation.mutate()}
            >
              {sendMutation.isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Send className="mr-2 size-4" />
              )}
              Send {mode === "template" ? "Email" : "Notification"}
            </Button>
            {mode === "template" && (
              <Button
                disabled={previewMutation.isPending}
                onClick={() => previewMutation.mutate()}
                variant="outline"
              >
                {previewMutation.isPending ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Eye className="mr-2 size-4" />
                )}
                Preview
              </Button>
            )}
          </div>

          {sendMutation.isSuccess && (
            <div className="rounded-lg bg-green-50 p-3 text-center text-green-800 text-sm dark:bg-green-950 dark:text-green-200">
              {mode === "template" ? "Email" : "Notification"} sent
              successfully!
            </div>
          )}

          {sendMutation.isError && (
            <div className="rounded-lg bg-red-50 p-3 text-center text-red-800 text-sm dark:bg-red-950 dark:text-red-200">
              Failed to send. Check console for details.
            </div>
          )}
        </CardContent>
      </Card>

      <RightColumn
        codeExample={codeExample}
        mode={mode}
        notifications={notifications}
        onLoadPreview={() => previewMutation.mutate()}
        previewHtml={previewHtml}
        previewIsPending={previewMutation.isPending}
        rightTab={rightTab}
        setRightTab={setRightTab}
        unreadCount={unreadCount}
      />
    </div>
  );
}
