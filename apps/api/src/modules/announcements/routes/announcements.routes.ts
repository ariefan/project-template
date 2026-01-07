import type {
  AnnouncementListResponse,
  AnnouncementPriority,
  AnnouncementResponse,
  AnnouncementScope,
  AnnouncementStatsResponse,
  AnnouncementWithInteractionResponse,
  CreateAnnouncementRequest,
  ErrorResponse,
  SoftDeleteResponse,
  UpdateAnnouncementRequest,
} from "@workspace/contracts";
import {
  zCreateAnnouncementRequest,
  zUpdateAnnouncementRequest,
} from "@workspace/contracts/zod";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { handleError, ValidationError } from "../../../lib/errors";
import { createMeta } from "../../../lib/response";
import {
  requireOwnershipOrPermission,
  requirePermission,
} from "../../auth/authorization-middleware";
import { requireAuth } from "../../auth/middleware";
import type { AnnouncementWithInteraction } from "../repositories/announcements.repository";
import * as announcementsService from "../services/announcements.service";

/**
 * Map announcement to API response
 */
function mapAnnouncementToResponse(
  announcement: Awaited<ReturnType<typeof announcementsService.getAnnouncement>>
) {
  return {
    id: announcement.id,
    orgId: announcement.orgId ?? undefined,
    title: announcement.title,
    content: announcement.content,
    linkUrl: announcement.linkUrl ?? undefined,
    linkText: announcement.linkText ?? undefined,
    priority: announcement.priority,
    scope: announcement.scope,
    targetRoles: announcement.targetRoles as Array<"all" | "admin" | "member">,
    isDismissible: announcement.isDismissible,
    publishAt: announcement.publishAt.toISOString(),
    expiresAt: announcement.expiresAt?.toISOString(),
    isActive: announcement.isActive,
    viewCount: announcement.viewCount ?? 0,
    readCount: announcement.readCount ?? 0,
    acknowledgeCount: announcement.acknowledgeCount ?? 0,
    dismissCount: announcement.dismissCount ?? 0,
    createdBy: announcement.createdBy,
    createdAt: announcement.createdAt.toISOString(),
    updatedAt: announcement.updatedAt.toISOString(),
    deletedAt: announcement.deletedAt?.toISOString(),
  };
}

/**
 * Map announcement with interaction to API response
 */
function mapAnnouncementWithInteractionToResponse(
  announcement: AnnouncementWithInteraction
) {
  return {
    ...mapAnnouncementToResponse(announcement),
    interaction: announcement.interaction
      ? {
          id: announcement.interaction.id,
          announcementId: announcement.interaction.announcementId,
          userId: announcement.interaction.userId,
          viewedAt: announcement.interaction.viewedAt?.toISOString(),
          readAt: announcement.interaction.readAt?.toISOString(),
          dismissedAt: announcement.interaction.dismissedAt?.toISOString(),
          acknowledgedAt:
            announcement.interaction.acknowledgedAt?.toISOString(),
          createdAt: announcement.interaction.createdAt.toISOString(),
          updatedAt: announcement.interaction.updatedAt.toISOString(),
        }
      : undefined,
    hasViewed: announcement.interaction?.viewedAt !== null,
    hasRead: announcement.interaction?.readAt !== null,
    hasDismissed: announcement.interaction?.dismissedAt !== null,
    hasAcknowledged: announcement.interaction?.acknowledgedAt !== null,
  };
}

/**
 * Announcements routes
 */
