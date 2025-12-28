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
import { bpomProductRegistrations } from "./indonesian-compliance";
import { inventoryItems } from "./inventory";
import { livestockMilkings } from "./livestock";

// ============================================================================
// ENUMS
// ============================================================================

export const milkBatchStatusEnum = pgEnum("milk_batch_status", [
  "collected",
  "in_transit",
  "received",
  "tested",
  "rejected",
  "in_tank",
  "pasteurized",
  "processed",
]);

export const milkGradeEnum = pgEnum("milk_grade", [
  "grade_a", // Premium quality
  "grade_b", // Standard quality
  "grade_c", // Manufacturing use only
  "rejected",
]);

export const pasteurizationMethodEnum = pgEnum("pasteurization_method", [
  "htst", // High Temperature Short Time (72°C for 15 sec)
  "ltlt", // Low Temperature Long Time (63°C for 30 min)
  "uht", // Ultra High Temperature (135°C for 2-5 sec)
  "raw", // Unpasteurized (for certain cheeses)
]);

export const cheeseStatusEnum = pgEnum("cheese_status", [
  "in_production",
  "pressing",
  "brining",
  "aging",
  "ready",
  "sold",
  "discarded",
]);

export const cheeseTypeEnum = pgEnum("cheese_type", [
  "fresh", // Ricotta, cottage cheese
  "soft", // Brie, Camembert (>50% moisture)
  "semi_soft", // Havarti, Munster (40-50% moisture)
  "semi_hard", // Cheddar, Gouda (30-40% moisture)
  "hard", // Parmesan, Pecorino (<30% moisture)
  "blue", // Blue cheese varieties
  "processed", // Processed cheese products
]);

export const yogurtTypeEnum = pgEnum("yogurt_type", [
  "traditional",
  "greek", // Strained
  "icelandic", // Skyr
  "drinking", // Kefir, lassi
  "frozen", // Frozen yogurt
]);

export const butterTypeEnum = pgEnum("butter_type", [
  "unsalted",
  "salted",
  "cultured",
  "whipped",
  "clarified", // Ghee
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "draft",
  "calculated",
  "approved",
  "paid",
  "disputed",
]);

// ============================================================================
// TABLES
// ============================================================================

/**
 * Milk Batches - Milk collection from farms with full quality data
 */
export const milkBatches = pgTable(
  "milk_batches",
  {
    id: serial("id").primaryKey(),
    batchCode: varchar("batch_code", { length: 100 }).notNull(),
    farmId: uuid("farm_id")
      .notNull()
      .references(() => farms.id, { onDelete: "cascade" }),

    // Collection details
    collectionDate: date("collection_date").notNull(),
    collectionTime: time("collection_time"),
    session: varchar("session", { length: 20 }), // morning, afternoon, evening

    // Volume
    estimatedVolumeLiters: decimal("estimated_volume_liters", {
      precision: 10,
      scale: 2,
    }),
    actualVolumeLiters: decimal("actual_volume_liters", {
      precision: 10,
      scale: 2,
    }).notNull(),
    variancePercentage: decimal("variance_percentage", {
      precision: 5,
      scale: 2,
    }),

    // Transport tracking
    collectedByUserId: uuid("collected_by_user_id"),
    vehicleId: uuid("vehicle_id"),
    temperatureAtPickupCelsius: decimal("temperature_at_pickup_celsius", {
      precision: 4,
      scale: 1,
    }),
    temperatureAtDeliveryCelsius: decimal("temperature_at_delivery_celsius", {
      precision: 4,
      scale: 1,
    }),
    transportDurationMinutes: integer("transport_duration_minutes"),
    transportNotes: text("transport_notes"),

    // Reception
    receivedDate: date("received_date"),
    receivedTime: time("received_time"),
    receivedByUserId: uuid("received_by_user_id"),
    visualInspection: text("visual_inspection"),
    smellInspection: text("smell_inspection"),
    tasteInspection: text("taste_inspection"),

    // Quality testing - Structured fields (not generic JSON!)
    qualityTestedByUserId: uuid("quality_tested_by_user_id"),
    testDate: date("test_date"),
    testTime: time("test_time"),

    // Critical quality parameters (from livestock milkings standard)
    somaticCellCount: integer("somatic_cell_count"), // SCC - mastitis indicator
    standardPlateCount: integer("standard_plate_count"), // SPC - bacterial count
    butterfatPercent: decimal("butterfat_percent", { precision: 4, scale: 2 }),
    proteinPercent: decimal("protein_percent", { precision: 4, scale: 2 }),
    lactosePercent: decimal("lactose_percent", { precision: 4, scale: 2 }),
    totalSolidsPercent: decimal("total_solids_percent", {
      precision: 4,
      scale: 2,
    }),
    solidsNotFatPercent: decimal("solids_not_fat_percent", {
      precision: 4,
      scale: 2,
    }),
    milkUreaNitrogen: decimal("milk_urea_nitrogen", { precision: 5, scale: 2 }), // MUN
    phLevel: decimal("ph_level", { precision: 3, scale: 2 }),
    freezingPointCelsius: decimal("freezing_point_celsius", {
      precision: 5,
      scale: 3,
    }), // Adulteration detection
    coliformCount: integer("coliform_count"),

    // Antibiotic residue testing
    antibioticTestResult: varchar("antibiotic_test_result", { length: 50 }), // negative, positive, trace
    antibioticType: varchar("antibiotic_type", { length: 100 }),

    // Grading
    milkGrade: milkGradeEnum("milk_grade"),
    qualityScore: integer("quality_score"), // 0-100

    // Status and disposition
    status: milkBatchStatusEnum("status").default("collected").notNull(),
    rejectionReason: text("rejection_reason"),
    rejectedDate: date("rejected_date"),

    // Tank assignment
    assignedTankId: uuid("assigned_tank_id"), // Reference to milkReceptionTanks

    notes: text("notes"),

    ...metadata,
    ...timestamps,
  },
  (table) => [
    index("milk_batches_farm_collection_date_idx").on(
      table.farmId,
      table.collectionDate
    ),
    index("milk_batches_status_idx").on(table.status),
    index("milk_batches_batch_code_idx").on(table.batchCode),
    index("milk_batches_milk_grade_idx").on(table.milkGrade),
    index("milk_batches_test_date_idx").on(table.testDate),
    unique("milk_batches_farm_batch_code_unique").on(
      table.farmId,
      table.batchCode
    ),
    check(
      "milk_batches_actual_volume_positive",
      sql`${table.actualVolumeLiters} > 0`
    ),
    check(
      "milk_batches_temp_pickup_range",
      sql`${table.temperatureAtPickupCelsius} IS NULL OR (${table.temperatureAtPickupCelsius} >= 0 AND ${table.temperatureAtPickupCelsius} <= 10)`
    ),
    check(
      "milk_batches_temp_delivery_range",
      sql`${table.temperatureAtDeliveryCelsius} IS NULL OR (${table.temperatureAtDeliveryCelsius} >= 0 AND ${table.temperatureAtDeliveryCelsius} <= 10)`
    ),
    check(
      "milk_batches_ph_range",
      sql`${table.phLevel} IS NULL OR (${table.phLevel} >= 6.4 AND ${table.phLevel} <= 6.8)`
    ),
    check(
      "milk_batches_quality_score_range",
      sql`${table.qualityScore} IS NULL OR (${table.qualityScore} >= 0 AND ${table.qualityScore} <= 100)`
    ),
  ]
);

