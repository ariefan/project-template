import { db } from "@workspace/db";
import { ssoProviders } from "@workspace/db/schema";
import { and, eq } from "drizzle-orm";

export function listSSOProviders(organizationId: string) {
  return db.query.ssoProviders.findMany({
    where: eq(ssoProviders.organizationId, organizationId),
    columns: {
      id: true,
      providerId: true,
      issuer: true,
      domain: true,
      domainVerified: true,
      organizationId: true,
      oidcConfig: true,
      samlConfig: true,
    },
  });
}

export async function deleteSSOProvider(
  providerId: string,
  organizationId: string
) {
  // Ensure the provider belongs to the organization
  const [deleted] = await db
    .delete(ssoProviders)
    .where(
      and(
        eq(ssoProviders.providerId, providerId),
        eq(ssoProviders.organizationId, organizationId)
      )
    )
    .returning();

  return deleted;
}
