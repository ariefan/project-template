import {
  type CreateRoleInput,
  Effect,
  type RolePermission,
  RoleService,
  type UpdateRoleInput,
} from "@workspace/authorization";
import type { ErrorResponse } from "@workspace/contracts";
import { getDefaultDb } from "@workspace/db";
import { DEFAULT_APPLICATION_ID } from "@workspace/db/schema";
import type { FastifyInstance } from "fastify";
import { handleError, NotFoundError, ValidationError } from "../../lib/errors";
import { createMeta } from "../../lib/response";
import { requirePermission } from "../auth/authorization-middleware";

/**
 * Response types for role endpoints
 */
interface RoleResponse {
  data: {
    id: string;
    applicationId: string;
    tenantId: string | null;
    name: string;
    description: string | null;
    isSystemRole: boolean;
    createdAt: string;
    updatedAt: string;
    createdBy: string | null;
    permissions?: RolePermission[];
  };
  meta: { requestId: string };
}

interface RoleListResponse {
  data: RoleResponse["data"][];
  meta: { requestId: string };
}

/**
 * Request body types
 */
interface CreateRoleBody {
  name: string;
  description?: string;
  permissions?: Array<{
    resource: string;
    action: string;
    effect?: "allow" | "deny";
    condition?: "" | "owner" | "shared";
  }>;
}

interface UpdateRoleBody {
  name?: string;
  description?: string;
  permissions?: Array<{
    resource: string;
    action: string;
    effect?: "allow" | "deny";
    condition?: "" | "owner" | "shared";
  }>;
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
): RoleResponse["data"] {
  return {
    id: role.id,
    applicationId: role.applicationId,
    tenantId: role.tenantId,
    name: role.name,
    description: role.description,
    isSystemRole: role.isSystemRole,
    createdAt: role.createdAt.toISOString(),
    updatedAt: role.updatedAt.toISOString(),
    createdBy: role.createdBy,
    ...(permissions && { permissions }),
  };
}

/**
 * Helper to parse permission body to RolePermission
 */
function parsePermissions(
  permissions?: CreateRoleBody["permissions"]
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
 * Role management routes
 *
 * Single-app mode routes (using default app):
 * - GET    /roles              - List global roles
 * - POST   /roles              - Create global role
 * - GET    /orgs/:orgId/roles  - List tenant roles
 * - POST   /orgs/:orgId/roles  - Create tenant role
 * - GET    /roles/:roleId      - Get role details
 * - PATCH  /roles/:roleId      - Update role
 * - DELETE /roles/:roleId      - Delete role
 */
export function roleRoutes(app: FastifyInstance) {
  const roleService = new RoleService(getDefaultDb(), app.enforcer);

  // ==========================================
  // Global Roles (no tenant)
  // ==========================================

  // List global roles
  app.get(
    "/roles",
    { preHandler: [requirePermission("settings", "read")] },
    async (request): Promise<RoleListResponse | ErrorResponse> => {
      try {
        const roles = await roleService.listGlobalRoles(DEFAULT_APPLICATION_ID);

        return {
          data: roles.map((role) => mapRoleToResponse(role)),
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
    Body: CreateRoleBody;
  }>(
    "/roles",
    { preHandler: [requirePermission("settings", "manage")] },
    async (request, reply): Promise<RoleResponse | ErrorResponse> => {
      try {
        const { name, description, permissions } = request.body;

        if (!name) {
          const error = new ValidationError("Missing required fields", [
            { field: "name", code: "required", message: "Name is required" },
          ]);
          const { statusCode, response } = handleError(error, request.id);
          reply.status(statusCode);
          return response as ErrorResponse;
        }

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

  // ==========================================
  // Tenant-scoped Roles
  // ==========================================

  // List tenant roles
  app.get<{
    Params: { orgId: string };
  }>(
    "/orgs/:orgId/roles",
    { preHandler: [requirePermission("settings", "read")] },
    async (request): Promise<RoleListResponse | ErrorResponse> => {
      try {
        const { orgId } = request.params;
        const roles = await roleService.listTenantRoles(
          DEFAULT_APPLICATION_ID,
          orgId
        );

        return {
          data: roles.map((role) => mapRoleToResponse(role)),
          meta: createMeta(request.id),
        };
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        const { response } = handleError(err, request.id);
        return response as ErrorResponse;
      }
    }
  );

  // Create tenant role
  app.post<{
    Params: { orgId: string };
    Body: CreateRoleBody;
  }>(
    "/orgs/:orgId/roles",
    { preHandler: [requirePermission("settings", "manage")] },
    async (request, reply): Promise<RoleResponse | ErrorResponse> => {
      try {
        const { orgId } = request.params;
        const { name, description, permissions } = request.body;

        if (!name) {
          const error = new ValidationError("Missing required fields", [
            { field: "name", code: "required", message: "Name is required" },
          ]);
          const { statusCode, response } = handleError(error, request.id);
          reply.status(statusCode);
          return response as ErrorResponse;
        }

        const input: CreateRoleInput = {
          applicationId: DEFAULT_APPLICATION_ID,
          tenantId: orgId,
          name,
          description,
          permissions: parsePermissions(permissions),
          createdBy: request.user?.id,
        };

        const role = await roleService.create(input);

        // Invalidate cache for this organization
        await request.server.invalidateOrgAuthzCache(orgId);

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

  // ==========================================
  // Role by ID (global or tenant)
  // ==========================================

  // Get role by ID
  app.get<{
    Params: { roleId: string };
  }>(
    "/roles/:roleId",
    { preHandler: [requirePermission("settings", "read")] },
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
    Body: UpdateRoleBody;
  }>(
    "/roles/:roleId",
    { preHandler: [requirePermission("settings", "manage")] },
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

        // Invalidate cache for the tenant if applicable
        if (role.tenantId) {
          await request.server.invalidateOrgAuthzCache(role.tenantId);
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
    { preHandler: [requirePermission("settings", "manage")] },
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

        // Invalidate cache for the tenant if applicable
        if (role.tenantId) {
          await request.server.invalidateOrgAuthzCache(role.tenantId);
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
