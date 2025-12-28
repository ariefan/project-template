import { relations } from "drizzle-orm";
import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { farms } from "./farms";
import { timestamps } from "./helpers";
import { species } from "./species";

// ============================================================================
// ENUMS
// ============================================================================

export const herdStatusEnum = pgEnum("herd_status", [
  "active",
  "inactive",
  "archived",
]);

export const herdTypeEnum = pgEnum("herd_type", [
  "breeding",
  "lactating",
  "dry",
  "heifer",
  "calf",
  "bull",
  "finishing",
  "replacement",
  "other",
]);

// ============================================================================
// TABLES
// ============================================================================

export const herds = pgTable(
  "herds",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    farmId: uuid("farm_id")
      .notNull()
      .references(() => farms.id, { onDelete: "cascade" }),
    speciesId: uuid("species_id").references(() => species.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    description: text("description"),
    status: herdStatusEnum("status").default("active").notNull(),
    type: herdTypeEnum("type").default("other").notNull(),
    location: varchar("location", { length: 255 }),
    capacity: integer("capacity"),
    ...timestamps,
  },
  (table) => [
    index("herds_farm_id_idx").on(table.farmId),
    index("herds_species_id_idx").on(table.speciesId),
    index("herds_status_idx").on(table.status),
  ]
);

// ============================================================================
// RELATIONS
// ============================================================================

export const herdsRelations = relations(herds, ({ one }) => ({
  farm: one(farms, {
    fields: [herds.farmId],
    references: [farms.id],
  }),
  species: one(species, {
    fields: [herds.speciesId],
    references: [species.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type HerdRow = typeof herds.$inferSelect;
export type NewHerdRow = typeof herds.$inferInsert;
export type HerdStatus = (typeof herdStatusEnum.enumValues)[number];
export type HerdType = (typeof herdTypeEnum.enumValues)[number];
