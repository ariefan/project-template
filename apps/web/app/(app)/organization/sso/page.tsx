import { PageHeader } from "@/components/layouts/page-header";
import { SsoSettings } from "./sso-settings";

export default function OrganizationSSOPage() {
	return (
		<div className="container mx-auto max-w-7xl px-4 py-8">
			<PageHeader
				description="Configure SAML or OIDC providers for your organization."
				title="Single Sign-On (SSO)"
			/>
			<SsoSettings />
		</div>
	);
}
