import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { users } from "./auth";

// ============ ENUMS ============

export const notificationChannelEnum = pgEnum("notification_channel", [
  "email",
  "sms",
  "whatsapp",
  "telegram",
  "push",
]);

export const notificationStatusEnum = pgEnum("notification_status", [
  "pending",
  "queued",
  "processing",
  "sent",
  "delivered",
  "failed",
  "bounced",
]);

export const notificationPriorityEnum = pgEnum("notification_priority", [
  "low",
  "normal",
  "high",
  "urgent",
]);

export const notificationCategoryEnum = pgEnum("notification_category", [
  "transactional",
  "marketing",
  "system",
  "security",
]);

export const campaignStatusEnum = pgEnum("campaign_status", [
  "draft",
  "scheduled",
  "sending",
  "completed",
  "cancelled",
]);

// ============ NOTIFICATIONS TABLE ============

export const notifications = pgTable(
  "notifications",
  {
    id: text("id").primaryKey(), // format: notif_{randomString}

    // Optional user association (null for system notifications)
    userId: text("user_id").references(() => users.id, {
      onDelete: "set null",
    }),

    // Notification details
    channel: notificationChannelEnum("channel").notNull(),
    category: notificationCategoryEnum("category")
      .notNull()
      .default("transactional"),
    priority: notificationPriorityEnum("priority").notNull().default("normal"),

    // Recipient (may differ from user - e.g., system emails to admins)
    recipientEmail: text("recipient_email"),
    recipientPhone: text("recipient_phone"),
    recipientTelegramId: text("recipient_telegram_id"),

    // Content
    templateId: text("template_id"),
    subject: text("subject"),
    body: text("body").notNull(),
    bodyHtml: text("body_html"),
    templateData: jsonb("template_data").$type<Record<string, unknown>>(),

    // Status tracking
    status: notificationStatusEnum("status").notNull().default("pending"),
    statusMessage: text("status_message"),

    // Provider info
    provider: text("provider"),
    providerMessageId: text("provider_message_id"),

    // Delivery tracking
    sentAt: timestamp("sent_at"),
    deliveredAt: timestamp("delivered_at"),
    failedAt: timestamp("failed_at"),

    // Retry handling
    retryCount: integer("retry_count").notNull().default(0),
    maxRetries: integer("max_retries").notNull().default(3),
    nextRetryAt: timestamp("next_retry_at"),

    // Bulk/campaign association
    campaignId: text("campaign_id"),
    batchId: text("batch_id"),

    // Metadata
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("notifications_user_id_idx").on(table.userId),
    index("notifications_status_idx").on(table.status),
    index("notifications_channel_idx").on(table.channel),
    index("notifications_created_at_idx").on(table.createdAt),
    index("notifications_campaign_id_idx").on(table.campaignId),
  ]
);

// ============ USER NOTIFICATION PREFERENCES ============

export const notificationPreferences = pgTable(
  "notification_preferences",
  {
    id: text("id").primaryKey(), // format: pref_{randomString}
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" })
      .unique(),

    // Channel-specific opt-in/out
    emailEnabled: boolean("email_enabled").notNull().default(true),
    smsEnabled: boolean("sms_enabled").notNull().default(false),
    whatsappEnabled: boolean("whatsapp_enabled").notNull().default(false),
    telegramEnabled: boolean("telegram_enabled").notNull().default(false),
    pushEnabled: boolean("push_enabled").notNull().default(true),

    // Category-specific preferences
    marketingEnabled: boolean("marketing_enabled").notNull().default(false),
    transactionalEnabled: boolean("transactional_enabled")
      .notNull()
      .default(true),
    securityEnabled: boolean("security_enabled").notNull().default(true),

    // Contact details (user may provide different contacts for notifications)
    preferredEmail: text("preferred_email"),
    preferredPhone: text("preferred_phone"),
    telegramChatId: text("telegram_chat_id"),

    // Quiet hours
    quietHoursEnabled: boolean("quiet_hours_enabled").notNull().default(false),
    quietHoursStart: text("quiet_hours_start"), // HH:mm format
    quietHoursEnd: text("quiet_hours_end"), // HH:mm format
    timezone: text("timezone").default("UTC"),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("notification_preferences_user_id_idx").on(table.userId)]
);

// ============ NOTIFICATION TEMPLATES ============

export const notificationTemplates = pgTable("notification_templates", {
  id: text("id").primaryKey(), // format: tmpl_{randomString}

  name: text("name").notNull().unique(),
  description: text("description"),

  channel: notificationChannelEnum("channel").notNull(),
  category: notificationCategoryEnum("category").notNull(),

  // Template content
  subject: text("subject"),
  body: text("body").notNull(),
  bodyHtml: text("body_html"),

  // Variables schema (JSON Schema for validation)
  variablesSchema: jsonb("variables_schema").$type<Record<string, unknown>>(),

  // Status
  isActive: boolean("is_active").notNull().default(true),

  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============ CAMPAIGNS ============

export const notificationCampaigns = pgTable("notification_campaigns", {
  id: text("id").primaryKey(), // format: camp_{randomString}

  name: text("name").notNull(),
  description: text("description"),

  channel: notificationChannelEnum("channel").notNull(),
  templateId: text("template_id").references(() => notificationTemplates.id),

  // Targeting
  targetAudience: jsonb("target_audience").$type<{
    userIds?: string[];
    filters?: Record<string, unknown>;
    excludeUserIds?: string[];
  }>(),

  // Template data for the campaign
  templateData: jsonb("template_data").$type<Record<string, unknown>>(),

  // Stats
  totalRecipients: integer("total_recipients").notNull().default(0),
  sentCount: integer("sent_count").notNull().default(0),
  deliveredCount: integer("delivered_count").notNull().default(0),
  failedCount: integer("failed_count").notNull().default(0),
  openedCount: integer("opened_count").notNull().default(0),
  clickedCount: integer("clicked_count").notNull().default(0),

  // Status
  status: campaignStatusEnum("status").notNull().default("draft"),
  scheduledFor: timestamp("scheduled_for"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),

  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============ TYPE EXPORTS ============

export type NotificationRow = typeof notifications.$inferSelect;
export type NewNotificationRow = typeof notifications.$inferInsert;

export type NotificationPreferenceRow =
  typeof notificationPreferences.$inferSelect;
export type NewNotificationPreferenceRow =
  typeof notificationPreferences.$inferInsert;

export type NotificationTemplateRow = typeof notificationTemplates.$inferSelect;
export type NewNotificationTemplateRow =
  typeof notificationTemplates.$inferInsert;

export type NotificationCampaignRow = typeof notificationCampaigns.$inferSelect;
export type NewNotificationCampaignRow =
  typeof notificationCampaigns.$inferInsert;

// Channel and status types
export type NotificationChannel =
  (typeof notificationChannelEnum.enumValues)[number];
export type NotificationStatus =
  (typeof notificationStatusEnum.enumValues)[number];
export type NotificationPriority =
  (typeof notificationPriorityEnum.enumValues)[number];
export type NotificationCategory =
  (typeof notificationCategoryEnum.enumValues)[number];
export type CampaignStatus = (typeof campaignStatusEnum.enumValues)[number];
