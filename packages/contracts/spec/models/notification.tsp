import "@typespec/http";
import "../common/responses.tsp";

using TypeSpec.Http;

/**
 * Notification channel enum
 */
enum NotificationChannel {
  email: "email",
  sms: "sms",
  whatsapp: "whatsapp",
  telegram: "telegram",
  push: "push",
}

/**
 * Notification category enum
 */
enum NotificationCategory {
  transactional: "transactional",
  marketing: "marketing",
  security: "security",
  system: "system",
}

/**
 * Notification priority enum
 */
enum NotificationPriority {
  urgent: "urgent",
  high: "high",
  normal: "normal",
  low: "low",
}

/**
 * Notification status enum
 */
enum NotificationStatus {
  pending: "pending",
  queued: "queued",
  processing: "processing",
  sent: "sent",
  delivered: "delivered",
  failed: "failed",
  bounced: "bounced",
}

/**
 * Notification recipient information
 */
model NotificationRecipient {
  /** Email address (required for email channel) */
  @example("user@example.com")
  email?: string;

  /** Phone number in E.164 format (required for SMS/WhatsApp) */
  @example("+1234567890")
  phone?: string;

  /** Telegram chat ID (required for Telegram channel) */
  @example("123456789")
  telegramId?: string;
}

/**
 * Notification resource model
 */
model Notification {
  /** Unique notification identifier */
  @example("notif_abc123")
  id: string;

  /** User ID who should receive this notification */
  @example("usr_xyz789")
  userId?: string;

  /** Notification channel */
  channel: NotificationChannel;

  /** Notification category */
  category: NotificationCategory;

  /** Notification priority */
  priority: NotificationPriority;

  /** Current notification status */
  status: NotificationStatus;

  /** Email address this was sent to */
  recipientEmail?: string;

  /** Phone number this was sent to */
  recipientPhone?: string;

  /** Telegram ID this was sent to */
  recipientTelegramId?: string;

  /** Template ID used (if any) */
  templateId?: string;

  /** Subject line (for email) */
  subject?: string;

  /** Plain text body */
  body?: string;

  /** HTML body (for email) */
  bodyHtml?: string;

  /** Template data used for rendering */
  templateData?: Record<unknown>;

  /** Campaign ID for bulk sends */
  campaignId?: string;

  /** Provider used to send (e.g., "nodemailer", "twilio") */
  provider?: string;

  /** Provider's message ID */
  providerMessageId?: string;

  /** Timestamp when notification was sent */
  sentAt?: utcDateTime;

  /** Timestamp when notification was delivered */
  deliveredAt?: utcDateTime;

  /** Timestamp when notification failed */
  failedAt?: utcDateTime;

  /** Timestamp when notification was read by user */
  readAt?: utcDateTime;

  /** Timestamp when notification was soft deleted */
  deletedAt?: utcDateTime;

  /** Number of retry attempts */
  retryCount: int32;

  /** Maximum retry attempts allowed */
  maxRetries: int32;

  /** Next retry timestamp */
  nextRetryAt?: utcDateTime;

  /** Status message (error details if failed) */
  statusMessage?: string;

  /** Metadata for custom data */
  metadata?: Record<unknown>;

  /** Timestamp when notification was created */
  createdAt: utcDateTime;

  /** Timestamp when notification was last updated */
  updatedAt: utcDateTime;
}

/**
 * Request body for sending a notification
 */
model SendNotificationRequest {
  /** Notification channel */
  channel: NotificationChannel;

  /** Notification category */
  category: NotificationCategory;

  /** Notification priority (default: normal) */
  priority?: NotificationPriority;

  /** Recipient information */
  recipient: NotificationRecipient;

  /** Template ID to use for rendering */
  @example("welcome-email")
  templateId?: string;

  /** Data for template rendering */
  templateData?: Record<unknown>;

  /** Subject line (for email, required if not using template) */
  @example("Welcome to our platform")
  subject?: string;

  /** Plain text body (required if not using template) */
  @example("Thank you for signing up!")
  body?: string;

  /** HTML body (for email) */
  bodyHtml?: string;

  /** Custom metadata */
  metadata?: Record<unknown>;
}

