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
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { farms } from "./farms";
import { metadata, timestamps } from "./helpers";
import {
  bpomProductRegistrations,
  halalSlaughterProcedures,
} from "./indonesian-compliance";
import { livestockDisposals } from "./livestock";
import { premises } from "./traceability";

// ============================================================================
// ENUMS
// ============================================================================

export const cutCategoryEnum = pgEnum("cut_category", [
  "primal",
  "subprimal",
  "retail",
  "offal",
  "byproduct",
]);

export const meatGradeEnum = pgEnum("meat_grade", [
  "prime",
  "choice",
  "select",
  "standard",
  "commercial",
  "utility",
  "cutter",
  "canner",
  "ungraded",
]);

export const storageTypeEnum = pgEnum("storage_type", [
  "fresh",
  "frozen",
  "aged_dry",
  "aged_wet",
  "cured",
  "smoked",
]);

export const packagingTypeEnum = pgEnum("packaging_type", [
  "vacuum_sealed",
  "cryovac",
  "butcher_paper",
  "shrink_wrap",
  "tray_wrap",
  "foam_tray",
  "hanging",
  "bulk",
]);

export const processingStatusEnum = pgEnum("processing_status", [
  "pending",
  "in_progress",
  "completed",
  "on_hold",
  "failed",
]);

export const meatSaleStatusEnum = pgEnum("meat_sale_status", [
  "available",
  "reserved",
  "sold",
  "returned",
  "disposed",
]);

export const meatPaymentStatusEnum = pgEnum("meat_payment_status", [
  "pending",
  "partial",
  "paid",
  "refunded",
  "disputed",
]);

export const deliveryMethodEnum = pgEnum("delivery_method", [
  "pickup",
  "local_delivery",
  "shipping",
  "wholesale_transport",
]);

export const customerTypeEnum = pgEnum("customer_type", [
  "retail",
  "wholesale",
  "restaurant",
  "butcher_shop",
  "farmers_market",
  "online",
]);

export const sideDesignationEnum = pgEnum("side_designation", [
  "left_side",
  "right_side",
  "forequarter",
  "hindquarter",
]);

export const processTypeEnum = pgEnum("process_type", [
  "grinding",
  "curing",
  "smoking",
  "sausage_making",
  "jerky",
  "corning",
  "aging",
  "tenderizing",
]);

export const cureMethodEnum = pgEnum("cure_method", [
  "dry_cure",
  "wet_brine",
  "injection",
  "combination",
]);

export const grindSizeEnum = pgEnum("grind_size", [
  "coarse", // 9.5mm plate
  "medium", // 6.4mm plate
  "fine", // 3.2mm plate
  "extra_fine", // 1.6mm plate
]);

export const testTypeEnum = pgEnum("test_type", [
  "ph",
  "bacterial_count",
  "e_coli",
  "salmonella",
  "listeria",
  "composition",
  "moisture",
  "fat_content",
  "protein_content",
]);

export const adjustmentTypeEnum = pgEnum("adjustment_type", [
  "shrinkage",
  "spoilage",
  "sampling",
  "theft",
  "donation",
  "employee_purchase",
  "trim_loss",
]);

// ============================================================================
// TABLES
// ============================================================================

/**
 * Carcasses - Individual carcass records with USDA grading
 */
