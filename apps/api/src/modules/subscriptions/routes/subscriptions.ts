import type { FastifyInstance } from "fastify";
import { createMeta } from "../../../lib/response";
import { requireAuth } from "../../auth/middleware";
import * as couponsService from "../services/coupons.service";
import type { CreateSubscriptionInput } from "../services/subscriptions.service";
import * as subscriptionsService from "../services/subscriptions.service";

export function subscriptionsRoutes(app: FastifyInstance) {
  // Get current subscription
  app.get<{
    Params: { orgId: string };
    Querystring: { applicationId: string };
  }>(
    "/orgs/:orgId/subscriptions/current",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { orgId } = request.params;
      const { applicationId } = request.query;

      const subscription = await subscriptionsService.getCurrentSubscription(
        orgId,
        applicationId
      );
      if (!subscription) {
        return reply.status(404).send({
          error: {
            code: "not_found",
            message: "No active subscription found",
          },
        });
      }

      return reply.send({ data: subscription, meta: createMeta(request.id) });
    }
  );

  // Create subscription
  app.post<{ Params: { orgId: string } }>(
    "/orgs/:orgId/subscriptions",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { orgId } = request.params;
      const body = request.body as Omit<
        CreateSubscriptionInput,
        "organizationId"
      >;

      const subscription = await subscriptionsService.createSubscription({
        organizationId: orgId,
        applicationId: body.applicationId || "app_main",
        planId: body.planId,
        couponCode: body.couponCode,
        customerEmail: body.customerEmail || request.user?.email || "",
        customerName: body.customerName || request.user?.name,
      });

      return reply
        .status(201)
        .send({ data: subscription, meta: createMeta(request.id) });
    }
  );

  // Update subscription
  app.patch<{ Params: { orgId: string; subscriptionId: string } }>(
    "/orgs/:orgId/subscriptions/:subscriptionId",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { subscriptionId } = request.params;
      const body = request.body as {
        planId?: string;
        cancelAtPeriodEnd?: boolean;
      };

      const subscription = await subscriptionsService.updateSubscription(
        subscriptionId,
        body
      );
      return reply.send({ data: subscription, meta: createMeta(request.id) });
    }
  );

  // Cancel subscription
  app.post<{ Params: { orgId: string; subscriptionId: string } }>(
    "/orgs/:orgId/subscriptions/:subscriptionId/cancel",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { subscriptionId } = request.params;
      const body = request.body as { immediate?: boolean };

      const subscription = await subscriptionsService.cancelSubscription(
        subscriptionId,
        body.immediate
      );
      return reply.send({ data: subscription, meta: createMeta(request.id) });
    }
  );

  // Resume subscription
  app.post<{ Params: { orgId: string; subscriptionId: string } }>(
    "/orgs/:orgId/subscriptions/:subscriptionId/resume",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { subscriptionId } = request.params;

      const subscription =
        await subscriptionsService.resumeSubscription(subscriptionId);
      return reply.send({ data: subscription, meta: createMeta(request.id) });
    }
  );

  // Apply coupon
  app.post<{ Params: { orgId: string; subscriptionId: string } }>(
    "/orgs/:orgId/subscriptions/:subscriptionId/coupon",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { subscriptionId } = request.params;
      const { couponCode } = request.body as { couponCode: string };

      const subscription = await subscriptionsService.applyCoupon(
        subscriptionId,
        couponCode
      );
      return reply.send({ data: subscription, meta: createMeta(request.id) });
    }
  );

  // Validate coupon
  app.post<{ Params: { orgId: string } }>(
    "/orgs/:orgId/subscriptions/validate-coupon",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { code, planId } = request.body as {
        code: string;
        planId: string;
      };

      const result = await couponsService.validateCoupon(code, planId);
      return reply.send(result);
    }
  );
}
