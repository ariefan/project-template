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
  eventBroadcaster?: Pick<
    {
      broadcastToUser: <T = unknown>(
        userId: string,
        event: { type: string; data: T; id: string; metadata?: unknown }
      ) => Promise<void>;
    },
    "broadcastToUser"
  >;
};

export interface NotificationSystem {
  start(): Promise<void>;
  stop(): Promise<void>;
  notification: ReturnType<typeof createNotificationService>;
  preferences: ReturnType<typeof createPreferenceService>;
}

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
        providers,
        config.eventBroadcaster
      )
    : undefined;

  const notificationService = createNotificationService({
    providers,
    queue,
    preferenceService,
    eventBroadcaster: config.eventBroadcaster,
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

export type { NotificationEnvConfig } from "./config";
export { buildServiceConfig } from "./config";
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
export type { GenericNotificationEmailProps } from "./templates/email/generic-notification";
export { GenericNotificationEmail } from "./templates/email/generic-notification";
export type { InvoiceReceiptEmailProps } from "./templates/email/invoice-receipt";
export { InvoiceReceiptEmail } from "./templates/email/invoice-receipt";
// Email template exports - also exported from main index for easier importing
export type { PasswordResetEmailProps } from "./templates/email/password-reset";
export { PasswordResetEmail } from "./templates/email/password-reset";
export type { PaymentFailedEmailProps } from "./templates/email/payment-failed";
export { PaymentFailedEmail } from "./templates/email/payment-failed";
export type { SecurityAlertEmailProps } from "./templates/email/security-alert";
export { SecurityAlertEmail } from "./templates/email/security-alert";
export type { TeamInviteEmailProps } from "./templates/email/team-invite";
export { TeamInviteEmail } from "./templates/email/team-invite";
export type { VerificationEmailProps } from "./templates/email/verification";
export { VerificationEmail } from "./templates/email/verification";
export type { WelcomeEmailProps } from "./templates/email/welcome";
export { WelcomeEmail } from "./templates/email/welcome";
export type * from "./types";