export const carcasses = pgTable(
  "carcasses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    farmId: uuid("farm_id")
      .notNull()
      .references(() => farms.id, { onDelete: "cascade" }),
    livestockDisposalId: integer("livestock_disposal_id")
      .notNull()
      .references(() => livestockDisposals.id, { onDelete: "cascade" }),

    // Slaughter details
    slaughterDate: date("slaughter_date").notNull(),
    slaughterTime: time("slaughter_time"),
    carcassTag: varchar("carcass_tag", { length: 100 }).notNull(),
    slaughterFacilityId: uuid("slaughter_facility_id").references(
      () => premises.id,
      { onDelete: "set null" }
    ),

    // Weights
    liveWeight: decimal("live_weight", { precision: 8, scale: 2 }),
    hotCarcassWeightKg: decimal("hot_carcass_weight_kg", {
      precision: 8,
      scale: 2,
    }).notNull(),
    coldCarcassWeightKg: decimal("cold_carcass_weight_kg", {
      precision: 8,
      scale: 2,
    }),
    shrinkagePercent: decimal("shrinkage_percent", {
      precision: 5,
      scale: 2,
    }), // HCW to CCW loss
    dressPercent: decimal("dress_percent", { precision: 5, scale: 2 }), // Carcass/live weight

    // USDA Grading
    gradeDate: date("grade_date"),
    qualityGrade: meatGradeEnum("quality_grade"),
    yieldGrade: integer("yield_grade"), // 1-5 scale (1 is leanest)
    marblingScore: varchar("marbling_score", { length: 50 }), // Slight, Small, Modest, etc.
    ribeyeAreaSqCm: decimal("ribeye_area_sq_cm", { precision: 6, scale: 2 }),
    backfatThicknessMm: decimal("backfat_thickness_mm", {
      precision: 5,
      scale: 2,
    }),
    kidneyFatPercent: decimal("kidney_fat_percent", { precision: 4, scale: 2 }),
    maturityScore: varchar("maturity_score", { length: 20 }), // A, B, C, D, E

    // Quality measurements
    phLevel: decimal("ph_level", { precision: 3, scale: 2 }), // 5.4-5.8 ideal
    colorScore: varchar("color_score", { length: 50 }), // L*a*b* color space
    temperatureAtCoolingCelsius: decimal("temperature_at_cooling_celsius", {
      precision: 4,
      scale: 1,
    }),
    chillingStartTime: timestamp("chilling_start_time"),
    chillingEndTime: timestamp("chilling_end_time"),

    // Inspection
    inspectorName: varchar("inspector_name", { length: 255 }),
    inspectorCredentials: varchar("inspector_credentials", { length: 100 }),
    usdaStampNumber: varchar("usda_stamp_number", { length: 100 }),
    antemortemPassed: boolean("antemortem_passed").default(true).notNull(),
    postmortemPassed: boolean("postmortem_passed").default(true).notNull(),
    inspectionNotes: text("inspection_notes"),
    condemnedParts:
      json("condemned_parts").$type<
        Array<{
          part: string;
          reason: string;
          weightKg: number;
        }>
      >(),

    // Aging
    agingType: storageTypeEnum("aging_type"), // aged_dry, aged_wet, fresh
    agingStartDate: date("aging_start_date"),
    agingTargetDays: integer("aging_target_days"),
    agingCompletedDate: date("aging_completed_date"),
    agingRoomId: uuid("aging_room_id"), // Reference to aging facility

    // Processing facility
    hangingDays: integer("hanging_days"),
    hangingLocation: varchar("hanging_location", { length: 255 }),

    notes: text("notes"),

    // Halal slaughter tracking
    halalCertified: boolean("halal_certified").default(false).notNull(),
    halalSlaughterProcedureId: integer(
      "halal_slaughter_procedure_id"
    ).references(() => halalSlaughterProcedures.id, { onDelete: "set null" }),
    halalSupervisorName: varchar("halal_supervisor_name", { length: 255 }),
    halalSupervisorCertificate: varchar("halal_supervisor_certificate", {
      length: 100,
    }),

    ...metadata,
    ...timestamps,
  },
  (table) => [
    index("carcasses_farm_id_idx").on(table.farmId),
    index("carcasses_livestock_disposal_id_idx").on(table.livestockDisposalId),
    index("carcasses_slaughter_date_idx").on(table.slaughterDate),
    index("carcasses_carcass_tag_idx").on(table.carcassTag),
    index("carcasses_slaughter_facility_idx").on(table.slaughterFacilityId),
    index("carcasses_quality_grade_idx").on(table.qualityGrade),
    index("carcasses_halal_certified_idx").on(table.halalCertified),
    index("carcasses_halal_procedure_idx").on(table.halalSlaughterProcedureId),
    unique("carcasses_farm_tag_unique").on(table.farmId, table.carcassTag),
    check(
      "carcasses_hot_weight_positive",
      sql`${table.hotCarcassWeightKg} > 0`
    ),
    check(
      "carcasses_cold_lte_hot",
      sql`${table.coldCarcassWeightKg} IS NULL OR ${table.coldCarcassWeightKg} <= ${table.hotCarcassWeightKg}`
    ),
    check(
      "carcasses_dress_percent_range",
      sql`${table.dressPercent} IS NULL OR (${table.dressPercent} >= 40 AND ${table.dressPercent} <= 70)`
    ),
    check(
      "carcasses_yield_grade_range",
      sql`${table.yieldGrade} IS NULL OR (${table.yieldGrade} >= 1 AND ${table.yieldGrade} <= 5)`
    ),
    check(
      "carcasses_ph_range",
      sql`${table.phLevel} IS NULL OR (${table.phLevel} >= 5.0 AND ${table.phLevel} <= 7.0)`
    ),
  ]
);

/**
 * Carcass Sides - Track left/right halves and quarters
 */
export const carcassSides = pgTable(
  "carcass_sides",
  {
    id: serial("id").primaryKey(),
    carcassId: uuid("carcass_id")
      .notNull()
      .references(() => carcasses.id, { onDelete: "cascade" }),
    sideDesignation: sideDesignationEnum("side_designation").notNull(),

    weightKg: decimal("weight_kg", { precision: 8, scale: 2 }).notNull(),
    ribeyeAreaSqCm: decimal("ribeye_area_sq_cm", { precision: 6, scale: 2 }),
    backfatThicknessMm: decimal("backfat_thickness_mm", {
      precision: 5,
      scale: 2,
    }),

    // Individual side grading (sometimes done)
    qualityGrade: meatGradeEnum("quality_grade"),
    yieldGrade: integer("yield_grade"),

    splitDate: date("split_date").notNull(),
    splitByUserId: uuid("split_by_user_id"),
    notes: text("notes"),

    ...timestamps,
  },
  (table) => [
    index("carcass_sides_carcass_id_idx").on(table.carcassId),
    unique("carcass_sides_carcass_designation_unique").on(
      table.carcassId,
      table.sideDesignation
    ),
    check("carcass_sides_weight_positive", sql`${table.weightKg} > 0`),
    check(
      "carcass_sides_yield_grade_range",
      sql`${table.yieldGrade} IS NULL OR (${table.yieldGrade} >= 1 AND ${table.yieldGrade} <= 5)`
    ),
  ]
);

/**
 * Aging Logs - Daily tracking during dry aging
 */
