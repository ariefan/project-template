import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  pgTable,
  text,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { timestamps } from "./helpers";

// ============================================================================
// TABLES
// ============================================================================

export const species = pgTable(
  "species",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: varchar("code", { length: 20 }).notNull().unique(),
    name: text("name").notNull().unique(),
    binomialNomenclature: text("binomial_nomenclature"),
    ...timestamps,
  },
  (table) => [index("species_code_idx").on(table.code)]
);

export const breeds = pgTable(
  "breeds",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    speciesId: uuid("species_id")
      .notNull()
      .references(() => species.id, { onDelete: "cascade" }),
    code: varchar("code", { length: 20 }).notNull(),
    name: text("name").notNull(),
    origin: text("origin"),
    description: text("description"),
    isActive: boolean("is_active").default(true).notNull(),
    ...timestamps,
  },
  (table) => [
    index("breeds_species_id_idx").on(table.speciesId),
    index("breeds_code_idx").on(table.code),
    unique("breeds_species_code_unique").on(table.speciesId, table.code),
  ]
);

// ============================================================================
// RELATIONS
// ============================================================================

export const speciesRelations = relations(species, ({ many }) => ({
  breeds: many(breeds),
}));

export const breedsRelations = relations(breeds, ({ one }) => ({
  species: one(species, {
    fields: [breeds.speciesId],
    references: [species.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type SpeciesRow = typeof species.$inferSelect;
export type NewSpeciesRow = typeof species.$inferInsert;
export type BreedRow = typeof breeds.$inferSelect;
export type NewBreedRow = typeof breeds.$inferInsert;
