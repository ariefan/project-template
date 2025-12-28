import { relations } from "drizzle-orm";
import {
  index,
  integer,
  pgTable,
  serial,
  text,
  unique,
  varchar,
} from "drizzle-orm/pg-core";
import { timestamps } from "./helpers";

// ============================================================================
// TABLES
// ============================================================================

export const provinces = pgTable(
  "provinces",
  {
    id: serial("id").primaryKey(),
    code: varchar("code", { length: 10 }).notNull().unique(),
    name: text("name").notNull(),
    ...timestamps,
  },
  (table) => [index("provinces_code_idx").on(table.code)]
);

export const cities = pgTable(
  "cities",
  {
    id: serial("id").primaryKey(),
    provinceId: integer("province_id")
      .notNull()
      .references(() => provinces.id, { onDelete: "cascade" }),
    code: varchar("code", { length: 20 }).notNull(),
    name: text("name").notNull(),
    ...timestamps,
  },
  (table) => [
    index("cities_province_id_idx").on(table.provinceId),
    index("cities_code_idx").on(table.code),
    unique("cities_province_code_unique").on(table.provinceId, table.code),
  ]
);

// ============================================================================
// RELATIONS
// ============================================================================

export const provincesRelations = relations(provinces, ({ many }) => ({
  cities: many(cities),
}));

export const citiesRelations = relations(cities, ({ one }) => ({
  province: one(provinces, {
    fields: [cities.provinceId],
    references: [provinces.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type ProvinceRow = typeof provinces.$inferSelect;
export type NewProvinceRow = typeof provinces.$inferInsert;
export type CityRow = typeof cities.$inferSelect;
export type NewCityRow = typeof cities.$inferInsert;
