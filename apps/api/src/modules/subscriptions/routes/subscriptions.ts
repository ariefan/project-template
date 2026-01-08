import type {
  CreateSubscriptionRequest,
  ErrorResponse,
  SubscriptionResponse,
  UpdateSubscriptionRequest,
  ValidateCouponRequest,
} from "@workspace/contracts";
import type { FastifyInstance } from "fastify";
import { handleError } from "../../../lib/errors";
import { createMeta } from "../../../lib/response";
import { requireAuth } from "../../auth/middleware";
import * as couponsService from "../services/coupons.service";
import type { CreateSubscriptionInput } from "../services/subscriptions.service";
import * as subscriptionsService from "../services/subscriptions.service";

/**
 * Convert subscription Dates to ISO strings for API response
 */
function mapSubscriptionDates(subscription: Record<string, unknown>) {
  const mapped = { ...subscription };
  for (const key of [
    "trialStartsAt",
    "trialEndsAt",
    "currentPeriodStart",
    "currentPeriodEnd",
    "canceledAt",
    "createdAt",
    "updatedAt",
  ] as const) {
    if (mapped[key] instanceof Date) {
      (mapped as Record<string, unknown>)[key] = (
        mapped[key] as Date
      ).toISOString();
    } else if (mapped[key] === null) {
      delete mapped[key];
    }
  }
  return mapped as SubscriptionResponse["data"];
}

/**
 * Subscriptions routes
 * Provides endpoints for managing organization subscriptions
 */
