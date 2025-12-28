import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  decimal,
  index,
  integer,
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
import { metadata, timestamps } from "./helpers";
import { herds } from "./herds";
import { livestock } from "./livestock";

// ============================================================================
// ENUMS
// ============================================================================

export const feedTypeEnum = pgEnum("feed_type", [
  "concentrate", // Grains, protein meals
  "forage", // Hay, silage, pasture
  "mineral", // Mineral supplements
  "vitamin", // Vitamin supplements
  "premix", // Pre-mixed supplements
  "byproduct", // Brewers grain, distillers grain, etc.
  "complete", // Complete feed (all-in-one)
  "other",
]);

export const feedFormEnum = pgEnum("feed_form", [
  "dry", // Hay, grain
  "wet", // Silage, wet brewers grain
  "liquid", // Molasses, liquid supplements
  "pellet",
  "crumble",
  "mash",
]);

export const unitOfMeasureEnum = pgEnum("unit_of_measure", [
  "kg",
  "lbs",
  "ton",
  "metric_ton",
  "bushel",
  "bale",
  "liter",
  "gallon",
]);

export const rationStatusEnum = pgEnum("ration_status", [
  "draft",
  "active",
  "inactive",
  "archived",
]);

export const targetAnimalGroupEnum = pgEnum("target_animal_group", [
  "lactating_cows",
  "dry_cows",
  "transition_cows",
  "fresh_cows",
  "heifers",
  "calves",
  "bulls",
  "finishing_cattle",
  "ewes",
  "lambs",
  "other",
]);

// ============================================================================
// TABLES
// ============================================================================

/**
 * Feed Ingredients - Individual feed ingredients with nutritional profiles
 */
export const feedIngredients = pgTable(
  "feed_ingredients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    farmId: uuid("farm_id")
      .notNull()
      .references(() => farms.id, { onDelete: "cascade" }),

    // Basic information
    name: text("name").notNull(),
    commonName: text("common_name"),
    scientificName: text("scientific_name"),
    productCode: varchar("product_code", { length: 100 }),
    feedType: feedTypeEnum("feed_type").notNull(),
    feedForm: feedFormEnum("feed_form").notNull(),
    description: text("description"),

    // Supplier information
    manufacturer: text("manufacturer"),
    supplier: text("supplier"),
    supplierProductCode: varchar("supplier_product_code", { length: 100 }),

    // Nutritional composition (per kg dry matter)
    dryMatterPercent: decimal("dry_matter_percent", {
      precision: 5,
      scale: 2,
    }), // DM %
    crudeProteinPercent: decimal("crude_protein_percent", {
      precision: 5,
      scale: 2,
    }), // CP %
    metabolizableEnergyMcalPerKg: decimal("metabolizable_energy_mcal_per_kg", {
      precision: 6,
      scale: 2,
    }), // ME
    netEnergyLactationMcalPerKg: decimal("net_energy_lactation_mcal_per_kg", {
      precision: 6,
      scale: 2,
    }), // NEL
    netEnergyGainMcalPerKg: decimal("net_energy_gain_mcal_per_kg", {
      precision: 6,
      scale: 2,
    }), // NEG
    totalDigestibleNutrientsPercent: decimal("tdn_percent", {
      precision: 5,
      scale: 2,
    }), // TDN

    // Fiber fractions
    neutralDetergentFiberPercent: decimal("ndf_percent", {
      precision: 5,
      scale: 2,
    }), // NDF
    acidDetergentFiberPercent: decimal("adf_percent", {
      precision: 5,
      scale: 2,
    }), // ADF
    crudeeFiberPercent: decimal("crude_fiber_percent", {
      precision: 5,
      scale: 2,
    }),

    // Fat and minerals
    crudeFatPercent: decimal("crude_fat_percent", { precision: 5, scale: 2 }),
    ashPercent: decimal("ash_percent", { precision: 5, scale: 2 }),
    calciumPercent: decimal("calcium_percent", { precision: 5, scale: 3 }),
    phosphorusPercent: decimal("phosphorus_percent", {
      precision: 5,
      scale: 3,
    }),
    magnesiumPercent: decimal("magnesium_percent", { precision: 5, scale: 3 }),
    potassiumPercent: decimal("potassium_percent", { precision: 5, scale: 3 }),
    sodiumPercent: decimal("sodium_percent", { precision: 5, scale: 3 }),
    sulfurPercent: decimal("sulfur_percent", { precision: 5, scale: 3 }),

    // Vitamins and other nutrients
    vitaminAIuPerKg: integer("vitamin_a_iu_per_kg"),
    vitaminDIuPerKg: integer("vitamin_d_iu_per_kg"),
    vitaminEIuPerKg: integer("vitamin_e_iu_per_kg"),

    // Cost and purchasing
    currentCostPerUnit: decimal("current_cost_per_unit", {
      precision: 15,
      scale: 2,
    }),
    unitOfMeasure: unitOfMeasureEnum("unit_of_measure").notNull(),

    // Storage and safety
    storageRequirements: text("storage_requirements"),
    shelfLifeDays: integer("shelf_life_days"),
    withdrawalPeriodDays: integer("withdrawal_period_days"),

    // Status
    isActive: boolean("is_active").default(true).notNull(),
    lastAnalysisDate: date("last_analysis_date"),

    ...metadata,
    ...timestamps,
  },
  (table) => [
    index("feed_ingredients_farm_id_idx").on(table.farmId),
    index("feed_ingredients_feed_type_idx").on(table.feedType),
    index("feed_ingredients_is_active_idx").on(table.isActive),
    index("feed_ingredients_product_code_idx").on(table.productCode),
  ]
);

