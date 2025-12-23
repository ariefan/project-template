import { authorization } from "@workspace/authorization";
import type * as casbin from "casbin";
import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";

declare module "fastify" {
  // biome-ignore lint/style/useConsistentTypeDefinitions: Module augmentation requires interface
  // biome-ignore lint/nursery/noShadow: Module augmentation pattern
  interface FastifyInstance {
    /**
     * Casbin enforcer instance for manual authorization checks
     */
    readonly enforcer: casbin.Enforcer;

    /**
     * Check if a user has permission for a resource action in an organization
     *
     * @param userId User ID from better-auth
     * @param orgId Organization ID
     * @param resource Resource name (posts, comments, etc.)
     * @param action Action name (read, create, update, delete, manage)
     * @returns true if user has permission, false otherwise
     */
    authorize(
      userId: string,
      orgId: string,
      resource: string,
      action: string
    ): Promise<boolean>;
  }
}

/**
 * Fastify plugin for Casbin authorization
 * Provides enforcer instance and authorize() helper method
 */
function authorizationPlugin(fastify: FastifyInstance): void {
  // Decorate fastify with enforcer instance
  fastify.decorate("enforcer", authorization);

  // Decorate fastify with convenience authorize method
  fastify.decorate(
    "authorize",
    async (
      userId: string,
      orgId: string,
      resource: string,
      action: string
    ): Promise<boolean> => {
      try {
        return await fastify.enforcer.enforce(userId, orgId, resource, action);
      } catch (error) {
        fastify.log.error(
          { userId, orgId, resource, action, error },
          "Authorization check failed"
        );
        return false;
      }
    }
  );
}

export default fp(authorizationPlugin, {
  name: "authorization",
  dependencies: [],
});
