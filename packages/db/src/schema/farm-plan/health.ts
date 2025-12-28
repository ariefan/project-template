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
  serial,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { farms } from "./farms";
import { herds } from "./herds";
import { inventoryItems } from "./inventory";
import { livestock } from "./livestock";

// ============================================================================
// ENUMS
// ============================================================================

export const treatmentStatusEnum = pgEnum("treatment_status", [
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
  "missed",
]);

export const vaccinationStatusEnum = pgEnum("vaccination_status", [
  "scheduled",
  "administered",
  "missed",
  "cancelled",
]);

export const livestockAlertSeverityEnum = pgEnum("livestock_alert_severity", [
  "low",
  "medium",
  "high",
  "critical",
]);

export const livestockAlertTypeEnum = pgEnum("livestock_alert_type", [
  "health_check_due",
  "vaccination_due",
  "treatment_due",
  "breeding_due",
  "pregnancy_check",
  "calving_expected",
  "weight_loss",
  "low_milk_production",
  "general",
]);

// ============================================================================
// TABLES
// ============================================================================

export const vaccinationSchedules = pgTable(
  "vaccination_schedules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    farmId: uuid("farm_id")
      .notNull()
      .references(() => farms.id, { onDelete: "cascade" }),

    name: text("name").notNull(),
    description: text("description"),

    vaccineName: text("vaccine_name").notNull(),
    vaccineInventoryItemId: integer("vaccine_inventory_item_id").references(
      () => inventoryItems.id,
      { onDelete: "set null" }
    ),

    dosage: decimal("dosage", { precision: 8, scale: 3 }),
    dosageUnit: text("dosage_unit"),

    intervalDays: integer("interval_days").notNull(),
    ageAtFirstDose: integer("age_at_first_dose"),

    speciesFilter: json("species_filter").$type<string[] | null>(),
    breedFilter: json("breed_filter").$type<string[] | null>(),

    isActive: boolean("is_active").default(true).notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("vaccination_schedules_farm_id_idx").on(table.farmId),
    index("vaccination_schedules_is_active_idx").on(table.isActive),
  ]
);

export const vaccinationRecords = pgTable(
  "vaccination_records",
  {
    id: serial("id").primaryKey(),
    farmId: uuid("farm_id")
      .notNull()
      .references(() => farms.id, { onDelete: "cascade" }),
    livestockId: uuid("livestock_id")
      .notNull()
      .references(() => livestock.id, { onDelete: "cascade" }),
    vaccinationScheduleId: uuid("vaccination_schedule_id").references(
      () => vaccinationSchedules.id,
      { onDelete: "set null" }
    ),

    vaccineName: text("vaccine_name").notNull(),
    batchNumber: text("batch_number"),

    scheduledDate: date("scheduled_date").notNull(),
    administeredDate: date("administered_date"),

    status: vaccinationStatusEnum("status").default("scheduled").notNull(),

    dosage: decimal("dosage", { precision: 8, scale: 3 }),
    dosageUnit: text("dosage_unit"),
    administrationRoute: text("administration_route"),

    administeredBy: uuid("administered_by"),
    notes: text("notes"),

    nextDueDate: date("next_due_date"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("vaccination_records_farm_id_idx").on(table.farmId),
    index("vaccination_records_livestock_id_idx").on(table.livestockId),
    index("vaccination_records_scheduled_date_idx").on(table.scheduledDate),
    index("vaccination_records_status_idx").on(table.status),
  ]
);

export const treatmentPlans = pgTable(
  "treatment_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    farmId: uuid("farm_id")
      .notNull()
      .references(() => farms.id, { onDelete: "cascade" }),
    livestockId: uuid("livestock_id").references(() => livestock.id, {
      onDelete: "cascade",
    }),
    herdId: uuid("herd_id").references(() => herds.id, {
      onDelete: "cascade",
    }),

    name: text("name").notNull(),
    description: text("description"),

    diagnosis: text("diagnosis"),

    startDate: date("start_date").notNull(),
    endDate: date("end_date"),

    status: treatmentStatusEnum("status").default("scheduled").notNull(),

    prescribedBy: uuid("prescribed_by"),
    prescribedAt: timestamp("prescribed_at"),

    medications: json("medications").$type<Array<{
      name: string;
      dosage: string;
      frequency: string;
      duration: string;
      inventoryItemId?: number;
    }> | null>(),

    instructions: text("instructions"),

    totalCost: decimal("total_cost", { precision: 15, scale: 2 }),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("treatment_plans_farm_id_idx").on(table.farmId),
    index("treatment_plans_livestock_id_idx").on(table.livestockId),
    index("treatment_plans_herd_id_idx").on(table.herdId),
    index("treatment_plans_status_idx").on(table.status),
    index("treatment_plans_start_date_idx").on(table.startDate),
  ]
);