/**
 * Milk Batch Sources - Junction table linking batches to individual animal milkings
 * Replaces the JSON array for proper traceability (farm to table)
 */
export const milkBatchSources = pgTable(
  "milk_batch_sources",
  {
    id: serial("id").primaryKey(),
    milkBatchId: integer("milk_batch_id")
      .notNull()
      .references(() => milkBatches.id, { onDelete: "cascade" }),
    livestockMilkingId: integer("livestock_milking_id")
      .notNull()
      .references(() => livestockMilkings.id, { onDelete: "restrict" }),
    volumeContributedLiters: decimal("volume_contributed_liters", {
      precision: 8,
      scale: 2,
    }).notNull(),
    ...timestamps,
  },
  (table) => [
    index("milk_batch_sources_batch_id_idx").on(table.milkBatchId),
    index("milk_batch_sources_milking_id_idx").on(table.livestockMilkingId),
    unique("milk_batch_sources_batch_milking_unique").on(
      table.milkBatchId,
      table.livestockMilkingId
    ),
    check(
      "milk_batch_sources_volume_positive",
      sql`${table.volumeContributedLiters} > 0`
    ),
  ]
);

/**
 * Milk Reception Tanks - Silo/tank tracking and inventory
 */
export const milkReceptionTanks = pgTable(
  "milk_reception_tanks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    farmId: uuid("farm_id")
      .notNull()
      .references(() => farms.id, { onDelete: "cascade" }),
    tankCode: varchar("tank_code", { length: 50 }).notNull(),
    tankName: text("tank_name").notNull(),
    capacityLiters: decimal("capacity_liters", {
      precision: 10,
      scale: 2,
    }).notNull(),
    currentVolumeLiters: decimal("current_volume_liters", {
      precision: 10,
      scale: 2,
    })
      .default("0")
      .notNull(),

    // Temperature monitoring
    currentTemperatureCelsius: decimal("current_temperature_celsius", {
      precision: 4,
      scale: 1,
    }),
    targetTemperatureCelsius: decimal("target_temperature_celsius", {
      precision: 4,
      scale: 1,
    })
      .default("4")
      .notNull(),

    // Cleaning/sanitization
    lastCleanedDate: date("last_cleaned_date"),
    lastCleanedByUserId: uuid("last_cleaned_by_user_id"),
    cleaningMethod: varchar("cleaning_method", { length: 100 }),
    nextCleaningDueDate: date("next_cleaning_due_date"),

    // Status
    isActive: boolean("is_active").default(true).notNull(),
    isUnderMaintenance: boolean("is_under_maintenance")
      .default(false)
      .notNull(),

    location: varchar("location", { length: 255 }),
    installationDate: date("installation_date"),
    notes: text("notes"),

    ...metadata,
    ...timestamps,
  },
  (table) => [
    index("milk_reception_tanks_farm_id_idx").on(table.farmId),
    unique("milk_reception_tanks_farm_code_unique").on(
      table.farmId,
      table.tankCode
    ),
    check(
      "milk_reception_tanks_capacity_positive",
      sql`${table.capacityLiters} > 0`
    ),
    check(
      "milk_reception_tanks_current_lte_capacity",
      sql`${table.currentVolumeLiters} >= 0 AND ${table.currentVolumeLiters} <= ${table.capacityLiters}`
    ),
  ]
);

