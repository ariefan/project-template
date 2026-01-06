import {
  and,
  count,
  db,
  eq,
  inArray,
  isNull,
  type Notification,
  notifications,
  users,
} from "@workspace/db";
import { nanoid } from "nanoid";
import type { ProviderRegistry } from "../providers/types";
import type { NotificationQueue } from "../queue/types";
import { isValidTemplateId, renderTemplate } from "../templates";
import type {
  EmailPayload,
  PushPayload,
  SendBulkRequest,
  SendNotificationRequest,
  SendResult,
  SmsPayload,
  TelegramPayload,
  WhatsAppPayload,
} from "../types";
import {
  createPreferenceService,
  type PreferenceService,
} from "./preference.service";

export interface NotificationService {
  send(request: SendNotificationRequest): Promise<SendResult>;
  sendBulk(
    request: SendBulkRequest
  ): Promise<{ queued: number; skipped: number }>;
  getHistory(
    userId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<Notification[]>;
  getById(id: string): Promise<Notification | null>;
  markAsRead(notificationId: string, userId: string): Promise<void>;
  markAsUnread(notificationId: string, userId: string): Promise<void>;
  markAllAsRead(userId: string): Promise<number>;
  getUnreadCount(userId: string): Promise<number>;
  deleteNotification(notificationId: string, userId: string): Promise<void>;
  restoreNotification(notificationId: string, userId: string): Promise<void>;
}

export interface NotificationServiceDeps {
  providers: ProviderRegistry;
  queue?: NotificationQueue;
  preferenceService?: PreferenceService;
  eventBroadcaster?: {
    broadcastToUser: <T = unknown>(
      userId: string,
      event: {
        type: string;
        data: T;
        id: string;
      }
    ) => Promise<void>;
  };
}

type AnyPayload =
  | EmailPayload
  | SmsPayload
  | WhatsAppPayload
  | TelegramPayload
  | PushPayload;

function extractBodyFromPayload(payload: AnyPayload): string {
  if ("body" in payload) {
    return payload.body;
  }
  if ("text" in payload) {
    return payload.text;
  }
  return "";
}

export function createNotificationService(
  deps: NotificationServiceDeps
): NotificationService {
  const preferenceService = deps.preferenceService ?? createPreferenceService();

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Payload builder handles multiple channel types with different field mappings
  function buildPayloadFromRequest(
    request: SendNotificationRequest
  ): AnyPayload {
    switch (request.channel) {
      case "email":
        return {
          to: request.recipient.email ?? "",
          subject: request.subject ?? "",
          body: request.body ?? "",
          html: request.bodyHtml,
        } satisfies EmailPayload;

      case "sms":
        return {
          to: request.recipient.phone ?? "",
          body: request.body ?? "",
        } satisfies SmsPayload;

      case "whatsapp":
        return {
          to: request.recipient.phone ?? "",
          body: request.body ?? "",
        } satisfies WhatsAppPayload;

      case "telegram":
        return {
          chatId: request.recipient.telegramId ?? "",
          text: request.body ?? "",
        } satisfies TelegramPayload;

      case "push":
        return {
          deviceToken: request.recipient.deviceToken ?? "",
          title: request.subject ?? "",
          body: request.body ?? "",
        } satisfies PushPayload;

      case "none":
        // In-app only - return minimal payload (won't be used for delivery)
        return {
          to: "",
          subject: request.subject ?? "",
          body: request.body ?? "",
        } satisfies EmailPayload;

      default:
        throw new Error(`Unknown channel: ${request.channel}`);
    }
  }

  async function buildPayload(
    request: SendNotificationRequest
  ): Promise<AnyPayload> {
    if (request.templateId && isValidTemplateId(request.templateId)) {
      const rendered = await renderTemplate(
        request.templateId,
        request.templateData as Record<string, unknown>
      );

      if (request.channel === "email") {
        return {
          to: request.recipient.email ?? "",
          subject: rendered.subject,
          body: rendered.text,
          html: rendered.html,
        } satisfies EmailPayload;
      }
    }

    return buildPayloadFromRequest(request);
  }

  function sendDirect(
    request: SendNotificationRequest,
    payload: AnyPayload
  ): Promise<SendResult> {
    switch (request.channel) {
      case "email":
        if (!deps.providers.email) {
          return Promise.resolve({
            success: false,
            provider: "none",
            error: {
              code: "providerNotConfigured",
              message: "Email provider not configured",
              retryable: false,
            },
          });
        }
        return deps.providers.email.send(payload as EmailPayload);

      case "sms":
        if (!deps.providers.sms) {
          return Promise.resolve({
            success: false,
            provider: "none",
            error: {
              code: "providerNotConfigured",
              message: "SMS provider not configured",
              retryable: false,
            },
          });
        }
        return deps.providers.sms.send(payload as SmsPayload);

      case "whatsapp":
        if (!deps.providers.whatsapp) {
          return Promise.resolve({
            success: false,
            provider: "none",
            error: {
              code: "providerNotConfigured",
              message: "WhatsApp provider not configured",
              retryable: false,
            },
          });
        }
        return deps.providers.whatsapp.send(payload as WhatsAppPayload);

      case "telegram":
        if (!deps.providers.telegram) {
          return Promise.resolve({
            success: false,
            provider: "none",
            error: {
              code: "providerNotConfigured",
              message: "Telegram provider not configured",
              retryable: false,
            },
          });
        }
        return deps.providers.telegram.send(payload as TelegramPayload);

      case "none":
        // In-app only notification - no external delivery
        return Promise.resolve({
          success: true,
          provider: "none",
          messageId: `none-${Date.now()}`,
        });

      case "push":
        return Promise.resolve({
          success: false,
          provider: "none",
          error: {
            code: "providerNotConfigured",
            message: "Push provider not configured",
            retryable: false,
          },
        });

      default:
        return Promise.resolve({
          success: false,
          provider: "none",
          error: {
            code: "unknownChannel",
            message: `Unknown channel: ${request.channel}`,
            retryable: false,
          },
        });
    }
  }

  async function checkUserPreferences(
    request: SendNotificationRequest
  ): Promise<SendResult | null> {
    if (!request.userId) {
      return null;
    }

    const channelEnabled = await preferenceService.isChannelEnabled(
      request.userId,
      request.channel
    );
    const categoryEnabled = await preferenceService.isCategoryEnabled(
      request.userId,
      request.category
    );

    if (channelEnabled && categoryEnabled) {
      return null;
    }

    return {
      success: false,
      provider: "none",
      error: {
        code: "optedOut",
        message: "User has opted out of this notification type",
        retryable: false,
      },
    };
  }

  async function insertNotificationRecord(
    id: string,
    request: SendNotificationRequest,
    bodyText: string
  ): Promise<void> {
    await db.insert(notifications).values({
      id,
      userId: request.userId,
      channel: request.channel,
      category: request.category,
      priority: request.priority ?? "normal",
      status: "pending",
      recipientEmail: request.recipient.email,
      recipientPhone: request.recipient.phone,
      recipientTelegramId: request.recipient.telegramId,
      templateId: request.templateId,
      subject: request.subject,
      body: bodyText,
      bodyHtml: request.bodyHtml,
      templateData: request.templateData,
      campaignId: request.campaignId,
      maxRetries: 3,
    });

    // Emit notification:created event
    if (deps.eventBroadcaster && request.userId) {
      await deps.eventBroadcaster.broadcastToUser(request.userId, {
        type: "notification:created",
        data: {
          id,
          userId: request.userId,
          channel: request.channel,
          category: request.category,
          priority: request.priority ?? "normal",
          subject: request.subject,
          body: bodyText,
          createdAt: new Date().toISOString(),
        },
        id: `notif_created_${id}`,
      });
    }
  }

  async function updateNotificationStatus(
    id: string,
    result: SendResult
  ): Promise<void> {
    await db
      .update(notifications)
      .set({
        status: result.success ? "sent" : "failed",
        sentAt: result.success ? new Date() : undefined,
        failedAt: result.success ? undefined : new Date(),
        statusMessage: result.error?.message,
        updatedAt: new Date(),
      })
      .where(eq(notifications.id, id));
  }

  return {
    async send(request: SendNotificationRequest): Promise<SendResult> {
      const optOutResult = await checkUserPreferences(request);
      if (optOutResult) {
        return optOutResult;
      }

      const notificationId = nanoid();
      const payload = await buildPayload(request);
      const bodyText = extractBodyFromPayload(payload);

      await insertNotificationRecord(notificationId, request, bodyText);

      // Skip queue for "none" channel (in-app only) since there's no external delivery
      if (
        deps.queue &&
        request.priority !== "urgent" &&
        request.channel !== "none"
      ) {
        await deps.queue.enqueue({
          id: notificationId,
          channel: request.channel,
          userId: request.userId,
          templateId: request.templateId,
          templateData: request.templateData,
          payload,
          priority: request.priority ?? "normal",
          category: request.category,
          campaignId: request.campaignId,
          retryCount: 0,
          maxRetries: 3,
        });

        return { success: true, messageId: notificationId, provider: "queue" };
      }

      const result = await sendDirect(request, payload);
      await updateNotificationStatus(notificationId, result);

      return { ...result, messageId: notificationId };
    },

    async sendBulk(
      request: SendBulkRequest
    ): Promise<{ queued: number; skipped: number }> {
      let queued = 0;
      let skipped = 0;

      if (request.userIds.length === 0) {
        return { queued, skipped };
      }

      const userRecords = await db
        .select()
        .from(users)
        .where(inArray(users.id, request.userIds));

      for (const user of userRecords) {
        const channelEnabled = await preferenceService.isChannelEnabled(
          user.id,
          request.channel
        );
        const categoryEnabled = await preferenceService.isCategoryEnabled(
          user.id,
          request.category
        );

        if (!(channelEnabled && categoryEnabled)) {
          skipped += 1;
          continue;
        }

        await this.send({
          channel: request.channel,
          category: request.category,
          priority: request.priority ?? "low",
          userId: user.id,
          recipient: { email: user.email },
          templateId: request.templateId,
          templateData: request.templateData,
          campaignId: request.campaignId,
        });

        queued += 1;
      }

      return { queued, skipped };
    },

    getHistory(
      userId: string,
      options?: { limit?: number; offset?: number }
    ): Promise<Notification[]> {
      return db
        .select()
        .from(notifications)
        .where(
          and(eq(notifications.userId, userId), isNull(notifications.deletedAt))
        )
        .orderBy(notifications.createdAt)
        .limit(options?.limit ?? 50)
        .offset(options?.offset ?? 0);
    },

    async getById(id: string): Promise<Notification | null> {
      const [notification] = await db
        .select()
        .from(notifications)
        .where(eq(notifications.id, id))
        .limit(1);

      return notification ?? null;
    },

    async markAsRead(notificationId: string, userId: string): Promise<void> {
      await db
        .update(notifications)
        .set({ readAt: new Date(), updatedAt: new Date() })
        .where(
          and(
            eq(notifications.id, notificationId),
            eq(notifications.userId, userId),
            isNull(notifications.deletedAt)
          )
        );

      // Emit notification:read event
      if (deps.eventBroadcaster) {
        await deps.eventBroadcaster.broadcastToUser(userId, {
          type: "notification:read",
          data: {
            id: notificationId,
            status: "read",
            timestamp: new Date().toISOString(),
          },
          id: `notif_read_${notificationId}`,
        });

        // Also emit updated unread count
        const unreadCount = await this.getUnreadCount(userId);
        await deps.eventBroadcaster.broadcastToUser(userId, {
          type: "notification:unread_count",
          data: { userId, count: unreadCount },
          id: `notif_unread_count_${userId}_${Date.now()}`,
        });
      }
    },

    async markAsUnread(notificationId: string, userId: string): Promise<void> {
      await db
        .update(notifications)
        .set({ readAt: null, updatedAt: new Date() })
        .where(
          and(
            eq(notifications.id, notificationId),
            eq(notifications.userId, userId),
            isNull(notifications.deletedAt)
          )
        );

      // Emit notification:unread event
      if (deps.eventBroadcaster) {
        await deps.eventBroadcaster.broadcastToUser(userId, {
          type: "notification:unread",
          data: {
            id: notificationId,
            status: "unread",
            timestamp: new Date().toISOString(),
          },
          id: `notif_unread_${notificationId}`,
        });

        // Also emit updated unread count
        const unreadCount = await this.getUnreadCount(userId);
        await deps.eventBroadcaster.broadcastToUser(userId, {
          type: "notification:unread_count",
          data: { userId, count: unreadCount },
          id: `notif_unread_count_${userId}_${Date.now()}`,
        });
      }
    },

    async markAllAsRead(userId: string): Promise<number> {
      const result = await db
        .update(notifications)
        .set({ readAt: new Date(), updatedAt: new Date() })
        .where(
          and(
            eq(notifications.userId, userId),
            isNull(notifications.readAt),
            isNull(notifications.deletedAt)
          )
        );

      const markedCount = result.rowCount ?? 0;

      // Emit bulk read event
      if (deps.eventBroadcaster && markedCount > 0) {
        await deps.eventBroadcaster.broadcastToUser(userId, {
          type: "notification:bulk_read",
          data: { markedCount, timestamp: new Date().toISOString() },
          id: `notif_bulk_read_${userId}_${Date.now()}`,
        });

        // Also emit updated unread count (should be 0 now)
        await deps.eventBroadcaster.broadcastToUser(userId, {
          type: "notification:unread_count",
          data: { userId, count: 0 },
          id: `notif_unread_count_${userId}_${Date.now()}`,
        });
      }

      return markedCount;
    },

    async getUnreadCount(userId: string): Promise<number> {
      const [result] = await db
        .select({ count: count() })
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, userId),
            isNull(notifications.readAt),
            isNull(notifications.deletedAt)
          )
        );

      return result?.count ?? 0;
    },

    async deleteNotification(
      notificationId: string,
      userId: string
    ): Promise<void> {
      await db
        .update(notifications)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(
          and(
            eq(notifications.id, notificationId),
            eq(notifications.userId, userId),
            isNull(notifications.deletedAt)
          )
        );

      // Emit notification:deleted event
      if (deps.eventBroadcaster) {
        await deps.eventBroadcaster.broadcastToUser(userId, {
          type: "notification:deleted",
          data: {
            id: notificationId,
            timestamp: new Date().toISOString(),
          },
          id: `notif_deleted_${notificationId}`,
        });

        // Also emit updated unread count
        const unreadCount = await this.getUnreadCount(userId);
        await deps.eventBroadcaster.broadcastToUser(userId, {
          type: "notification:unread_count",
          data: { userId, count: unreadCount },
          id: `notif_unread_count_${userId}_${Date.now()}`,
        });
      }
    },

    async restoreNotification(
      notificationId: string,
      userId: string
    ): Promise<void> {
      await db
        .update(notifications)
        .set({ deletedAt: null, updatedAt: new Date() })
        .where(
          and(
            eq(notifications.id, notificationId),
            eq(notifications.userId, userId)
          )
        );
    },
  };
}
