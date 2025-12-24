import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * Applications table
 *
 * Represents different applications in the multi-app system.
 * Each application has its own tenants (organizations), users, roles, and permissions.
 */
export const applications = pgTable(
  "applications",
  {
    id: text("id").primaryKey(), // app_xxx
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("applications_slug_uidx").on(table.slug),
    index("applications_name_idx").on(table.name),
  ]
);

export type Application = typeof applications.$inferSelect;
export type NewApplication = typeof applications.$inferInsert;

/**
 * Default application ID used when multi-app is not needed
 */
export const DEFAULT_APPLICATION_ID = "app_default";
