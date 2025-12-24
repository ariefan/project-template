import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { applications } from "./applications";
import { organizations, users } from "./auth";
import { roles } from "./roles";

/**
 * User Role Assignments table
 *
 * Tracks which roles are assigned to which users with audit metadata.
 * This provides the audit trail (who assigned, when) while Casbin
 * provides the actual enforcement via grouping policies.
 *
 * When a role is assigned:
 * 1. Insert into this table (audit trail)
 * 2. Add Casbin grouping policy: g(userId, roleName, appId, tenantId)
 */
export const userRoleAssignments = pgTable(
  "user_role_assignments",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleId: text("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    applicationId: text("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    tenantId: text("tenant_id").references(() => organizations.id, {
      onDelete: "cascade",
    }), // NULL for global role assignments
    assignedAt: timestamp("assigned_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    assignedBy: text("assigned_by").references(() => users.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    // User can only have each role once per app+tenant
    uniqueIndex("user_role_assignments_uidx").on(
      table.userId,
      table.roleId,
      table.applicationId,
      table.tenantId
    ),
    index("user_role_assignments_user_idx").on(table.userId),
    index("user_role_assignments_role_idx").on(table.roleId),
    index("user_role_assignments_app_idx").on(table.applicationId),
    index("user_role_assignments_tenant_idx").on(table.tenantId),
    // Common query: get all roles for a user in an app+tenant
    index("user_role_assignments_user_app_tenant_idx").on(
      table.userId,
      table.applicationId,
      table.tenantId
    ),
  ]
);

export type UserRoleAssignment = typeof userRoleAssignments.$inferSelect;
export type NewUserRoleAssignment = typeof userRoleAssignments.$inferInsert;
