import type { NotificationSystem } from "@workspace/notifications";
import type { FastifyInstance } from "fastify";
import { notificationRoutes } from "./routes/notifications";
import { preferenceRoutes } from "./routes/preferences";

declare module "fastify" {
  interface FastifyInstance {
    notifications: NotificationSystem | null;
  }
}

export async function notificationsModule(app: FastifyInstance) {
  await app.register(notificationRoutes);
  await app.register(preferenceRoutes);
}

export { notificationRoutes } from "./routes/notifications";
export { preferenceRoutes } from "./routes/preferences";
