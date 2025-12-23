import { index, pgTable, serial, text } from "drizzle-orm/pg-core";

export const casbinRules = pgTable(
  "casbin_rules",
  {
    id: serial("id").primaryKey(),
    ptype: text("ptype").notNull(), // "p" for policy, "g" for role assignment
    v0: text("v0"), // subject (userId or role name)
    v1: text("v1"), // domain (organizationId)
    v2: text("v2"), // object/resource
    v3: text("v3"), // action
    v4: text("v4"), // reserved for future use
    v5: text("v5"), // reserved for future use
  },
  (table) => [
    index("casbin_rules_ptype_idx").on(table.ptype),
    index("casbin_rules_v0_idx").on(table.v0),
    index("casbin_rules_v1_idx").on(table.v1),
    // Composite index for the most common query pattern:
    // Check if user (v0) in org (v1) can do action (v3) on resource (v2)
    index("casbin_rules_v0_v1_v2_v3_idx").on(
      table.v0,
      table.v1,
      table.v2,
      table.v3
    ),
  ]
);

export type CasbinRuleRow = typeof casbinRules.$inferSelect;
export type NewCasbinRuleRow = typeof casbinRules.$inferInsert;
