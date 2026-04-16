import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  decimal,
  index,
  integer,
  json,
  pgEnum,
  pgTable,
  serial,
  text,
  time,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { farms } from "./farms";
import { timestamps, timestampsWithSoftDelete } from "./helpers";
import { herds } from "./herds";
import { breeds } from "./species";

// ============================================================================
// ENUMS
// ============================================================================

export const livestockSexEnum = pgEnum("livestock_sex", ["M", "F"]);

export const livestockOriginEnum = pgEnum("livestock_origin", [
  "born_on_farm",
  "purchased",
  "bartered",
  "granted",
  "borrowed",
]);

export const livestockStatusEnum = pgEnum("livestock_status", [
  "active",
  "inactive",
  "ended",
]);

export const healthStatusEnum = pgEnum("health_status", [
  "healthy",
  "sick",
  "injured",
  "recovering",
]);

export const disposalStatusEnum = pgEnum("disposal_status", [
  "sold",
  "gifted",
  "loaned",
  "died",
  "slaughtered",
  "culled",
]);

// ============================================================================
// TABLES
// ============================================================================

/**
 * Main livestock table - individual animal records
 * Note: "livestock" is a mass noun (like "cattle"), so the table name is singular
 */
export const livestock = pgTable(
  "livestock",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Farm association
    farmId: uuid("farm_id")
      .notNull()
      .references(() => farms.id, { onDelete: "cascade" }),
    breedId: uuid("breed_id").references(() => breeds.id, {
      onDelete: "set null",
    }),
    herdId: uuid("herd_id").references(() => herds.id, {
      onDelete: "set null",
    }),

    // Basic information
    aifarmId: text("aifarm_id").unique(),
    name: text("name"),
    birthdate: date("birthdate"),
    sex: livestockSexEnum("sex").default("F").notNull(),
    color: varchar("color", { length: 100 }),
    origin: livestockOriginEnum("origin").default("born_on_farm").notNull(),
    status: livestockStatusEnum("status").default("active").notNull(),

    // Identification
    tagType: varchar("tag_type", { length: 50 }),
    tagId: varchar("tag_id", { length: 100 }).notNull(),

    // Physical attributes
    birthWeight: decimal("birth_weight", { precision: 8, scale: 2 }),
    weight: decimal("weight", { precision: 8, scale: 2 }),
    photo: json("photo").$type<string[] | null>(),

    // Parentage - now with proper foreign keys
    // biome-ignore lint/suspicious/noExplicitAny: self-referencing table requires any
    sireId: uuid("sire_id").references((): any => livestock.id, {
      onDelete: "set null",
    }),
    // biome-ignore lint/suspicious/noExplicitAny: self-referencing table requires any
    damId: uuid("dam_id").references((): any => livestock.id, {
      onDelete: "set null",
    }),

    // Purchase information
    purchaseDate: date("purchase_date"),
    purchasePrice: decimal("purchase_price", { precision: 15, scale: 2 }),
    purchaseFrom: text("purchase_from"),

    // Barter information
    barterLivestockId: text("barter_livestock_id"),
    barterFrom: text("barter_from"),
    barterDate: date("barter_date"),

    // Grant information
    grantFrom: text("grant_from"),
    grantDate: date("grant_date"),

    // Borrowed information
    borrowedFrom: text("borrowed_from"),
    borrowedDate: date("borrowed_date"),

    // Entry tracking
    entryDate: date("entry_date"),
    herdEntryDate: date("herd_entry_date"),

    // Official identification (regulatory compliance)
    officialIdNumber: varchar("official_id_number", { length: 100 }),
    microchipNumber: varchar("microchip_number", { length: 100 }),
    microchipLocation: varchar("microchip_location", { length: 100 }),

    // Current location tracking
    currentPremisesId: uuid("current_premises_id"),
    currentPenId: varchar("current_pen_id", { length: 100 }),

    // Production tracking (dairy)
    lactationNumber: integer("lactation_number"),
    daysInMilk: integer("days_in_milk"),
    bodyConditionScore: decimal("body_condition_score", {
      precision: 3,
      scale: 1,
    }),

    // Data quality
    dataCompleteness: integer("data_completeness"),

    ...timestampsWithSoftDelete,
  },
  (table) => [
    index("livestock_farm_id_idx").on(table.farmId),
    index("livestock_breed_id_idx").on(table.breedId),
    index("livestock_herd_id_idx").on(table.herdId),
    index("livestock_official_id_idx").on(table.officialIdNumber),
    index("livestock_status_idx").on(table.status),
    index("livestock_current_premises_idx").on(table.currentPremisesId),
    index("livestock_sire_id_idx").on(table.sireId),
    index("livestock_dam_id_idx").on(table.damId),
    index("livestock_birthdate_idx").on(table.birthdate),

    // Composite unique index: tag ID must be unique per farm
    unique("livestock_farm_tag_unique").on(table.farmId, table.tagId),

    // Check constraints for data integrity
    check(
      "livestock_birth_weight_positive",
      sql`${table.birthWeight} IS NULL OR ${table.birthWeight} > 0`
    ),
    check(
      "livestock_weight_positive",
      sql`${table.weight} IS NULL OR ${table.weight} > 0`
    ),
    check(
      "livestock_purchase_price_positive",
      sql`${table.purchasePrice} IS NULL OR ${table.purchasePrice} >= 0`
    ),
    check(
      "livestock_bcs_valid",
      sql`${table.bodyConditionScore} IS NULL OR (${table.bodyConditionScore} >= 1 AND ${table.bodyConditionScore} <= 5)`
    ),
  ]
);

