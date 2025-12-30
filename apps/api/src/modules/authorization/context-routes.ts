import type { ErrorResponse } from "@workspace/contracts";
import { and, db, eq } from "@workspace/db";
import {
  DEFAULT_APPLICATION_ID,
  members,
  userActiveContext,
} from "@workspace/db/schema";
import type { FastifyInstance } from "fastify";
import { handleError, ValidationError } from "../../lib/errors";
import { createMeta } from "../../lib/response";
import { requireAuth } from "../auth/middleware";

/**
 * Response types for context endpoints
 */
interface UserContextResponse {
  data: {
    userId: string;
    activeApplicationId: string | null;
    activeTenantId: string | null;
    updatedAt: string;
  };
  meta: { requestId: string };
}

interface AvailableContextsResponse {
  data: {
    userId: string;
    contexts: Array<{
      applicationId: string;
      tenantId: string;
      tenantName: string | null;
      role: string;
    }>;
  };
  meta: { requestId: string };
}

interface SwitchContextBody {
  applicationId?: string;
  tenantId?: string;
}

/**
 * Check if user is a member of the specified tenant
 */
async function validateTenantAccess(
  userId: string,
  tenantId: string
): Promise<boolean> {
  const result = await db
    .select()
    .from(members)
    .where(
      and(eq(members.userId, userId), eq(members.organizationId, tenantId))
    )
    .limit(1);

  return result.length > 0;
}

/**
 * Upsert user's active context and return formatted response data
 */
async function upsertActiveContext(
  userId: string,
  applicationId: string,
  tenantId: string | null
): Promise<UserContextResponse["data"]> {
  const result = await db
    .insert(userActiveContext)
    .values({
      userId,
      activeApplicationId: applicationId,
      activeTenantId: tenantId,
    })
    .onConflictDoUpdate({
      target: userActiveContext.userId,
      set: {
        activeApplicationId: applicationId,
        activeTenantId: tenantId,
        updatedAt: new Date(),
      },
    })
    .returning();

  const updated = result[0];
  if (!updated) {
    throw new Error("Failed to update context");
  }

  return {
    userId: updated.userId,
    activeApplicationId: updated.activeApplicationId,
    activeTenantId: updated.activeTenantId,
    updatedAt: updated.updatedAt.toISOString(),
  };
}

/**
 * Context switching routes
 *
 * These routes manage the user's active application and tenant context.
 * This is for UI state management only - NOT for authorization decisions.
 *
 * - GET  /users/me/context         - Get current active context
 * - POST /users/me/switch-context  - Switch to a different app/tenant
 * - GET  /users/me/available-contexts - List all available contexts
 */
export function contextRoutes(app: FastifyInstance) {
  // Get current user's active context
  app.get(
    "/users/me/context",
    { preHandler: [requireAuth] },
    async (request, reply): Promise<UserContextResponse | ErrorResponse> => {
      try {
        const userId = request.user?.id;
        if (!userId) {
          throw new Error("User not authenticated");
        }

        const [context] = await db
          .select()
          .from(userActiveContext)
          .where(eq(userActiveContext.userId, userId))
          .limit(1);

        if (!context) {
          return {
            data: {
              userId,
              activeApplicationId: DEFAULT_APPLICATION_ID,
              activeTenantId: null,
              updatedAt: new Date().toISOString(),
            },
            meta: createMeta(request.id),
          };
        }

        return {
          data: {
            userId: context.userId,
            activeApplicationId: context.activeApplicationId,
            activeTenantId: context.activeTenantId,
            updatedAt: context.updatedAt.toISOString(),
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

  // Switch to a different app/tenant context
  app.post<{
    Body: SwitchContextBody;
  }>(
    "/users/me/switch-context",
    { preHandler: [requireAuth] },
    async (request, reply): Promise<UserContextResponse | ErrorResponse> => {
      try {
        const userId = request.user?.id;
        if (!userId) {
          throw new Error("User not authenticated");
        }

        const { applicationId, tenantId } = request.body;

        // Validate tenant access if specified
        if (tenantId) {
          const hasAccess = await validateTenantAccess(userId, tenantId);
          if (!hasAccess) {
            throw new ValidationError("You do not have access to this tenant", [
              {
                field: "tenantId",
                code: "forbidden",
                message: "You are not a member of this organization",
              },
            ]);
          }
        }

        const appId = applicationId ?? DEFAULT_APPLICATION_ID;
        const data = await upsertActiveContext(userId, appId, tenantId ?? null);

        return { data, meta: createMeta(request.id) };
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        const { statusCode, response } = handleError(err, request.id);
        reply.status(statusCode);
        return response as ErrorResponse;
      }
    }
  );

  // List all available contexts for the user
  app.get(
    "/users/me/available-contexts",
    { preHandler: [requireAuth] },
    async (
      request,
      reply
    ): Promise<AvailableContextsResponse | ErrorResponse> => {
      try {
        const userId = request.user?.id;
        if (!userId) {
          throw new Error("User not authenticated");
        }

        const { organizations } = await import("@workspace/db/schema");
        const memberships = await db
          .select({
            organizationId: members.organizationId,
            organizationName: organizations.name,
            role: members.role,
          })
          .from(members)
          .innerJoin(
            organizations,
            eq(members.organizationId, organizations.id)
          )
          .where(eq(members.userId, userId));

        const contexts = memberships.map((m) => ({
          applicationId: DEFAULT_APPLICATION_ID,
          tenantId: m.organizationId,
          tenantName: m.organizationName,
          role: m.role,
        }));

        return {
          data: {
            userId,
            contexts,
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
