import { RESOURCES } from "@workspace/authorization";
import type { FastifyInstance } from "fastify";
import { handleError, ValidationError } from "../../../lib/errors";
import { createMeta } from "../../../lib/response";
import { requirePermission } from "../../auth/authorization-middleware";
import { requireAuth } from "../../auth/middleware";
import * as ssoService from "../services/sso.service";

export function ssoProviderRoutes(app: FastifyInstance) {
	/**
	 * List SSO providers for organization
	 */
	app.get<{
		Params: { orgId: string };
	}>(
		"/:orgId/sso-providers",
		{
			// Require read permission on organization or sso resource
			// Using "organization" "read" for now as general access, strictly it might need stricter permissions
			preHandler: [
				requireAuth,
				requirePermission(RESOURCES.ORGANIZATIONS, "read"),
			],
		},
		async (request, reply) => {
			try {
				const { orgId } = request.params;

				const providers = await ssoService.listSSOProviders(orgId);

				// Map to a cleaner response format if needed, but returning raw Drizzle result is often fine for internal APIs
				// Need to parse config strings if they are stored as JSON strings in DB (based on schema they are text)
				const mappedProviders = providers.map((p) => ({
					...p,
					name: p.providerId, // Use providerId as name for now
					// Parse configs if they are strings
					oidcConfig: p.oidcConfig ? JSON.parse(p.oidcConfig) : null,
					samlConfig: p.samlConfig ? JSON.parse(p.samlConfig) : null,
				}));

				return {
					data: mappedProviders,
					meta: createMeta(request.id),
				};
			} catch (error) {
				const { statusCode, response } = handleError(error, request.id);
				reply.status(statusCode);
				return response;
			}
		},
	);

	/**
	 * Delete SSO provider
	 */
	app.delete<{
		Params: { orgId: string; providerId: string };
	}>(
		"/:orgId/sso-providers/:providerId",
		{
			// Require update/admin permission
			preHandler: [
				requireAuth,
				requirePermission(RESOURCES.ORGANIZATIONS, "update"),
			],
		},
		async (request, reply) => {
			try {
				const { orgId, providerId } = request.params;

				const deleted = await ssoService.deleteSSOProvider(providerId, orgId);

				if (!deleted) {
					throw new ValidationError(
						"Provider not found or could not be deleted",
					);
				}

				return {
					data: { success: true, id: providerId },
					meta: createMeta(request.id),
				};
			} catch (error) {
				const { statusCode, response } = handleError(error, request.id);
				reply.status(statusCode);
				return response;
			}
		},
	);
}
