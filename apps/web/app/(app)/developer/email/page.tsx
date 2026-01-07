"use client";

import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layouts/page-header";
import { renderEmailTemplate } from "./actions";

const TEMPLATE_NAMES: Array<{ key: string; name: string }> = [
  { key: "welcome", name: "Welcome Email" },
  { key: "password-reset", name: "Password Reset" },
  { key: "verification", name: "Email Verification" },
  { key: "security-alert", name: "Security Alert" },
  { key: "team-invite", name: "Team Invite" },
  { key: "invoice-receipt", name: "Invoice Receipt" },
  { key: "payment-failed", name: "Payment Failed" },
  { key: "generic-notification", name: "Generic Notification" },
];

type TemplateKey =
  | "welcome"
  | "password-reset"
  | "verification"
  | "security-alert"
  | "team-invite"
  | "invoice-receipt"
  | "payment-failed"
  | "generic-notification";

export default function EmailPreviewPage() {
  const [selectedTemplate, setSelectedTemplate] =
    useState<TemplateKey>("welcome");
  const [htmlContent, setHtmlContent] = useState<string>("");

  // Render template when selection changes
  useEffect(() => {
    const renderTemplate = async () => {
      const html = await renderEmailTemplate(selectedTemplate);
      setHtmlContent(html);
    };
    renderTemplate();
  }, [selectedTemplate]);

  const currentTemplateName =
    TEMPLATE_NAMES.find((t) => t.key === selectedTemplate)?.name ||
    "Email Template";

  return (
    <div className="space-y-6">
      <PageHeader
        description="Preview system email templates with dummy data"
        title="Email Templates"
      />

      <div className="grid h-[calc(100vh-200px)] min-h-150 gap-6 lg:grid-cols-[240px_1fr]">
        <Card className="flex h-full flex-col">
          <CardHeader>
            <CardTitle className="text-lg">Templates</CardTitle>
            <CardDescription>Select to preview</CardDescription>
          </CardHeader>
          <div className="flex flex-col gap-1 p-2">
            {TEMPLATE_NAMES.map((template) => (
              <Button
                className={cn(
                  "w-full justify-start",
                  selectedTemplate === template.key && "bg-muted font-medium"
                )}
                key={template.key}
                onClick={() => setSelectedTemplate(template.key as TemplateKey)}
                variant={
                  selectedTemplate === template.key ? "secondary" : "ghost"
                }
              >
                {template.name}
              </Button>
            ))}
          </div>
        </Card>

        <Card className="flex h-full flex-col overflow-hidden bg-muted/20">
          <div className="flex items-center justify-between border-b px-4 pb-4">
            <h3 className="font-medium">{currentTemplateName}</h3>
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <span>Preview Mode</span>
            </div>
          </div>
          <div className="relative flex h-full w-full flex-1 items-center justify-center overflow-hidden">
            <div className="h-full w-full max-w-200 overflow-hidden rounded-md shadow-sm ring-1 ring-gray-200">
              <iframe
                className="block h-full w-full border-0 bg-white"
                sandbox="allow-same-origin"
                srcDoc={htmlContent}
                title="Email Preview"
              />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
