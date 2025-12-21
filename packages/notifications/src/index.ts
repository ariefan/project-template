import { createProviderRegistry } from "./providers";
import { createPgBossQueue } from "./queue/pg-boss";
import { createNotificationService } from "./services/notification.service";
import { createPreferenceService } from "./services/preference.service";
import type { NotificationServiceConfig } from "./types";

export type NotificationSystemConfig = NotificationServiceConfig & {
  queue?: {
    connectionString: string;
    concurrency?: number;
    maxRetries?: number;
  };
};

export type NotificationSystem = {
  start(): Promise<void>;
  stop(): Promise<void>;
  notification: ReturnType<typeof createNotificationService>;
  preferences: ReturnType<typeof createPreferenceService>;
};

export function createNotificationSystem(
  config: NotificationSystemConfig
): NotificationSystem {
  const providers = createProviderRegistry(config);
  const preferenceService = createPreferenceService();
  const queue = config.queue
    ? createPgBossQueue(
        {
          connectionString: config.queue.connectionString,
          concurrency: config.queue.concurrency,
          maxRetries: config.queue.maxRetries,
        },
        providers
      )
    : undefined;

  const notificationService = createNotificationService({
    providers,
    queue,
    preferenceService,
  });

  return {
    async start() {
      if (queue) {
        await queue.start();
      }
    },

    async stop() {
      if (queue) {
        await queue.stop();
      }
    },

    notification: notificationService,
    preferences: preferenceService,
  };
}

export { buildServiceConfig, loadEnvConfig } from "./config";
export { createProviderRegistry } from "./providers";
export { createPgBossQueue } from "./queue/pg-boss";
export type { NotificationQueue } from "./queue/types";
export { createNotificationService } from "./services/notification.service";
export { createPreferenceService } from "./services/preference.service";
export {
  getTemplateSubject,
  isValidTemplateId,
  renderTemplate,
} from "./templates";
export type * from "./types";
