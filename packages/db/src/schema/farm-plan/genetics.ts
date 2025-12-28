import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  decimal,
  index,
  integer,
  json,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { farms } from "./farms";
import { livestock } from "./livestock";

// ============================================================================
// ENUMS
// ============================================================================

export const geneticTestTypeEnum = pgEnum("genetic_test_type", [
  "parentage",
  "genomic_profile",
  "disease_carrier",
  "coat_color",
  "horned_polled",
]);

export const geneticTestStatusEnum = pgEnum("genetic_test_status", [
  "pending",
  "processing",
  "completed",
  "failed",
]);

// ============================================================================
// TABLES
// ============================================================================

export const geneticEvaluations = pgTable(
  "genetic_evaluations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    livestockId: uuid("livestock_id")
      .notNull()
      .references(() => livestock.id, { onDelete: "cascade" }),

    evaluationDate: date("evaluation_date").notNull(),
    evaluationSource: text("evaluation_source").notNull(),
    evaluationVersion: text("evaluation_version"),

    // Core EPD traits (nullable - not all animals have all traits)
    birthWeightEpd: decimal("birth_weight_epd", { precision: 6, scale: 2 }),
    birthWeightAccuracy: decimal("birth_weight_accuracy", {
      precision: 4,
      scale: 2,
    }),
    weaningWeightEpd: decimal("weaning_weight_epd", { precision: 6, scale: 2 }),
    weaningWeightAccuracy: decimal("weaning_weight_accuracy", {
      precision: 4,
      scale: 2,
    }),
    yearlingWeightEpd: decimal("yearling_weight_epd", {
      precision: 6,
      scale: 2,
    }),
    yearlingWeightAccuracy: decimal("yearling_weight_accuracy", {
      precision: 4,
      scale: 2,
    }),
    milkEpd: decimal("milk_epd", { precision: 6, scale: 2 }),
    milkAccuracy: decimal("milk_accuracy", { precision: 4, scale: 2 }),
    marblingEpd: decimal("marbling_epd", { precision: 6, scale: 2 }),
    marblingAccuracy: decimal("marbling_accuracy", { precision: 4, scale: 2 }),
    ribeyeEpd: decimal("ribeye_epd", { precision: 6, scale: 2 }),
    ribeyeAccuracy: decimal("ribeye_accuracy", { precision: 4, scale: 2 }),
    fatEpd: decimal("fat_epd", { precision: 6, scale: 2 }),
    fatAccuracy: decimal("fat_accuracy", { precision: 4, scale: 2 }),
    docilityEpd: decimal("docility_epd", { precision: 6, scale: 2 }),
    docilityAccuracy: decimal("docility_accuracy", { precision: 4, scale: 2 }),
    calvingEaseDirectEpd: decimal("calving_ease_direct_epd", {
      precision: 6,
      scale: 2,
    }),
    calvingEaseDirectAccuracy: decimal("calving_ease_direct_accuracy", {
      precision: 4,
      scale: 2,
    }),
    calvingEaseMaternalEpd: decimal("calving_ease_maternal_epd", {
      precision: 6,
      scale: 2,
    }),
    calvingEaseMaternalAccuracy: decimal("calving_ease_maternal_accuracy", {
      precision: 4,
      scale: 2,
    }),

    // Indexes and economic values
    percentileRank: integer("percentile_rank"),
    dollarValues: json("dollar_values").$type<{
      $W?: number;
      $B?: number;
      $C?: number;
    } | null>(),

    notes: text("notes"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("genetic_evaluations_livestock_id_idx").on(table.livestockId),
    index("genetic_evaluations_evaluation_date_idx").on(table.evaluationDate),
  ]
);

export const geneticTests = pgTable(
  "genetic_tests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    livestockId: uuid("livestock_id")
      .notNull()
      .references(() => livestock.id, { onDelete: "cascade" }),
    testType: geneticTestTypeEnum("test_type").notNull(),
    status: geneticTestStatusEnum("status").default("pending").notNull(),

    labName: text("lab_name").notNull(),
    labReferenceNumber: text("lab_reference_number"),
    sampleDate: date("sample_date").notNull(),
    sampleType: text("sample_type"),
    resultDate: date("result_date"),

    // Results
    testResults: json("test_results").$type<Record<string, unknown> | null>(),
    parentageSireId: uuid("parentage_sire_id").references(() => livestock.id, {
      onDelete: "set null",
    }),
    parentageDamId: uuid("parentage_dam_id").references(() => livestock.id, {
      onDelete: "set null",
    }),
    parentageConfirmed: boolean("parentage_confirmed"),

    certificatePath: text("certificate_path"),
    notes: text("notes"),

    submittedBy: uuid("submitted_by").notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("genetic_tests_livestock_id_idx").on(table.livestockId),
    index("genetic_tests_status_idx").on(table.status),
    index("genetic_tests_test_type_idx").on(table.testType),
    index("genetic_tests_parentage_sire_id_idx").on(table.parentageSireId),
    index("genetic_tests_parentage_dam_id_idx").on(table.parentageDamId),
  ]
);

export const breedingGoals = pgTable(
  "breeding_goals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    farmId: uuid("farm_id")
      .notNull()
      .references(() => farms.id, { onDelete: "cascade" }),

    goalName: text("goal_name").notNull(),
    description: text("description"),
    isActive: boolean("is_active").default(true).notNull(),
    priority: integer("priority").default(1).notNull(),

    // Target traits with weights
    targetTraits: json("target_traits")
      .$type<
        Array<{
          trait: string;
          targetValue?: number;
          weight: number;
          direction: "increase" | "decrease" | "maintain";
        }>
      >()
      .notNull(),

    startDate: date("start_date"),
    endDate: date("end_date"),

    createdBy: uuid("created_by").notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("breeding_goals_farm_id_idx").on(table.farmId),
    index("breeding_goals_is_active_idx").on(table.isActive),
  ]
);

// ============================================================================
// RELATIONS
// ============================================================================

export const geneticEvaluationsRelations = relations(
  geneticEvaluations,
  ({ one }) => ({
    livestock: one(livestock, {
      fields: [geneticEvaluations.livestockId],
      references: [livestock.id],
    }),
  })
);

export const geneticTestsRelations = relations(geneticTests, ({ one }) => ({
  livestock: one(livestock, {
    fields: [geneticTests.livestockId],
    references: [livestock.id],
  }),
  parentageSire: one(livestock, {
    fields: [geneticTests.parentageSireId],
    references: [livestock.id],
    relationName: "parentageSire",
  }),
  parentageDam: one(livestock, {
    fields: [geneticTests.parentageDamId],
    references: [livestock.id],
    relationName: "parentageDam",
  }),
}));

export const breedingGoalsRelations = relations(breedingGoals, ({ one }) => ({
  farm: one(farms, {
    fields: [breedingGoals.farmId],
    references: [farms.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type GeneticEvaluationRow = typeof geneticEvaluations.$inferSelect;
export type NewGeneticEvaluationRow = typeof geneticEvaluations.$inferInsert;
export type GeneticTestRow = typeof geneticTests.$inferSelect;
export type NewGeneticTestRow = typeof geneticTests.$inferInsert;
export type BreedingGoalRow = typeof breedingGoals.$inferSelect;
export type NewBreedingGoalRow = typeof breedingGoals.$inferInsert;

export type GeneticTestType = (typeof geneticTestTypeEnum.enumValues)[number];
export type GeneticTestStatus =
  (typeof geneticTestStatusEnum.enumValues)[number];