export const agingLogs = pgTable(
  "aging_logs",
  {
    id: serial("id").primaryKey(),
    carcassId: uuid("carcass_id")
      .notNull()
      .references(() => carcasses.id, { onDelete: "cascade" }),

    logDate: date("log_date").notNull(),
    dayNumber: integer("day_number").notNull(), // Day 1, 2, 3, etc.

    weightKg: decimal("weight_kg", { precision: 8, scale: 2 }).notNull(),
    weightLossPercent: decimal("weight_loss_percent", {
      precision: 5,
      scale: 2,
    }),

    temperatureCelsius: decimal("temperature_celsius", {
      precision: 4,
      scale: 1,
    }).notNull(),
    humidityPercent: integer("humidity_percent").notNull(),

    visualInspection: text("visual_inspection"),
    moldDevelopment: text("mold_development"), // Desired for dry aging
    trimRequired: boolean("trim_required").default(false).notNull(),

    recordedByUserId: uuid("recorded_by_user_id").notNull(),
    notes: text("notes"),

    ...timestamps,
  },
  (table) => [
    index("aging_logs_carcass_id_idx").on(table.carcassId),
    index("aging_logs_log_date_idx").on(table.logDate),
    unique("aging_logs_carcass_date_unique").on(table.carcassId, table.logDate),
    check("aging_logs_weight_positive", sql`${table.weightKg} > 0`),
    check(
      "aging_logs_temp_range",
      sql`${table.temperatureCelsius} >= -5 AND ${table.temperatureCelsius} <= 10`
    ),
    check(
      "aging_logs_humidity_range",
      sql`${table.humidityPercent} >= 0 AND ${table.humidityPercent} <= 100`
    ),
  ]
);

/**
 * Meat Cuts - Individual cuts from carcasses
 */
export const meatCuts = pgTable(
  "meat_cuts",
  {
    id: serial("id").primaryKey(),
    carcassId: uuid("carcass_id")
      .notNull()
      .references(() => carcasses.id, { onDelete: "cascade" }),
    farmId: uuid("farm_id")
      .notNull()
      .references(() => farms.id, { onDelete: "cascade" }),

    // Cut identification
    cutName: varchar("cut_name", { length: 255 }).notNull(),
    cutCategory: cutCategoryEnum("cut_category").notNull(),
    primalCut: varchar("primal_cut", { length: 100 }), // Chuck, rib, loin, round, etc.
    subprimalCut: varchar("subprimal_cut", { length: 100 }),

    // Cut details
    cutDate: date("cut_date").notNull(),
    cutTime: time("cut_time"),
    weightKg: decimal("weight_kg", { precision: 8, scale: 3 }).notNull(),
    quantity: integer("quantity").default(1).notNull(),
    unitWeightKg: decimal("unit_weight_kg", { precision: 8, scale: 3 }),

    // Physical characteristics
    thicknessCm: decimal("thickness_cm", { precision: 5, scale: 2 }), // For steaks
    isBoneIn: boolean("is_bone_in").default(false).notNull(),

    // Traceability
    batchCode: varchar("batch_code", { length: 100 }).notNull(),
    lotNumber: varchar("lot_number", { length: 100 }),
    labelBarcode: varchar("label_barcode", { length: 100 }),

    // Packaging
    packagingType: packagingTypeEnum("packaging_type")
      .default("vacuum_sealed")
      .notNull(),
    packageDate: date("package_date"),
    packagedByUserId: uuid("packaged_by_user_id"),

    // Storage
    storageType: storageTypeEnum("storage_type").default("fresh").notNull(),
    storageLocation: varchar("storage_location", { length: 255 }),
    expiryDate: date("expiry_date"),
    freezeDate: date("freeze_date"),
    currentTemperatureCelsius: decimal("current_temperature_celsius", {
      precision: 4,
      scale: 1,
    }),

    // Pricing
    wholesalePricePerKg: decimal("wholesale_price_per_kg", {
      precision: 10,
      scale: 2,
    }),
    retailPricePerKg: decimal("retail_price_per_kg", {
      precision: 10,
      scale: 2,
    }),

    // Status tracking
    status: meatSaleStatusEnum("status").default("available").notNull(),
    reservedFor: varchar("reserved_for", { length: 255 }),
    reservedDate: date("reserved_date"),

    cutByUserId: uuid("cut_by_user_id"),
    notes: text("notes"),

    ...metadata,
    ...timestamps,
  },
  (table) => [
    index("meat_cuts_carcass_id_idx").on(table.carcassId),
    index("meat_cuts_farm_id_idx").on(table.farmId),
    index("meat_cuts_batch_code_idx").on(table.batchCode),
    index("meat_cuts_status_idx").on(table.status),
    index("meat_cuts_expiry_date_idx").on(table.expiryDate),
    index("meat_cuts_cut_category_idx").on(table.cutCategory),
    index("meat_cuts_storage_type_idx").on(table.storageType),
    check("meat_cuts_weight_positive", sql`${table.weightKg} > 0`),
    check("meat_cuts_quantity_positive", sql`${table.quantity} > 0`),
    check(
      "meat_cuts_wholesale_price_positive",
      sql`${table.wholesalePricePerKg} IS NULL OR ${table.wholesalePricePerKg} >= 0`
    ),
    check(
      "meat_cuts_retail_price_positive",
      sql`${table.retailPricePerKg} IS NULL OR ${table.retailPricePerKg} >= 0`
    ),
  ]
);

/**
 * Meat Processing Batches - Value-added processing (sausage, cured meats, etc.)
 */
