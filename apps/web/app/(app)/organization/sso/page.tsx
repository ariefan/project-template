import { SsoSettings } from "@/app/(app)/admin/sso/sso-settings";

export default function OrganizationSSOPage() {
  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div>
        <h3 className="font-medium text-lg">Single Sign-On (SSO)</h3>
        <p className="text-muted-foreground text-sm">
          Configure SAML or OIDC providers for your organization.
        </p>
      </div>
      <SsoSettings />
    </div>
  );
}