export function subscriptionsRoutes(app: FastifyInstance) {
  // Get current subscription
  app.get<{
    Params: { orgId: string };
    Querystring: { applicationId?: string };
  }>(
    "/orgs/:orgId/subscriptions/current",
    { preHandler: [requireAuth] },
    async (request, reply): Promise<SubscriptionResponse | ErrorResponse> => {
      try {
        const { orgId } = request.params;
        const { applicationId } = request.query;

        const subscription = await subscriptionsService.getCurrentSubscription(
          orgId,
          applicationId ?? "app_default"
        );
        if (!subscription) {
          reply.status(404);
          return {
            error: {
              code: "not_found",
              message: "No active subscription found",
              requestId: request.id,
            },
          };
        }

        return {
          data: mapSubscriptionDates(subscription),
          meta: createMeta(request.id),
        };
      } catch (error) {
        const { statusCode, response } = handleError(error, request.id);
        reply.status(statusCode);
        return response;
      }
    }
  );

  // Create subscription
  app.post<{
    Params: { orgId: string };
    Body: CreateSubscriptionRequest;
  }>(
    "/orgs/:orgId/subscriptions",
    { preHandler: [requireAuth] },
    async (request, reply): Promise<SubscriptionResponse | ErrorResponse> => {
      try {
        const { orgId } = request.params;
        const body = request.body;

        const input: CreateSubscriptionInput = {
          organizationId: orgId,
          applicationId: "app_default",
          planId: body.planId,
          couponCode: body.couponCode,
          customerEmail: request.user?.email ?? "",
          customerName: request.user?.name,
          paymentMethodId: body.paymentMethodId,
          returnUrl: body.returnUrl,
        };

        const subscription =
          await subscriptionsService.createSubscription(input);

        reply.status(201);
        return {
          data: mapSubscriptionDates(subscription),
          meta: createMeta(request.id),
        };
      } catch (error) {
        const { statusCode, response } = handleError(error, request.id);
        reply.status(statusCode);
        return response;
      }
    }
  );

  // Update subscription
  app.patch<{
    Params: { orgId: string; subscriptionId: string };
    Body: UpdateSubscriptionRequest;
  }>(
    "/orgs/:orgId/subscriptions/:subscriptionId",
    { preHandler: [requireAuth] },
    async (request, reply): Promise<SubscriptionResponse | ErrorResponse> => {
      try {
        const { subscriptionId } = request.params;
        const body = request.body;

        const subscription = await subscriptionsService.updateSubscription(
          subscriptionId,
          body
        );

        if (!subscription) {
          reply.status(404);
          return {
            error: {
              code: "not_found",
              message: "Subscription not found",
              requestId: request.id,
            },
          };
        }

        return {
          data: mapSubscriptionDates(subscription),
          meta: createMeta(request.id),
        };
      } catch (error) {
        const { statusCode, response } = handleError(error, request.id);
        reply.status(statusCode);
        return response;
      }
    }
  );

  // Cancel subscription
  app.post<{
    Params: { orgId: string; subscriptionId: string };
    Body: { immediate?: boolean };
  }>(
    "/orgs/:orgId/subscriptions/:subscriptionId/cancel",
    { preHandler: [requireAuth] },
    async (request, reply): Promise<SubscriptionResponse | ErrorResponse> => {
      try {
        const { subscriptionId } = request.params;
        const body = request.body;

        const subscription = await subscriptionsService.cancelSubscription(
          subscriptionId,
          body.immediate
        );

        if (!subscription) {
          reply.status(404);
          return {
            error: {
              code: "not_found",
              message: "Subscription not found",
              requestId: request.id,
            },
          };
        }

        return {
          data: mapSubscriptionDates(subscription),
          meta: createMeta(request.id),
        };
      } catch (error) {
        const { statusCode, response } = handleError(error, request.id);
        reply.status(statusCode);
        return response;
      }
    }
  );

  // Resume subscription
  app.post<{ Params: { orgId: string; subscriptionId: string } }>(
    "/orgs/:orgId/subscriptions/:subscriptionId/resume",
    { preHandler: [requireAuth] },
    async (request, reply): Promise<SubscriptionResponse | ErrorResponse> => {
      try {
        const { subscriptionId } = request.params;

        const subscription =
          await subscriptionsService.resumeSubscription(subscriptionId);

        if (!subscription) {
          reply.status(404);
          return {
            error: {
              code: "not_found",
              message: "Subscription not found",
              requestId: request.id,
            },
          };
        }

        return {
          data: mapSubscriptionDates(subscription),
          meta: createMeta(request.id),
        };
      } catch (error) {
        const { statusCode, response } = handleError(error, request.id);
        reply.status(statusCode);
        return response;
      }
    }
  );

  // Apply coupon
  app.post<{
    Params: { orgId: string; subscriptionId: string };
    Body: { couponCode: string };
  }>(
    "/orgs/:orgId/subscriptions/:subscriptionId/coupon",
    { preHandler: [requireAuth] },
    async (request, reply): Promise<SubscriptionResponse | ErrorResponse> => {
      try {
        const { subscriptionId } = request.params;
        const { couponCode } = request.body;

        const subscription = await subscriptionsService.applyCoupon(
          subscriptionId,
          couponCode
        );

        if (!subscription) {
          reply.status(404);
          return {
            error: {
              code: "not_found",
              message: "Subscription not found",
              requestId: request.id,
            },
          };
        }

        return {
          data: mapSubscriptionDates(subscription),
          meta: createMeta(request.id),
        };
      } catch (error) {
        const { statusCode, response } = handleError(error, request.id);
        reply.status(statusCode);
        return response;
      }
    }
  );

  // Validate coupon
  app.post<{
    Params: { orgId: string };
    Body: ValidateCouponRequest;
  }>(
    "/orgs/:orgId/subscriptions/validate-coupon",
    { preHandler: [requireAuth] },
    async (request, reply): Promise<never> => {
      try {
        const body = request.body;

        const result = await couponsService.validateCoupon(
          body.code,
          body.planId
        );

        return reply.send({
          data: result,
          meta: createMeta(request.id),
        });
      } catch (error) {
        const { statusCode, response } = handleError(error, request.id);
        reply.status(statusCode);
        return reply.send(response);
      }
    }
  );
}