/**
 * Feed Lab Analyses - Laboratory test results for feed nutritional content
 */
export const feedLabAnalyses = pgTable(
  "feed_lab_analyses",
  {
    id: serial("id").primaryKey(),
    feedIngredientId: uuid("feed_ingredient_id")
      .notNull()
      .references(() => feedIngredients.id, { onDelete: "cascade" }),
    farmId: uuid("farm_id")
      .notNull()
      .references(() => farms.id, { onDelete: "cascade" }),

    // Sample information
    sampleDate: date("sample_date").notNull(),
    sampleId: varchar("sample_id", { length: 100 }),
    lotNumber: varchar("lot_number", { length: 100 }),

    // Lab information
    laboratoryName: text("laboratory_name"),
    analysisDate: date("analysis_date"),
    reportNumber: varchar("report_number", { length: 100 }),
    certificateUrl: text("certificate_url"),

    // Results (same fields as feedIngredients but from actual lab test)
    dryMatterPercent: decimal("dry_matter_percent", {
      precision: 5,
      scale: 2,
    }),
    crudeProteinPercent: decimal("crude_protein_percent", {
      precision: 5,
      scale: 2,
    }),
    metabolizableEnergyMcalPerKg: decimal("metabolizable_energy_mcal_per_kg", {
      precision: 6,
      scale: 2,
    }),
    neutralDetergentFiberPercent: decimal("ndf_percent", {
      precision: 5,
      scale: 2,
    }),
    acidDetergentFiberPercent: decimal("adf_percent", {
      precision: 5,
      scale: 2,
    }),
    crudeFatPercent: decimal("crude_fat_percent", { precision: 5, scale: 2 }),
    ashPercent: decimal("ash_percent", { precision: 5, scale: 2 }),
    calciumPercent: decimal("calcium_percent", { precision: 5, scale: 3 }),
    phosphorusPercent: decimal("phosphorus_percent", {
      precision: 5,
      scale: 3,
    }),

    // Quality indicators
    moldCount: integer("mold_count"),
    yeastCount: integer("yeast_count"),
    aflatoxinPpb: decimal("aflatoxin_ppb", { precision: 8, scale: 2 }),

    notes: text("notes"),
    testedByUserId: uuid("tested_by_user_id"),

    ...timestamps,
  },
  (table) => [
    index("feed_lab_analyses_feed_ingredient_id_idx").on(
      table.feedIngredientId
    ),
    index("feed_lab_analyses_sample_date_idx").on(table.sampleDate),
    index("feed_lab_analyses_farm_id_idx").on(table.farmId),
  ]
);

/**
 * Rations - Feed formulations for specific animal groups
 */
