"use client";

import { SsoSettings } from "@/app/(app)/admin/sso/sso-settings";
import { PageHeader } from "@/components/layouts/page-header";

export default function SsoPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        description="Configure external identity providers for your organization."
        title="Single Sign-On (SSO)"
      />
      <SsoSettings />
    </div>
  );
}