export const livestockWeights = pgTable(
  "livestock_weights",
  {
    id: serial("id").primaryKey(),
    livestockId: uuid("livestock_id")
      .notNull()
      .references(() => livestock.id, { onDelete: "cascade" }),
    weight: decimal("weight", { precision: 8, scale: 2 }).notNull(),
    date: date("date").notNull(),
    deviceId: varchar("device_id", { length: 100 }),
    userId: uuid("user_id").notNull(),
    ...timestamps,
  },
  (table) => [
    index("livestock_weights_livestock_id_idx").on(table.livestockId),
    index("livestock_weights_date_idx").on(table.date),
    index("livestock_weights_livestock_date_idx").on(
      table.livestockId,
      table.date
    ),
    check("livestock_weights_weight_positive", sql`${table.weight} > 0`),
  ]
);

export const livestockMilkings = pgTable(
  "livestock_milkings",
  {
    id: serial("id").primaryKey(),
    livestockId: uuid("livestock_id")
      .notNull()
      .references(() => livestock.id, { onDelete: "cascade" }),
    milkVolume: decimal("milk_volume", { precision: 8, scale: 2 }).notNull(),
    date: date("date").notNull(),
    time: time("time"),
    session: varchar("session", { length: 20 }),
    deviceId: varchar("device_id", { length: 100 }),
    userId: uuid("user_id").notNull(),
    notes: text("notes"),

    // DHI milk quality metrics
    somaticCellCount: integer("somatic_cell_count"),
    butterfatPct: decimal("butterfat_pct", { precision: 4, scale: 2 }),
    proteinPct: decimal("protein_pct", { precision: 4, scale: 2 }),
    lactosePct: decimal("lactose_pct", { precision: 4, scale: 2 }),
    milkUreaNitrogen: decimal("milk_urea_nitrogen", { precision: 5, scale: 2 }),
    solidsNotFat: decimal("solids_not_fat", { precision: 4, scale: 2 }),
    conductivity: decimal("conductivity", { precision: 6, scale: 2 }),
    temperature: decimal("temperature", { precision: 4, scale: 1 }),
    isSupervisedTest: boolean("is_supervised_test").default(false).notNull(),
    testDayNumber: integer("test_day_number"),

    ...timestamps,
  },
  (table) => [
    index("livestock_milkings_livestock_id_idx").on(table.livestockId),
    index("livestock_milkings_date_idx").on(table.date),
    index("livestock_milkings_scc_idx").on(table.somaticCellCount),
    index("livestock_milkings_session_idx").on(table.session),
    index("livestock_milkings_livestock_date_idx").on(
      table.livestockId,
      table.date
    ),
    check("livestock_milkings_volume_positive", sql`${table.milkVolume} > 0`),
    check(
      "livestock_milkings_scc_positive",
      sql`${table.somaticCellCount} IS NULL OR ${table.somaticCellCount} >= 0`
    ),
  ]
);

export const livestockDisposals = pgTable(
  "livestock_disposals",
  {
    id: serial("id").primaryKey(),
    livestockId: uuid("livestock_id")
      .notNull()
      .references(() => livestock.id, { onDelete: "cascade" }),
    farmId: uuid("farm_id")
      .notNull()
      .references(() => farms.id, { onDelete: "cascade" }),
    disposalDate: date("disposal_date").notNull(),
    disposalStatus: disposalStatusEnum("disposal_status").notNull(),

    // Sale/gift information
    buyerName: text("buyer_name"),
    buyerPhone: varchar("buyer_phone", { length: 50 }),
    buyerEmail: varchar("buyer_email", { length: 255 }),
    price: decimal("price", { precision: 15, scale: 2 }),

    // Transfer information
    receivingFarmName: text("receiving_farm_name"),
    receiverName: text("receiver_name"),
    receiverPhone: varchar("receiver_phone", { length: 50 }),
    receiverEmail: varchar("receiver_email", { length: 255 }),

    // Loan information
    loanDate: date("loan_date"),
    returnDate: date("return_date"),

    notes: text("notes"),
    recordedByUserId: uuid("recorded_by_user_id").notNull(),

    // Slaughter traceability
    slaughterFacilityId: uuid("slaughter_facility_id"),
    carcassWeight: decimal("carcass_weight", { precision: 8, scale: 2 }),
    dressPercentage: decimal("dress_percentage", { precision: 5, scale: 2 }),
    qualityGrade: varchar("quality_grade", { length: 20 }),
    yieldGrade: varchar("yield_grade", { length: 20 }),
    condemnationReason: text("condemnation_reason"),

    ...timestamps,
  },
  (table) => [
    index("livestock_disposals_livestock_id_idx").on(table.livestockId),
    index("livestock_disposals_farm_id_idx").on(table.farmId),
    index("livestock_disposals_date_idx").on(table.disposalDate),
    index("livestock_disposals_status_idx").on(table.disposalStatus),
    check(
      "livestock_disposals_price_positive",
      sql`${table.price} IS NULL OR ${table.price} >= 0`
    ),
    check(
      "livestock_disposals_return_after_loan",
      sql`${table.returnDate} IS NULL OR ${table.loanDate} IS NULL OR ${table.returnDate} >= ${table.loanDate}`
    ),
  ]
);

