import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  decimal,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { farms } from "./farms";
import { timestamps } from "./helpers";
import { livestock } from "./livestock";

// ============================================================================
// ENUMS
// ============================================================================

export const breedingMethodEnum = pgEnum("breeding_method", [
  "natural",
  "artificial_insemination",
]);

export const breedingResultEnum = pgEnum("breeding_result", [
  "pending",
  "successful",
  "failed",
  "unknown",
]);

export const pregnancyStatusEnum = pgEnum("pregnancy_status", [
  "suspected",
  "confirmed",
  "ongoing",
  "delivered",
  "aborted",
  "false_positive",
]);

export const birthOutcomeEnum = pgEnum("birth_outcome", [
  "live_birth",
  "stillborn",
  "abortion",
  "dystocia",
]);

// ============================================================================
// TABLES
// ============================================================================

export const breedingRecords = pgTable(
  "breeding_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    farmId: uuid("farm_id")
      .notNull()
      .references(() => farms.id, { onDelete: "cascade" }),
    femaleLivestockId: uuid("female_livestock_id")
      .notNull()
      .references(() => livestock.id, { onDelete: "cascade" }),
    maleLivestockId: uuid("male_livestock_id").references(() => livestock.id, {
      onDelete: "set null",
    }),

    breedingDate: date("breeding_date").notNull(),
    method: breedingMethodEnum("method").notNull(),

    // AI-specific fields
    semenBatchId: text("semen_batch_id"),
    semenSource: text("semen_source"),
    technicianId: uuid("technician_id"),

    result: breedingResultEnum("result").default("pending").notNull(),
    resultDate: date("result_date"),

    expectedDueDate: date("expected_due_date"),
    notes: text("notes"),

    recordedBy: uuid("recorded_by").notNull(),
    ...timestamps,
  },
  (table) => [
    index("breeding_records_farm_id_idx").on(table.farmId),
    index("breeding_records_female_livestock_id_idx").on(
      table.femaleLivestockId
    ),
    index("breeding_records_male_livestock_id_idx").on(table.maleLivestockId),
    index("breeding_records_breeding_date_idx").on(table.breedingDate),
  ]
);

export const pregnancies = pgTable(
  "pregnancies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    farmId: uuid("farm_id")
      .notNull()
      .references(() => farms.id, { onDelete: "cascade" }),
    livestockId: uuid("livestock_id")
      .notNull()
      .references(() => livestock.id, { onDelete: "cascade" }),
    breedingRecordId: uuid("breeding_record_id").references(
      () => breedingRecords.id,
      { onDelete: "set null" }
    ),

    status: pregnancyStatusEnum("status").default("suspected").notNull(),

    detectionDate: date("detection_date").notNull(),
    detectionMethod: text("detection_method"),

    confirmedDate: date("confirmed_date"),
    confirmedBy: uuid("confirmed_by"),

    expectedDueDate: date("expected_due_date"),
    actualDeliveryDate: date("actual_delivery_date"),

    gestationDays: integer("gestation_days"),

    notes: text("notes"),

    ...timestamps,
  },
  (table) => [
    index("pregnancies_farm_id_idx").on(table.farmId),
    index("pregnancies_livestock_id_idx").on(table.livestockId),
    index("pregnancies_status_idx").on(table.status),
    index("pregnancies_expected_due_date_idx").on(table.expectedDueDate),
  ]
);

export const births = pgTable(
  "births",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    farmId: uuid("farm_id")
      .notNull()
      .references(() => farms.id, { onDelete: "cascade" }),
    pregnancyId: uuid("pregnancy_id").references(() => pregnancies.id, {
      onDelete: "set null",
    }),
    motherLivestockId: uuid("mother_livestock_id")
      .notNull()
      .references(() => livestock.id, { onDelete: "cascade" }),
    offspringLivestockId: uuid("offspring_livestock_id").references(
      () => livestock.id,
      { onDelete: "set null" }
    ),

    birthDate: timestamp("birth_date").notNull(),
    birthOrder: integer("birth_order").default(1).notNull(),

    outcome: birthOutcomeEnum("outcome").notNull(),
    birthWeight: decimal("birth_weight", { precision: 8, scale: 2 }),
    sex: text("sex"),

    assistanceRequired: boolean("assistance_required").default(false).notNull(),
    assistanceNotes: text("assistance_notes"),

    veterinarianId: uuid("veterinarian_id"),
    attendantId: uuid("attendant_id"),

    healthNotes: text("health_notes"),

    ...timestamps,
  },
  (table) => [
    index("births_farm_id_idx").on(table.farmId),
    index("births_mother_livestock_id_idx").on(table.motherLivestockId),
    index("births_pregnancy_id_idx").on(table.pregnancyId),
    index("births_birth_date_idx").on(table.birthDate),
  ]
);

// ============================================================================
// RELATIONS
// ============================================================================

export const breedingRecordsRelations = relations(
  breedingRecords,
  ({ one, many }) => ({
    farm: one(farms, {
      fields: [breedingRecords.farmId],
      references: [farms.id],
    }),
    femaleLivestock: one(livestock, {
      fields: [breedingRecords.femaleLivestockId],
      references: [livestock.id],
      relationName: "femaleBreedings",
    }),
    maleLivestock: one(livestock, {
      fields: [breedingRecords.maleLivestockId],
      references: [livestock.id],
      relationName: "maleBreedings",
    }),
    pregnancies: many(pregnancies),
  })
);

export const pregnanciesRelations = relations(pregnancies, ({ one, many }) => ({
  farm: one(farms, {
    fields: [pregnancies.farmId],
    references: [farms.id],
  }),
  livestock: one(livestock, {
    fields: [pregnancies.livestockId],
    references: [livestock.id],
  }),
  breedingRecord: one(breedingRecords, {
    fields: [pregnancies.breedingRecordId],
    references: [breedingRecords.id],
  }),
  births: many(births),
}));

export const birthsRelations = relations(births, ({ one }) => ({
  farm: one(farms, {
    fields: [births.farmId],
    references: [farms.id],
  }),
  pregnancy: one(pregnancies, {
    fields: [births.pregnancyId],
    references: [pregnancies.id],
  }),
  motherLivestock: one(livestock, {
    fields: [births.motherLivestockId],
    references: [livestock.id],
    relationName: "birthsAsMother",
  }),
  offspringLivestock: one(livestock, {
    fields: [births.offspringLivestockId],
    references: [livestock.id],
    relationName: "birthRecord",
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type BreedingRecordRow = typeof breedingRecords.$inferSelect;
export type NewBreedingRecordRow = typeof breedingRecords.$inferInsert;
export type PregnancyRow = typeof pregnancies.$inferSelect;
export type NewPregnancyRow = typeof pregnancies.$inferInsert;
export type BirthRow = typeof births.$inferSelect;
export type NewBirthRow = typeof births.$inferInsert;

export type BreedingMethod = (typeof breedingMethodEnum.enumValues)[number];
export type BreedingResult = (typeof breedingResultEnum.enumValues)[number];
export type PregnancyStatus = (typeof pregnancyStatusEnum.enumValues)[number];
export type BirthOutcome = (typeof birthOutcomeEnum.enumValues)[number];