export function announcementsRoutes(app: FastifyInstance) {
  /**
   * List active announcements for organization
   */
  app.get<{
    Params: { orgId: string };
    Querystring: {
      page?: number;
      pageSize?: number;
      priority?: AnnouncementPriority;
      scope?: AnnouncementScope;
      readStatus?: "read" | "unread";
      dismissedStatus?: "dismissed" | "not-dismissed";
      includeExpired?: boolean;
      includeInactive?: boolean;
      orderBy?: string;
    };
  }>(
    "/:orgId/announcements",
    { preHandler: [requireAuth] },
    async (
      request,
      reply
    ): Promise<AnnouncementListResponse | ErrorResponse> => {
      try {
        const { orgId } = request.params;
        const userId = request.user?.id;

        if (!userId) {
          throw new ValidationError("User not authenticated");
        }

        const result =
          await announcementsService.listAnnouncementsWithInteractions(
            orgId,
            userId,
            {
              page: Number(request.query.page) || 1,
              pageSize: Math.min(Number(request.query.pageSize) || 20, 100),
              priority: request.query.priority,
              scope: request.query.scope,
              readStatus: request.query.readStatus,
              dismissedStatus: request.query.dismissedStatus,
              includeExpired: request.query.includeExpired,
              includeInactive: request.query.includeInactive,
              orderBy: request.query.orderBy,
            }
          );

        return {
          data: result.data.map(mapAnnouncementWithInteractionToResponse),
          pagination: result.pagination,
          meta: createMeta(request.id),
        };
      } catch (error) {
        const { statusCode, response } = handleError(error, request.id);
        reply.status(statusCode);
        return response;
      }
    }
  );

  /**
   * Get specific announcement by ID
   */
  app.get<{
    Params: { orgId: string; announcementId: string };
  }>(
    "/:orgId/announcements/:announcementId",
    { preHandler: [requireAuth] },
    async (
      request,
      reply
    ): Promise<AnnouncementWithInteractionResponse | ErrorResponse> => {
      try {
        const { orgId, announcementId } = request.params;
        const userId = request.user?.id;

        if (!userId) {
          throw new ValidationError("User not authenticated");
        }

        const announcement =
          await announcementsService.getAnnouncementWithInteraction(
            announcementId,
            userId,
            orgId
          );

        return {
          data: mapAnnouncementWithInteractionToResponse(announcement),
          meta: createMeta(request.id),
        };
      } catch (error) {
        const { statusCode, response } = handleError(error, request.id);
        reply.status(statusCode);
        return response;
      }
    }
  );

  /**
   * Create new announcement (admin only)
   */
  app.post<{
    Params: { orgId: string };
    Body: CreateAnnouncementRequest;
  }>(
    "/:orgId/announcements",
    { preHandler: [requirePermission("announcements", "create")] },
    async (request, reply): Promise<AnnouncementResponse | ErrorResponse> => {
      try {
        const { orgId } = request.params;
        const userId = request.user?.id;

        if (!userId) {
          throw new ValidationError("User not authenticated");
        }

        const validatedBody = zCreateAnnouncementRequest.parse(request.body);

        const announcement = await announcementsService.createAnnouncement({
          orgId: validatedBody.orgId ?? orgId,
          title: validatedBody.title,
          content: validatedBody.content,
          linkUrl: validatedBody.linkUrl,
          linkText: validatedBody.linkText,
          priority: validatedBody.priority,
          scope: validatedBody.scope,
          targetRoles: validatedBody.targetRoles,
          isDismissible: validatedBody.isDismissible,
          publishAt: validatedBody.publishAt
            ? new Date(validatedBody.publishAt)
            : undefined,
          expiresAt: validatedBody.expiresAt
            ? new Date(validatedBody.expiresAt)
            : undefined,
          isActive: validatedBody.isActive,
          createdBy: userId,
        });

        reply.status(201);
        return {
          data: mapAnnouncementToResponse(announcement),
          meta: createMeta(request.id),
        };
      } catch (error) {
        const { statusCode, response } = handleError(error, request.id);
        reply.status(statusCode);
        return response;
      }
    }
  );

  /**
   * Update announcement (admin or owner)
   */
  app.patch<{
    Params: { orgId: string; announcementId: string };
    Body: UpdateAnnouncementRequest;
  }>(
    "/:orgId/announcements/:announcementId",
    {
      preHandler: [
        requireOwnershipOrPermission(
          "announcements",
          "update",
          (request: FastifyRequest) => {
            const { announcementId, orgId } = request.params as {
              announcementId: string;
              orgId: string;
            };
            return announcementsService.getAnnouncementOwnerId(
              announcementId,
              orgId
            );
          }
        ),
      ],
    },
    async (request, reply): Promise<AnnouncementResponse | ErrorResponse> => {
      try {
        const { orgId, announcementId } = request.params;

        const validatedBody = zUpdateAnnouncementRequest.parse(request.body);

        const announcement = await announcementsService.updateAnnouncement(
          announcementId,
          orgId,
          {
            title: validatedBody.title,
            content: validatedBody.content,
            linkUrl: validatedBody.linkUrl,
            linkText: validatedBody.linkText,
            priority: validatedBody.priority,
            targetRoles: validatedBody.targetRoles,
            isDismissible: validatedBody.isDismissible,
            publishAt: validatedBody.publishAt
              ? new Date(validatedBody.publishAt)
              : undefined,
            expiresAt: validatedBody.expiresAt
              ? new Date(validatedBody.expiresAt)
              : undefined,
            isActive: validatedBody.isActive,
          }
        );

        return {
          data: mapAnnouncementToResponse(announcement),
          meta: createMeta(request.id),
        };
      } catch (error) {
        const { statusCode, response } = handleError(error, request.id);
        reply.status(statusCode);
        return response;
      }
    }
  );

  /**
   * Delete announcement (admin or owner)
   */
  app.delete<{
    Params: { orgId: string; announcementId: string };
  }>(
    "/:orgId/announcements/:announcementId",
    {
      preHandler: [
        requireOwnershipOrPermission(
          "announcements",
          "delete",
          (request: FastifyRequest) => {
            const { announcementId, orgId } = request.params as {
              announcementId: string;
              orgId: string;
            };
            return announcementsService.getAnnouncementOwnerId(
              announcementId,
              orgId
            );
          }
        ),
      ],
    },
    async (request, reply): Promise<SoftDeleteResponse | ErrorResponse> => {
      try {
        const { orgId, announcementId } = request.params;
        const userId = request.user?.id;

        if (!userId) {
          throw new ValidationError("User not authenticated");
        }

        await announcementsService.deleteAnnouncement(announcementId, orgId);

        return {
          data: {
            id: announcementId,
            deletedAt: new Date().toISOString(),
            deletedBy: userId,
            canRestore: true,
          },
          meta: createMeta(request.id),
        };
      } catch (error) {
        const { statusCode, response } = handleError(error, request.id);
        reply.status(statusCode);
        return response;
      }
    }
  );

  /**
   * Mark announcement as viewed
   */
  app.post<{
    Params: { orgId: string; announcementId: string };
  }>(
    "/:orgId/announcements/:announcementId/view",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      try {
        const { orgId, announcementId } = request.params;
        const userId = request.user?.id;

        if (!userId) {
          throw new ValidationError("User not authenticated");
        }

        const interaction = await announcementsService.markAnnouncementAsViewed(
          announcementId,
          userId,
          orgId
        );

        return {
          data: {
            announcementId,
            viewedAt:
              interaction.viewedAt?.toISOString() ?? new Date().toISOString(),
          },
          meta: createMeta(request.id),
        };
      } catch (error) {
        const { statusCode, response } = handleError(error, request.id);
        reply.status(statusCode);
        return response;
      }
    }
  );

  /**
   * Mark announcement as read
   */
  app.post<{
    Params: { orgId: string; announcementId: string };
  }>(
    "/:orgId/announcements/:announcementId/read",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      try {
        const { orgId, announcementId } = request.params;
        const userId = request.user?.id;

        if (!userId) {
          throw new ValidationError("User not authenticated");
        }

        const interaction = await announcementsService.markAnnouncementAsRead(
          announcementId,
          userId,
          orgId
        );

        return {
          data: {
            announcementId,
            readAt:
              interaction.readAt?.toISOString() ?? new Date().toISOString(),
          },
          meta: createMeta(request.id),
        };
      } catch (error) {
        const { statusCode, response } = handleError(error, request.id);
        reply.status(statusCode);
        return response;
      }
    }
  );

  /**
   * Dismiss announcement
   */
  app.post<{
    Params: { orgId: string; announcementId: string };
  }>(
    "/:orgId/announcements/:announcementId/dismiss",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      try {
        const { orgId, announcementId } = request.params;
        const userId = request.user?.id;

        if (!userId) {
          throw new ValidationError("User not authenticated");
        }

        const interaction = await announcementsService.dismissAnnouncement(
          announcementId,
          userId,
          orgId
        );

        return {
          data: {
            announcementId,
            dismissedAt:
              interaction.dismissedAt?.toISOString() ??
              new Date().toISOString(),
          },
          meta: createMeta(request.id),
        };
      } catch (error) {
        const { statusCode, response } = handleError(error, request.id);
        reply.status(statusCode);
        return response;
      }
    }
  );

  /**
   * Acknowledge critical announcement
   */
  app.post<{
    Params: { orgId: string; announcementId: string };
  }>(
    "/:orgId/announcements/:announcementId/acknowledge",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      try {
        const { orgId, announcementId } = request.params;
        const userId = request.user?.id;

        if (!userId) {
          throw new ValidationError("User not authenticated");
        }

        const interaction = await announcementsService.acknowledgeAnnouncement(
          announcementId,
          userId,
          orgId
        );

        return {
          data: {
            announcementId,
            acknowledgedAt:
              interaction.acknowledgedAt?.toISOString() ??
              new Date().toISOString(),
          },
          meta: createMeta(request.id),
        };
      } catch (error) {
        const { statusCode, response } = handleError(error, request.id);
        reply.status(statusCode);
        return response;
      }
    }
  );

  /**
   * Get unread announcement count
   */
  app.get<{
    Params: { orgId: string };
  }>(
    "/:orgId/announcements/unread-count",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      try {
        const { orgId } = request.params;
        const userId = request.user?.id;

        if (!userId) {
          throw new ValidationError("User not authenticated");
        }

        const counts = await announcementsService.getUnreadAnnouncementCount(
          orgId,
          userId
        );

        return {
          data: counts,
          meta: createMeta(request.id),
        };
      } catch (error) {
        const { statusCode, response } = handleError(error, request.id);
        reply.status(statusCode);
        return response;
      }
    }
  );

  /**
   * Get announcement statistics (admin only)
   */
  app.get<{
    Params: { orgId: string; announcementId: string };
  }>(
    "/:orgId/announcements/:announcementId/stats",
    { preHandler: [requirePermission("announcements", "read")] },
    async (
      request,
      reply
    ): Promise<AnnouncementStatsResponse | ErrorResponse> => {
      try {
        const { orgId, announcementId } = request.params;

        const stats = await announcementsService.getAnnouncementStats(
          announcementId,
          orgId
        );

        return {
          data: stats,
          meta: createMeta(request.id),
        };
      } catch (error) {
        const { statusCode, response } = handleError(error, request.id);
        reply.status(statusCode);
        return response;
      }
    }
  );
}
