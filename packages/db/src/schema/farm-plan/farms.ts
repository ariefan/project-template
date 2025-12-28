import { relations } from "drizzle-orm";
import {
  decimal,
  index,
  integer,
  json,
  pgEnum,
  pgTable,
  serial,
  text,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { metadata, timestamps } from "./helpers";
import { cities } from "./locations";

// ============================================================================
// ENUMS
// ============================================================================

export const farmTypeEnum = pgEnum("farm_type", [
  "dairy",
  "beef",
  "mixed",
  "sheep",
  "goat",
  "poultry",
  "swine",
  "other",
]);

export const farmUserRoleEnum = pgEnum("farm_user_role", [
  "owner",
  "manager",
  "worker",
  "veterinarian",
  "viewer",
]);

// ============================================================================
// TABLES
// ============================================================================

export const farms = pgTable(
  "farms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    address: text("address"),
    picture: text("picture"),
    owner: text("owner"),
    email: text("email"),
    phone: text("phone"),

    // Location
    latlong: json("latlong").$type<{ lat: number; lng: number } | null>(),
    cityId: integer("city_id")
      .notNull()
      .references(() => cities.id, { onDelete: "cascade" }),
    timezone: varchar("timezone", { length: 50 }).default("UTC").notNull(),

    // Farm details
    farmType: farmTypeEnum("farm_type").default("dairy").notNull(),
    areaHectares: decimal("area_hectares", { precision: 10, scale: 2 }),

    // Primary owner/manager
    userId: uuid("user_id").notNull(),

    ...metadata,
    ...timestamps,
  },
  (table) => [
    index("farms_city_id_idx").on(table.cityId),
    index("farms_user_id_idx").on(table.userId),
  ]
);

export const farmUsers = pgTable(
  "farm_users",
  {
    id: serial("id").primaryKey(),
    farmId: uuid("farm_id")
      .notNull()
      .references(() => farms.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull(),
    role: farmUserRoleEnum("role").default("worker").notNull(),
    ...timestamps,
  },
  (table) => [
    unique("farm_users_farm_user_unique").on(table.farmId, table.userId),
    index("farm_users_user_id_idx").on(table.userId),
  ]
);

export const farmInvites = pgTable(
  "farm_invites",
  {
    id: serial("id").primaryKey(),
    farmId: uuid("farm_id")
      .notNull()
      .references(() => farms.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: farmUserRoleEnum("role").default("worker").notNull(),
    ...timestamps,
  },
  (table) => [
    index("farm_invites_farm_id_idx").on(table.farmId),
    index("farm_invites_email_idx").on(table.email),
  ]
);

// ============================================================================
// RELATIONS
// ============================================================================

export const farmsRelations = relations(farms, ({ one, many }) => ({
  city: one(cities, {
    fields: [farms.cityId],
    references: [cities.id],
  }),
  farmUsers: many(farmUsers),
  farmInvites: many(farmInvites),
}));

export const farmUsersRelations = relations(farmUsers, ({ one }) => ({
  farm: one(farms, {
    fields: [farmUsers.farmId],
    references: [farms.id],
  }),
}));

export const farmInvitesRelations = relations(farmInvites, ({ one }) => ({
  farm: one(farms, {
    fields: [farmInvites.farmId],
    references: [farms.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type FarmRow = typeof farms.$inferSelect;
export type NewFarmRow = typeof farms.$inferInsert;
export type FarmUserRow = typeof farmUsers.$inferSelect;
export type NewFarmUserRow = typeof farmUsers.$inferInsert;
export type FarmInviteRow = typeof farmInvites.$inferSelect;
export type NewFarmInviteRow = typeof farmInvites.$inferInsert;

export type FarmType = (typeof farmTypeEnum.enumValues)[number];
export type FarmUserRole = (typeof farmUserRoleEnum.enumValues)[number];
