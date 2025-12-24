import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { applications } from "./applications";
import { organizations, users } from "./auth";

/**
 * Roles table
 *
 * Stores role metadata for the multi-app, multi-tenant RBAC system.
 * Actual permissions are stored in casbin_rules table.
 *
 * - Global roles: tenantId is NULL, apply at application level
 * - Tenant roles: tenantId is set, apply within a specific organization
 */
export const roles = pgTable(
  "roles",
  {
    id: text("id").primaryKey(), // role_xxx
    applicationId: text("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    tenantId: text("tenant_id").references(() => organizations.id, {
      onDelete: "cascade",
    }), // NULL for global roles
    name: text("name").notNull(),
    description: text("description"),
    isSystemRole: boolean("is_system_role").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    // Unique role name per application+tenant
    uniqueIndex("roles_app_tenant_name_uidx").on(
      table.applicationId,
      table.tenantId,
      table.name
    ),
    index("roles_application_id_idx").on(table.applicationId),
    index("roles_tenant_id_idx").on(table.tenantId),
    index("roles_is_system_role_idx").on(table.isSystemRole),
  ]
);

export type Role = typeof roles.$inferSelect;
export type NewRole = typeof roles.$inferInsert;

/**
 * System role names
 */
export const SystemRoles = {
  // Global roles (no tenant)
  SUPER_USER: "super_user",
  APP_ADMIN: "app_admin",
  USER: "user",

  // Tenant roles
  OWNER: "owner",
  ADMIN: "admin",
  MEMBER: "member",
  VIEWER: "viewer",
} as const;

export type SystemRoleName = (typeof SystemRoles)[keyof typeof SystemRoles];
