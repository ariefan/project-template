import { relations } from "drizzle-orm";
import {
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
import { farmTasks, farmWorkers } from "./labor";

// ============================================================================
// ENUMS
// ============================================================================

export const equipmentStatusEnum = pgEnum("equipment_status", [
  "operational",
  "needs_maintenance",
  "under_repair",
  "retired",
  "sold",
]);

export const equipmentCategoryEnum = pgEnum("equipment_category", [
  "tractor",
  "vehicle",
  "milking",
  "feeding",
  "processing",
  "irrigation",
  "fencing",
  "handling",
  "storage",
  "other",
]);

export const maintenanceTypeEnum = pgEnum("maintenance_type", [
  "preventive",
  "corrective",
  "emergency",
  "inspection",
]);

export const maintenanceStatusEnum = pgEnum("maintenance_status", [
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
]);

// ============================================================================
// TABLES
// ============================================================================

export const equipment = pgTable(
  "equipment",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    farmId: uuid("farm_id")
      .notNull()
      .references(() => farms.id, { onDelete: "cascade" }),

    name: text("name").notNull(),
    category: equipmentCategoryEnum("category").notNull(),
    manufacturer: text("manufacturer"),
    model: text("model"),
    serialNumber: text("serial_number"),
    yearManufactured: integer("year_manufactured"),

    purchaseDate: date("purchase_date"),
    purchasePrice: decimal("purchase_price", { precision: 12, scale: 2 }),
    currentValue: decimal("current_value", { precision: 12, scale: 2 }),
    depreciationRate: decimal("depreciation_rate", { precision: 5, scale: 2 }),

    status: equipmentStatusEnum("status").default("operational").notNull(),
    location: text("location"),
    assignedToId: uuid("assigned_to_id").references(() => farmWorkers.id, {
      onDelete: "set null",
    }),

    // Fuel/operating info
    fuelType: text("fuel_type"),
    currentHours: decimal("current_hours", { precision: 10, scale: 2 }),
    currentMileage: decimal("current_mileage", { precision: 12, scale: 2 }),

    // Maintenance schedule
    maintenanceIntervalHours: integer("maintenance_interval_hours"),
    maintenanceIntervalDays: integer("maintenance_interval_days"),
    lastMaintenanceDate: date("last_maintenance_date"),
    nextMaintenanceDate: date("next_maintenance_date"),

    warrantyExpiry: date("warranty_expiry"),
    insuranceExpiry: date("insurance_expiry"),
    registrationExpiry: date("registration_expiry"),

    notes: text("notes"),
    photo: json("photo").$type<string[] | null>(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    index("equipment_farm_id_idx").on(table.farmId),
    index("equipment_status_idx").on(table.status),
    index("equipment_category_idx").on(table.category),
    index("equipment_next_maintenance_date_idx").on(table.nextMaintenanceDate),
    index("equipment_assigned_to_id_idx").on(table.assignedToId),
  ]
);

export const maintenanceRecords = pgTable(
  "maintenance_records",
  {
    id: serial("id").primaryKey(),
    equipmentId: uuid("equipment_id")
      .notNull()
      .references(() => equipment.id, { onDelete: "cascade" }),
    farmId: uuid("farm_id")
      .notNull()
      .references(() => farms.id, { onDelete: "cascade" }),

    maintenanceType: maintenanceTypeEnum("maintenance_type").notNull(),
    status: maintenanceStatusEnum("status").default("scheduled").notNull(),

    scheduledDate: date("scheduled_date").notNull(),
    startedDate: timestamp("started_date"),
    completedDate: timestamp("completed_date"),

    description: text("description").notNull(),
    workPerformed: text("work_performed"),
    partsUsed: json("parts_used").$type<Array<{
      name: string;
      quantity: number;
      cost: number;
    }> | null>(),

    laborCost: decimal("labor_cost", { precision: 10, scale: 2 }),
    partsCost: decimal("parts_cost", { precision: 10, scale: 2 }),
    totalCost: decimal("total_cost", { precision: 10, scale: 2 }),

    performedById: uuid("performed_by_id").references(() => farmWorkers.id, {
      onDelete: "set null",
    }),
    externalVendor: text("external_vendor"),
    vendorInvoiceNumber: text("vendor_invoice_number"),

    hoursAtService: decimal("hours_at_service", { precision: 10, scale: 2 }),
    mileageAtService: decimal("mileage_at_service", {
      precision: 12,
      scale: 2,
    }),

    nextServiceDate: date("next_service_date"),
    nextServiceHours: decimal("next_service_hours", {
      precision: 10,
      scale: 2,
    }),

    notes: text("notes"),
    attachments: json("attachments").$type<string[] | null>(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("maintenance_records_equipment_id_idx").on(table.equipmentId),
    index("maintenance_records_farm_id_idx").on(table.farmId),
    index("maintenance_records_scheduled_date_idx").on(table.scheduledDate),
    index("maintenance_records_status_idx").on(table.status),
    index("maintenance_records_type_idx").on(table.maintenanceType),
    index("maintenance_records_performed_by_id_idx").on(table.performedById),
  ]
);

export const equipmentUsageLogs = pgTable(
  "equipment_usage_logs",
  {
    id: serial("id").primaryKey(),
    equipmentId: uuid("equipment_id")
      .notNull()
      .references(() => equipment.id, { onDelete: "cascade" }),
    farmId: uuid("farm_id")
      .notNull()
      .references(() => farms.id, { onDelete: "cascade" }),

    usageDate: date("usage_date").notNull(),
    operatorId: uuid("operator_id").references(() => farmWorkers.id, {
      onDelete: "set null",
    }),

    hoursUsed: decimal("hours_used", { precision: 6, scale: 2 }),
    mileageUsed: decimal("mileage_used", { precision: 10, scale: 2 }),
    fuelConsumed: decimal("fuel_consumed", { precision: 8, scale: 2 }),

    purpose: text("purpose"),
    taskId: uuid("task_id").references(() => farmTasks.id, {
      onDelete: "set null",
    }),

    startHours: decimal("start_hours", { precision: 10, scale: 2 }),
    endHours: decimal("end_hours", { precision: 10, scale: 2 }),

    notes: text("notes"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("equipment_usage_logs_equipment_id_idx").on(table.equipmentId),
    index("equipment_usage_logs_farm_id_idx").on(table.farmId),
    index("equipment_usage_logs_usage_date_idx").on(table.usageDate),
    index("equipment_usage_logs_operator_id_idx").on(table.operatorId),
    index("equipment_usage_logs_task_id_idx").on(table.taskId),
  ]
);

// ============================================================================
// RELATIONS
// ============================================================================

export const equipmentRelations = relations(equipment, ({ one, many }) => ({
  farm: one(farms, {
    fields: [equipment.farmId],
    references: [farms.id],
  }),
  assignedTo: one(farmWorkers, {
    fields: [equipment.assignedToId],
    references: [farmWorkers.id],
  }),
  maintenanceRecords: many(maintenanceRecords),
  usageLogs: many(equipmentUsageLogs),
}));

export const maintenanceRecordsRelations = relations(
  maintenanceRecords,
  ({ one }) => ({
    equipment: one(equipment, {
      fields: [maintenanceRecords.equipmentId],
      references: [equipment.id],
    }),
    farm: one(farms, {
      fields: [maintenanceRecords.farmId],
      references: [farms.id],
    }),
    performedBy: one(farmWorkers, {
      fields: [maintenanceRecords.performedById],
      references: [farmWorkers.id],
    }),
  })
);

export const equipmentUsageLogsRelations = relations(
  equipmentUsageLogs,
  ({ one }) => ({
    equipment: one(equipment, {
      fields: [equipmentUsageLogs.equipmentId],
      references: [equipment.id],
    }),
    farm: one(farms, {
      fields: [equipmentUsageLogs.farmId],
      references: [farms.id],
    }),
    operator: one(farmWorkers, {
      fields: [equipmentUsageLogs.operatorId],
      references: [farmWorkers.id],
    }),
    task: one(farmTasks, {
      fields: [equipmentUsageLogs.taskId],
      references: [farmTasks.id],
    }),
  })
);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type EquipmentRow = typeof equipment.$inferSelect;
export type NewEquipmentRow = typeof equipment.$inferInsert;
export type MaintenanceRecordRow = typeof maintenanceRecords.$inferSelect;
export type NewMaintenanceRecordRow = typeof maintenanceRecords.$inferInsert;
export type EquipmentUsageLogRow = typeof equipmentUsageLogs.$inferSelect;
export type NewEquipmentUsageLogRow = typeof equipmentUsageLogs.$inferInsert;

export type EquipmentStatus = (typeof equipmentStatusEnum.enumValues)[number];
export type EquipmentCategory =
  (typeof equipmentCategoryEnum.enumValues)[number];
export type MaintenanceType = (typeof maintenanceTypeEnum.enumValues)[number];
export type MaintenanceStatus =
  (typeof maintenanceStatusEnum.enumValues)[number];