export const rations = pgTable(
  "rations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    farmId: uuid("farm_id")
      .notNull()
      .references(() => farms.id, { onDelete: "cascade" }),

    // Basic information
    name: text("name").notNull(),
    description: text("description"),
    rationCode: varchar("ration_code", { length: 50 }),

    // Target group
    targetAnimalGroup: targetAnimalGroupEnum("target_animal_group").notNull(),
    targetProductionLevel: varchar("target_production_level", { length: 100 }), // e.g., "30 liters/day"

    // Nutritional targets
    targetDryMatterIntakeKg: decimal("target_dmi_kg", {
      precision: 6,
      scale: 2,
    }),
    targetCrudeProteinPercent: decimal("target_crude_protein_percent", {
      precision: 5,
      scale: 2,
    }),
    targetEnergyMcalPerKg: decimal("target_energy_mcal_per_kg", {
      precision: 6,
      scale: 2,
    }),
    targetNdfPercent: decimal("target_ndf_percent", { precision: 5, scale: 2 }),

    // Cost
    estimatedCostPerKgDm: decimal("estimated_cost_per_kg_dm", {
      precision: 10,
      scale: 2,
    }),
    estimatedCostPerHead: decimal("estimated_cost_per_head", {
      precision: 10,
      scale: 2,
    }),

    // Formulation
    formulatedByUserId: uuid("formulated_by_user_id"),
    formulationDate: date("formulation_date"),
    effectiveDate: date("effective_date"),
    expirationDate: date("expiration_date"),

    // Status
    status: rationStatusEnum("status").default("draft").notNull(),
    isActive: boolean("is_active").default(false).notNull(),
    version: integer("version").default(1).notNull(),

    notes: text("notes"),

    ...metadata,
    ...timestamps,
  },
  (table) => [
    index("rations_farm_id_idx").on(table.farmId),
    index("rations_target_animal_group_idx").on(table.targetAnimalGroup),
    index("rations_status_idx").on(table.status),
    index("rations_is_active_idx").on(table.isActive),
    check(
      "rations_effective_before_expiration",
      sql`${table.expirationDate} IS NULL OR ${table.effectiveDate} IS NULL OR ${table.expirationDate} > ${table.effectiveDate}`
    ),
  ]
);

/**
 * Ration Ingredients - Components of a ration formula
 */
export const rationIngredients = pgTable(
  "ration_ingredients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    rationId: uuid("ration_id")
      .notNull()
      .references(() => rations.id, { onDelete: "cascade" }),
    feedIngredientId: uuid("feed_ingredient_id")
      .notNull()
      .references(() => feedIngredients.id, { onDelete: "restrict" }),

    // Quantities
    percentageOfDryMatter: decimal("percentage_of_dry_matter", {
      precision: 5,
      scale: 2,
    }).notNull(),
    kgAsFedbasis: decimal("kg_as_fed_basis", { precision: 8, scale: 2 }),
    kgDryMatter: decimal("kg_dry_matter", { precision: 8, scale: 2 }),

    // Mixing instructions
    mixingOrder: integer("mixing_order"), // Sequence for TMR mixer
    mixingDurationSeconds: integer("mixing_duration_seconds"),
    specialInstructions: text("special_instructions"),

    notes: text("notes"),

    ...timestamps,
  },
  (table) => [
    index("ration_ingredients_ration_id_idx").on(table.rationId),
    index("ration_ingredients_feed_ingredient_id_idx").on(
      table.feedIngredientId
    ),
    unique("ration_ingredients_ration_feed_unique").on(
      table.rationId,
      table.feedIngredientId
    ),
    check(
      "ration_ingredients_percentage_valid",
      sql`${table.percentageOfDryMatter} > 0 AND ${table.percentageOfDryMatter} <= 100`
    ),
    check(
      "ration_ingredients_kg_positive",
      sql`${table.kgAsFedbasis} IS NULL OR ${table.kgAsFedbasis} > 0`
    ),
  ]
);

/**
 * TMR Mixing Batches - Total Mixed Ration production records
 */
