import { db, eq, members, organizations, users } from "@workspace/db";
import { ilike, inArray, or } from "drizzle-orm";
import type { FastifyPluginAsync } from "fastify";

export const systemUsersRoutes: FastifyPluginAsync = async (fastify) => {
  await Promise.resolve();
  fastify.get<{
    Querystring: { search?: string };
  }>("/", {}, async (request) => {
    const { search } = request.query;

    const _query = db.select();

    // To support searching by organization name efficiently, we use select and joins
    // but the findMany with relations is easier for the nested output format.
    // However, findMany doesn't easily search relations in the root where.
    // We'll stick to findMany but filter in JS for now if performance allows,
    // OR use a subquery/join to find user IDs.

    // Let's use the subquery approach to keep the findMany nested structure clean:
    let userIds: string[] | undefined;
    if (search) {
      const searchPattern = `%${search}%`;
      const matches = await db
        .selectDistinct({ id: users.id })
        .from(users)
        .leftJoin(members, eq(users.id, members.userId))
        .leftJoin(organizations, eq(members.organizationId, organizations.id))
        .where(
          or(
            ilike(users.name, searchPattern),
            ilike(users.email, searchPattern),
            ilike(organizations.name, searchPattern),
            ilike(organizations.slug, searchPattern)
          )
        );
      userIds = matches.map((m) => m.id);
    }

    const allUsers = await db.query.users.findMany({
      where: userIds ? inArray(users.id, userIds) : undefined,
      with: {
        members: {
          with: {
            organizations: true,
          },
        },
      },
      orderBy: (users, { desc }) => [desc(users.createdAt)],
    });

    return {
      data: allUsers.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
        banned: user.banned,
        createdAt: user.createdAt.toISOString(),
        emailVerified: user.emailVerified,
        organizations: user.members.map((m) => ({
          id: m.organizations.id,
          name: m.organizations.name,
          slug: m.organizations.slug,
          role: m.role,
        })),
      })),
      meta: {
        requestId: request.id,
        timestamp: new Date().toISOString(),
      },
    };
  });
};
