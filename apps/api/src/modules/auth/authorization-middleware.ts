import type { FastifyReply, FastifyRequest } from "fastify";
import { ForbiddenError } from "../../lib/errors";
import { requireAuth } from "./middleware";

/**
 * Middleware that requires specific permission on a resource
 * Must be used after requireAuth and route must have orgId in params
 *
 * @param resource Resource name (posts, comments, etc.)
 * @param action Action name (read, create, update, delete, manage)
 * @param orgIdParam Parameter name containing orgId (default: "orgId")
 * @returns Fastify preHandler middleware function
 */
export function requirePermission(
	resource: string,
	action: string,
	orgIdParam = "orgId",
) {
	return async (
		request: FastifyRequest,
		reply: FastifyReply,
	): Promise<void> => {
		// Ensure user is authenticated
		await requireAuth(request, reply);
		if (reply.sent) {
			return;
		}

		// Get organization ID from route params
		const orgId = (request.params as Record<string, string>)[orgIdParam];
		if (!orgId) {
			throw new Error(`Organization ID parameter "${orgIdParam}" not found`);
		}

		// Check permission
		const currentUser = request.user;
		if (!currentUser) {
			throw new Error("User not authenticated");
		}

		const userId = currentUser.id;
		const allowed = await request.server.authorize(
			userId,
			orgId,
			resource,
			action,
		);

		if (!allowed) {
			throw new ForbiddenError(
				`You don't have permission to ${action} ${resource}`,
			);
		}
	};
}

/**
 * Middleware that requires ownership of resource OR permission
 * Useful for allowing users to modify their own resources
 *
 * This uses Casbin's owner condition: policies with `condition: "owner"`
 * will only allow access if resourceOwnerId matches the user ID.
 *
 * @param resource Resource name
 * @param action Action name
 * @param getOwnerId Function to extract owner ID from request (can be sync or async)
 * @param orgIdParam Parameter name containing orgId
 * @returns Fastify preHandler middleware function
 */
export function requireOwnershipOrPermission(
	resource: string,
	action: string,
	getOwnerId: (
		request: FastifyRequest,
	) => string | undefined | Promise<string | undefined>,
	orgIdParam = "orgId",
) {
	return async (
		request: FastifyRequest,
		reply: FastifyReply,
	): Promise<void> => {
		// Ensure user is authenticated
		await requireAuth(request, reply);
		if (reply.sent) {
			return;
		}

		const currentUser = request.user;
		if (!currentUser) {
			throw new Error("User not authenticated");
		}

		const userId = currentUser.id;
		const orgId = (request.params as Record<string, string>)[orgIdParam];
		if (!orgId) {
			throw new Error(`Organization ID parameter "${orgIdParam}" not found`);
		}

		// Get resource owner ID for Casbin's owner condition
		const resourceOwnerId = await getOwnerId(request);

		// Single authorization check — Casbin evaluates owner condition if policy requires it
		const allowed = await request.server.authorize(
			userId,
			orgId,
			resource,
			action,
			resourceOwnerId ?? "",
		);

		if (!allowed) {
			throw new ForbiddenError(
				`You don't have permission to ${action} this ${resource}`,
			);
		}
	};
}

/**
 * Middleware that requires a specific feature to be enabled for the organization
 * Must be used after requireAuth and route must have orgId in params
 *
 * @param featureKey The feature key to check in the subscription plan
 * @param orgIdParam Parameter name containing orgId (default: "orgId")
 * @returns Fastify preHandler middleware function
 */
export function requireFeature(featureKey: string, orgIdParam = "orgId") {
	return async (
		request: FastifyRequest,
		_reply: FastifyReply,
	): Promise<void> => {
		// Get organization ID from route params
		const orgId = (request.params as Record<string, string>)[orgIdParam];
		if (!orgId) {
			throw new Error(`Organization ID parameter "${orgIdParam}" not found`);
		}

		const hasFeature = await request.server.checkFeature(orgId, featureKey);

		if (!hasFeature) {
			throw new ForbiddenError(
				`Your current subscription plan does not include the "${featureKey}" feature. Please upgrade your plan.`,
			);
		}
	};
}
