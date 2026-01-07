import type { FastifyInstance } from "fastify";
import { createMeta } from "../../../lib/response";
import * as plansService from "../services/plans.service";

export function pricingRoutes(app: FastifyInstance) {
  // Get public plans (no auth required)
  app.get("/pricing/plans", async (request, reply) => {
    const { applicationId, billingPeriod } = request.query as {
      applicationId?: string;
      billingPeriod?: "monthly" | "yearly";
    };
    console.log(
      `[DEBUG] Pricing Plans Request: applicationId=${applicationId}, billingPeriod=${billingPeriod}`
    );

    const plans = await plansService.getPublicPlans(
      applicationId,
      billingPeriod
    );
    console.log(`[DEBUG] Found ${plans.length} plans`);

    return reply.send({
      data: plans,
      pagination: {
        page: 1,
        pageSize: plans.length,
        totalCount: plans.length,
        totalPages: 1,
        hasNext: false,
        hasPrevious: false,
      },
      meta: createMeta(request.id),
    });
  });
}
