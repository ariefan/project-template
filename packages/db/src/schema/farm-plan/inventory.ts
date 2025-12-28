import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  decimal,
  index,
  integer,
  json,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { farms } from "./farms";
import { livestock, livestockHealthRecords } from "./livestock";

// ============================================================================
// TABLES
// ============================================================================

export const inventoryCategories = pgTable("inventory_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  icon: text("icon"),
  color: text("color").default("#6b7280").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const inventoryUnits = pgTable("inventory_units", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  symbol: text("symbol").notNull(),
  type: text("type").notNull(),
  baseFactor: decimal("base_factor", { precision: 15, scale: 6 })
    .default("1")
    .notNull(),
  isBase: boolean("is_base").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const inventoryItems = pgTable(
  "inventory_items",
  {
    id: serial("id").primaryKey(),
    farmId: uuid("farm_id")
      .notNull()
      .references(() => farms.id, { onDelete: "cascade" }),
    categoryId: integer("category_id")
      .notNull()
      .references(() => inventoryCategories.id),
    unitId: integer("unit_id")
      .notNull()
      .references(() => inventoryUnits.id),
    name: text("name").notNull(),
    brand: text("brand"),
    description: text("description"),
    sku: text("sku"),
    unitCost: decimal("unit_cost", { precision: 15, scale: 2 }),
    sellingPrice: decimal("selling_price", { precision: 15, scale: 2 }),
    minimumStock: decimal("minimum_stock", { precision: 15, scale: 3 })
      .default("0")
      .notNull(),
    currentStock: decimal("current_stock", { precision: 15, scale: 3 })
      .default("0")
      .notNull(),
    trackExpiry: boolean("track_expiry").default(false).notNull(),
    trackBatch: boolean("track_batch").default(false).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    expiryDate: date("expiry_date"),
    specifications: json("specifications").$type<Record<
      string,
      unknown
    > | null>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    unique("inventory_items_farm_name_brand_unique").on(
      table.farmId,
      table.name,
      table.brand
    ),
    index("inventory_items_farm_id_idx").on(table.farmId),
    index("inventory_items_category_id_idx").on(table.categoryId),
  ]
);

export const inventoryBatches = pgTable(
  "inventory_batches",
  {
    id: serial("id").primaryKey(),
    inventoryItemId: integer("inventory_item_id")
      .notNull()
      .references(() => inventoryItems.id, { onDelete: "cascade" }),
    batchNumber: text("batch_number").notNull().unique(),
    manufactureDate: date("manufacture_date"),
    expiryDate: date("expiry_date"),
    originalQuantity: decimal("original_quantity", {
      precision: 15,
      scale: 3,
    }).notNull(),
    currentQuantity: decimal("current_quantity", {
      precision: 15,
      scale: 3,
    }).notNull(),
    reservedQuantity: decimal("reserved_quantity", { precision: 15, scale: 3 })
      .default("0")
      .notNull(),
    unitCost: decimal("unit_cost", { precision: 15, scale: 2 }),
    supplier: text("supplier"),
    notes: text("notes"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("inventory_batches_inventory_item_id_idx").on(table.inventoryItemId),
  ]
);

export const inventoryTransactions = pgTable(
  "inventory_transactions",
  {
    id: serial("id").primaryKey(),
    inventoryItemId: integer("inventory_item_id")
      .notNull()
      .references(() => inventoryItems.id, { onDelete: "cascade" }),
    inventoryBatchId: integer("inventory_batch_id").references(
      () => inventoryBatches.id,
      { onDelete: "cascade" }
    ),
    userId: uuid("user_id").notNull(),
    type: text("type").notNull(),
    referenceType: text("reference_type"),
    referenceId: text("reference_id"),
    quantity: decimal("quantity", { precision: 15, scale: 3 }).notNull(),
    unitCost: decimal("unit_cost", { precision: 15, scale: 2 }),
    totalCost: decimal("total_cost", { precision: 15, scale: 2 }),
    notes: text("notes"),
    metadata: json("metadata").$type<Record<string, unknown> | null>(),
    transactionDate: timestamp("transaction_date").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("inventory_transactions_item_date_idx").on(
      table.inventoryItemId,
      table.transactionDate
    ),
    index("inventory_transactions_reference_idx").on(
      table.referenceType,
      table.referenceId
    ),
  ]
);

export const inventoryAlerts = pgTable(
  "inventory_alerts",
  {
    id: serial("id").primaryKey(),
    farmId: uuid("farm_id")
      .notNull()
      .references(() => farms.id, { onDelete: "cascade" }),
    inventoryItemId: integer("inventory_item_id").references(
      () => inventoryItems.id,
      { onDelete: "cascade" }
    ),
    inventoryBatchId: integer("inventory_batch_id").references(
      () => inventoryBatches.id,
      { onDelete: "cascade" }
    ),
    alertType: text("alert_type").notNull(),
    severity: text("severity").notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
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
    index("inventory_alerts_farm_read_created_idx").on(
      table.farmId,
      table.isRead,
      table.createdAt
    ),
    index("inventory_alerts_type_severity_idx").on(
      table.alertType,
      table.severity
    ),
  ]
);

export const inventoryUsageRecords = pgTable(
  "inventory_usage_records",
  {
    id: serial("id").primaryKey(),
    inventoryTransactionId: integer("inventory_transaction_id")
      .notNull()
      .references(() => inventoryTransactions.id, { onDelete: "cascade" }),
    livestockId: uuid("livestock_id").references(() => livestock.id, {
      onDelete: "cascade",
    }),
    healthRecordId: integer("health_record_id").references(
      () => livestockHealthRecords.id,
      { onDelete: "cascade" }
    ),
    quantityUsed: decimal("quantity_used", {
      precision: 15,
      scale: 3,
    }).notNull(),
    usageType: text("usage_type").notNull(),
    usageNotes: text("usage_notes"),
    usedAt: timestamp("used_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("inventory_usage_records_livestock_used_at_idx").on(
      table.livestockId,
      table.usedAt
    ),
    index("inventory_usage_records_health_record_idx").on(table.healthRecordId),
  ]
);

// ============================================================================
// RELATIONS
// ============================================================================

export const inventoryCategoriesRelations = relations(
  inventoryCategories,
  ({ many }) => ({
    items: many(inventoryItems),
  })
);

export const inventoryUnitsRelations = relations(
  inventoryUnits,
  ({ many }) => ({
    items: many(inventoryItems),
  })
);

export const inventoryItemsRelations = relations(
  inventoryItems,
  ({ one, many }) => ({
    farm: one(farms, {
      fields: [inventoryItems.farmId],
      references: [farms.id],
    }),
    category: one(inventoryCategories, {
      fields: [inventoryItems.categoryId],
      references: [inventoryCategories.id],
    }),
    unit: one(inventoryUnits, {
      fields: [inventoryItems.unitId],
      references: [inventoryUnits.id],
    }),
    batches: many(inventoryBatches),
    transactions: many(inventoryTransactions),
    alerts: many(inventoryAlerts),
  })
);

export const inventoryBatchesRelations = relations(
  inventoryBatches,
  ({ one, many }) => ({
    inventoryItem: one(inventoryItems, {
      fields: [inventoryBatches.inventoryItemId],
      references: [inventoryItems.id],
    }),
    transactions: many(inventoryTransactions),
    alerts: many(inventoryAlerts),
  })
);

export const inventoryTransactionsRelations = relations(
  inventoryTransactions,
  ({ one, many }) => ({
    inventoryItem: one(inventoryItems, {
      fields: [inventoryTransactions.inventoryItemId],
      references: [inventoryItems.id],
    }),
    inventoryBatch: one(inventoryBatches, {
      fields: [inventoryTransactions.inventoryBatchId],
      references: [inventoryBatches.id],
    }),
    usageRecords: many(inventoryUsageRecords),
  })
);

export const inventoryAlertsRelations = relations(
  inventoryAlerts,
  ({ one }) => ({
    farm: one(farms, {
      fields: [inventoryAlerts.farmId],
      references: [farms.id],
    }),
    inventoryItem: one(inventoryItems, {
      fields: [inventoryAlerts.inventoryItemId],
      references: [inventoryItems.id],
    }),
    inventoryBatch: one(inventoryBatches, {
      fields: [inventoryAlerts.inventoryBatchId],
      references: [inventoryBatches.id],
    }),
  })
);

export const inventoryUsageRecordsRelations = relations(
  inventoryUsageRecords,
  ({ one }) => ({
    inventoryTransaction: one(inventoryTransactions, {
      fields: [inventoryUsageRecords.inventoryTransactionId],
      references: [inventoryTransactions.id],
    }),
    livestock: one(livestock, {
      fields: [inventoryUsageRecords.livestockId],
      references: [livestock.id],
    }),
    healthRecord: one(livestockHealthRecords, {
      fields: [inventoryUsageRecords.healthRecordId],
      references: [livestockHealthRecords.id],
    }),
  })
);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type InventoryCategoryRow = typeof inventoryCategories.$inferSelect;
export type NewInventoryCategoryRow = typeof inventoryCategories.$inferInsert;
export type InventoryUnitRow = typeof inventoryUnits.$inferSelect;
export type NewInventoryUnitRow = typeof inventoryUnits.$inferInsert;
export type InventoryItemRow = typeof inventoryItems.$inferSelect;
export type NewInventoryItemRow = typeof inventoryItems.$inferInsert;
export type InventoryBatchRow = typeof inventoryBatches.$inferSelect;
export type NewInventoryBatchRow = typeof inventoryBatches.$inferInsert;
export type InventoryTransactionRow = typeof inventoryTransactions.$inferSelect;
export type NewInventoryTransactionRow =
  typeof inventoryTransactions.$inferInsert;
export type InventoryAlertRow = typeof inventoryAlerts.$inferSelect;
export type NewInventoryAlertRow = typeof inventoryAlerts.$inferInsert;
export type InventoryUsageRecordRow = typeof inventoryUsageRecords.$inferSelect;
export type NewInventoryUsageRecordRow =
  typeof inventoryUsageRecords.$inferInsert;