export const tmrMixingBatches = pgTable(
  "tmr_mixing_batches",
  {
    id: serial("id").primaryKey(),
    farmId: uuid("farm_id")
      .notNull()
      .references(() => farms.id, { onDelete: "cascade" }),
    rationId: uuid("ration_id")
      .notNull()
      .references(() => rations.id, { onDelete: "restrict" }),

    // Batch information
    batchNumber: varchar("batch_number", { length: 100 }).notNull(),
    mixingDate: date("mixing_date").notNull(),
    mixingTime: time("mixing_time"),

    // Equipment and personnel
    mixerWagonId: uuid("mixer_wagon_id"), // Reference to equipment
    mixedByUserId: uuid("mixed_by_user_id").notNull(),

    // Quantities
    targetBatchWeightKg: decimal("target_batch_weight_kg", {
      precision: 10,
      scale: 2,
    }).notNull(),
    actualBatchWeightKg: decimal("actual_batch_weight_kg", {
      precision: 10,
      scale: 2,
    }),
    variancePercent: decimal("variance_percent", { precision: 5, scale: 2 }),

    // Quality control
    mixingDurationMinutes: integer("mixing_duration_minutes"),
    temperatureCelsius: decimal("temperature_celsius", {
      precision: 4,
      scale: 1,
    }),
    visualQualityScore: integer("visual_quality_score"), // 1-10
    notes: text("notes"),

    ...timestamps,
  },
  (table) => [
    index("tmr_mixing_batches_farm_id_idx").on(table.farmId),
    index("tmr_mixing_batches_ration_id_idx").on(table.rationId),
    index("tmr_mixing_batches_mixing_date_idx").on(table.mixingDate),
    unique("tmr_mixing_batches_batch_number_unique").on(
      table.farmId,
      table.batchNumber
    ),
    check(
      "tmr_mixing_batches_weight_positive",
      sql`${table.targetBatchWeightKg} > 0`
    ),
  ]
);

/**
 * Herd Feedings - Group feeding events
 */
export const herdFeedings = pgTable(
  "herd_feedings",
  {
    id: serial("id").primaryKey(),
    farmId: uuid("farm_id")
      .notNull()
      .references(() => farms.id, { onDelete: "cascade" }),
    herdId: uuid("herd_id")
      .notNull()
      .references(() => herds.id, { onDelete: "cascade" }),
    rationId: uuid("ration_id")
      .notNull()
      .references(() => rations.id, { onDelete: "restrict" }),

    // Feeding event
    feedingDate: date("feeding_date").notNull(),
    feedingTime: time("feeding_time"),
    session: varchar("session", { length: 20 }), // morning, afternoon, evening

    // Quantities
    quantityOfferedKg: decimal("quantity_offered_kg", {
      precision: 10,
      scale: 2,
    }).notNull(),
    quantityRefusedKg: decimal("quantity_refused_kg", {
      precision: 10,
      scale: 2,
    }),
    quantityConsumedKg: decimal("quantity_consumed_kg", {
      precision: 10,
      scale: 2,
    }),

    // Location and conditions
    feedBunkId: varchar("feed_bunk_id", { length: 100 }),
    temperatureCelsius: decimal("temperature_celsius", {
      precision: 4,
      scale: 1,
    }),
    weatherConditions: varchar("weather_conditions", { length: 100 }),

    // Cost tracking
    actualCostTotal: decimal("actual_cost_total", {
      precision: 15,
      scale: 2,
    }),
    costPerHead: decimal("cost_per_head", { precision: 10, scale: 2 }),

    // Personnel
    fedByUserId: uuid("fed_by_user_id").notNull(),
    notes: text("notes"),

    ...timestamps,
  },
  (table) => [
    index("herd_feedings_herd_id_idx").on(table.herdId),
    index("herd_feedings_ration_id_idx").on(table.rationId),
    index("herd_feedings_feeding_date_idx").on(table.feedingDate),
    index("herd_feedings_farm_id_date_idx").on(table.farmId, table.feedingDate),
    check(
      "herd_feedings_quantity_offered_positive",
      sql`${table.quantityOfferedKg} > 0`
    ),
    check(
      "herd_feedings_refused_lte_offered",
      sql`${table.quantityRefusedKg} IS NULL OR ${table.quantityRefusedKg} <= ${table.quantityOfferedKg}`
    ),
  ]
);

/**
 * Individual Animal Feedings - For concentrate feeders, special diets
 */
