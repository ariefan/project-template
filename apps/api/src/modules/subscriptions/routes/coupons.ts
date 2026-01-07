import type { FastifyInstance } from "fastify";
import { createMeta } from "../../../lib/response";
import { requireAuth } from "../../auth/middleware";
import type {
  CreateCouponInput,
  UpdateCouponInput,
} from "../services/coupons.service";
import * as couponsService from "../services/coupons.service";

export function couponsRoutes(app: FastifyInstance) {
  // List coupons
  app.get(
    "/admin/coupons",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { page, pageSize, type, isActive, code } = request.query as {
        page?: string;
        pageSize?: string;
        type?: string;
        isActive?: string;
        code?: string;
      };

      let isActiveValue: boolean | undefined;
      if (isActive === "true") {
        isActiveValue = true;
      } else if (isActive === "false") {
        isActiveValue = false;
      }

      const result = await couponsService.listCoupons({
        page: page ? Number.parseInt(page, 10) : 1,
        pageSize: pageSize ? Number.parseInt(pageSize, 10) : 50,
        type: type as "fixed" | "percent" | "trial_extension" | undefined,
        isActive: isActiveValue,
        code,
      });

      return reply.send({
        data: result.data,
        pagination: result.pagination,
        meta: createMeta(request.id),
      });
    }
  );

  // Get coupon
  app.get<{ Params: { couponId: string } }>(
    "/admin/coupons/:couponId",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const coupon = await couponsService.getCoupon(request.params.couponId);
      return reply.send({ data: coupon, meta: createMeta(request.id) });
    }
  );

  // Create coupon
  app.post(
    "/admin/coupons",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const coupon = await couponsService.createCoupon(
        request.body as CreateCouponInput
      );
      return reply
        .status(201)
        .send({ data: coupon, meta: createMeta(request.id) });
    }
  );

  // Update coupon
  app.patch<{ Params: { couponId: string } }>(
    "/admin/coupons/:couponId",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const coupon = await couponsService.updateCoupon(
        request.params.couponId,
        request.body as UpdateCouponInput
      );
      return reply.send({ data: coupon, meta: createMeta(request.id) });
    }
  );

  // Delete coupon
  app.delete<{ Params: { couponId: string } }>(
    "/admin/coupons/:couponId",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const result = await couponsService.deleteCoupon(request.params.couponId);
      return reply.send({ data: result, meta: createMeta(request.id) });
    }
  );
}