/**
 * Pasteurization Batches - HACCP critical control point records
 * Required for regulatory compliance (FDA, USDA)
 */
export const pasteurizationBatches = pgTable(
  "pasteurization_batches",
  {
    id: serial("id").primaryKey(),
    farmId: uuid("farm_id")
      .notNull()
      .references(() => farms.id, { onDelete: "cascade" }),
    batchCode: varchar("batch_code", { length: 100 }).notNull(),

    // Process details
    pasteurizationDate: date("pasteurization_date").notNull(),
    pasteurizationTime: time("pasteurization_time").notNull(),
    method: pasteurizationMethodEnum("method").notNull(),

    // Critical control points (HACCP)
    targetTemperatureCelsius: decimal("target_temperature_celsius", {
      precision: 5,
      scale: 2,
    }).notNull(),
    actualTemperatureCelsius: decimal("actual_temperature_celsius", {
      precision: 5,
      scale: 2,
    }).notNull(),
    holdingTimeSeconds: integer("holding_time_seconds").notNull(),
    targetHoldingTimeSeconds: integer("target_holding_time_seconds").notNull(),

    // Volume
    volumeInLiters: decimal("volume_in_liters", {
      precision: 10,
      scale: 2,
    }).notNull(),
    volumeOutLiters: decimal("volume_out_liters", {
      precision: 10,
      scale: 2,
    }),

    // Equipment
    equipmentId: uuid("equipment_id"), // Reference to equipment table
    equipmentCalibrationDate: date("equipment_calibration_date"),
    operatorUserId: uuid("operator_user_id").notNull(),

    // Quality verification
    preTestPhosphatasePpm: decimal("pre_test_phosphatase_ppm", {
      precision: 6,
      scale: 2,
    }), // Should be positive
    postTestPhosphatasePpm: decimal("post_test_phosphatase_ppm", {
      precision: 6,
      scale: 2,
    }), // Should be <0.1 for HTST
    coliformTestResult: varchar("coliform_test_result", { length: 50 }),

    // Compliance
    meetsStandards: boolean("meets_standards").default(true).notNull(),
    deviationNotes: text("deviation_notes"),
    correctiveAction: text("corrective_action"),

    // Verification
    verifiedByUserId: uuid("verified_by_user_id"),
    verificationDate: date("verification_date"),

    notes: text("notes"),

    ...metadata,
    ...timestamps,
  },
  (table) => [
    index("pasteurization_batches_farm_id_idx").on(table.farmId),
    index("pasteurization_batches_date_idx").on(table.pasteurizationDate),
    index("pasteurization_batches_method_idx").on(table.method),
    unique("pasteurization_batches_farm_code_unique").on(
      table.farmId,
      table.batchCode
    ),
    check(
      "pasteurization_batches_volume_positive",
      sql`${table.volumeInLiters} > 0`
    ),
    check(
      "pasteurization_batches_temp_positive",
      sql`${table.actualTemperatureCelsius} > 0`
    ),
    check(
      "pasteurization_batches_holding_time_positive",
      sql`${table.holdingTimeSeconds} > 0`
    ),
  ]
);

/**
 * Cheese Batches - Cheese production with complete manufacturing data
 */
