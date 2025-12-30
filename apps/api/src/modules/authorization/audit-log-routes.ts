import type { ErrorResponse } from "@workspace/contracts";
import type { AuthorizationLog } from "@workspace/db/schema";
import type { FastifyInstance } from "fastify";
import { handleError, NotFoundError } from "../../lib/errors";
import { createMeta } from "../../lib/response";
import { requirePermission } from "../auth/authorization-middleware";

/**
 * Map database AuthorizationLog to API AuditLog format
 */
function mapToAuditLog(log: AuthorizationLog) {
  return {
    eventId: `evt_${log.id}`,
    eventType: log.eventType,
    timestamp: log.timestamp?.toISOString() ?? new Date().toISOString(),
    tenantId: log.orgId,
    actor: {
      type: log.actorId === "system" ? "system" : "user",
      id: log.actorId ?? "unknown",
      ipAddress: log.actorIp ?? undefined,
      userAgent: log.actorUserAgent ?? undefined,
    },
    resource: {
      type: log.resource ?? "unknown",
      id: log.userId ?? log.orgId,
      endpoint: log.action ?? undefined,
    },
    changes: undefined,
    metadata: log.details
      ? {
          extra: log.details,
        }
      : undefined,
  };
}

/**
 * Parse eventId (evt_123) to numeric ID
 */
function parseEventId(eventId: string): number | null {
  if (!eventId.startsWith("evt_")) {
    return null;
  }
  const id = Number.parseInt(eventId.slice(4), 10);
  return Number.isNaN(id) ? null : id;
}

interface AuditLogListQuery {
  page?: number;
  pageSize?: number;
  eventType?: string;
  actorId?: string;
  resourceType?: string;
  timestampAfter?: string;
  timestampBefore?: string;
  ipAddress?: string;
}

interface ExportRequest {
  format: "csv" | "json";
  timestampAfter?: string;
  timestampBefore?: string;
  eventTypes?: string[];
}

export function auditLogRoutes(app: FastifyInstance) {
  // GET /:orgId/audit-logs - List audit logs with pagination and filters
  app.get<{
    Params: { orgId: string };
    Querystring: AuditLogListQuery;
  }>(
    "/:orgId/audit-logs",
    { preHandler: [requirePermission("settings", "manage")] },
    async (request, reply) => {
      try {
        const { orgId } = request.params;
        const {
          page,
          pageSize,
          eventType,
          actorId,
          resourceType,
          timestampAfter,
          timestampBefore,
          ipAddress,
        } = request.query;

        const auditService = request.server.auditService;
        if (!auditService) {
          reply.status(503);
          return {
            error: {
              code: "serviceUnavailable",
              message: "Audit service is not available",
              requestId: request.id,
            },
            meta: createMeta(request.id),
          } as ErrorResponse;
        }

        const result = await auditService.queryLogs(orgId, {
          page,
          pageSize,
          filters: {
            eventType,
            actorId,
            resourceType,
            timestampAfter: timestampAfter
              ? new Date(timestampAfter)
              : undefined,
            timestampBefore: timestampBefore
              ? new Date(timestampBefore)
              : undefined,
            ipAddress,
          },
        });

        return {
          data: result.data.map(mapToAuditLog),
          pagination: result.pagination,
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

  // GET /:orgId/audit-logs/:eventId - Get single audit log
  app.get<{
    Params: { orgId: string; eventId: string };
  }>(
    "/:orgId/audit-logs/:eventId",
    { preHandler: [requirePermission("settings", "manage")] },
    async (request, reply) => {
      try {
        const { orgId, eventId } = request.params;

        const auditService = request.server.auditService;
        if (!auditService) {
          reply.status(503);
          return {
            error: {
              code: "serviceUnavailable",
              message: "Audit service is not available",
              requestId: request.id,
            },
            meta: createMeta(request.id),
          } as ErrorResponse;
        }

        const logId = parseEventId(eventId);
        if (logId === null) {
          throw new NotFoundError("AuditLog", eventId);
        }

        const log = await auditService.getLogById(orgId, logId);
        if (!log) {
          throw new NotFoundError("AuditLog", eventId);
        }

        return {
          data: mapToAuditLog(log),
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

  // POST /:orgId/audit-logs/export - Export audit logs
  app.post<{
    Params: { orgId: string };
    Body: ExportRequest;
  }>(
    "/:orgId/audit-logs/export",
    { preHandler: [requirePermission("settings", "manage")] },
    async (request, reply) => {
      try {
        const { orgId } = request.params;
        const { format, timestampAfter, timestampBefore, eventTypes } =
          request.body;

        const auditService = request.server.auditService;
        if (!auditService) {
          reply.status(503);
          return {
            error: {
              code: "serviceUnavailable",
              message: "Audit service is not available",
              requestId: request.id,
            },
            meta: createMeta(request.id),
          } as ErrorResponse;
        }

        // Count total logs for this export
        const filters = {
          timestampAfter: timestampAfter ? new Date(timestampAfter) : undefined,
          timestampBefore: timestampBefore
            ? new Date(timestampBefore)
            : undefined,
          eventType: eventTypes?.[0], // Simplified: use first event type as filter
        };

        const totalCount = await auditService.countLogs(orgId, filters);

        // For large exports (>10k), return async job
        const ASYNC_THRESHOLD = 10_000;
        if (totalCount > ASYNC_THRESHOLD) {
          // TODO: Create async job and return 202
          reply.status(202);
          return {
            data: {
              jobId: `job_${Date.now()}`,
              status: "pending",
              createdAt: new Date().toISOString(),
            },
            meta: createMeta(request.id),
          };
        }

        // For small exports, generate inline
        const result = await auditService.queryLogs(orgId, {
          page: 1,
          pageSize: totalCount || 100,
          filters,
        });

        const logs = result.data.map(mapToAuditLog);

        // Generate export content
        let content: string;
        let contentType: string;

        if (format === "csv") {
          // Generate CSV
          const headers = [
            "eventId",
            "eventType",
            "timestamp",
            "tenantId",
            "actorId",
            "actorType",
            "actorIp",
            "resourceType",
            "resourceId",
          ];
          const rows = logs.map((log) =>
            [
              log.eventId,
              log.eventType,
              log.timestamp,
              log.tenantId,
              log.actor.id,
              log.actor.type,
              log.actor.ipAddress ?? "",
              log.resource.type,
              log.resource.id,
            ].join(",")
          );
          content = [headers.join(","), ...rows].join("\n");
          contentType = "text/csv";
        } else {
          // Generate JSON
          content = JSON.stringify(logs, null, 2);
          contentType = "application/json";
        }

        // For now, return the content directly as a data URL
        // In production, upload to storage and return presigned URL
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        reply.status(200);
        return {
          data: {
            downloadUrl: `data:${contentType};base64,${Buffer.from(content).toString("base64")}`,
            eventCount: logs.length,
            expiresAt: expiresAt.toISOString(),
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
