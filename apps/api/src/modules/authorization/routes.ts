import type { ErrorResponse } from "@workspace/contracts";
import type { FastifyInstance } from "fastify";
import { ForbiddenError, handleError, ValidationError } from "../../lib/errors";
import { createMeta } from "../../lib/response";
import { requirePermission } from "../auth/authorization-middleware";
import { requireAuth } from "../auth/middleware";

type Policy = {
  ptype: string;
  v0: string;
  v1: string;
  v2: string;
  v3: string;
};

type PolicyListResponse = {
  data: Policy[];
  meta: {
    requestId: string;
  };
};

type RoleAssignmentRequest = {
  role: string;
};

type UserRolesResponse = {
  data: {
    userId: string;
    orgId: string;
    roles: string[];
  };
  meta: {
    requestId: string;
  };
};

type PolicyCreateResponse = {
  data: Policy;
  meta: {
    requestId: string;
  };
};

export function authorizationRoutes(app: FastifyInstance) {
  // Get all policies for an organization
  app.get<{
    Params: { orgId: string };
  }>(
    "/:orgId/policies",
    { preHandler: [requirePermission("settings", "manage")] },
    async (request): Promise<PolicyListResponse | ErrorResponse> => {
      try {
        const policies = await request.server.enforcer.getFilteredPolicy(
          1,
          request.params.orgId
        );

        return {
          data: policies.map((policy: string[]) => ({
            ptype: "p",
            v0: policy[0] || "",
            v1: policy[1] || "",
            v2: policy[2] || "",
            v3: policy[3] || "",
          })),
          meta: createMeta(request.id),
        };
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        const { response } = handleError(err, request.id);
        return response as ErrorResponse;
      }
    }
  );

  // Add a custom policy
  app.post<{
    Params: { orgId: string };
    Body: {
      role: string;
      resource: string;
      action: string;
    };
  }>(
    "/:orgId/policies",
    { preHandler: [requirePermission("settings", "manage")] },
    async (request, reply): Promise<PolicyCreateResponse | ErrorResponse> => {
      try {
        const { role, resource, action } = request.body;
        const { orgId } = request.params;

        // Validate required fields
        if (!(role && resource && action)) {
          const error = new ValidationError("Missing required fields", [
            {
              field: "role",
              code: "required",
              message: "Role is required",
            },
            {
              field: "resource",
              code: "required",
              message: "Resource is required",
            },
            {
              field: "action",
              code: "required",
              message: "Action is required",
            },
          ]);
          const { statusCode, response } = handleError(error, request.id);
          reply.status(statusCode);
          return response as ErrorResponse;
        }

        const added = await request.server.enforcer.addPolicy(
          role,
          orgId,
          resource,
          action
        );

        if (!added) {
          throw new Error("Policy already exists");
        }

        reply.status(201);
        return {
          data: {
            ptype: "p",
            v0: role,
            v1: orgId,
            v2: resource,
            v3: action,
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

  // Get user roles in an organization
  app.get<{
    Params: {
      orgId: string;
      userId: string;
    };
  }>(
    "/:orgId/users/:userId/roles",
    { preHandler: [requireAuth] },
    async (request): Promise<UserRolesResponse | ErrorResponse> => {
      try {
        const { orgId, userId } = request.params;
        const currentUser = request.user;

        if (!currentUser) {
          throw new Error("User not authenticated");
        }

        const currentUserId = currentUser.id;

        // Users can only view their own roles or require admin permission
        if (currentUserId !== userId) {
          const hasPermission = await request.server.authorize(
            currentUserId,
            orgId,
            "users",
            "manage"
          );

          if (!hasPermission) {
            throw new ForbiddenError("You can only view your own roles");
          }
        }

        const roles = await request.server.enforcer.getRolesForUserInDomain(
          userId,
          orgId
        );

        return {
          data: {
            userId,
            orgId,
            roles: roles || [],
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

  // Assign a role to a user
  app.post<{
    Params: {
      orgId: string;
      userId: string;
    };
    Body: RoleAssignmentRequest;
  }>(
    "/:orgId/users/:userId/roles",
    { preHandler: [requirePermission("users", "manage")] },
    async (request, reply): Promise<UserRolesResponse | ErrorResponse> => {
      try {
        const { orgId, userId } = request.params;
        const { role } = request.body;

        if (!role) {
          const error = new ValidationError("Missing role", [
            {
              field: "role",
              code: "required",
              message: "Role is required",
            },
          ]);
          const { statusCode, response } = handleError(error, request.id);
          reply.status(statusCode);
          return response as ErrorResponse;
        }

        // Use the syncMemberRole function from authorization package
        const { syncMemberRole } = await import("@workspace/authorization");
        await syncMemberRole(request.server.enforcer, userId, orgId, role);

        reply.status(200);

        const roles = await request.server.enforcer.getRolesForUserInDomain(
          userId,
          orgId
        );

        return {
          data: {
            userId,
            orgId,
            roles: roles || [],
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
}