export const meatProcessingBatches = pgTable(
  "meat_processing_batches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    farmId: uuid("farm_id")
      .notNull()
      .references(() => farms.id, { onDelete: "cascade" }),

    batchCode: varchar("batch_code", { length: 100 }).notNull().unique(),
    processType: processTypeEnum("process_type").notNull(),
    status: processingStatusEnum("status").default("pending").notNull(),

    startDate: date("start_date").notNull(),
    startTime: time("start_time"),
    endDate: date("end_date"),
    endTime: time("end_time"),

    // Input tracking (total from junction table)
    totalInputWeightKg: decimal("total_input_weight_kg", {
      precision: 10,
      scale: 3,
    }).notNull(),

    // Output
    outputProductName: varchar("output_product_name", {
      length: 255,
    }).notNull(),
    outputWeightKg: decimal("output_weight_kg", { precision: 10, scale: 3 }),
    outputQuantity: integer("output_quantity"),
    yieldPercent: decimal("yield_percent", { precision: 5, scale: 2 }),

    // Recipe/additives
    recipe: json("recipe").$type<{
      ingredients?: Array<{
        name: string;
        quantityGrams: number;
        unit: string;
      }>;
      instructions?: string;
    }>(),

    // Personnel
    processedByUserId: uuid("processed_by_user_id").notNull(),
    qualityCheckByUserId: uuid("quality_check_by_user_id"),
    qualityCheckPassed: boolean("quality_check_passed"),
    qualityNotes: text("quality_notes"),

    notes: text("notes"),

    // BPOM registration
    bpomRegistrationId: integer("bpom_registration_id").references(
      () => bpomProductRegistrations.id,
      { onDelete: "set null" }
    ),
    bpomBatchNumber: varchar("bpom_batch_number", { length: 100 }),

    ...metadata,
    ...timestamps,
  },
  (table) => [
    index("meat_processing_batches_farm_id_idx").on(table.farmId),
    index("meat_processing_batches_batch_code_idx").on(table.batchCode),
    index("meat_processing_batches_status_idx").on(table.status),
    index("meat_processing_batches_process_type_idx").on(table.processType),
    index("meat_processing_batches_start_date_idx").on(table.startDate),
    index("meat_processing_batches_bpom_registration_idx").on(
      table.bpomRegistrationId
    ),
    check(
      "meat_processing_batches_input_weight_positive",
      sql`${table.totalInputWeightKg} > 0`
    ),
    check(
      "meat_processing_batches_output_weight_positive",
      sql`${table.outputWeightKg} IS NULL OR ${table.outputWeightKg} > 0`
    ),
  ]
);

/**
 * Processing Batch Inputs - Junction table linking batches to input cuts
 * Replaces the JSON array for proper traceability
 */
export const processingBatchInputs = pgTable(
  "processing_batch_inputs",
  {
    id: serial("id").primaryKey(),
    processingBatchId: uuid("processing_batch_id")
      .notNull()
      .references(() => meatProcessingBatches.id, { onDelete: "cascade" }),
    meatCutId: integer("meat_cut_id")
      .notNull()
      .references(() => meatCuts.id, { onDelete: "restrict" }),

    weightUsedKg: decimal("weight_used_kg", {
      precision: 10,
      scale: 3,
    }).notNull(),
    addedAt: timestamp("added_at").defaultNow().notNull(),

    ...timestamps,
  },
  (table) => [
    index("processing_batch_inputs_batch_idx").on(table.processingBatchId),
    index("processing_batch_inputs_cut_idx").on(table.meatCutId),
    unique("processing_batch_inputs_batch_cut_unique").on(
      table.processingBatchId,
      table.meatCutId
    ),
    check(
      "processing_batch_inputs_weight_positive",
      sql`${table.weightUsedKg} > 0`
    ),
  ]
);

/**
 * Curing Batches - Detailed curing process tracking
 */
export const curingBatches = pgTable(
  "curing_batches",
  {
    id: serial("id").primaryKey(),
    processingBatchId: uuid("processing_batch_id")
      .notNull()
      .references(() => meatProcessingBatches.id, { onDelete: "cascade" }),

    cureMethod: cureMethodEnum("cure_method").notNull(),
    cureType: varchar("cure_type", { length: 100 }).notNull(), // Prague Powder #1, #2, etc.

    // Cure composition
    saltPercent: decimal("salt_percent", { precision: 5, scale: 2 }),
    sugarPercent: decimal("sugar_percent", { precision: 5, scale: 2 }),
    nitriteNitratePpm: decimal("nitrite_nitrate_ppm", {
      precision: 7,
      scale: 2,
    }), // FDA limit 200ppm
    otherAdditives:
      json("other_additives").$type<
        Array<{
          name: string;
          percentOrPpm: number;
        }>
      >(),

    // Process parameters
    cureStartDate: date("cure_start_date").notNull(),
    cureEndDate: date("cure_end_date"),
    curingDurationDays: integer("curing_duration_days"),
    curingTemperatureCelsius: decimal("curing_temperature_celsius", {
      precision: 4,
      scale: 1,
    }),
    curingHumidityPercent: integer("curing_humidity_percent"),

    // For wet brine
    brineConcentrationPercent: decimal("brine_concentration_percent", {
      precision: 5,
      scale: 2,
    }),
    brineVolumeLiters: decimal("brine_volume_liters", {
      precision: 8,
      scale: 2,
    }),

    // Equilibrium curing
    targetWaterActivityAw: decimal("target_water_activity_aw", {
      precision: 4,
      scale: 3,
    }), // <0.95 for shelf-stable

    notes: text("notes"),

    ...timestamps,
  },
  (table) => [
    index("curing_batches_processing_batch_idx").on(table.processingBatchId),
    check(
      "curing_batches_nitrite_limit",
      sql`${table.nitriteNitratePpm} IS NULL OR ${table.nitriteNitratePpm} <= 200`
    ),
    check(
      "curing_batches_water_activity_range",
      sql`${table.targetWaterActivityAw} IS NULL OR (${table.targetWaterActivityAw} >= 0 AND ${table.targetWaterActivityAw} <= 1)`
    ),
  ]
);

