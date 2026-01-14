"use client";

import { SsoSettings } from "@/app/(app)/admin/sso/sso-settings";

export default function SsoPage() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-medium text-lg">Single Sign-On (SSO)</h3>
        <p className="text-muted-foreground text-sm">
          Configure external identity providers for your organization.
        </p>
      </div>
      <SsoSettings />
    </div>
  );
}