export const individualAnimalFeedings = pgTable(
  "individual_animal_feedings",
  {
    id: serial("id").primaryKey(),
    farmId: uuid("farm_id")
      .notNull()
      .references(() => farms.id, { onDelete: "cascade" }),
    livestockId: uuid("livestock_id")
      .notNull()
      .references(() => livestock.id, { onDelete: "cascade" }),
    feedIngredientId: uuid("feed_ingredient_id")
      .notNull()
      .references(() => feedIngredients.id, { onDelete: "restrict" }),

    // Feeding event
    feedingDate: date("feeding_date").notNull(),
    feedingTime: time("feeding_time"),

    // Quantity
    quantityKg: decimal("quantity_kg", { precision: 8, scale: 2 }).notNull(),

    // Equipment (automated feeder)
    feederDeviceId: varchar("feeder_device_id", { length: 100 }),
    isAutomated: boolean("is_automated").default(false).notNull(),

    // Special diet tracking
    isSpecialDiet: boolean("is_special_diet").default(false).notNull(),
    specialDietReason: text("special_diet_reason"), // medical, performance, etc.

    notes: text("notes"),

    ...timestamps,
  },
  (table) => [
    index("individual_animal_feedings_livestock_id_idx").on(table.livestockId),
    index("individual_animal_feedings_feed_ingredient_id_idx").on(
      table.feedIngredientId
    ),
    index("individual_animal_feedings_feeding_date_idx").on(table.feedingDate),
    check(
      "individual_animal_feedings_quantity_positive",
      sql`${table.quantityKg} > 0`
    ),
  ]
);

/**
 * Feed Efficiency Records - Performance metrics
 */
export const feedEfficiencyRecords = pgTable(
  "feed_efficiency_records",
  {
    id: serial("id").primaryKey(),
    farmId: uuid("farm_id")
      .notNull()
      .references(() => farms.id, { onDelete: "cascade" }),
    herdId: uuid("herd_id").references(() => herds.id, {
      onDelete: "cascade",
    }),
    livestockId: uuid("livestock_id").references(() => livestock.id, {
      onDelete: "cascade",
    }),

    // Time period
    periodStartDate: date("period_start_date").notNull(),
    periodEndDate: date("period_end_date").notNull(),

    // Feed intake
    totalFeedIntakeKg: decimal("total_feed_intake_kg", {
      precision: 10,
      scale: 2,
    }).notNull(),
    averageDailyIntakeKg: decimal("average_daily_intake_kg", {
      precision: 8,
      scale: 2,
    }),

    // Production
    totalMilkProducedLiters: decimal("total_milk_produced_liters", {
      precision: 10,
      scale: 2,
    }),
    totalWeightGainKg: decimal("total_weight_gain_kg", {
      precision: 8,
      scale: 2,
    }),

    // Efficiency metrics
    feedConversionRatio: decimal("feed_conversion_ratio", {
      precision: 6,
      scale: 2,
    }), // kg feed / kg gain
    milkPerKgFeed: decimal("milk_per_kg_feed", { precision: 6, scale: 2 }),
    incomeOverFeedCost: decimal("income_over_feed_cost", {
      precision: 15,
      scale: 2,
    }), // IOFC

    // Cost
    totalFeedCost: decimal("total_feed_cost", { precision: 15, scale: 2 }),
    feedCostPerLiterMilk: decimal("feed_cost_per_liter_milk", {
      precision: 8,
      scale: 2,
    }),
    feedCostPerKgGain: decimal("feed_cost_per_kg_gain", {
      precision: 8,
      scale: 2,
    }),

    calculatedByUserId: uuid("calculated_by_user_id"),
    notes: text("notes"),

    ...timestamps,
  },
  (table) => [
    index("feed_efficiency_records_farm_id_idx").on(table.farmId),
    index("feed_efficiency_records_herd_id_idx").on(table.herdId),
    index("feed_efficiency_records_livestock_id_idx").on(table.livestockId),
    index("feed_efficiency_records_period_start_idx").on(table.periodStartDate),
    check(
      "feed_efficiency_records_period_valid",
      sql`${table.periodEndDate} > ${table.periodStartDate}`
    ),
    check(
      "feed_efficiency_records_intake_positive",
      sql`${table.totalFeedIntakeKg} > 0`
    ),
  ]
);

// ============================================================================
// RELATIONS
// ============================================================================

export const feedIngredientsRelations = relations(
  feedIngredients,
  ({ one, many }) => ({
    farm: one(farms, {
      fields: [feedIngredients.farmId],
      references: [farms.id],
    }),
    labAnalyses: many(feedLabAnalyses),
    rationIngredients: many(rationIngredients),
    individualFeedings: many(individualAnimalFeedings),
  })
);

export const feedLabAnalysesRelations = relations(
  feedLabAnalyses,
  ({ one }) => ({
    feedIngredient: one(feedIngredients, {
      fields: [feedLabAnalyses.feedIngredientId],
      references: [feedIngredients.id],
    }),
    farm: one(farms, {
      fields: [feedLabAnalyses.farmId],
      references: [farms.id],
    }),
  })
);

