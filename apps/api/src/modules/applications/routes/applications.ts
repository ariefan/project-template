/**
 * Application Routes
 *
 * CRUD operations for managing applications in the multi-app system.
 * These are admin-level operations.
 */

import { applications, db, eq } from "@workspace/db";
import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../auth";

function generateAppId(): string {
  return `app_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function applicationRoutes(app: FastifyInstance) {
  // List all applications
  app.get(
    "/applications",
    { preHandler: [requireAuth] },
    async (request, _reply) => {
      const query = request.query as { page?: string; pageSize?: string };
      const page = Math.max(1, Number(query.page) || 1);
      const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
      const offset = (page - 1) * pageSize;

      const [items, countResult] = await Promise.all([
        db
          .select()
          .from(applications)
          .limit(pageSize)
          .offset(offset)
          .orderBy(applications.createdAt),
        db.select({ count: db.$count(applications) }).from(applications),
      ]);

      const totalCount = countResult[0]?.count ?? 0;

      return {
        data: items,
        pagination: {
          page,
          pageSize,
          totalCount,
          totalPages: Math.ceil(totalCount / pageSize),
        },
      };
    }
  );

  // Get single application
  app.get(
    "/applications/:appId",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { appId } = request.params as { appId: string };

      const [application] = await db
        .select()
        .from(applications)
        .where(eq(applications.id, appId))
        .limit(1);

      if (!application) {
        return reply.status(404).send({
          error: {
            code: "notFound",
            message: "Application not found",
            requestId: request.id,
          },
        });
      }

      return { data: application };
    }
  );

  // Create application
  app.post(
    "/applications",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const body = request.body as {
        name: string;
        slug: string;
        description?: string;
      };

      if (!(body.name && body.slug)) {
        return reply.status(400).send({
          error: {
            code: "badRequest",
            message: "Missing required fields: name, slug",
            requestId: request.id,
          },
        });
      }

      // Check if slug already exists
      const [existing] = await db
        .select()
        .from(applications)
        .where(eq(applications.slug, body.slug))
        .limit(1);

      if (existing) {
        return reply.status(409).send({
          error: {
            code: "conflict",
            message: "Application with this slug already exists",
            requestId: request.id,
          },
        });
      }

      const id = generateAppId();
      const [created] = await db
        .insert(applications)
        .values({
          id,
          name: body.name,
          slug: body.slug,
          description: body.description,
        })
        .returning();

      return reply.status(201).send({ data: created });
    }
  );

  // Update application
  app.patch(
    "/applications/:appId",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { appId } = request.params as { appId: string };
      const body = request.body as {
        name?: string;
        slug?: string;
        description?: string;
      };

      // Check if application exists
      const [existing] = await db
        .select()
        .from(applications)
        .where(eq(applications.id, appId))
        .limit(1);

      if (!existing) {
        return reply.status(404).send({
          error: {
            code: "notFound",
            message: "Application not found",
            requestId: request.id,
          },
        });
      }

      // If updating slug, check uniqueness
      if (body.slug && body.slug !== existing.slug) {
        const [slugExists] = await db
          .select()
          .from(applications)
          .where(eq(applications.slug, body.slug))
          .limit(1);

        if (slugExists) {
          return reply.status(409).send({
            error: {
              code: "conflict",
              message: "Application with this slug already exists",
              requestId: request.id,
            },
          });
        }
      }

      const [updated] = await db
        .update(applications)
        .set({
          ...(body.name && { name: body.name }),
          ...(body.slug && { slug: body.slug }),
          ...(body.description !== undefined && {
            description: body.description,
          }),
        })
        .where(eq(applications.id, appId))
        .returning();

      return { data: updated };
    }
  );

  // Delete application
  app.delete(
    "/applications/:appId",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { appId } = request.params as { appId: string };

      // Prevent deletion of default application
      if (appId === "app_default") {
        return reply.status(400).send({
          error: {
            code: "badRequest",
            message: "Cannot delete the default application",
            requestId: request.id,
          },
        });
      }

      const [existing] = await db
        .select()
        .from(applications)
        .where(eq(applications.id, appId))
        .limit(1);

      if (!existing) {
        return reply.status(404).send({
          error: {
            code: "notFound",
            message: "Application not found",
            requestId: request.id,
          },
        });
      }

      await db.delete(applications).where(eq(applications.id, appId));

      return reply.status(204).send();
    }
  );
}
