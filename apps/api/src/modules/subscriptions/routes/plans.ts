import type { FastifyInstance } from "fastify";
import { createMeta } from "../../../lib/response";
import { requireAuth } from "../../auth/middleware";
import type {
  CreatePlanInput,
  UpdatePlanInput,
} from "../services/plans.service";
import * as plansService from "../services/plans.service";

export function plansRoutes(app: FastifyInstance) {
  // List plans
  app.get(
    "/admin/plans",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const {
        page,
        pageSize,
        applicationId,
        visibility,
        isActive,
        billingPeriod,
      } = request.query as {
        page?: string;
        pageSize?: string;
        applicationId?: string;
        visibility?: string;
        isActive?: string;
        billingPeriod?: string;
      };

      let isActiveValue: boolean | undefined;
      if (isActive === "true") {
        isActiveValue = true;
      } else if (isActive === "false") {
        isActiveValue = false;
      }

      const result = await plansService.listPlans({
        page: page ? Number.parseInt(page, 10) : 1,
        pageSize: pageSize ? Number.parseInt(pageSize, 10) : 50,
        applicationId,
        visibility: visibility as "public" | "private" | "archived" | undefined,
        isActive: isActiveValue,
        billingPeriod: billingPeriod as "monthly" | "yearly" | undefined,
      });

      return reply.send({
        data: result.data,
        pagination: result.pagination,
        meta: createMeta(request.id),
      });
    }
  );

  // Get plan
  app.get<{ Params: { planId: string } }>(
    "/admin/plans/:planId",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const plan = await plansService.getPlan(request.params.planId);
      return reply.send({ data: plan, meta: createMeta(request.id) });
    }
  );

  // Create plan
  app.post(
    "/admin/plans",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const plan = await plansService.createPlan(
        request.body as CreatePlanInput
      );
      return reply
        .status(201)
        .send({ data: plan, meta: createMeta(request.id) });
    }
  );

  // Update plan
  app.patch<{ Params: { planId: string } }>(
    "/admin/plans/:planId",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const plan = await plansService.updatePlan(
        request.params.planId,
        request.body as UpdatePlanInput
      );
      return reply.send({ data: plan, meta: createMeta(request.id) });
    }
  );

  // Delete plan
  app.delete<{ Params: { planId: string } }>(
    "/admin/plans/:planId",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const result = await plansService.deletePlan(request.params.planId);
      return reply.send({ data: result, meta: createMeta(request.id) });
    }
  );
}
