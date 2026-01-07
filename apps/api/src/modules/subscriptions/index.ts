import type { FastifyInstance } from "fastify";
import { couponsRoutes } from "./routes/coupons";
import { plansRoutes } from "./routes/plans";
import { pricingRoutes } from "./routes/pricing";
import { subscriptionsRoutes } from "./routes/subscriptions";
import webhooksRoutes from "./routes/webhooks";

export { registerSubscriptionHandlers } from "./handlers/subscription.handler";

export default async function subscriptionsModule(app: FastifyInstance) {
  // Admin routes
  plansRoutes(app);
  couponsRoutes(app);

  // User routes
  subscriptionsRoutes(app);

  // Public routes
  pricingRoutes(app);
  await app.register(webhooksRoutes);
}

export * as couponsService from "./services/coupons.service";
// Re-export services for use by other modules
export * as plansService from "./services/plans.service";
export * as pricingService from "./services/pricing.service";
export * as subscriptionsService from "./services/subscriptions.service";
