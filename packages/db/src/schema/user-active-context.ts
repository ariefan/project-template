import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { applications } from "./applications";
import { organizations, users } from "./auth";

/**
 * User Active Context table
 *
 * Stores the user's currently active application and tenant.
 * This is for UI state management only.
 *
 * IMPORTANT: This is NOT used for authorization decisions.
 * Always require app+tenant in request context for auth checks.
 * Never trust stored context for security decisions.
 */
export const userActiveContext = pgTable(
  "user_active_context",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    activeApplicationId: text("active_application_id").references(
      () => applications.id,
      { onDelete: "set null" }
    ),
    activeTenantId: text("active_tenant_id").references(
      () => organizations.id,
      { onDelete: "set null" }
    ),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("user_active_context_app_idx").on(table.activeApplicationId),
    index("user_active_context_tenant_idx").on(table.activeTenantId),
  ]
);

export type UserActiveContext = typeof userActiveContext.$inferSelect;
export type NewUserActiveContext = typeof userActiveContext.$inferInsert;
