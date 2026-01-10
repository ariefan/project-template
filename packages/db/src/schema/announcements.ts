import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { users } from "./auth";

// ============ ENUMS ============

/**
 * Announcement priority level
 */
export const announcementPriorityEnum = pgEnum("announcement_priority", [
  "info",
  "warning",
  "critical",
  "success",
]);

/**
 * Announcement scope
 */
export const announcementScopeEnum = pgEnum("announcement_scope", [
  "system",
  "organization",
]);

/**
 * Target role for announcements
 */
export const announcementTargetRoleEnum = pgEnum("announcement_target_role", [
  "all",
  "admin",
  "member",
]);

// ============ ANNOUNCEMENTS TABLE ============

/**
 * Announcements table for system and organization announcements
 * Supports scheduled publishing, expiration, role-based targeting, and user interaction tracking
 */
export const announcements = pgTable(
  "announcements",
  {
    id: text("id").primaryKey(), // format: ann_{randomString}

    // Multi-tenancy (null for system-wide announcements)
    orgId: text("org_id"),

    // Content
    title: text("title").notNull(),
    content: text("content").notNull(), // Supports Markdown for links, formatting, and equations

    // Configuration
    priority: announcementPriorityEnum("priority").notNull().default("info"),
    scope: announcementScopeEnum("scope").notNull().default("organization"),

    // Targeting (stored as array of role strings)
    // Empty array means all roles
    targetRoles: text("target_roles").array().notNull().default([]), // e.g., ['admin', 'member']

    // Behavior
    isDismissible: boolean("is_dismissible").notNull().default(true),
    isActive: boolean("is_active").notNull().default(true),

    // Scheduling
    publishAt: timestamp("publish_at").notNull().defaultNow(),
    expiresAt: timestamp("expires_at"),

    // Analytics (cached counts)
    viewCount: integer("view_count").notNull().default(0),
    readCount: integer("read_count").notNull().default(0),
    acknowledgeCount: integer("acknowledge_count").notNull().default(0),
    dismissCount: integer("dismiss_count").notNull().default(0),

    // Audit
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    index("announcements_org_id_idx").on(table.orgId),
    index("announcements_priority_idx").on(table.priority),
    index("announcements_scope_idx").on(table.scope),
    index("announcements_publish_at_idx").on(table.publishAt),
    index("announcements_expires_at_idx").on(table.expiresAt),
    index("announcements_created_at_idx").on(table.createdAt),
    index("announcements_is_active_idx").on(table.isActive),
  ]
);

// ============ ANNOUNCEMENT INTERACTIONS TABLE ============

/**
 * Tracks user interactions with announcements
 * Records view, read, dismiss, and acknowledgment events
 */
export const announcementInteractions = pgTable(
  "announcement_interactions",
  {
    id: text("id").primaryKey(), // format: anint_{randomString}

    // References
    announcementId: text("announcement_id")
      .notNull()
      .references(() => announcements.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Interaction timestamps
    viewedAt: timestamp("viewed_at"), // When announcement was first displayed
    readAt: timestamp("read_at"), // When user opened/expanded it
    dismissedAt: timestamp("dismissed_at"), // When user dismissed it
    acknowledgedAt: timestamp("acknowledged_at"), // When user acknowledged (critical only)

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("announcement_interactions_announcement_id_idx").on(
      table.announcementId
    ),
    index("announcement_interactions_user_id_idx").on(table.userId),
    index("announcement_interactions_viewed_at_idx").on(table.viewedAt),
    index("announcement_interactions_read_at_idx").on(table.readAt),
    index("announcement_interactions_dismissed_at_idx").on(table.dismissedAt),
    // Unique constraint: one interaction record per user per announcement
    index("announcement_interactions_unique_idx").on(
      table.announcementId,
      table.userId
    ),
  ]
);

// ============ TYPE EXPORTS ============

export type AnnouncementRow = typeof announcements.$inferSelect;
export type NewAnnouncementRow = typeof announcements.$inferInsert;
export type AnnouncementPriority =
  (typeof announcementPriorityEnum.enumValues)[number];
export type AnnouncementScope =
  (typeof announcementScopeEnum.enumValues)[number];
export type AnnouncementTargetRole =
  (typeof announcementTargetRoleEnum.enumValues)[number];

export type AnnouncementInteractionRow =
  typeof announcementInteractions.$inferSelect;
export type NewAnnouncementInteractionRow =
  typeof announcementInteractions.$inferInsert;