/**
 * Notification preferences model
 */
model NotificationPreferences {
  /** User ID */
  userId: string;

  /** Email notifications enabled */
  emailEnabled: boolean;

  /** SMS notifications enabled */
  smsEnabled: boolean;

  /** WhatsApp notifications enabled */
  whatsappEnabled: boolean;

  /** Telegram notifications enabled */
  telegramEnabled: boolean;

  /** Push notifications enabled */
  pushEnabled: boolean;

  /** Marketing notifications enabled */
  marketingEnabled: boolean;

  /** Transactional notifications enabled */
  transactionalEnabled: boolean;

  /** Security notifications enabled */
  securityEnabled: boolean;

  /** System notifications enabled */
  systemEnabled: boolean;

  /** Preferred email address */
  preferredEmail?: string;

  /** Preferred phone number */
  preferredPhone?: string;

  /** Preferred Telegram ID */
  preferredTelegramId?: string;

  /** Quiet hours enabled */
  quietHoursEnabled: boolean;

  /** Quiet hours start time (HH:mm format) */
  quietHoursStart?: string;

  /** Quiet hours end time (HH:mm format) */
  quietHoursEnd?: string;

  /** Quiet hours timezone (IANA format) */
  quietHoursTimezone?: string;

  /** Timestamp when created */
  createdAt: utcDateTime;

  /** Timestamp when last updated */
  updatedAt: utcDateTime;
}

/**
 * Request body for updating notification preferences
 */
model UpdatePreferencesRequest {
  /** Email notifications enabled */
  emailEnabled?: boolean;

  /** SMS notifications enabled */
  smsEnabled?: boolean;

  /** WhatsApp notifications enabled */
  whatsappEnabled?: boolean;

  /** Telegram notifications enabled */
  telegramEnabled?: boolean;

  /** Push notifications enabled */
  pushEnabled?: boolean;

  /** Marketing notifications enabled */
  marketingEnabled?: boolean;

  /** Transactional notifications enabled */
  transactionalEnabled?: boolean;

  /** Security notifications enabled */
  securityEnabled?: boolean;

  /** System notifications enabled */
  systemEnabled?: boolean;

  /** Preferred email address */
  preferredEmail?: string;

  /** Preferred phone number */
  preferredPhone?: string;

  /** Preferred Telegram ID */
  preferredTelegramId?: string;

  /** Quiet hours enabled */
  quietHoursEnabled?: boolean;

  /** Quiet hours start time (HH:mm format) */
  quietHoursStart?: string;

  /** Quiet hours end time (HH:mm format) */
  quietHoursEnd?: string;

  /** Quiet hours timezone (IANA format) */
  quietHoursTimezone?: string;
}

/**
 * Single notification response
 */
model NotificationResponse {
  data: Notification;
  meta: ResponseMeta;
}

/**
 * Notification collection response
 */
model NotificationListResponse {
  data: Notification[];
  meta: ResponseMeta;
}

/**
 * Send notification success response
 */
model SendNotificationResponse {
  data: {
    /** Message ID assigned to the notification */
    messageId: string;

    /** Provider used to send */
    provider: string;
  };
  meta: ResponseMeta;
}

/**
 * Notification preferences response
 */
model NotificationPreferencesResponse {
  data: NotificationPreferences;
  meta: ResponseMeta;
}

/**
 * Mark all as read response
 */
model MarkAllReadResponse {
  data: {
    /** Number of notifications marked as read */
    markedCount: int32;
  };
  meta: ResponseMeta;
}

/**
 * Unread count response
 */
model UnreadCountResponse {
  data: {
    /** Number of unread notifications */
    unreadCount: int32;
  };
  meta: ResponseMeta;
}
