"use client";

import { useMutation } from "@tanstack/react-query";
import { notificationsSend } from "@workspace/contracts";
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
import { Code2, Eye, Mail, Send } from "lucide-react";
import { useState } from "react";
import { apiClient } from "@/lib/api-client";

type TemplateId =
  | "welcome"
  | "password-reset"
  | "verification"
  | "security-alert";

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
];

export function EmailTester() {
  const [selectedTemplate, setSelectedTemplate] =
    useState<TemplateId>("welcome");
  const [recipientEmail, setRecipientEmail] = useState("test@example.com");
  const [templateData, setTemplateData] = useState<Record<string, string>>(
    EMAIL_TEMPLATES[0]?.defaultProps ?? {}
  );
  const [previewHtml, setPreviewHtml] = useState<string>("");

  const currentTemplate = EMAIL_TEMPLATES.find(
    (t) => t.id === selectedTemplate
  );

  const handleTemplateChange = (templateId: TemplateId) => {
    setSelectedTemplate(templateId);
    const template = EMAIL_TEMPLATES.find((t) => t.id === templateId);
    setTemplateData(template?.defaultProps ?? {});
  };

  const handleTemplateDataChange = (key: string, value: string) => {
    setTemplateData((prev) => ({ ...prev, [key]: value }));
  };

  const sendEmailMutation = useMutation({
    mutationFn: async () => {
      return await notificationsSend({
        client: apiClient,
        body: {
          channel: "email",
          category: "system",
          recipient: { email: recipientEmail },
          templateId: selectedTemplate,
          templateData,
        },
      });
    },
  });

  const previewEmailMutation = useMutation({
    mutationFn: () => {
      // For now, we'll just show a message that preview is not implemented
      // In a real implementation, you would call an API endpoint that renders the template
      return Promise.resolve(
        "Preview feature requires server-side rendering implementation"
      );
    },
    onSuccess: (html) => {
      setPreviewHtml(html);
    },
  });

  const codeExample = `import { notificationsSend } from "@workspace/contracts";
import { apiClient } from "@/lib/api-client";

await notificationsSend({
  client: apiClient,
  body: {
    channel: "email",
    category: "system",
    recipient: { email: "${recipientEmail}" },
    templateId: "${selectedTemplate}",
    templateData: ${JSON.stringify(templateData, null, 2)},
  },
});`;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="size-5 text-primary" />
              Email Template Configuration
            </CardTitle>
            <CardDescription>
              Configure template and recipient details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template">Email Template</Label>
              <Select
                onValueChange={(value) =>
                  handleTemplateChange(value as TemplateId)
                }
                value={selectedTemplate}
              >
                <SelectTrigger id="template">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EMAIL_TEMPLATES.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
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
              <Label htmlFor="recipient">Recipient Email</Label>
              <Input
                id="recipient"
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="recipient@example.com"
                type="email"
                value={recipientEmail}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Template Data</CardTitle>
            <CardDescription>
              Configure the data passed to the email template
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentTemplate &&
              Object.entries(currentTemplate.defaultProps).map(
                ([key, defaultValue]) => (
                  <div className="space-y-2" key={key}>
                    <Label htmlFor={key}>
                      {key}
                      {currentTemplate.requiredFields.includes(key) && (
                        <Badge className="ml-2" variant="secondary">
                          Required
                        </Badge>
                      )}
                    </Label>
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

            <div className="flex gap-2 pt-4">
              <Button
                className="flex-1"
                disabled={sendEmailMutation.isPending || !recipientEmail}
                onClick={() => sendEmailMutation.mutate()}
              >
                <Send className="mr-2 size-4" />
                Send Test Email
              </Button>
              <Button
                disabled={previewEmailMutation.isPending}
                onClick={() => previewEmailMutation.mutate()}
                variant="outline"
              >
                <Eye className="mr-2 size-4" />
                Preview
              </Button>
            </div>

            {sendEmailMutation.isSuccess && (
              <div className="rounded-lg bg-green-50 p-3 text-center text-green-800 text-sm dark:bg-green-950 dark:text-green-200">
                Email sent successfully!
              </div>
            )}

            {sendEmailMutation.isError && (
              <div className="rounded-lg bg-red-50 p-3 text-center text-red-800 text-sm dark:bg-red-950 dark:text-red-200">
                Failed to send email. Check console for details.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code2 className="size-5 text-primary" />
              Implementation
            </CardTitle>
            <CardDescription>
              Code examples and template information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="code">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="code">Code</TabsTrigger>
                <TabsTrigger value="templates">Templates</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>

              <TabsContent className="space-y-4" value="code">
                <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-xs">
                  <code>{codeExample}</code>
                </pre>
              </TabsContent>

              <TabsContent className="space-y-4" value="templates">
                <div className="space-y-4">
                  <div>
                    <h4 className="mb-2 font-semibold text-sm">
                      Available Templates
                    </h4>
                    <div className="space-y-2">
                      {EMAIL_TEMPLATES.map((template) => (
                        <div
                          className="rounded-lg border p-3"
                          key={template.id}
                        >
                          <div className="mb-1 flex items-center justify-between">
                            <p className="font-medium text-sm">
                              {template.name}
                            </p>
                            <Badge variant="outline">{template.id}</Badge>
                          </div>
                          <p className="text-muted-foreground text-xs">
                            {template.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="mb-2 font-semibold text-sm">
                      Template Location
                    </h4>
                    <p className="text-muted-foreground text-xs">
                      Email templates are built with React Email and located in:
                    </p>
                    <code className="mt-2 block rounded bg-muted p-2 text-xs">
                      packages/notifications/src/templates/email/
                    </code>
                  </div>

                  <div>
                    <h4 className="mb-2 font-semibold text-sm">Technologies</h4>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">React Email</Badge>
                      <Badge variant="secondary">Resend</Badge>
                      <Badge variant="secondary">Nodemailer</Badge>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent className="space-y-4" value="preview">
                {previewHtml ? (
                  <div className="rounded-lg border p-4">
                    <div
                      // biome-ignore lint/security/noDangerouslySetInnerHtml: Preview HTML from trusted template system
                      dangerouslySetInnerHTML={{ __html: previewHtml }}
                    />
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed p-8 text-center">
                    <Eye className="mx-auto mb-2 size-8 text-muted-foreground" />
                    <p className="text-muted-foreground text-sm">
                      Click Preview to see the rendered email template
                    </p>
                    <p className="mt-2 text-muted-foreground text-xs">
                      Note: Preview feature requires server-side implementation
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