/**
 * Smoking Batches - Smoking process tracking
 */
export const smokingBatches = pgTable(
  "smoking_batches",
  {
    id: serial("id").primaryKey(),
    processingBatchId: uuid("processing_batch_id")
      .notNull()
      .references(() => meatProcessingBatches.id, { onDelete: "cascade" }),

    woodType: varchar("wood_type", { length: 100 }).notNull(), // Hickory, applewood, mesquite, etc.
    smokeStartTime: timestamp("smoke_start_time").notNull(),
    smokeEndTime: timestamp("smoke_end_time"),
    smokeDurationMinutes: integer("smoke_duration_minutes"),

    smokeTemperatureCelsius: decimal("smoke_temperature_celsius", {
      precision: 5,
      scale: 1,
    }).notNull(),
    internalTargetTempCelsius: decimal("internal_target_temp_celsius", {
      precision: 4,
      scale: 1,
    }).notNull(),
    internalActualTempCelsius: decimal("internal_actual_temp_celsius", {
      precision: 4,
      scale: 1,
    }),

    smokeColor: varchar("smoke_color", { length: 50 }), // Light, medium, dark

    notes: text("notes"),

    ...timestamps,
  },
  (table) => [
    index("smoking_batches_processing_batch_idx").on(table.processingBatchId),
  ]
);

/**
 * Grinder Batches - Ground meat production with composition tracking
 */
export const grinderBatches = pgTable(
  "grinder_batches",
  {
    id: serial("id").primaryKey(),
    processingBatchId: uuid("processing_batch_id")
      .notNull()
      .references(() => meatProcessingBatches.id, { onDelete: "cascade" }),

    grindSize: grindSizeEnum("grind_size").notNull(),
    targetFatPercent: decimal("target_fat_percent", {
      precision: 4,
      scale: 2,
    }).notNull(),
    actualFatPercent: decimal("actual_fat_percent", {
      precision: 4,
      scale: 2,
    }),

    leanSourceCuts: json("lean_source_cuts").$type<string[]>(),
    fatSourceCuts: json("fat_source_cuts").$type<string[]>(),

    grinderTemperatureCelsius: decimal("grinder_temperature_celsius", {
      precision: 4,
      scale: 1,
    }),
    grindDate: date("grind_date").notNull(),

    // Testing
    bacterialTestDate: date("bacterial_test_date"),
    bacterialCountCfu: integer("bacterial_count_cfu"), // Colony forming units
    testPassed: boolean("test_passed"),

    notes: text("notes"),

    ...timestamps,
  },
  (table) => [
    index("grinder_batches_processing_batch_idx").on(table.processingBatchId),
    index("grinder_batches_grind_date_idx").on(table.grindDate),
    check(
      "grinder_batches_target_fat_range",
      sql`${table.targetFatPercent} >= 0 AND ${table.targetFatPercent} <= 100`
    ),
  ]
);

/**
 * Quality Tests - Pathogen testing and composition analysis
 */
export const qualityTests = pgTable(
  "quality_tests",
  {
    id: serial("id").primaryKey(),
    farmId: uuid("farm_id")
      .notNull()
      .references(() => farms.id, { onDelete: "cascade" }),

    // Test subject (one of these will be filled)
    carcassId: uuid("carcass_id").references(() => carcasses.id, {
      onDelete: "set null",
    }),
    meatCutId: integer("meat_cut_id").references(() => meatCuts.id, {
      onDelete: "set null",
    }),
    processingBatchId: uuid("processing_batch_id").references(
      () => meatProcessingBatches.id,
      { onDelete: "set null" }
    ),

    testType: testTypeEnum("test_type").notNull(),
    testDate: date("test_date").notNull(),
    testTime: time("test_time"),

    // Test results
    result: varchar("result", { length: 100 }), // Positive, negative, value
    numericResult: decimal("numeric_result", { precision: 10, scale: 4 }),
    unitOfMeasure: varchar("unit_of_measure", { length: 50 }),
    isPassed: boolean("is_passed"),

    // Lab information
    laboratoryName: varchar("laboratory_name", { length: 255 }),
    testMethodology: varchar("test_methodology", { length: 255 }),
    certificationNumber: varchar("certification_number", { length: 100 }),

    testedByUserId: uuid("tested_by_user_id"),
    notes: text("notes"),

    ...timestamps,
  },
  (table) => [
    index("quality_tests_farm_id_idx").on(table.farmId),
    index("quality_tests_carcass_id_idx").on(table.carcassId),
    index("quality_tests_meat_cut_id_idx").on(table.meatCutId),
    index("quality_tests_processing_batch_id_idx").on(table.processingBatchId),
    index("quality_tests_test_type_idx").on(table.testType),
    index("quality_tests_test_date_idx").on(table.testDate),
  ]
);

/**
 * Temperature Logs - Cold chain monitoring for food safety
 */
