import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type DatabaseConfig = {
  connectionString: string;
  max?: number;
  idleTimeoutMillis?: number;
};

export type Database = ReturnType<typeof drizzle<typeof schema>>;

export type DatabaseConnection = {
  db: Database;
  pool: Pool;
};

// ─────────────────────────────────────────────────────────────
// PRIMARY: Pure factory - apps own the lifecycle
// ─────────────────────────────────────────────────────────────

/**
 * Create a new database connection.
 * Apps should use this and manage the lifecycle themselves.
 *
 * @example
 * ```ts
 * const { db, pool } = createDb({ connectionString: env.DATABASE_URL });
 *
 * // Use db for queries
 * const users = await db.select().from(schema.users);
 *
 * // Clean up when done
 * await pool.end();
 * ```
 */
export function createDb(config: DatabaseConfig): DatabaseConnection {
  const pool = new Pool({
    connectionString: config.connectionString,
    max: config.max ?? 10,
    idleTimeoutMillis: config.idleTimeoutMillis ?? 30_000,
  });

  const db = drizzle(pool, { schema });

  return { db, pool };
}

// ─────────────────────────────────────────────────────────────
// OPTIONAL: Default instance helpers (convenience for simple apps)
// ─────────────────────────────────────────────────────────────

let defaultDb: Database | null = null;
let defaultPool: Pool | null = null;

/**
 * Initialize the default database instance.
 * Use this for simple apps that only need one connection.
 *
 * @example
 * ```ts
 * // At app startup
 * initDefaultDb({ connectionString: env.DATABASE_URL });
 *
 * // Later, anywhere in the app
 * const db = getDefaultDb();
 * ```
 */
export function initDefaultDb(config: DatabaseConfig): Database {
  if (defaultDb) {
    return defaultDb;
  }

  const result = createDb(config);
  defaultDb = result.db;
  defaultPool = result.pool;

  return defaultDb;
}

/**
 * Get the default database instance.
 * Throws if initDefaultDb() hasn't been called.
 */
export function getDefaultDb(): Database {
  if (!defaultDb) {
    throw new Error(
      "Database not initialized. Call initDefaultDb(config) before using getDefaultDb()."
    );
  }
  return defaultDb;
}

/**
 * Close the default database connection.
 * Call this during graceful shutdown.
 */
export async function closeDefaultDb(): Promise<void> {
  if (defaultPool) {
    await defaultPool.end();
    defaultPool = null;
    defaultDb = null;
  }
}

// ─────────────────────────────────────────────────────────────
// Convenience export: Lazy proxy to default db instance
// ─────────────────────────────────────────────────────────────

/**
 * Lazy proxy to the default database instance.
 * Automatically delegates to getDefaultDb() on first access.
 * Requires initDefaultDb() to be called at app startup.
 */
export const db: Database = new Proxy({} as Database, {
  get(_target, prop: string | symbol) {
    const instance = getDefaultDb();
    const value = instance[prop as keyof Database];
    if (typeof value === "function") {
      return value.bind(instance);
    }
    return value;
  },
});

// ─────────────────────────────────────────────────────────────
// Re-exports
// ─────────────────────────────────────────────────────────────

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