export const cheeseBatches = pgTable(
  "cheese_batches",
  {
    id: serial("id").primaryKey(),
    batchCode: varchar("batch_code", { length: 100 }).notNull().unique(),
    farmId: uuid("farm_id")
      .notNull()
      .references(() => farms.id, { onDelete: "cascade" }),

    // Basic information
    cheeseVariety: varchar("cheese_variety", { length: 100 }).notNull(), // Cheddar, Gouda, etc.
    cheeseType: cheeseTypeEnum("cheese_type").notNull(),
    productionDate: date("production_date").notNull(),
    producedByUserId: uuid("produced_by_user_id").notNull(),

    // Milk source
    totalMilkVolumeLiters: decimal("total_milk_volume_liters", {
      precision: 10,
      scale: 2,
    }).notNull(),

    // Recipe and process
    recipeId: uuid("recipe_id"), // Reference to cheese recipes (future table)
    recipeNotes: text("recipe_notes"),

    // Culture and enzymes
    starterCulture: varchar("starter_culture", { length: 255 }),
    cultureQuantityGrams: decimal("culture_quantity_grams", {
      precision: 8,
      scale: 2,
    }),
    rennetType: varchar("rennet_type", { length: 100 }),
    rennetQuantityMl: decimal("rennet_quantity_ml", { precision: 8, scale: 2 }),
    calciumChlorideQuantityMl: decimal("calcium_chloride_quantity_ml", {
      precision: 8,
      scale: 2,
    }),

    // Additional ingredients
    additionalIngredients: json("additional_ingredients").$type<
      Array<{
        name: string;
        quantityGrams: number;
        unit: string;
      }>
    >(),

    // Process parameters
    setTemperatureCelsius: decimal("set_temperature_celsius", {
      precision: 4,
      scale: 1,
    }),
    setTime: time("set_time"),
    cutTime: time("cut_time"),
    cookTemperatureCelsius: decimal("cook_temperature_celsius", {
      precision: 4,
      scale: 1,
    }),
    cookDurationMinutes: integer("cook_duration_minutes"),
    targetPhAtSet: decimal("target_ph_at_set", { precision: 3, scale: 2 }),
    actualPhAtSet: decimal("actual_ph_at_set", { precision: 3, scale: 2 }),
    actualPhAtMolding: decimal("actual_ph_at_molding", {
      precision: 3,
      scale: 2,
    }),

    // Pressing
    pressingStartDate: date("pressing_start_date"),
    pressingStartTime: time("pressing_start_time"),
    pressingDurationHours: integer("pressing_duration_hours"),
    pressingPressureKpa: decimal("pressing_pressure_kpa", {
      precision: 6,
      scale: 2,
    }),

    // Brining (for some cheeses)
    briningStartDate: date("brining_start_date"),
    briningDurationHours: integer("brining_duration_hours"),
    brineSalinityPercent: decimal("brine_salinity_percent", {
      precision: 4,
      scale: 2,
    }),

    // Production output
    initialCheeseWeightKg: decimal("initial_cheese_weight_kg", {
      precision: 10,
      scale: 2,
    }),
    yieldPercentage: decimal("yield_percentage", { precision: 5, scale: 2 }),
    numberOfWheels: integer("number_of_wheels"),

    // Composition analysis
    moisturePercent: decimal("moisture_percent", { precision: 5, scale: 2 }),
    saltPercent: decimal("salt_percent", { precision: 5, scale: 2 }),
    fatPercent: decimal("fat_percent", { precision: 5, scale: 2 }),
    proteinPercent: decimal("protein_percent", { precision: 5, scale: 2 }),

    // Aging tracking
    agingStartDate: date("aging_start_date"),
    agingTargetDays: integer("aging_target_days"),
    agingRoomId: uuid("aging_room_id"), // Reference to cheeseAgingRooms
    agingNotes:
      json("aging_notes").$type<
        Array<{
          date: string;
          note: string;
          weightKg?: number;
        }>
      >(),

    // Status
    status: cheeseStatusEnum("status").default("in_production").notNull(),

    // Inventory linkage
    inventoryItemId: integer("inventory_item_id").references(
      () => inventoryItems.id,
      { onDelete: "set null" }
    ),
    storageLocation: varchar("storage_location", { length: 255 }),
    processPhotos: json("process_photos").$type<string[]>(),

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
    index("cheese_batches_farm_production_date_idx").on(
      table.farmId,
      table.productionDate
    ),
    index("cheese_batches_status_idx").on(table.status),
    index("cheese_batches_cheese_type_idx").on(table.cheeseType),
    index("cheese_batches_aging_room_idx").on(table.agingRoomId),
    index("cheese_batches_bpom_registration_idx").on(table.bpomRegistrationId),
    check(
      "cheese_batches_milk_volume_positive",
      sql`${table.totalMilkVolumeLiters} > 0`
    ),
    check(
      "cheese_batches_weight_positive",
      sql`${table.initialCheeseWeightKg} IS NULL OR ${table.initialCheeseWeightKg} > 0`
    ),
    check(
      "cheese_batches_yield_range",
      sql`${table.yieldPercentage} IS NULL OR (${table.yieldPercentage} >= 5 AND ${table.yieldPercentage} <= 20)`
    ),
    check(
      "cheese_batches_moisture_range",
      sql`${table.moisturePercent} IS NULL OR (${table.moisturePercent} >= 20 AND ${table.moisturePercent} <= 80)`
    ),
  ]
);

/**
 * Cheese Batch Sources - Junction table linking cheese to milk batches
 * Critical for product traceability and recalls
 */
export const cheeseBatchSources = pgTable(
  "cheese_batch_sources",
  {
    id: serial("id").primaryKey(),
    cheeseBatchId: integer("cheese_batch_id")
      .notNull()
      .references(() => cheeseBatches.id, { onDelete: "cascade" }),
    milkBatchId: integer("milk_batch_id")
      .notNull()
      .references(() => milkBatches.id, { onDelete: "restrict" }),
    volumeUsedLiters: decimal("volume_used_liters", {
      precision: 10,
      scale: 2,
    }).notNull(),
    ...timestamps,
  },
  (table) => [
    index("cheese_batch_sources_cheese_batch_idx").on(table.cheeseBatchId),
    index("cheese_batch_sources_milk_batch_idx").on(table.milkBatchId),
    unique("cheese_batch_sources_cheese_milk_unique").on(
      table.cheeseBatchId,
      table.milkBatchId
    ),
    check(
      "cheese_batch_sources_volume_positive",
      sql`${table.volumeUsedLiters} > 0`
    ),
  ]
);

/**
 * Cheese Wheels - Individual cheese piece tracking
 * For wheel/block numbering and weight loss monitoring
 */