export const treatmentRecords = pgTable(
  "treatment_records",
  {
    id: serial("id").primaryKey(),
    treatmentPlanId: uuid("treatment_plan_id")
      .notNull()
      .references(() => treatmentPlans.id, { onDelete: "cascade" }),

    treatmentDate: timestamp("treatment_date").notNull(),

    medicationGiven: text("medication_given"),
    dosageGiven: text("dosage_given"),

    administeredBy: uuid("administered_by").notNull(),

    livestockResponse: text("livestock_response"),
    notes: text("notes"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("treatment_records_treatment_plan_id_idx").on(table.treatmentPlanId),
    index("treatment_records_treatment_date_idx").on(table.treatmentDate),
  ]
);

export const livestockAlerts = pgTable(
  "livestock_alerts",
  {
    id: serial("id").primaryKey(),
    farmId: uuid("farm_id")
      .notNull()
      .references(() => farms.id, { onDelete: "cascade" }),
    livestockId: uuid("livestock_id").references(() => livestock.id, {
      onDelete: "cascade",
    }),
    herdId: uuid("herd_id").references(() => herds.id, {
      onDelete: "cascade",
    }),

    alertType: livestockAlertTypeEnum("alert_type").notNull(),
    severity: livestockAlertSeverityEnum("severity").notNull(),

    title: text("title").notNull(),
    message: text("message").notNull(),

    dueDate: date("due_date"),

    metadata: json("metadata").$type<Record<string, unknown> | null>(),

    isRead: boolean("is_read").default(false).notNull(),
    isResolved: boolean("is_resolved").default(false).notNull(),
    resolvedAt: timestamp("resolved_at"),
    resolvedBy: uuid("resolved_by"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("livestock_alerts_farm_id_idx").on(table.farmId),
    index("livestock_alerts_livestock_id_idx").on(table.livestockId),
    index("livestock_alerts_is_resolved_idx").on(table.isResolved),
    index("livestock_alerts_due_date_idx").on(table.dueDate),
    index("livestock_alerts_severity_type_idx").on(
      table.severity,
      table.alertType
    ),
  ]
);

// ============================================================================
// RELATIONS
// ============================================================================

export const vaccinationSchedulesRelations = relations(
  vaccinationSchedules,
  ({ one, many }) => ({
    farm: one(farms, {
      fields: [vaccinationSchedules.farmId],
      references: [farms.id],
    }),
    vaccineInventoryItem: one(inventoryItems, {
      fields: [vaccinationSchedules.vaccineInventoryItemId],
      references: [inventoryItems.id],
    }),
    vaccinationRecords: many(vaccinationRecords),
  })
);

export const vaccinationRecordsRelations = relations(
  vaccinationRecords,
  ({ one }) => ({
    farm: one(farms, {
      fields: [vaccinationRecords.farmId],
      references: [farms.id],
    }),
    livestock: one(livestock, {
      fields: [vaccinationRecords.livestockId],
      references: [livestock.id],
    }),
    vaccinationSchedule: one(vaccinationSchedules, {
      fields: [vaccinationRecords.vaccinationScheduleId],
      references: [vaccinationSchedules.id],
    }),
  })
);

export const treatmentPlansRelations = relations(
  treatmentPlans,
  ({ one, many }) => ({
    farm: one(farms, {
      fields: [treatmentPlans.farmId],
      references: [farms.id],
    }),
    livestock: one(livestock, {
      fields: [treatmentPlans.livestockId],
      references: [livestock.id],
    }),
    herd: one(herds, {
      fields: [treatmentPlans.herdId],
      references: [herds.id],
    }),
    treatmentRecords: many(treatmentRecords),
  })
);

export const treatmentRecordsRelations = relations(
  treatmentRecords,
  ({ one }) => ({
    treatmentPlan: one(treatmentPlans, {
      fields: [treatmentRecords.treatmentPlanId],
      references: [treatmentPlans.id],
    }),
  })
);

export const livestockAlertsRelations = relations(
  livestockAlerts,
  ({ one }) => ({
    farm: one(farms, {
      fields: [livestockAlerts.farmId],
      references: [farms.id],
    }),
    livestock: one(livestock, {
      fields: [livestockAlerts.livestockId],
      references: [livestock.id],
    }),
    herd: one(herds, {
      fields: [livestockAlerts.herdId],
      references: [herds.id],
    }),
  })
);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type VaccinationScheduleRow = typeof vaccinationSchedules.$inferSelect;
export type NewVaccinationScheduleRow =
  typeof vaccinationSchedules.$inferInsert;
export type VaccinationRecordRow = typeof vaccinationRecords.$inferSelect;
export type NewVaccinationRecordRow = typeof vaccinationRecords.$inferInsert;
export type TreatmentPlanRow = typeof treatmentPlans.$inferSelect;
export type NewTreatmentPlanRow = typeof treatmentPlans.$inferInsert;
export type TreatmentRecordRow = typeof treatmentRecords.$inferSelect;
export type NewTreatmentRecordRow = typeof treatmentRecords.$inferInsert;
export type LivestockAlertRow = typeof livestockAlerts.$inferSelect;
export type NewLivestockAlertRow = typeof livestockAlerts.$inferInsert;

export type TreatmentStatus = (typeof treatmentStatusEnum.enumValues)[number];
export type VaccinationStatus =
  (typeof vaccinationStatusEnum.enumValues)[number];
export type LivestockAlertSeverity =
  (typeof livestockAlertSeverityEnum.enumValues)[number];
export type LivestockAlertType =
  (typeof livestockAlertTypeEnum.enumValues)[number];