export const rationsRelations = relations(rations, ({ one, many }) => ({
  farm: one(farms, {
    fields: [rations.farmId],
    references: [farms.id],
  }),
  ingredients: many(rationIngredients),
  tmrBatches: many(tmrMixingBatches),
  herdFeedings: many(herdFeedings),
}));

export const rationIngredientsRelations = relations(
  rationIngredients,
  ({ one }) => ({
    ration: one(rations, {
      fields: [rationIngredients.rationId],
      references: [rations.id],
    }),
    feedIngredient: one(feedIngredients, {
      fields: [rationIngredients.feedIngredientId],
      references: [feedIngredients.id],
    }),
  })
);

export const tmrMixingBatchesRelations = relations(
  tmrMixingBatches,
  ({ one }) => ({
    farm: one(farms, {
      fields: [tmrMixingBatches.farmId],
      references: [farms.id],
    }),
    ration: one(rations, {
      fields: [tmrMixingBatches.rationId],
      references: [rations.id],
    }),
  })
);

export const herdFeedingsRelations = relations(herdFeedings, ({ one }) => ({
  farm: one(farms, {
    fields: [herdFeedings.farmId],
    references: [farms.id],
  }),
  herd: one(herds, {
    fields: [herdFeedings.herdId],
    references: [herds.id],
  }),
  ration: one(rations, {
    fields: [herdFeedings.rationId],
    references: [rations.id],
  }),
}));

export const individualAnimalFeedingsRelations = relations(
  individualAnimalFeedings,
  ({ one }) => ({
    farm: one(farms, {
      fields: [individualAnimalFeedings.farmId],
      references: [farms.id],
    }),
    livestock: one(livestock, {
      fields: [individualAnimalFeedings.livestockId],
      references: [livestock.id],
    }),
    feedIngredient: one(feedIngredients, {
      fields: [individualAnimalFeedings.feedIngredientId],
      references: [feedIngredients.id],
    }),
  })
);

export const feedEfficiencyRecordsRelations = relations(
  feedEfficiencyRecords,
  ({ one }) => ({
    farm: one(farms, {
      fields: [feedEfficiencyRecords.farmId],
      references: [farms.id],
    }),
    herd: one(herds, {
      fields: [feedEfficiencyRecords.herdId],
      references: [herds.id],
    }),
    livestock: one(livestock, {
      fields: [feedEfficiencyRecords.livestockId],
      references: [livestock.id],
    }),
  })
);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type FeedIngredientRow = typeof feedIngredients.$inferSelect;
export type NewFeedIngredientRow = typeof feedIngredients.$inferInsert;
export type FeedLabAnalysisRow = typeof feedLabAnalyses.$inferSelect;
export type NewFeedLabAnalysisRow = typeof feedLabAnalyses.$inferInsert;
export type RationRow = typeof rations.$inferSelect;
export type NewRationRow = typeof rations.$inferInsert;
export type RationIngredientRow = typeof rationIngredients.$inferSelect;
export type NewRationIngredientRow = typeof rationIngredients.$inferInsert;
export type TmrMixingBatchRow = typeof tmrMixingBatches.$inferSelect;
export type NewTmrMixingBatchRow = typeof tmrMixingBatches.$inferInsert;
export type HerdFeedingRow = typeof herdFeedings.$inferSelect;
export type NewHerdFeedingRow = typeof herdFeedings.$inferInsert;
export type IndividualAnimalFeedingRow =
  typeof individualAnimalFeedings.$inferSelect;
export type NewIndividualAnimalFeedingRow =
  typeof individualAnimalFeedings.$inferInsert;
export type FeedEfficiencyRecordRow = typeof feedEfficiencyRecords.$inferSelect;
export type NewFeedEfficiencyRecordRow =
  typeof feedEfficiencyRecords.$inferInsert;

export type FeedType = (typeof feedTypeEnum.enumValues)[number];
export type FeedForm = (typeof feedFormEnum.enumValues)[number];
export type UnitOfMeasure = (typeof unitOfMeasureEnum.enumValues)[number];
export type RationStatus = (typeof rationStatusEnum.enumValues)[number];
export type TargetAnimalGroup =
  (typeof targetAnimalGroupEnum.enumValues)[number];
