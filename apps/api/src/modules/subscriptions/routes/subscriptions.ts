import type {
  CreateSubscriptionRequest,
  ErrorResponse,
  Subscription,
  SubscriptionResponse,
  UpdateSubscriptionRequest,
  ValidateCouponRequest,
  ValidateCouponResponse,
} from "@workspace/contracts";
import type { FastifyInstance } from "fastify";
import { handleError, ValidationError } from "../../../lib/errors";
import { createMeta } from "../../../lib/response";
import { requireAuth } from "../../auth/middleware";
import * as couponsService from "../services/coupons.service";
import * as subscriptionsService from "../services/subscriptions.service";

/**
 * Map internal subscription to API response
 */
function mapSubscriptionToResponse(
  subscription: NonNullable<
    Awaited<ReturnType<typeof subscriptionsService.createSubscription>>
  >
): Subscription {
  return {
    ...subscription,
    trialStartsAt: subscription.trialStartsAt?.toISOString(),
    trialEndsAt: subscription.trialEndsAt?.toISOString(),
    currentPeriodStart: subscription.currentPeriodStart.toISOString(),
    currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
    canceledAt: subscription.canceledAt?.toISOString(),
    createdAt: subscription.createdAt.toISOString(),
    updatedAt: subscription.updatedAt.toISOString(),
    // Map Drizzle enum to string literal
    status: subscription.status as Subscription["status"],
    couponId: subscription.couponId ?? undefined,
    discountPercent: subscription.discountPercent ?? undefined,
    discountAmountCents: subscription.discountAmountCents ?? undefined,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd ?? false,
    providerSubscriptionId: subscription.providerSubscriptionId ?? undefined,
    providerCustomerId: subscription.providerCustomerId ?? undefined,
  };
}

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
          data: mapSubscriptionToResponse(subscription),
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

        const subscription = await subscriptionsService.createSubscription({
          organizationId: orgId,
          applicationId: "app_default", // Mapped from CreateSubscriptionRequest if it had it, but contracts don't expose it
          planId: body.planId,
          couponCode: body.couponCode,
          customerEmail: request.user?.email || "",
          customerName: request.user?.name,
          paymentMethodId: body.paymentMethodId,
          returnUrl: body.returnUrl,
        });

        reply.status(201);
        return {
          data: mapSubscriptionToResponse(subscription),
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
          throw new ValidationError("Subscription not found");
        }

        return {
          data: mapSubscriptionToResponse(subscription),
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
          throw new ValidationError("Subscription not found");
        }

        return {
          data: mapSubscriptionToResponse(subscription),
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
          throw new ValidationError("Subscription not found");
        }

        return {
          data: mapSubscriptionToResponse(subscription),
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

        if (!couponCode) {
          throw new ValidationError("Coupon code is required");
        }

        const subscription = await subscriptionsService.applyCoupon(
          subscriptionId,
          couponCode
        );

        if (!subscription) {
          throw new ValidationError("Subscription not found");
        }

        return {
          data: mapSubscriptionToResponse(subscription),
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
    async (request, reply): Promise<ValidateCouponResponse | ErrorResponse> => {
      try {
        const { code, planId } = request.body;

        const result = await couponsService.validateCoupon(code, planId);

        if (!result.valid) {
          reply.status(400); // Bad Request for invalid coupon
        }

        return {
          valid: result.valid,
          message: result.message,
          discountAmount: result.discountAmount,
          coupon: result.coupon
            ? {
                id: result.coupon.id,
                code: result.coupon.code,
                name: result.coupon.name ?? undefined,
                type: result.coupon.type,
                percentOff: result.coupon.percentOff ?? undefined,
                amountOffCents: result.coupon.amountOffCents ?? undefined,
                trialExtensionDays:
                  result.coupon.trialExtensionDays ?? undefined,
                isActive: result.coupon.isActive ?? false,
                startsAt: result.coupon.startsAt?.toISOString(),
                expiresAt: result.coupon.expiresAt?.toISOString(),
                maxRedemptions: result.coupon.maxRedemptions ?? undefined,
                currentRedemptions: result.coupon.currentRedemptions ?? 0,
                firstTimeOnly: result.coupon.firstTimeOnly ?? false,
                planIds: result.coupon.planIds ?? undefined,
                createdAt: result.coupon.createdAt.toISOString(),
                updatedAt: result.coupon.updatedAt.toISOString(),
              }
            : undefined,
        };
      } catch (error) {
        const { statusCode, response } = handleError(error, request.id);
        reply.status(statusCode);
        return response;
      }
    }
  );
}