export const cheeseWheels = pgTable(
  "cheese_wheels",
  {
    id: serial("id").primaryKey(),
    cheeseBatchId: integer("cheese_batch_id")
      .notNull()
      .references(() => cheeseBatches.id, { onDelete: "cascade" }),
    wheelNumber: varchar("wheel_number", { length: 100 }).notNull(),

    // Weight tracking
    initialWeightKg: decimal("initial_weight_kg", {
      precision: 8,
      scale: 3,
    }).notNull(),
    currentWeightKg: decimal("current_weight_kg", {
      precision: 8,
      scale: 3,
    }).notNull(),
    weightLossPercent: decimal("weight_loss_percent", {
      precision: 5,
      scale: 2,
    }),

    // Physical characteristics
    diameterCm: decimal("diameter_cm", { precision: 5, scale: 2 }),
    heightCm: decimal("height_cm", { precision: 5, scale: 2 }),

    // Location
    agingRoomId: uuid("aging_room_id"),
    shelfPosition: varchar("shelf_position", { length: 100 }),

    // Quality
    qualityGrade: varchar("quality_grade", { length: 20 }), // A, B, C, etc.
    hasDefects: boolean("has_defects").default(false).notNull(),
    defectNotes: text("defect_notes"),

    // Sale/disposition
    soldDate: date("sold_date"),
    salePrice: decimal("sale_price", { precision: 10, scale: 2 }),
    customerName: text("customer_name"),

    notes: text("notes"),

    ...timestamps,
  },
  (table) => [
    index("cheese_wheels_batch_id_idx").on(table.cheeseBatchId),
    index("cheese_wheels_aging_room_idx").on(table.agingRoomId),
    unique("cheese_wheels_batch_number_unique").on(
      table.cheeseBatchId,
      table.wheelNumber
    ),
    check(
      "cheese_wheels_initial_weight_positive",
      sql`${table.initialWeightKg} > 0`
    ),
    check(
      "cheese_wheels_current_lte_initial",
      sql`${table.currentWeightKg} > 0 AND ${table.currentWeightKg} <= ${table.initialWeightKg}`
    ),
  ]
);

/**
 * Cheese Aging Rooms - Environmental monitoring for aging caves/rooms
 */
export const cheeseAgingRooms = pgTable(
  "cheese_aging_rooms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    farmId: uuid("farm_id")
      .notNull()
      .references(() => farms.id, { onDelete: "cascade" }),
    roomCode: varchar("room_code", { length: 50 }).notNull(),
    roomName: text("room_name").notNull(),

    // Capacity
    capacityWheels: integer("capacity_wheels"),
    currentOccupancy: integer("current_occupancy").default(0).notNull(),

    // Environmental targets
    targetTemperatureCelsius: decimal("target_temperature_celsius", {
      precision: 4,
      scale: 1,
    }).notNull(),
    targetHumidityPercent: integer("target_humidity_percent").notNull(),

    // Current conditions
    currentTemperatureCelsius: decimal("current_temperature_celsius", {
      precision: 4,
      scale: 1,
    }),
    currentHumidityPercent: integer("current_humidity_percent"),
    lastMonitoredAt: timestamp("last_monitored_at"),

    // Cleaning
    lastCleanedDate: date("last_cleaned_date"),
    cleaningFrequencyDays: integer("cleaning_frequency_days"),

    // Status
    isActive: boolean("is_active").default(true).notNull(),
    location: varchar("location", { length: 255 }),
    notes: text("notes"),

    ...metadata,
    ...timestamps,
  },
  (table) => [
    index("cheese_aging_rooms_farm_id_idx").on(table.farmId),
    unique("cheese_aging_rooms_farm_code_unique").on(
      table.farmId,
      table.roomCode
    ),
    check(
      "cheese_aging_rooms_occupancy_lte_capacity",
      sql`${table.capacityWheels} IS NULL OR ${table.currentOccupancy} <= ${table.capacityWheels}`
    ),
    check(
      "cheese_aging_rooms_humidity_range",
      sql`${table.targetHumidityPercent} >= 0 AND ${table.targetHumidityPercent} <= 100`
    ),
  ]
);

/**
 * Yogurt Batches - Yogurt production tracking
 */
export const yogurtBatches = pgTable(
  "yogurt_batches",
  {
    id: serial("id").primaryKey(),
    batchCode: varchar("batch_code", { length: 100 }).notNull().unique(),
    farmId: uuid("farm_id")
      .notNull()
      .references(() => farms.id, { onDelete: "cascade" }),

    // Basic info
    yogurtType: yogurtTypeEnum("yogurt_type").notNull(),
    productionDate: date("production_date").notNull(),
    producedByUserId: uuid("produced_by_user_id").notNull(),

    // Milk source
    totalMilkVolumeLiters: decimal("total_milk_volume_liters", {
      precision: 10,
      scale: 2,
    }).notNull(),

    // Process
    starterCultures: json("starter_cultures").$type<string[]>(),
    cultureQuantityGrams: decimal("culture_quantity_grams", {
      precision: 8,
      scale: 2,
    }),
    incubationTemperatureCelsius: decimal("incubation_temperature_celsius", {
      precision: 4,
      scale: 1,
    }),
    incubationDurationHours: integer("incubation_duration_hours"),
    targetPhAtEnd: decimal("target_ph_at_end", { precision: 3, scale: 2 }),
    actualPhAtEnd: decimal("actual_ph_at_end", { precision: 3, scale: 2 }),

    // Straining (for Greek yogurt)
    isStrained: boolean("is_strained").default(false).notNull(),
    strainingDurationHours: integer("straining_duration_hours"),

    // Flavoring/additions
    flavorVariety: varchar("flavor_variety", { length: 100 }),
    additionalIngredients: json("additional_ingredients").$type<
      Array<{
        name: string;
        quantityGrams: number;
      }>
    >(),

    // Output
    finalYieldLiters: decimal("final_yield_liters", {
      precision: 10,
      scale: 2,
    }),
    yieldPercentage: decimal("yield_percentage", { precision: 5, scale: 2 }),

    // Composition
    fatPercent: decimal("fat_percent", { precision: 4, scale: 2 }),
    proteinPercent: decimal("protein_percent", { precision: 4, scale: 2 }),

    // Inventory
    inventoryItemId: integer("inventory_item_id").references(
      () => inventoryItems.id,
      { onDelete: "set null" }
    ),

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
    index("yogurt_batches_farm_production_date_idx").on(
      table.farmId,
      table.productionDate
    ),
    index("yogurt_batches_yogurt_type_idx").on(table.yogurtType),
    index("yogurt_batches_bpom_registration_idx").on(table.bpomRegistrationId),
    check(
      "yogurt_batches_milk_volume_positive",
      sql`${table.totalMilkVolumeLiters} > 0`
    ),
    check(
      "yogurt_batches_ph_range",
      sql`${table.actualPhAtEnd} IS NULL OR (${table.actualPhAtEnd} >= 3.5 AND ${table.actualPhAtEnd} <= 5.0)`
    ),
  ]
);

