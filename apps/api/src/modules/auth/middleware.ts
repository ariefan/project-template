import { auth } from "@workspace/auth";
import { fromNodeHeaders } from "better-auth/node";
import type { FastifyReply, FastifyRequest } from "fastify";

// Infer types from auth instance
type AuthSession = typeof auth.$Infer.Session.session;
type AuthUser = typeof auth.$Infer.Session.user;

// Extend Fastify request to include session data
declare module "fastify" {
  // biome-ignore lint/style/useConsistentTypeDefinitions: Module augmentation requires interface
  // biome-ignore lint/nursery/noShadow: Intentionally extending FastifyRequest
  interface FastifyRequest {
    session: AuthSession | null;
    user: AuthUser | null;
  }
}

/**
 * Get current session from request headers
 * Returns null if no valid session exists
 */
export async function getSession(
  request: FastifyRequest
): Promise<{ session: AuthSession; user: AuthUser } | null> {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(request.headers),
  });
  return session;
}

/**
 * Decorator to attach session to request
 * Use this on routes that optionally need auth
 */
export async function attachSession(
  request: FastifyRequest,
  _reply: FastifyReply
) {
  const result = await getSession(request);
  request.session = result?.session ?? null;
  request.user = result?.user ?? null;
}

/**
 * Decorator to require authentication
 * Use this on routes that require a logged-in user
 */
export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const result = await getSession(request);

  if (!result) {
    reply.status(401).send({
      error: {
        code: "unauthorized",
        message: "Authentication required",
        requestId: request.id,
      },
    });
    return;
  }

  request.session = result.session;
  request.user = result.user;
}

/**
 * Decorator to require organization membership
 * Use this on routes that require the user to be a member of the org
 */
export function requireOrgMembership(orgIdParam = "orgId") {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await requireAuth(request, reply);
    if (reply.sent) {
      return;
    }

    const orgId = (request.params as Record<string, string>)[orgIdParam];
    if (!orgId) {
      reply.status(400).send({
        error: {
          code: "badRequest",
          message: "Organization ID is required",
          requestId: request.id,
        },
      });
      return;
    }

    // Check org membership using better-auth organization plugin
    // Type assertion needed because plugin methods aren't visible on base type
    type OrgApi = {
      getFullOrganization: (opts: {
        headers: Headers;
        query: { organizationId: string };
      }) => Promise<{ id: string; members: unknown[] } | null>;
    };
    const membership = await (
      auth.api as unknown as OrgApi
    ).getFullOrganization({
      headers: fromNodeHeaders(request.headers),
      query: { organizationId: orgId },
    });

    if (!membership) {
      reply.status(403).send({
        error: {
          code: "forbidden",
          message: "You are not a member of this organization",
          requestId: request.id,
        },
      });
    }
  };
}