export const temperatureLogs = pgTable(
  "temperature_logs",
  {
    id: serial("id").primaryKey(),
    farmId: uuid("farm_id")
      .notNull()
      .references(() => farms.id, { onDelete: "cascade" }),

    storageLocation: varchar("storage_location", { length: 255 }).notNull(),
    temperatureCelsius: decimal("temperature_celsius", {
      precision: 4,
      scale: 1,
    }).notNull(),
    humidityPercent: integer("humidity_percent"),

    recordedAt: timestamp("recorded_at").defaultNow().notNull(),
    deviceId: varchar("device_id", { length: 100 }),
    isAutomated: boolean("is_automated").default(false).notNull(),

    isOutOfRange: boolean("is_out_of_range").default(false).notNull(),
    alertSent: boolean("alert_sent").default(false).notNull(),

    recordedByUserId: uuid("recorded_by_user_id"),
    notes: text("notes"),

    ...timestamps,
  },
  (table) => [
    index("temperature_logs_farm_id_idx").on(table.farmId),
    index("temperature_logs_location_idx").on(table.storageLocation),
    index("temperature_logs_recorded_at_idx").on(table.recordedAt),
    index("temperature_logs_out_of_range_idx").on(table.isOutOfRange),
  ]
);

/**
 * Product Labels - Label content for regulatory compliance
 */
export const productLabels = pgTable(
  "product_labels",
  {
    id: serial("id").primaryKey(),
    meatCutId: integer("meat_cut_id")
      .notNull()
      .references(() => meatCuts.id, { onDelete: "cascade" }),

    labelPrintedDate: date("label_printed_date").notNull(),
    labelBarcode: varchar("label_barcode", { length: 100 }),

    // Required label information
    productName: varchar("product_name", { length: 255 }).notNull(),
    ingredients: json("ingredients").$type<string[]>(),
    allergenWarnings: json("allergen_warnings").$type<string[]>(),

    // Nutritional information (per 100g)
    caloriesKcal: integer("calories_kcal"),
    totalFatGrams: decimal("total_fat_grams", { precision: 5, scale: 2 }),
    saturatedFatGrams: decimal("saturated_fat_grams", {
      precision: 5,
      scale: 2,
    }),
    proteinGrams: decimal("protein_grams", { precision: 5, scale: 2 }),
    sodiumMg: decimal("sodium_mg", { precision: 6, scale: 2 }),

    // Safety information
    safeHandlingInstructions: text("safe_handling_instructions"),
    cookingInstructions: text("cooking_instructions"),
    storageInstructions: text("storage_instructions"),

    packDate: date("pack_date").notNull(),
    useByDate: date("use_by_date"),
    sellByDate: date("sell_by_date"),

    netWeightKg: decimal("net_weight_kg", { precision: 8, scale: 3 }).notNull(),
    producerName: varchar("producer_name", { length: 255 }),
    producerAddress: text("producer_address"),

    usdaInspectionLegend: varchar("usda_inspection_legend", { length: 255 }),

    ...timestamps,
  },
  (table) => [
    index("product_labels_meat_cut_id_idx").on(table.meatCutId),
    index("product_labels_barcode_idx").on(table.labelBarcode),
    check("product_labels_net_weight_positive", sql`${table.netWeightKg} > 0`),
  ]
);

/**
 * Meat Sales - Sales transactions with tax and payment tracking
 */
export const meatSales = pgTable(
  "meat_sales",
  {
    id: serial("id").primaryKey(),
    farmId: uuid("farm_id")
      .notNull()
      .references(() => farms.id, { onDelete: "cascade" }),

    // Product reference (one of these)
    meatCutId: integer("meat_cut_id").references(() => meatCuts.id, {
      onDelete: "set null",
    }),
    processingBatchId: uuid("processing_batch_id").references(
      () => meatProcessingBatches.id,
      { onDelete: "set null" }
    ),

    // Sale details
    saleDate: date("sale_date").notNull(),
    saleTime: time("sale_time"),
    quantityKg: decimal("quantity_kg", { precision: 10, scale: 3 }).notNull(),
    pricePerKg: decimal("price_per_kg", { precision: 12, scale: 2 }).notNull(),
    subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),

    // Tax
    taxPercent: decimal("tax_percent", { precision: 5, scale: 2 }),
    taxAmount: decimal("tax_amount", { precision: 12, scale: 2 }),

    // Discounts
    discountPercent: decimal("discount_percent", { precision: 5, scale: 2 }),
    discountAmount: decimal("discount_amount", { precision: 12, scale: 2 }),

    totalPrice: decimal("total_price", { precision: 12, scale: 2 }).notNull(),

    // Customer information
    customerName: varchar("customer_name", { length: 255 }),
    customerEmail: varchar("customer_email", { length: 255 }),
    customerPhone: varchar("customer_phone", { length: 50 }),
    customerType: customerTypeEnum("customer_type"),

    // Payment
    invoiceNumber: varchar("invoice_number", { length: 100 }),
    paymentStatus: meatPaymentStatusEnum("meat_payment_status")
      .default("pending")
      .notNull(),
    paymentMethod: varchar("payment_method", { length: 100 }),
    paymentDate: date("payment_date"),
    paymentReference: varchar("payment_reference", { length: 255 }),

    // Delivery
    deliveryMethod: deliveryMethodEnum("delivery_method"),
    deliveryDate: date("delivery_date"),
    deliveryAddress: text("delivery_address"),
    trackingNumber: varchar("tracking_number", { length: 100 }),
    shippingTemperatureRequirement: varchar(
      "shipping_temperature_requirement",
      { length: 100 }
    ), // "<4°C"
    deliveryNotes: text("delivery_notes"),

    // Returns/refunds
    isReturned: boolean("is_returned").default(false).notNull(),
    returnDate: date("return_date"),
    returnReason: text("return_reason"),
    refundAmount: decimal("refund_amount", { precision: 12, scale: 2 }),

    recordedByUserId: uuid("recorded_by_user_id").notNull(),
    notes: text("notes"),

    ...metadata,
    ...timestamps,
  },
  (table) => [
    index("meat_sales_farm_id_idx").on(table.farmId),
    index("meat_sales_sale_date_idx").on(table.saleDate),
    index("meat_sales_meat_cut_id_idx").on(table.meatCutId),
    index("meat_sales_processing_batch_id_idx").on(table.processingBatchId),
    index("meat_sales_customer_type_idx").on(table.customerType),
    index("meat_sales_payment_status_idx").on(table.paymentStatus),
    index("meat_sales_invoice_number_idx").on(table.invoiceNumber),
    check("meat_sales_quantity_positive", sql`${table.quantityKg} > 0`),
    check("meat_sales_price_positive", sql`${table.pricePerKg} >= 0`),
    check("meat_sales_total_positive", sql`${table.totalPrice} >= 0`),
  ]
);