/**
 * Butter Batches - Butter and cream production
 */
export const butterBatches = pgTable(
  "butter_batches",
  {
    id: serial("id").primaryKey(),
    batchCode: varchar("batch_code", { length: 100 }).notNull().unique(),
    farmId: uuid("farm_id")
      .notNull()
      .references(() => farms.id, { onDelete: "cascade" }),

    // Basic info
    butterType: butterTypeEnum("butter_type").notNull(),
    productionDate: date("production_date").notNull(),
    producedByUserId: uuid("produced_by_user_id").notNull(),

    // Cream source
    creamVolumeLiters: decimal("cream_volume_liters", {
      precision: 10,
      scale: 2,
    }).notNull(),
    creamButterfatPercent: decimal("cream_butterfat_percent", {
      precision: 4,
      scale: 2,
    }),

    // Process
    churningTemperatureCelsius: decimal("churning_temperature_celsius", {
      precision: 4,
      scale: 1,
    }),
    churningDurationMinutes: integer("churning_duration_minutes"),

    // For cultured butter
    starterCulture: varchar("starter_culture", { length: 255 }),
    fermentationDurationHours: integer("fermentation_duration_hours"),

    // Output
    butterWeightKg: decimal("butter_weight_kg", {
      precision: 10,
      scale: 2,
    }).notNull(),
    buttermilkVolumeLiters: decimal("buttermilk_volume_liters", {
      precision: 10,
      scale: 2,
    }),

    // Composition
    butterButterfatPercent: decimal("butter_butterfat_percent", {
      precision: 4,
      scale: 2,
    }),
    moisturePercent: decimal("moisture_percent", { precision: 4, scale: 2 }),
    saltPercent: decimal("salt_percent", { precision: 4, scale: 2 }),

    // Inventory
    inventoryItemId: integer("inventory_item_id").references(
      () => inventoryItems.id,
      { onDelete: "set null" }
    ),

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
    index("butter_batches_farm_production_date_idx").on(
      table.farmId,
      table.productionDate
    ),
    index("butter_batches_butter_type_idx").on(table.butterType),
    index("butter_batches_bpom_registration_idx").on(table.bpomRegistrationId),
    check(
      "butter_batches_cream_volume_positive",
      sql`${table.creamVolumeLiters} > 0`
    ),
    check(
      "butter_batches_butter_weight_positive",
      sql`${table.butterWeightKg} > 0`
    ),
  ]
);

/**
 * Milk Payments - Payment processing for milk deliveries
 */
