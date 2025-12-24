import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });

export type Database = typeof db;

// Re-export drizzle-orm operators
export {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  like,
  lte,
  or,
  sql,
} from "drizzle-orm";

// Re-export schema tables
export * from "./schema";

// Export inferred types from notification tables
export type Notification = typeof schema.notifications.$inferSelect;
export type NotificationInsert = typeof schema.notifications.$inferInsert;
export type NotificationPreference =
  typeof schema.notificationPreferences.$inferSelect;
export type NotificationPreferenceInsert =
  typeof schema.notificationPreferences.$inferInsert;
export type NotificationTemplate =
  typeof schema.notificationTemplates.$inferSelect;
export type NotificationCampaign =
  typeof schema.notificationCampaigns.$inferSelect;