/**
 * Inventory Adjustments - Track shrinkage, spoilage, sampling, etc.
 */
export const inventoryAdjustments = pgTable(
  "inventory_adjustments",
  {
    id: serial("id").primaryKey(),
    farmId: uuid("farm_id")
      .notNull()
      .references(() => farms.id, { onDelete: "cascade" }),
    meatCutId: integer("meat_cut_id")
      .notNull()
      .references(() => meatCuts.id, { onDelete: "cascade" }),

    adjustmentType: adjustmentTypeEnum("adjustment_type").notNull(),
    adjustmentDate: date("adjustment_date").notNull(),

    quantityKg: decimal("quantity_kg", { precision: 10, scale: 3 }).notNull(),
    estimatedValueLoss: decimal("estimated_value_loss", {
      precision: 12,
      scale: 2,
    }),

    reason: text("reason").notNull(),
    evidencePhotoUrls: json("evidence_photo_urls").$type<string[]>(),
    witnessUserId: uuid("witness_user_id"),

    recordedByUserId: uuid("recorded_by_user_id").notNull(),
    notes: text("notes"),

    ...timestamps,
  },
  (table) => [
    index("inventory_adjustments_farm_id_idx").on(table.farmId),
    index("inventory_adjustments_meat_cut_id_idx").on(table.meatCutId),
    index("inventory_adjustments_type_idx").on(table.adjustmentType),
    index("inventory_adjustments_date_idx").on(table.adjustmentDate),
    check(
      "inventory_adjustments_quantity_positive",
      sql`${table.quantityKg} > 0`
    ),
  ]
);

// ============================================================================
// RELATIONS
// ============================================================================

export const carcassesRelations = relations(carcasses, ({ one, many }) => ({
  farm: one(farms, {
    fields: [carcasses.farmId],
    references: [farms.id],
  }),
  livestockDisposal: one(livestockDisposals, {
    fields: [carcasses.livestockDisposalId],
    references: [livestockDisposals.id],
  }),
  slaughterFacility: one(premises, {
    fields: [carcasses.slaughterFacilityId],
    references: [premises.id],
  }),
  sides: many(carcassSides),
  agingLogs: many(agingLogs),
  meatCuts: many(meatCuts),
  qualityTests: many(qualityTests),
  halalSlaughterProcedure: one(halalSlaughterProcedures, {
    fields: [carcasses.halalSlaughterProcedureId],
    references: [halalSlaughterProcedures.id],
  }),
}));

export const carcassSidesRelations = relations(carcassSides, ({ one }) => ({
  carcass: one(carcasses, {
    fields: [carcassSides.carcassId],
    references: [carcasses.id],
  }),
}));

export const agingLogsRelations = relations(agingLogs, ({ one }) => ({
  carcass: one(carcasses, {
    fields: [agingLogs.carcassId],
    references: [carcasses.id],
  }),
}));

export const meatCutsRelations = relations(meatCuts, ({ one, many }) => ({
  carcass: one(carcasses, {
    fields: [meatCuts.carcassId],
    references: [carcasses.id],
  }),
  farm: one(farms, {
    fields: [meatCuts.farmId],
    references: [farms.id],
  }),
  processingBatchInputs: many(processingBatchInputs),
  qualityTests: many(qualityTests),
  productLabels: many(productLabels),
  sales: many(meatSales),
  inventoryAdjustments: many(inventoryAdjustments),
}));

export const meatProcessingBatchesRelations = relations(
  meatProcessingBatches,
  ({ one, many }) => ({
    farm: one(farms, {
      fields: [meatProcessingBatches.farmId],
      references: [farms.id],
    }),
    inputs: many(processingBatchInputs),
    curingBatch: one(curingBatches),
    smokingBatch: one(smokingBatches),
    grinderBatch: one(grinderBatches),
    qualityTests: many(qualityTests),
    sales: many(meatSales),
    bpomRegistration: one(bpomProductRegistrations, {
      fields: [meatProcessingBatches.bpomRegistrationId],
      references: [bpomProductRegistrations.id],
    }),
  })
);

export const processingBatchInputsRelations = relations(
  processingBatchInputs,
  ({ one }) => ({
    processingBatch: one(meatProcessingBatches, {
      fields: [processingBatchInputs.processingBatchId],
      references: [meatProcessingBatches.id],
    }),
    meatCut: one(meatCuts, {
      fields: [processingBatchInputs.meatCutId],
      references: [meatCuts.id],
    }),
  })
);

export const curingBatchesRelations = relations(curingBatches, ({ one }) => ({
  processingBatch: one(meatProcessingBatches, {
    fields: [curingBatches.processingBatchId],
    references: [meatProcessingBatches.id],
  }),
}));

export const smokingBatchesRelations = relations(smokingBatches, ({ one }) => ({
  processingBatch: one(meatProcessingBatches, {
    fields: [smokingBatches.processingBatchId],
    references: [meatProcessingBatches.id],
  }),
}));

