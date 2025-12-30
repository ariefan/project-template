import {
  AuthorizationAuditService,
  createViolationManager,
  type ViolationSeverity,
} from "@workspace/authorization";
import type { ErrorResponse } from "@workspace/contracts";
import type { FastifyInstance } from "fastify";
import { AppError, handleError, ValidationError } from "../../lib/errors";
import { createMeta } from "../../lib/response";
import { requirePermission } from "../auth/authorization-middleware";

interface ViolationRequest {
  resource: string;
  action: string;
  severity: ViolationSeverity;
  reason: string;
  expiresAt?: string;
}

interface ViolationResponse {
  data: {
    orgId: string;
    resource: string;
    action: string;
    status: "suspended" | "restored";
  };
  meta: {
    requestId: string;
  };
}

interface ViolationListResponse {
  data: Array<{
    role: string;
    resource: string;
    action: string;
    effect: string;
  }>;
  meta: {
    requestId: string;
  };
}

export function violationRoutes(app: FastifyInstance) {
  const violationManager = createViolationManager(app.enforcer);

  // Suspend a specific permission for an organization
  app.post<{
    Params: { orgId: string };
    Body: ViolationRequest;
  }>(
    "/:orgId/violations/suspend",
    { preHandler: [requirePermission("settings", "manage")] },
    async (request, reply): Promise<ViolationResponse | ErrorResponse> => {
      try {
        const { resource, action, severity, reason } = request.body;
        const { orgId } = request.params;

        if (!(resource && action && severity && reason)) {
          const error = new ValidationError("Missing required fields", [
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
            {
              field: "severity",
              code: "required",
              message: "Severity is required",
            },
            {
              field: "reason",
              code: "required",
              message: "Reason is required",
            },
          ]);
          const { statusCode, response } = handleError(error, request.id);
          reply.status(statusCode);
          return response as ErrorResponse;
        }

        const suspended = await violationManager.suspendPermission({
          orgId,
          resource,
          action,
          severity,
          reason,
        });

        if (!suspended) {
          throw new AppError(
            "violationError",
            "Failed to suspend permission (may already exist)",
            500
          );
        }

        // Invalidate cache for this organization
        await request.server.invalidateOrgAuthzCache(orgId);

        // Log violation to audit log
        if (request.server.auditService) {
          try {
            const context = AuthorizationAuditService.extractContext(request);
            await request.server.auditService.logPolicyAdded({
              orgId,
              role: "*",
              resource,
              action,
              effect: "deny",
              context,
              details: { severity, reason },
            });
          } catch (auditError) {
            request.log.error(
              { error: auditError },
              "Failed to log violation suspension"
            );
          }
        }

        reply.status(201);
        return {
          data: {
            orgId,
            resource,
            action,
            status: "suspended",
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

  // Restore a suspended permission for an organization
  app.post<{
    Params: { orgId: string };
    Body: {
      resource: string;
      action: string;
    };
  }>(
    "/:orgId/violations/restore",
    { preHandler: [requirePermission("settings", "manage")] },
    async (request, reply): Promise<ViolationResponse | ErrorResponse> => {
      try {
        const { resource, action } = request.body;
        const { orgId } = request.params;

        if (!(resource && action)) {
          const error = new ValidationError("Missing required fields", [
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

        const restored = await violationManager.restorePermission({
          orgId,
          resource,
          action,
        });

        if (!restored) {
          throw new AppError(
            "violationError",
            "Failed to restore permission (may not exist)",
            500
          );
        }

        // Invalidate cache for this organization
        await request.server.invalidateOrgAuthzCache(orgId);

        // Log restoration to audit log
        if (request.server.auditService) {
          try {
            const context = AuthorizationAuditService.extractContext(request);
            await request.server.auditService.logPolicyRemoved({
              orgId,
              role: "*",
              resource,
              action,
              effect: "deny",
              context,
            });
          } catch (auditError) {
            request.log.error(
              { error: auditError },
              "Failed to log violation restoration"
            );
          }
        }

        reply.status(200);
        return {
          data: {
            orgId,
            resource,
            action,
            status: "restored",
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

  // Suspend entire organization (emergency lockdown)
  app.post<{
    Params: { orgId: string };
    Body: {
      severity: ViolationSeverity;
      reason: string;
    };
  }>(
    "/:orgId/violations/lockdown",
    { preHandler: [requirePermission("settings", "manage")] },
    async (request, reply): Promise<ViolationResponse | ErrorResponse> => {
      try {
        const { severity, reason } = request.body;
        const { orgId } = request.params;

        if (!(severity && reason)) {
          const error = new ValidationError("Missing required fields", [
            {
              field: "severity",
              code: "required",
              message: "Severity is required",
            },
            {
              field: "reason",
              code: "required",
              message: "Reason is required",
            },
          ]);
          const { statusCode, response } = handleError(error, request.id);
          reply.status(statusCode);
          return response as ErrorResponse;
        }

        const suspended = await violationManager.suspendOrganization({
          orgId,
          severity,
          reason,
        });

        if (!suspended) {
          throw new AppError(
            "violationError",
            "Failed to suspend organization",
            500
          );
        }

        // Invalidate cache for this organization
        await request.server.invalidateOrgAuthzCache(orgId);

        // Log lockdown to audit log
        if (request.server.auditService) {
          try {
            const context = AuthorizationAuditService.extractContext(request);
            await request.server.auditService.logPolicyAdded({
              orgId,
              role: "*",
              resource: "organization",
              action: "lockdown",
              effect: "deny",
              context,
              details: { severity, reason },
            });
          } catch (auditError) {
            request.log.error(
              { error: auditError },
              "Failed to log organization lockdown"
            );
          }
        }

        reply.status(201);
        return {
          data: {
            orgId,
            resource: "organization",
            action: "lockdown",
            status: "suspended",
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

  // Restore organization access
  app.post<{
    Params: { orgId: string };
  }>(
    "/:orgId/violations/unlock",
    { preHandler: [requirePermission("settings", "manage")] },
    async (request, reply): Promise<ViolationResponse | ErrorResponse> => {
      try {
        const { orgId } = request.params;

        const restored = await violationManager.restoreOrganization({ orgId });

        if (!restored) {
          throw new AppError(
            "violationError",
            "Failed to restore organization (no violations found)",
            500
          );
        }

        // Invalidate cache for this organization
        await request.server.invalidateOrgAuthzCache(orgId);

        // Log unlock to audit log
        if (request.server.auditService) {
          try {
            const context = AuthorizationAuditService.extractContext(request);
            await request.server.auditService.logPolicyRemoved({
              orgId,
              role: "*",
              resource: "organization",
              action: "lockdown",
              effect: "deny",
              context,
            });
          } catch (auditError) {
            request.log.error(
              { error: auditError },
              "Failed to log organization unlock"
            );
          }
        }

        reply.status(200);
        return {
          data: {
            orgId,
            resource: "organization",
            action: "lockdown",
            status: "restored",
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

  // Get all active violations for an organization
  app.get<{
    Params: { orgId: string };
  }>(
    "/:orgId/violations",
    { preHandler: [requirePermission("settings", "manage")] },
    async (request, reply): Promise<ViolationListResponse | ErrorResponse> => {
      try {
        const { orgId } = request.params;

        const violations = await violationManager.getViolations(orgId);

        return {
          data: violations,
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
