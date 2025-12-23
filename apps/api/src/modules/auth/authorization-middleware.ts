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
  orgIdParam = "orgId"
) {
  return async (
    request: FastifyRequest,
    reply: FastifyReply
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
      action
    );

    if (!allowed) {
      throw new ForbiddenError(
        `You don't have permission to ${action} ${resource}`
      );
    }
  };
}

/**
 * Middleware that requires ownership of resource OR permission
 * Useful for allowing users to modify their own resources
 *
 * @param resource Resource name
 * @param action Action name
 * @param getOwnerId Function to extract owner ID from request
 * @param orgIdParam Parameter name containing orgId
 * @returns Fastify preHandler middleware function
 */
export function requireOwnershipOrPermission(
  resource: string,
  action: string,
  getOwnerId: (request: FastifyRequest) => string | undefined,
  orgIdParam = "orgId"
) {
  return async (
    request: FastifyRequest,
    reply: FastifyReply
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

    // Check if user has general permission
    const hasPermission = await request.server.authorize(
      userId,
      orgId,
      resource,
      action
    );

    if (hasPermission) {
      return;
    }

    // Check if user is the owner
    const ownerId = getOwnerId(request);
    if (ownerId === userId) {
      return;
    }

    throw new ForbiddenError(`You can only ${action} your own ${resource}`);
  };
}
