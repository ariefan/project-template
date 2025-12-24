import { index, pgTable, serial, text } from "drizzle-orm/pg-core";

/**
 * Casbin Rules table
 *
 * Stores authorization policies and role assignments.
 *
 * Multi-App RBAC Model:
 * - Policy (ptype="p"): v0=sub, v1=app, v2=tenant, v3=obj, v4=act, v5=eft, v6=condition
 * - Grouping (ptype="g"): v0=user, v1=role, v2=app, v3=tenant
 *
 * Condition values (v6 for policies):
 * - "" (empty): no condition, always applies
 * - "owner": isOwner(sub, resourceOwnerId) must be true
 * - "shared": isShared(sub, resourceId) must be true
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
