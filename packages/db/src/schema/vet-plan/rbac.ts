import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  json,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// ============================================================================
// ENUMS
// ============================================================================

export const permissionActionEnum = pgEnum("permission_action", [
  "create",
  "read",
  "update",
  "delete",
  "export",
  "print",
  "prescribe",
  "administer",
  "approve",
  "void",
]);

export const permissionResourceEnum = pgEnum("permission_resource", [
  "patients",
  "clients",
  "appointments",
  "medical_encounters",
  "prescriptions",
  "diagnostics",
  "surgeries",
  "invoices",
  "payments",
  "inventory",
  "staff",
  "reports",
  "settings",
  "audit_logs",
]);

// Type exports
export type PermissionAction = (typeof permissionActionEnum.enumValues)[number];
export type PermissionResource =
  (typeof permissionResourceEnum.enumValues)[number];

// ============================================================================
// TABLES
// ============================================================================

export const roles = pgTable(
  "vet_roles",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Role details
    name: text("name").notNull().unique(), // e.g., "veterinarian", "receptionist", "admin"
    displayName: text("display_name").notNull(),
    description: text("description"),

    // System role flag (cannot be deleted/modified)
    isSystem: boolean("is_system").default(false).notNull(),

    // Status
    isActive: boolean("is_active").default(true).notNull(),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("vet_roles_name_idx").on(table.name)]
);

export const permissions = pgTable(
  "vet_permissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Permission definition
    action: permissionActionEnum("action").notNull(),
    resource: permissionResourceEnum("resource").notNull(),

    // Optional field-level permissions
    fields: json("fields").$type<string[]>(), // Specific fields allowed

    // Conditions
    conditions: json("conditions").$type<{
      ownRecordsOnly?: boolean;
      clinicOnly?: boolean;
      departmentOnly?: boolean;
    }>(),

    // Description
    name: text("name").notNull().unique(), // e.g., "read_patients", "create_appointments"
    description: text("description"),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("vet_permissions_resource_action_idx").on(
      table.resource,
      table.action
    ),
  ]
);

export const rolePermissions = pgTable(
  "vet_role_permissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permissionId: uuid("permission_id")
      .notNull()
      .references(() => permissions.id, { onDelete: "cascade" }),

    // Override conditions specific to this role
    conditionOverrides: json("condition_overrides").$type<
      Record<string, unknown>
    >(),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("vet_role_permissions_role_id_idx").on(table.roleId),
    index("vet_role_permissions_permission_id_idx").on(table.permissionId),
  ]
);

export const userRoles = pgTable(
  "vet_user_roles",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    userId: uuid("user_id").notNull(), // Staff/Vet user ID
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),

    // Scope limitations
    clinicId: uuid("clinic_id"), // If role is clinic-specific
    departmentId: uuid("department_id"), // If role is department-specific

    // Validity period
    effectiveFrom: timestamp("effective_from").defaultNow().notNull(),
    effectiveUntil: timestamp("effective_until"),

    // Status
    isActive: boolean("is_active").default(true).notNull(),

    // Assignment tracking
    assignedBy: uuid("assigned_by"), // Who granted this role
    assignmentReason: text("assignment_reason"),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("vet_user_roles_user_id_idx").on(table.userId),
    index("vet_user_roles_role_id_idx").on(table.roleId),
  ]
);

// ============================================================================
// RELATIONS
// ============================================================================

export const rolesRelations = relations(roles, ({ many }) => ({
  rolePermissions: many(rolePermissions),
  userRoles: many(userRoles),
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
}));

export const rolePermissionsRelations = relations(
  rolePermissions,
  ({ one }) => ({
    role: one(roles, {
      fields: [rolePermissions.roleId],
      references: [roles.id],
    }),
    permission: one(permissions, {
      fields: [rolePermissions.permissionId],
      references: [permissions.id],
    }),
  })
);

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  role: one(roles, {
    fields: [userRoles.roleId],
    references: [roles.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type RoleRow = typeof roles.$inferSelect;
export type NewRoleRow = typeof roles.$inferInsert;

export type PermissionRow = typeof permissions.$inferSelect;
export type NewPermissionRow = typeof permissions.$inferInsert;

export type RolePermissionRow = typeof rolePermissions.$inferSelect;
export type NewRolePermissionRow = typeof rolePermissions.$inferInsert;

export type UserRoleRow = typeof userRoles.$inferSelect;
export type NewUserRoleRow = typeof userRoles.$inferInsert;
