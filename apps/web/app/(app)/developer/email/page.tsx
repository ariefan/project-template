"use client";

import { PageHeader } from "@/components/layouts/page-header";
import { EmailTester } from "./email-tester";

export default function DeveloperEmailPage() {
  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <PageHeader
        description="Test and preview email templates with live rendering and sending capabilities."
        title="Email Templates"
      />
      <EmailTester />
    </div>
  );
}
