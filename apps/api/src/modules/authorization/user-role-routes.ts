import {
  AuthorizationAuditService,
  UserRoleService,
} from "@workspace/authorization";
import type { AssignRoleRequest, ErrorResponse } from "@workspace/contracts";
import { zAssignRoleRequest } from "@workspace/contracts/zod";
import { getDefaultDb } from "@workspace/db";
import { DEFAULT_APPLICATION_ID } from "@workspace/db/schema";
import type { FastifyInstance } from "fastify";
import { ForbiddenError, handleError, NotFoundError } from "../../lib/errors";
import { createMeta } from "../../lib/response";
import { validateBody } from "../../lib/validation";
import { requirePermission } from "../auth/authorization-middleware";
import { requireAuth } from "../auth/middleware";

/**
      assignedBy: string | null;
    }>;
  };
  meta: { requestId: string };
}

/**
 * User role assignment routes
 *
 * Routes for managing user-role assignments in the multi-app RBAC system.
 *
 * - GET    /:orgId/users/:userId/roles  - Get user's roles in tenant
 * - POST   /:orgId/users/:userId/roles  - Assign role to user in tenant
 * - DELETE /:orgId/users/:userId/roles/:roleId - Remove role from user
 */
export function userRoleRoutes(app: FastifyInstance) {
  const userRoleService = new UserRoleService(getDefaultDb());

  // Get user's roles in a tenant
  app.get<{
    Params: { orgId: string; userId: string };
  }>(
    "/:orgId/users/:userId/roles",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      try {
        const { orgId, userId } = request.params;
        const currentUser = request.user;

        if (!currentUser) {
          throw new Error("User not authenticated");
        }

        // Users can view their own roles, or need users:read permission
        if (currentUser.id !== userId) {
          const hasPermission = await request.server.authorize(
            currentUser.id,
            orgId,
            "users",
            "read"
          );

          if (!hasPermission) {
            throw new ForbiddenError("You can only view your own roles");
          }
        }

        const assignments = await userRoleService.getUserRoles(
          userId,
          DEFAULT_APPLICATION_ID,
          orgId
        );

        return {
          data: assignments.map((a) => ({
            id: a.id,
            userId: a.userId,
            applicationId: a.applicationId,
            tenantId: a.tenantId ?? undefined,
            roleId: a.roleId,
            roleName: a.role.name,
            isGlobalRole: a.tenantId === null,
            assignedAt: a.assignedAt.toISOString(),
            assignedBy: a.assignedBy ?? undefined,
          })),
          meta: createMeta(request.id),
        };
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        const { statusCode, response } = handleError(err, request.id);
        reply.status(statusCode);
        return response as ErrorResponse;
      }
    }
  );

  // Assign a role to a user in a tenant
  app.post<{
    Params: { orgId: string; userId: string };
    Body: AssignRoleRequest;
  }>(
    "/:orgId/users/:userId/roles",
    {
      preHandler: [
        requirePermission("users", "manage"),
        validateBody(zAssignRoleRequest),
      ],
    },
    async (request, reply) => {
      try {
        const { orgId, userId } = request.params;
        const { roleId } = request.body;

        const assignment = await userRoleService.assignRole({
          userId,
          roleId,
          applicationId: DEFAULT_APPLICATION_ID,
          tenantId: orgId,
          assignedBy: request.user?.id,
        });

        // Invalidate cache for this user in this organization
        await request.server.invalidateAuthzCache(userId, orgId);

        // Log to audit
        if (request.server.auditService) {
          try {
            const context = AuthorizationAuditService.extractContext(request);
            await request.server.auditService.logRoleAssigned({
              userId,
              orgId,
              role: roleId,
              context,
            });
          } catch (auditError) {
            request.log.error(
              { error: auditError },
              "Failed to log role assignment"
            );
          }
        }

        // Return the newly created assignment per contract
        // Fetch with role relation to get role name
        const assignments = await userRoleService.getUserRoles(
          userId,
          DEFAULT_APPLICATION_ID,
          orgId
        );
        const createdAssignment = assignments.find((a) => a.roleId === roleId);

        reply.status(201);
        return {
          data: {
            id: assignment.id,
            userId: assignment.userId,
            applicationId: assignment.applicationId,
            tenantId: assignment.tenantId ?? undefined,
            roleId: assignment.roleId,
            roleName: createdAssignment?.role.name ?? "Unknown",
            isGlobalRole: assignment.tenantId === null,
            assignedAt: assignment.assignedAt.toISOString(),
            assignedBy: assignment.assignedBy ?? undefined,
          },
          meta: createMeta(request.id),
        };
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        const { statusCode, response } = handleError(err, request.id);
        reply.status(statusCode);
        return response as ErrorResponse;
      }
    }
  );

  // Remove a role from a user in a tenant
  app.delete<{
    Params: { orgId: string; userId: string; roleId: string };
  }>(
    "/:orgId/users/:userId/roles/:roleId",
    { preHandler: [requirePermission("users", "manage")] },
    async (
      request,
      reply
    ): Promise<{ meta: { requestId: string } } | ErrorResponse> => {
      try {
        const { orgId, userId, roleId } = request.params;

        const removed = await userRoleService.removeRole(
          userId,
          roleId,
          DEFAULT_APPLICATION_ID,
          orgId
        );

        if (!removed) {
          const error = new NotFoundError("Role assignment not found");
          const { statusCode, response } = handleError(error, request.id);
          reply.status(statusCode);
          return response as ErrorResponse;
        }

        // Invalidate cache for this user in this organization
        await request.server.invalidateAuthzCache(userId, orgId);

        // Log to audit
        if (request.server.auditService) {
          try {
            const context = AuthorizationAuditService.extractContext(request);
            await request.server.auditService.logRoleRemoved({
              userId,
              orgId,
              role: roleId,
              context,
            });
          } catch (auditError) {
            request.log.error(
              { error: auditError },
              "Failed to log role removal"
            );
          }
        }

        reply.status(204);
        return { meta: createMeta(request.id) };
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        const { statusCode, response } = handleError(err, request.id);
        reply.status(statusCode);
        return response as ErrorResponse;
      }
    }
  );
}
