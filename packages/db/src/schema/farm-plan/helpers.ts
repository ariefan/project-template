/**
 * Schema Helper Functions
 *
 * Reusable patterns for common database schema elements
 * to maintain consistency and reduce duplication (DRY principle)
 */

import { json, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Standard timestamp fields for audit tracking
 * Includes created_at and updated_at with automatic management
 */
export const timestamps = {
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
} as const;

/**
 * Timestamp fields with soft delete support
 * Includes created_at, updated_at, and deleted_at
 */
export const timestampsWithSoftDelete = {
  ...timestamps,
  deletedAt: timestamp("deleted_at"),
} as const;

/**
 * User tracking field for who created/recorded an action
 * @param fieldName - Custom field name (default: "created_by_user_id")
 */
export function createdByUser(fieldName = "created_by_user_id") {
  return {
    [fieldName]: uuid(fieldName).notNull(),
  } as const;
}

/**
 * User tracking field for who performed an action (generic)
 * @param fieldName - Field name like "recorded_by_user_id", "administered_by_user_id"
 */
export function performedByUser(fieldName: string) {
  return {
    [fieldName]: uuid(fieldName).notNull(),
  } as const;
}

/**
 * Optional user tracking field
 * @param fieldName - Field name for the user reference
 */
export function optionalUser(fieldName: string) {
  return {
    [fieldName]: uuid(fieldName),
  } as const;
}

/**
 * Generic metadata JSON field for extensibility
 * Allows storing additional unstructured data without schema changes
 */
export const metadata = {
  metadata: json("metadata").$type<Record<string, unknown> | null>(),
} as const;

/**
 * Notes field for additional context/comments
 */
export const notes = {
  notes: text("notes"),
} as const;

/**
 * Farm reference foreign key (required)
 * Used across most tables to associate records with a farm
 */
export function farmReference(_tableName: string) {
  return uuid("farm_id")
    .notNull()
    .references(
      () => {
        // Dynamic import to avoid circular dependencies
        const { farms } = require("./farms");
        return farms.id;
      },
      { onDelete: "cascade" }
    );
}