export const livestockHealthRecords = pgTable(
  "livestock_health_records",
  {
    id: serial("id").primaryKey(),
    livestockId: uuid("livestock_id")
      .notNull()
      .references(() => livestock.id, { onDelete: "cascade" }),
    healthStatus: healthStatusEnum("health_status").notNull(),
    diagnosis: json("diagnosis").$type<string[] | null>(),
    treatment: text("treatment"),
    notes: text("notes"),
    medicines: json("medicines").$type<Array<{
      name: string;
      dosage: string;
      quantity: number;
    }> | null>(),
    recordDate: date("record_date").notNull(),
    ...timestamps,
  },
  (table) => [
    index("livestock_health_records_livestock_id_idx").on(table.livestockId),
    index("livestock_health_records_record_date_idx").on(table.recordDate),
  ]
);

// ============================================================================
// RELATIONS
// ============================================================================

export const livestockRelations = relations(livestock, ({ one, many }) => ({
  farm: one(farms, {
    fields: [livestock.farmId],
    references: [farms.id],
  }),
  breed: one(breeds, {
    fields: [livestock.breedId],
    references: [breeds.id],
  }),
  herd: one(herds, {
    fields: [livestock.herdId],
    references: [herds.id],
  }),
  sire: one(livestock, {
    fields: [livestock.sireId],
    references: [livestock.id],
    relationName: "sireOffspring",
  }),
  dam: one(livestock, {
    fields: [livestock.damId],
    references: [livestock.id],
    relationName: "damOffspring",
  }),
  offspring: many(livestock, { relationName: "sireOffspring" }),
  offspringAsDam: many(livestock, { relationName: "damOffspring" }),
  weights: many(livestockWeights),
  milkings: many(livestockMilkings),
  disposals: many(livestockDisposals),
  healthRecords: many(livestockHealthRecords),
}));

export const livestockWeightsRelations = relations(
  livestockWeights,
  ({ one }) => ({
    livestock: one(livestock, {
      fields: [livestockWeights.livestockId],
      references: [livestock.id],
    }),
  })
);

export const livestockMilkingsRelations = relations(
  livestockMilkings,
  ({ one }) => ({
    livestock: one(livestock, {
      fields: [livestockMilkings.livestockId],
      references: [livestock.id],
    }),
  })
);

export const livestockDisposalsRelations = relations(
  livestockDisposals,
  ({ one }) => ({
    livestock: one(livestock, {
      fields: [livestockDisposals.livestockId],
      references: [livestock.id],
    }),
    farm: one(farms, {
      fields: [livestockDisposals.farmId],
      references: [farms.id],
    }),
  })
);

export const livestockHealthRecordsRelations = relations(
  livestockHealthRecords,
  ({ one }) => ({
    livestock: one(livestock, {
      fields: [livestockHealthRecords.livestockId],
      references: [livestock.id],
    }),
  })
);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type LivestockRow = typeof livestock.$inferSelect;
export type NewLivestockRow = typeof livestock.$inferInsert;
export type LivestockWeightRow = typeof livestockWeights.$inferSelect;
export type NewLivestockWeightRow = typeof livestockWeights.$inferInsert;
export type LivestockMilkingRow = typeof livestockMilkings.$inferSelect;
export type NewLivestockMilkingRow = typeof livestockMilkings.$inferInsert;
export type LivestockDisposalRow = typeof livestockDisposals.$inferSelect;
export type NewLivestockDisposalRow = typeof livestockDisposals.$inferInsert;
export type LivestockHealthRecordRow =
  typeof livestockHealthRecords.$inferSelect;
export type NewLivestockHealthRecordRow =
  typeof livestockHealthRecords.$inferInsert;

export type LivestockSex = (typeof livestockSexEnum.enumValues)[number];
export type LivestockOrigin = (typeof livestockOriginEnum.enumValues)[number];
export type LivestockStatus = (typeof livestockStatusEnum.enumValues)[number];
export type HealthStatus = (typeof healthStatusEnum.enumValues)[number];
export type DisposalStatus = (typeof disposalStatusEnum.enumValues)[number];
