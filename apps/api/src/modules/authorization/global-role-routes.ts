import {
  type CreateRoleInput,
  Effect,
  type RolePermission,
  RoleService,
  type UpdateRoleInput,
} from "@workspace/authorization";
// Use types from @workspace/contracts for type safety
import type {
  CreateRoleRequest,
  ErrorResponse,
  Permission,
  PermissionInput,
  Role,
  RoleListResponse,
  RoleResponse,
  UpdateRoleRequest,
} from "@workspace/contracts";
import {
  zCreateRoleRequest,
  zUpdateRoleRequest,
} from "@workspace/contracts/zod";
import { getDefaultDb } from "@workspace/db";
import { DEFAULT_APPLICATION_ID } from "@workspace/db/schema";
import type { FastifyInstance } from "fastify";
import { handleError, NotFoundError } from "../../lib/errors";
import { createMeta } from "../../lib/response";
import { validateBody } from "../../lib/validation";
import { requireAuth } from "../auth/middleware";

/**
 * Helper to map RolePermission to contracts Permission type
 */
function mapPermissions(permissions: RolePermission[]): Permission[] {
  return permissions.map((p) => ({
    resource: p.resource,
    action: p.action,
    effect: p.effect as Permission["effect"],
    condition: p.condition as Permission["condition"],
  }));
}

/**
 * Helper to map role to response format
 */
function mapRoleToResponse(
  role: {
    id: string;
    applicationId: string;
    tenantId: string | null;
    name: string;
    description: string | null;
    isSystemRole: boolean;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string | null;
  },
  permissions?: RolePermission[]
): Role {
  return {
    id: role.id,
    applicationId: role.applicationId,
    tenantId: role.tenantId ?? undefined,
    name: role.name,
    description: role.description ?? undefined,
    isSystemRole: role.isSystemRole,
    isGlobalRole: role.tenantId === null,
    permissions: mapPermissions(permissions ?? []),
    createdAt: role.createdAt.toISOString(),
    updatedAt: role.updatedAt.toISOString(),
    createdBy: role.createdBy ?? undefined,
  };
}

/**
 * Helper to parse permission input from contracts to RolePermission
 */
function parsePermissions(
  permissions?: PermissionInput[]
): RolePermission[] | undefined {
  if (!permissions) {
    return;
  }

  return permissions.map((p) => ({
    resource: p.resource,
    action: p.action,
    effect: p.effect === "deny" ? Effect.DENY : Effect.ALLOW,
    condition: p.condition ?? "",
  }));
}

/**
 * Global role management routes (no tenant scope)
 *
 * Note: These routes use requireAuth only (no org-scoped permission check)
 * since global roles are not tied to any organization.
 *
 * Routes:
 * - GET    /roles              - List global roles
 * - POST   /roles              - Create global role
 * - GET    /roles/:roleId      - Get role details
 * - PATCH  /roles/:roleId      - Update role
 * - DELETE /roles/:roleId      - Delete role
 */
export function globalRoleRoutes(app: FastifyInstance) {
  const roleService = new RoleService(getDefaultDb(), app.enforcer);

  // List global roles
  app.get(
    "/roles",
    { preHandler: [requireAuth] },
    async (request): Promise<RoleListResponse | ErrorResponse> => {
      try {
        const roles = await roleService.listGlobalRoles(DEFAULT_APPLICATION_ID);
        const roleData = await Promise.all(
          roles.map(async (role) => {
            const permissions = await roleService.getPermissions(role.id);
            return mapRoleToResponse(role, permissions);
          })
        );

        return {
          data: roleData,
          pagination: {
            page: 1,
            pageSize: roleData.length,
            totalPages: 1,
            totalCount: roleData.length,
            hasNext: false,
            hasPrevious: false,
          },
          meta: createMeta(request.id),
        };
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        const { response } = handleError(err, request.id);
        return response as ErrorResponse;
      }
    }
  );

  // Create global role
  app.post<{
    Body: CreateRoleRequest;
  }>(
    "/roles",
    {
      preHandler: [requireAuth, validateBody(zCreateRoleRequest)],
    },
    async (request, reply): Promise<RoleResponse | ErrorResponse> => {
      try {
        const { name, description, permissions } = request.body;

        const input: CreateRoleInput = {
          applicationId: DEFAULT_APPLICATION_ID,
          tenantId: null,
          name,
          description,
          permissions: parsePermissions(permissions),
          createdBy: request.user?.id,
        };

        const role = await roleService.create(input);

        reply.status(201);
        return {
          data: mapRoleToResponse(role, parsePermissions(permissions)),
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

  // Get role by ID
  app.get<{
    Params: { roleId: string };
  }>(
    "/roles/:roleId",
    { preHandler: [requireAuth] },
    async (request, reply): Promise<RoleResponse | ErrorResponse> => {
      try {
        const { roleId } = request.params;
        const role = await roleService.getById(roleId);

        if (!role) {
          const error = new NotFoundError("Role not found");
          const { statusCode, response } = handleError(error, request.id);
          reply.status(statusCode);
          return response as ErrorResponse;
        }

        const permissions = await roleService.getPermissions(roleId);

        return {
          data: mapRoleToResponse(role, permissions),
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

  // Update role
  app.patch<{
    Params: { roleId: string };
    Body: UpdateRoleRequest;
  }>(
    "/roles/:roleId",
    {
      preHandler: [requireAuth, validateBody(zUpdateRoleRequest)],
    },
    async (request, reply): Promise<RoleResponse | ErrorResponse> => {
      try {
        const { roleId } = request.params;
        const { name, description, permissions } = request.body;

        const existingRole = await roleService.getById(roleId);
        if (!existingRole) {
          const error = new NotFoundError("Role not found");
          const { statusCode, response } = handleError(error, request.id);
          reply.status(statusCode);
          return response as ErrorResponse;
        }

        const input: UpdateRoleInput = {
          name,
          description,
          permissions: parsePermissions(permissions),
        };

        const role = await roleService.update(roleId, input);

        if (!role) {
          const error = new NotFoundError("Role not found");
          const { statusCode, response } = handleError(error, request.id);
          reply.status(statusCode);
          return response as ErrorResponse;
        }

        const updatedPermissions = await roleService.getPermissions(roleId);

        return {
          data: mapRoleToResponse(role, updatedPermissions),
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

  // Delete role
  app.delete<{
    Params: { roleId: string };
  }>(
    "/roles/:roleId",
    { preHandler: [requireAuth] },
    async (
      request,
      reply
    ): Promise<{ meta: { requestId: string } } | ErrorResponse> => {
      try {
        const { roleId } = request.params;

        const role = await roleService.getById(roleId);
        if (!role) {
          const error = new NotFoundError("Role not found");
          const { statusCode, response } = handleError(error, request.id);
          reply.status(statusCode);
          return response as ErrorResponse;
        }

        const deleted = await roleService.delete(roleId);

        if (!deleted) {
          const error = new NotFoundError(
            "Role not found or cannot be deleted"
          );
          const { statusCode, response } = handleError(error, request.id);
          reply.status(statusCode);
          return response as ErrorResponse;
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
