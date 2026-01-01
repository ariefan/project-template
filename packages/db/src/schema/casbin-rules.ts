import { index, pgTable, serial, text } from "drizzle-orm/pg-core";

/**
 * Casbin Rules table
 *
 * Stores role→permission policies for authorization.
 *
 * Architecture:
 * - DB (user_role_assignments table) owns user→role mapping
 * - Casbin (this table) owns role→permission evaluation via p policies
 * - No g() grouping policies are used; role is resolved from DB at runtime
 *
 * Policy format (ptype="p"):
 * - v0: role name (e.g., "owner", "admin", "member", "viewer")
 * - v1: application ID
 * - v2: tenant ID (organization)
 * - v3: resource (e.g., "posts", "comments", "files")
 * - v4: action (e.g., "read", "create", "update", "delete")
 * - v5: effect ("allow" or "deny")
 * - v6: condition ("" for none, "owner" for owner-only access)
 *
 * Role inheritance (ptype="g", optional):
 * - v0: child role, v1: parent role
 * - Example: g("admin", "member") means admin inherits member permissions
 *
 * Condition values (v6):
 * - "" (empty): no condition, always applies
 * - "owner": isOwner(sub, resourceOwnerId) must be true
 */
export const casbinRules = pgTable(
  "casbin_rules",
  {
    id: serial("id").primaryKey(),
    ptype: text("ptype").notNull(), // "p" for policy, "g" for role assignment
    v0: text("v0"), // p: subject (role name), g: user
    v1: text("v1"), // p: app, g: role
    v2: text("v2"), // p: tenant, g: app
    v3: text("v3"), // p: object/resource, g: tenant
    v4: text("v4"), // p: action
    v5: text("v5"), // p: effect (allow/deny)
    v6: text("v6"), // p: condition (owner, shared, etc.)
  },
  (table) => [
    index("casbin_rules_ptype_idx").on(table.ptype),
    index("casbin_rules_v0_idx").on(table.v0),
    index("casbin_rules_v1_idx").on(table.v1),
    index("casbin_rules_v2_idx").on(table.v2),
    // Composite index for policy queries:
    // Check if role (v0) in app (v1) + tenant (v2) can do action (v4) on resource (v3)
    index("casbin_rules_policy_idx").on(
      table.ptype,
      table.v0,
      table.v1,
      table.v2,
      table.v3,
      table.v4
    ),
    // Composite index for grouping queries:
    // Get roles for user (v0) in app (v2) + tenant (v3)
    index("casbin_rules_grouping_idx").on(
      table.ptype,
      table.v0,
      table.v2,
      table.v3
    ),
  ]
);

export type CasbinRuleRow = typeof casbinRules.$inferSelect;
export type NewCasbinRuleRow = typeof casbinRules.$inferInsert;