export const milkPayments = pgTable(
  "milk_payments",
  {
    id: serial("id").primaryKey(),
    farmId: uuid("farm_id")
      .notNull()
      .references(() => farms.id, { onDelete: "cascade" }),

    // Payment period
    paymentPeriodStart: date("payment_period_start").notNull(),
    paymentPeriodEnd: date("payment_period_end").notNull(),
    paymentNumber: varchar("payment_number", { length: 100 }),

    // Volume and pricing
    totalLiters: decimal("total_liters", { precision: 10, scale: 2 }).notNull(),
    gradeBreakdown: json("grade_breakdown")
      .$type<
        Record<
          string,
          {
            liters: number;
            rate: number;
            amount: number;
          }
        >
      >()
      .notNull(),

    // Quality bonuses/penalties
    qualityBonuses:
      json("quality_bonuses").$type<
        Array<{
          reason: string;
          amount: number;
        }>
      >(),
    qualityPenalties:
      json("quality_penalties").$type<
        Array<{
          reason: string;
          amount: number;
        }>
      >(),

    // Financial amounts
    baseAmount: decimal("base_amount", { precision: 15, scale: 2 }).notNull(),
    bonusesTotal: decimal("bonuses_total", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    penaltiesTotal: decimal("penalties_total", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),
    grossAmount: decimal("gross_amount", { precision: 15, scale: 2 }).notNull(),

    // Deductions
    deductions:
      json("deductions").$type<
        Array<{
          description: string;
          amount: number;
        }>
      >(),
    deductionsTotal: decimal("deductions_total", { precision: 15, scale: 2 })
      .default("0")
      .notNull(),

    netAmount: decimal("net_amount", { precision: 15, scale: 2 }).notNull(),

    status: paymentStatusEnum("status").default("draft").notNull(),

    // Workflow tracking
    calculatedByUserId: uuid("calculated_by_user_id"),
    calculatedDate: date("calculated_date"),
    approvedByUserId: uuid("approved_by_user_id"),
    approvedDate: date("approved_date"),
    paidByUserId: uuid("paid_by_user_id"),
    paidDate: date("paid_date"),

    // Payment details
    paymentMethod: varchar("payment_method", { length: 100 }),
    paymentReference: varchar("payment_reference", { length: 255 }),
    paymentProofPath: text("payment_proof_path"),

    // Dispute handling
    disputeReason: text("dispute_reason"),
    disputeResolvedDate: date("dispute_resolved_date"),

    notes: text("notes"),

    ...metadata,
    ...timestamps,
  },
  (table) => [
    index("milk_payments_farm_period_start_idx").on(
      table.farmId,
      table.paymentPeriodStart
    ),
    index("milk_payments_status_idx").on(table.status),
    index("milk_payments_payment_number_idx").on(table.paymentNumber),
    check(
      "milk_payments_period_valid",
      sql`${table.paymentPeriodEnd} >= ${table.paymentPeriodStart}`
    ),
    check("milk_payments_total_liters_positive", sql`${table.totalLiters} > 0`),
    check("milk_payments_base_amount_positive", sql`${table.baseAmount} >= 0`),
    check("milk_payments_net_amount_positive", sql`${table.netAmount} >= 0`),
  ]
);

/**
 * Milk Payment Batches - Junction table linking payments to specific batches
 * Enables batch-level payment tracking and reconciliation
 */
export const milkPaymentBatches = pgTable(
  "milk_payment_batches",
  {
    id: serial("id").primaryKey(),
    milkPaymentId: integer("milk_payment_id")
      .notNull()
      .references(() => milkPayments.id, { onDelete: "cascade" }),
    milkBatchId: integer("milk_batch_id")
      .notNull()
      .references(() => milkBatches.id, { onDelete: "restrict" }),

    volumeLiters: decimal("volume_liters", {
      precision: 10,
      scale: 2,
    }).notNull(),
    pricePerLiter: decimal("price_per_liter", {
      precision: 10,
      scale: 4,
    }).notNull(),
    amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),

    ...timestamps,
  },
  (table) => [
    index("milk_payment_batches_payment_idx").on(table.milkPaymentId),
    index("milk_payment_batches_batch_idx").on(table.milkBatchId),
    unique("milk_payment_batches_payment_batch_unique").on(
      table.milkPaymentId,
      table.milkBatchId
    ),
    check(
      "milk_payment_batches_volume_positive",
      sql`${table.volumeLiters} > 0`
    ),
    check(
      "milk_payment_batches_price_positive",
      sql`${table.pricePerLiter} >= 0`
    ),
    check("milk_payment_batches_amount_positive", sql`${table.amount} >= 0`),
  ]
);

// ============================================================================
// RELATIONS
// ============================================================================

export const milkBatchesRelations = relations(milkBatches, ({ one, many }) => ({
  farm: one(farms, {
    fields: [milkBatches.farmId],
    references: [farms.id],
  }),
  assignedTank: one(milkReceptionTanks, {
    fields: [milkBatches.assignedTankId],
    references: [milkReceptionTanks.id],
  }),
  sources: many(milkBatchSources),
  cheeseBatchSources: many(cheeseBatchSources),
  paymentBatches: many(milkPaymentBatches),
}));

export const milkBatchSourcesRelations = relations(
  milkBatchSources,
  ({ one }) => ({
    milkBatch: one(milkBatches, {
      fields: [milkBatchSources.milkBatchId],
      references: [milkBatches.id],
    }),
    livestockMilking: one(livestockMilkings, {
      fields: [milkBatchSources.livestockMilkingId],
      references: [livestockMilkings.id],
    }),
  })
);

export const milkReceptionTanksRelations = relations(
  milkReceptionTanks,
  ({ one, many }) => ({
    farm: one(farms, {
      fields: [milkReceptionTanks.farmId],
      references: [farms.id],
    }),
    batches: many(milkBatches),
  })
);

export const pasteurizationBatchesRelations = relations(
  pasteurizationBatches,
  ({ one }) => ({
    farm: one(farms, {
      fields: [pasteurizationBatches.farmId],
      references: [farms.id],
    }),
  })
);

export const cheeseBatchesRelations = relations(
  cheeseBatches,
  ({ one, many }) => ({
    farm: one(farms, {
      fields: [cheeseBatches.farmId],
      references: [farms.id],
    }),
    inventoryItem: one(inventoryItems, {
      fields: [cheeseBatches.inventoryItemId],
      references: [inventoryItems.id],
    }),
    agingRoom: one(cheeseAgingRooms, {
      fields: [cheeseBatches.agingRoomId],
      references: [cheeseAgingRooms.id],
    }),
    sources: many(cheeseBatchSources),
    wheels: many(cheeseWheels),
    bpomRegistration: one(bpomProductRegistrations, {
      fields: [cheeseBatches.bpomRegistrationId],
      references: [bpomProductRegistrations.id],
    }),
  })
);