export const grinderBatchesRelations = relations(grinderBatches, ({ one }) => ({
  processingBatch: one(meatProcessingBatches, {
    fields: [grinderBatches.processingBatchId],
    references: [meatProcessingBatches.id],
  }),
}));

export const qualityTestsRelations = relations(qualityTests, ({ one }) => ({
  farm: one(farms, {
    fields: [qualityTests.farmId],
    references: [farms.id],
  }),
  carcass: one(carcasses, {
    fields: [qualityTests.carcassId],
    references: [carcasses.id],
  }),
  meatCut: one(meatCuts, {
    fields: [qualityTests.meatCutId],
    references: [meatCuts.id],
  }),
  processingBatch: one(meatProcessingBatches, {
    fields: [qualityTests.processingBatchId],
    references: [meatProcessingBatches.id],
  }),
}));

export const temperatureLogsRelations = relations(
  temperatureLogs,
  ({ one }) => ({
    farm: one(farms, {
      fields: [temperatureLogs.farmId],
      references: [farms.id],
    }),
  })
);

export const productLabelsRelations = relations(productLabels, ({ one }) => ({
  meatCut: one(meatCuts, {
    fields: [productLabels.meatCutId],
    references: [meatCuts.id],
  }),
}));

export const meatSalesRelations = relations(meatSales, ({ one }) => ({
  farm: one(farms, {
    fields: [meatSales.farmId],
    references: [farms.id],
  }),
  meatCut: one(meatCuts, {
    fields: [meatSales.meatCutId],
    references: [meatCuts.id],
  }),
  processingBatch: one(meatProcessingBatches, {
    fields: [meatSales.processingBatchId],
    references: [meatProcessingBatches.id],
  }),
}));

export const inventoryAdjustmentsRelations = relations(
  inventoryAdjustments,
  ({ one }) => ({
    farm: one(farms, {
      fields: [inventoryAdjustments.farmId],
      references: [farms.id],
    }),
    meatCut: one(meatCuts, {
      fields: [inventoryAdjustments.meatCutId],
      references: [meatCuts.id],
    }),
  })
);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type CarcassRow = typeof carcasses.$inferSelect;
export type NewCarcassRow = typeof carcasses.$inferInsert;
export type CarcassSideRow = typeof carcassSides.$inferSelect;
export type NewCarcassSideRow = typeof carcassSides.$inferInsert;
export type AgingLogRow = typeof agingLogs.$inferSelect;
export type NewAgingLogRow = typeof agingLogs.$inferInsert;
export type MeatCutRow = typeof meatCuts.$inferSelect;
export type NewMeatCutRow = typeof meatCuts.$inferInsert;
export type MeatProcessingBatchRow = typeof meatProcessingBatches.$inferSelect;
export type NewMeatProcessingBatchRow =
  typeof meatProcessingBatches.$inferInsert;
export type ProcessingBatchInputRow = typeof processingBatchInputs.$inferSelect;
export type NewProcessingBatchInputRow =
  typeof processingBatchInputs.$inferInsert;
export type CuringBatchRow = typeof curingBatches.$inferSelect;
export type NewCuringBatchRow = typeof curingBatches.$inferInsert;
export type SmokingBatchRow = typeof smokingBatches.$inferSelect;
export type NewSmokingBatchRow = typeof smokingBatches.$inferInsert;
export type GrinderBatchRow = typeof grinderBatches.$inferSelect;
export type NewGrinderBatchRow = typeof grinderBatches.$inferInsert;
export type QualityTestRow = typeof qualityTests.$inferSelect;
export type NewQualityTestRow = typeof qualityTests.$inferInsert;
export type TemperatureLogRow = typeof temperatureLogs.$inferSelect;
export type NewTemperatureLogRow = typeof temperatureLogs.$inferInsert;
export type ProductLabelRow = typeof productLabels.$inferSelect;
export type NewProductLabelRow = typeof productLabels.$inferInsert;
export type MeatSaleRow = typeof meatSales.$inferSelect;
export type NewMeatSaleRow = typeof meatSales.$inferInsert;
export type InventoryAdjustmentRow = typeof inventoryAdjustments.$inferSelect;
export type NewInventoryAdjustmentRow =
  typeof inventoryAdjustments.$inferInsert;

export type CutCategory = (typeof cutCategoryEnum.enumValues)[number];
export type MeatGrade = (typeof meatGradeEnum.enumValues)[number];
export type StorageType = (typeof storageTypeEnum.enumValues)[number];
export type PackagingType = (typeof packagingTypeEnum.enumValues)[number];
export type ProcessingStatus = (typeof processingStatusEnum.enumValues)[number];
export type MeatSaleStatus = (typeof meatSaleStatusEnum.enumValues)[number];
export type MeatPaymentStatus =
  (typeof meatPaymentStatusEnum.enumValues)[number];
export type DeliveryMethod = (typeof deliveryMethodEnum.enumValues)[number];
export type CustomerType = (typeof customerTypeEnum.enumValues)[number];
export type SideDesignation = (typeof sideDesignationEnum.enumValues)[number];
export type ProcessType = (typeof processTypeEnum.enumValues)[number];
export type CureMethod = (typeof cureMethodEnum.enumValues)[number];
export type GrindSize = (typeof grindSizeEnum.enumValues)[number];
export type TestType = (typeof testTypeEnum.enumValues)[number];
export type AdjustmentType = (typeof adjustmentTypeEnum.enumValues)[number];
