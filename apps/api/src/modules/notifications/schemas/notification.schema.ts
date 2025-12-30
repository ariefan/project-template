import { z } from "zod";

/**
 * Notification channel enum
 */
export const NotificationChannelSchema = z.enum([
  "email",
  "sms",
  "whatsapp",
  "telegram",
  "push",
]);

/**
 * Notification category enum
 */
export const NotificationCategorySchema = z.enum([
  "transactional",
  "marketing",
  "security",
  "system",
]);

/**
 * Notification priority enum
 */
export const NotificationPrioritySchema = z.enum([
  "urgent",
  "high",
  "normal",
  "low",
]);

/**
 * Recipient information
 */
export const RecipientSchema = z
  .object({
    email: z.string().email().optional(),
    phone: z
      .string()
      .regex(/^\+[1-9]\d{1,14}$/, "Phone must be in E.164 format (+1234567890)")
      .optional(),
    telegramId: z.string().optional(),
  })
  .refine(
    (data) => data.email || data.phone || data.telegramId,
    "At least one recipient contact method is required"
  );

/**
 * Query parameters for GET /notifications
 */
export const GetNotificationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  channel: NotificationChannelSchema.optional(),
  category: NotificationCategorySchema.optional(),
  status: z
    .enum([
      "pending",
      "queued",
      "processing",
      "sent",
      "delivered",
      "failed",
      "bounced",
    ])
    .optional(),
});

/**
 * Path parameters for GET /notifications/:id
 */
export const GetNotificationParamsSchema = z.object({
  id: z.string().min(1, "Notification ID is required"),
});

/**
 * Body schema for POST /notifications/send
 */
export const SendNotificationBodySchema = z.object({
  channel: NotificationChannelSchema,
  category: NotificationCategorySchema,
  priority: NotificationPrioritySchema.default("normal"),
  recipient: RecipientSchema,
  templateId: z.string().optional(),
  templateData: z.record(z.string(), z.unknown()).optional(),
  subject: z.string().min(1).max(200).optional(),
  body: z.string().min(1).max(10_000).optional(),
  bodyHtml: z.string().min(1).max(50_000).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Type exports
 */
export type NotificationChannel = z.infer<typeof NotificationChannelSchema>;
export type NotificationCategory = z.infer<typeof NotificationCategorySchema>;
export type NotificationPriority = z.infer<typeof NotificationPrioritySchema>;
export type Recipient = z.infer<typeof RecipientSchema>;
export type GetNotificationsQuery = z.infer<typeof GetNotificationsQuerySchema>;
export type GetNotificationParams = z.infer<typeof GetNotificationParamsSchema>;
export type SendNotificationBody = z.infer<typeof SendNotificationBodySchema>;
