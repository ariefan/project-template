import type {
  SoftDeleteResponse,
  SystemOrganizationListResponse,
  SystemOrganizationResponse,
  UpdateSystemOrganizationRequest,
} from "@workspace/contracts";
import {
  count,
  db,
  desc,
  eq,
  like,
  members,
  or,
  organizations,
  users,
} from "@workspace/db";
import type { FastifyPluginAsync } from "fastify";

// biome-ignore lint/suspicious/useAwait: fastify plugin
export const systemOrganizationsRoutes: FastifyPluginAsync = async (
  fastify
) => {
  fastify.get<{
    Querystring: {
      page?: number;
      pageSize?: number;
      search?: string;
    };
    Reply: SystemOrganizationListResponse;
  }>("/", {}, async (request) => {
    const page = Number(request.query.page) || 1;
    const limit = Number(request.query.pageSize) || 20;
    const search = request.query.search;
    const offset = (page - 1) * limit;

    const where = search
      ? or(
          like(organizations.name, `%${search}%`),
          like(organizations.slug, `%${search}%`)
        )
      : undefined;

    const [totalResult] = await db
      .select({ count: count() })
      .from(organizations)
      .where(where);

    const total = totalResult?.count ?? 0;

    const memberCountSubquery = db
      .select({
        organizationId: members.organizationId,
        count: count().as("count"),
      })
      .from(members)
      .groupBy(members.organizationId)
      .as("member_counts");

    const orgs = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        logo: organizations.logo,
        createdAt: organizations.createdAt,
        metadata: organizations.metadata,
        memberCount: memberCountSubquery.count,
      })
      .from(organizations)
      .leftJoin(
        memberCountSubquery,
        eq(organizations.id, memberCountSubquery.organizationId)
      )
      .where(where)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(organizations.createdAt));

    const mappedOrgs = orgs.map((org) => ({
      id: org.id,
      name: org.name,
      slug: org.slug,
      logo: org.logo,
      createdAt: org.createdAt.toISOString(),
      metadata: org.metadata ? JSON.stringify(org.metadata) : null,
      memberCount: Number(org.memberCount) || 0,
    }));

    return {
      data: mappedOrgs,
      pagination: {
        page,
        pageSize: limit,
        totalPages: Math.ceil(total / limit),
        totalCount: total,
        hasNext: page * limit < total,
        hasPrevious: page > 1,
        links: {
          first: null,
          last: null,
          previous: null,
          next: null,
        },
      },
      meta: {
        requestId: request.id,
        timestamp: new Date().toISOString(),
      },
    };
  });

  fastify.get<{
    Params: { id: string };
    Reply: {
      data: Array<{
        id: string;
        role: string;
        createdAt: string;
        user: {
          id: string;
          name: string;
          email: string;
          image: string | null;
        };
      }>;
      meta: {
        requestId: string;
        timestamp: string;
      };
    };
  }>("/:id/members", {}, async (request, _reply) => {
    const { id } = request.params;

    const orgMembers = await db
      .select({
        id: members.id,
        role: members.role,
        createdAt: members.createdAt,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
          image: users.image,
        },
      })
      .from(members)
      .innerJoin(users, eq(members.userId, users.id))
      .where(eq(members.organizationId, id))
      .orderBy(desc(members.createdAt));

    return {
      data: orgMembers.map((m) => ({
        ...m,
        createdAt: m.createdAt.toISOString(),
      })),
      meta: {
        requestId: request.id,
        timestamp: new Date().toISOString(),
      },
    };
  });

  fastify.patch<{
    Params: { id: string };
    Body: UpdateSystemOrganizationRequest;
    Reply: SystemOrganizationResponse;
  }>("/:id", {}, async (request, reply) => {
    const { id } = request.params;
    const { name, slug, logo } = request.body;

    const existing = await db.query.organizations.findFirst({
      where: eq(organizations.id, id),
    });

    if (!existing) {
      return reply.code(404).send();
    }

    const [updated] = await db
      .update(organizations)
      .set({
        ...(name ? { name } : {}),
        ...(slug ? { slug } : {}),
        ...(logo !== undefined ? { logo } : {}),
      })
      .where(eq(organizations.id, id))
      .returning();

    if (!updated) {
      return reply.code(500).send();
    }

    return {
      data: {
        id: updated.id,
        name: updated.name,
        slug: updated.slug,
        logo: updated.logo,
        createdAt: updated.createdAt.toISOString(),
        metadata: updated.metadata ? JSON.stringify(updated.metadata) : null,
      },
      meta: {
        requestId: request.id,
        timestamp: new Date().toISOString(),
      },
    };
  });

  fastify.delete<{
    Params: { id: string };
    Reply: SoftDeleteResponse;
  }>("/:id", {}, async (request, reply) => {
    const { id } = request.params;

    // Check existence
    const existing = await db.query.organizations.findFirst({
      where: eq(organizations.id, id),
    });

    if (!existing) {
      return reply.code(404).send();
    }

    // Hard delete for now as Soft Delete on Organization usually requires cascading
    // But contract says SoftDeleteResponse.
    // Drizzle delete returns deleted rows.
    await db.delete(organizations).where(eq(organizations.id, id));

    return {
      data: {
        id,
        deletedAt: new Date().toISOString(),
        deletedBy: "system", // TODO: Get actual user from auth
        canRestore: false,
      },
      meta: {
        requestId: request.id,
        timestamp: new Date().toISOString(),
      },
    };
  });
};