export const cheeseBatchSourcesRelations = relations(
  cheeseBatchSources,
  ({ one }) => ({
    cheeseBatch: one(cheeseBatches, {
      fields: [cheeseBatchSources.cheeseBatchId],
      references: [cheeseBatches.id],
    }),
    milkBatch: one(milkBatches, {
      fields: [cheeseBatchSources.milkBatchId],
      references: [milkBatches.id],
    }),
  })
);

export const cheeseWheelsRelations = relations(cheeseWheels, ({ one }) => ({
  cheeseBatch: one(cheeseBatches, {
    fields: [cheeseWheels.cheeseBatchId],
    references: [cheeseBatches.id],
  }),
  agingRoom: one(cheeseAgingRooms, {
    fields: [cheeseWheels.agingRoomId],
    references: [cheeseAgingRooms.id],
  }),
}));

export const cheeseAgingRoomsRelations = relations(
  cheeseAgingRooms,
  ({ one, many }) => ({
    farm: one(farms, {
      fields: [cheeseAgingRooms.farmId],
      references: [farms.id],
    }),
    batches: many(cheeseBatches),
    wheels: many(cheeseWheels),
  })
);

export const yogurtBatchesRelations = relations(yogurtBatches, ({ one }) => ({
  farm: one(farms, {
    fields: [yogurtBatches.farmId],
    references: [farms.id],
  }),
  inventoryItem: one(inventoryItems, {
    fields: [yogurtBatches.inventoryItemId],
    references: [inventoryItems.id],
  }),
  bpomRegistration: one(bpomProductRegistrations, {
    fields: [yogurtBatches.bpomRegistrationId],
    references: [bpomProductRegistrations.id],
  }),
}));

export const butterBatchesRelations = relations(butterBatches, ({ one }) => ({
  farm: one(farms, {
    fields: [butterBatches.farmId],
    references: [farms.id],
  }),
  inventoryItem: one(inventoryItems, {
    fields: [butterBatches.inventoryItemId],
    references: [inventoryItems.id],
  }),
  bpomRegistration: one(bpomProductRegistrations, {
    fields: [butterBatches.bpomRegistrationId],
    references: [bpomProductRegistrations.id],
  }),
}));

export const milkPaymentsRelations = relations(
  milkPayments,
  ({ one, many }) => ({
    farm: one(farms, {
      fields: [milkPayments.farmId],
      references: [farms.id],
    }),
    paymentBatches: many(milkPaymentBatches),
  })
);

export const milkPaymentBatchesRelations = relations(
  milkPaymentBatches,
  ({ one }) => ({
    milkPayment: one(milkPayments, {
      fields: [milkPaymentBatches.milkPaymentId],
      references: [milkPayments.id],
    }),
    milkBatch: one(milkBatches, {
      fields: [milkPaymentBatches.milkBatchId],
      references: [milkBatches.id],
    }),
  })
);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type MilkBatchRow = typeof milkBatches.$inferSelect;
export type NewMilkBatchRow = typeof milkBatches.$inferInsert;
export type MilkBatchSourceRow = typeof milkBatchSources.$inferSelect;
export type NewMilkBatchSourceRow = typeof milkBatchSources.$inferInsert;
export type MilkReceptionTankRow = typeof milkReceptionTanks.$inferSelect;
export type NewMilkReceptionTankRow = typeof milkReceptionTanks.$inferInsert;
export type PasteurizationBatchRow = typeof pasteurizationBatches.$inferSelect;
export type NewPasteurizationBatchRow =
  typeof pasteurizationBatches.$inferInsert;
export type CheeseBatchRow = typeof cheeseBatches.$inferSelect;
export type NewCheeseBatchRow = typeof cheeseBatches.$inferInsert;
export type CheeseBatchSourceRow = typeof cheeseBatchSources.$inferSelect;
export type NewCheeseBatchSourceRow = typeof cheeseBatchSources.$inferInsert;
export type CheeseWheelRow = typeof cheeseWheels.$inferSelect;
export type NewCheeseWheelRow = typeof cheeseWheels.$inferInsert;
export type CheeseAgingRoomRow = typeof cheeseAgingRooms.$inferSelect;
export type NewCheeseAgingRoomRow = typeof cheeseAgingRooms.$inferInsert;
export type YogurtBatchRow = typeof yogurtBatches.$inferSelect;
export type NewYogurtBatchRow = typeof yogurtBatches.$inferInsert;
export type ButterBatchRow = typeof butterBatches.$inferSelect;
export type NewButterBatchRow = typeof butterBatches.$inferInsert;
export type MilkPaymentRow = typeof milkPayments.$inferSelect;
export type NewMilkPaymentRow = typeof milkPayments.$inferInsert;
export type MilkPaymentBatchRow = typeof milkPaymentBatches.$inferSelect;
export type NewMilkPaymentBatchRow = typeof milkPaymentBatches.$inferInsert;

export type MilkBatchStatus = (typeof milkBatchStatusEnum.enumValues)[number];
export type MilkGrade = (typeof milkGradeEnum.enumValues)[number];
export type PasteurizationMethod =
  (typeof pasteurizationMethodEnum.enumValues)[number];
export type CheeseStatus = (typeof cheeseStatusEnum.enumValues)[number];
export type CheeseType = (typeof cheeseTypeEnum.enumValues)[number];
export type YogurtType = (typeof yogurtTypeEnum.enumValues)[number];
export type ButterType = (typeof butterTypeEnum.enumValues)[number];
export type PaymentStatus = (typeof paymentStatusEnum.enumValues)[number];
