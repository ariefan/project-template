import { relations } from "drizzle-orm";
import {
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
import { clinics } from "./clinics";
import { products } from "./services";

// ============================================================================
// ENUMS
// ============================================================================

export const transactionTypeEnum = pgEnum("transaction_type", [
  "purchase",
  "sale",
  "adjustment",
  "return",
  "transfer",
  "expired",
  "damaged",
  "used",
]);

export const stockStatusEnum = pgEnum("stock_status", [
  "in_stock",
  "low_stock",
  "out_of_stock",
  "discontinued",
]);

// Type exports
export type TransactionType = (typeof transactionTypeEnum.enumValues)[number];
export type StockStatus = (typeof stockStatusEnum.enumValues)[number];

// ============================================================================
// TABLES
// ============================================================================

export const inventoryLocations = pgTable(
  "vet_inventory_locations",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),

    // Location details
    name: text("name").notNull(),
    description: text("description"),
    locationType: text("location_type"), // e.g., "pharmacy", "surgery_room", "storage", "exam_room"

    // Metadata
    metadata: json("metadata").$type<Record<string, unknown>>(),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("vet_inventory_locations_clinic_id_idx").on(table.clinicId),
    index("vet_inventory_locations_type_idx").on(table.locationType),
  ]
);

export const inventoryItems = pgTable(
  "vet_inventory_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),

    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),

    locationId: uuid("location_id").references(() => inventoryLocations.id, {
      onDelete: "set null",
    }),

    // Stock levels
    quantityOnHand: integer("quantity_on_hand").default(0).notNull(),
    quantityReserved: integer("quantity_reserved").default(0).notNull(),
    quantityAvailable: integer("quantity_available").default(0).notNull(),

    // Reorder management
    reorderPoint: integer("reorder_point"),
    reorderQuantity: integer("reorder_quantity"),

    // Status
    stockStatus: stockStatusEnum("stock_status").default("in_stock").notNull(),

    // Last update
    lastRestockedAt: timestamp("last_restock_at"),
    lastCountedAt: timestamp("last_counted_at"),

    // Metadata
    metadata: json("metadata").$type<Record<string, unknown>>(),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("vet_inventory_items_product_id_idx").on(table.productId),
    index("vet_inventory_items_clinic_id_idx").on(table.clinicId),
    index("vet_inventory_items_location_id_idx").on(table.locationId),
    index("vet_inventory_items_stock_status_idx").on(table.stockStatus),
  ]
);

export const inventoryBatches = pgTable(
  "vet_inventory_batches",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    inventoryItemId: uuid("inventory_item_id")
      .notNull()
      .references(() => inventoryItems.id, { onDelete: "cascade" }),

    // Batch details
    batchNumber: text("batch_number").notNull(),
    lotNumber: text("lot_number"),

    // Quantity
    quantityReceived: integer("quantity_received").notNull(),
    quantityRemaining: integer("quantity_remaining").notNull(),

    // Supplier
    supplierName: text("supplier_name"),
    purchaseOrderNumber: text("purchase_order_number"),

    // Cost
    unitCost: decimal("unit_cost", { precision: 12, scale: 2 }),
    totalCost: decimal("total_cost", { precision: 12, scale: 2 }),

    // Dates
    receivedDate: date("received_date").notNull(),
    manufactureDate: date("manufacture_date"),
    expiryDate: date("expiry_date"),

    // Storage
    storageConditions: text("storage_conditions"),

    // Notes
    notes: text("notes"),

    // Metadata
    metadata: json("metadata").$type<Record<string, unknown>>(),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("vet_inventory_batches_inventory_item_id_idx").on(table.inventoryItemId),
    index("vet_inventory_batches_expiry_date_idx").on(table.expiryDate),
    index("vet_inventory_batches_batch_number_idx").on(table.batchNumber),
  ]
);

export const inventoryTransactions = pgTable(
  "vet_inventory_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    inventoryItemId: uuid("inventory_item_id")
      .notNull()
      .references(() => inventoryItems.id, { onDelete: "cascade" }),

    batchId: uuid("batch_id").references(() => inventoryBatches.id, { onDelete: "set null" }),

    // Transaction details
    transactionType: transactionTypeEnum("transaction_type").notNull(),
    quantity: integer("quantity").notNull(),
    unitCost: decimal("unit_cost", { precision: 12, scale: 2 }),
    totalCost: decimal("total_cost", { precision: 12, scale: 2 }),

    // References
    referenceType: text("reference_type"), // e.g., "appointment", "invoice", "purchase_order"
    referenceId: uuid("reference_id"),

    // Location
    fromLocationId: uuid("from_location_id").references(() => inventoryLocations.id, {
      onDelete: "set null",
    }),
    toLocationId: uuid("to_location_id").references(() => inventoryLocations.id, {
      onDelete: "set null",
    }),

    // Transaction date
    transactionDate: timestamp("transaction_date").defaultNow().notNull(),

    // Performed by
    performedBy: uuid("performed_by"), // Staff member ID

    // Notes
    notes: text("notes"),
    reason: text("reason"),

    // Balance after transaction
    balanceAfter: integer("balance_after"),

    // Metadata
    metadata: json("metadata").$type<Record<string, unknown>>(),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("vet_inventory_transactions_inventory_item_id_idx").on(table.inventoryItemId),
    index("vet_inventory_transactions_type_idx").on(table.transactionType),
    index("vet_inventory_transactions_date_idx").on(table.transactionDate),
    index("vet_inventory_transactions_reference_idx").on(table.referenceType, table.referenceId),
  ]
);

export const purchaseOrders = pgTable(
  "vet_purchase_orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),

    // PO identification
    poNumber: text("po_number").notNull().unique(),

    // Supplier
    supplierName: text("supplier_name").notNull(),
    supplierContact: text("supplier_contact"),
    supplierEmail: text("supplier_email"),
    supplierPhone: text("supplier_phone"),

    // Status
    status: text("status").default("draft").notNull(), // draft, sent, confirmed, received, cancelled

    // Amounts
    subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
    taxAmount: decimal("tax_amount", { precision: 12, scale: 2 }).default("0"),
    shippingCost: decimal("shipping_cost", { precision: 12, scale: 2 }).default("0"),
    totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),

    // Items (stored as JSON for flexibility)
    items: json("items").$type<
      Array<{
        productId: string;
        productName: string;
        quantity: number;
        unitCost: number;
        totalCost: number;
      }>
    >(),

    // Dates
    orderDate: date("order_date").notNull(),
    expectedDeliveryDate: date("expected_delivery_date"),
    receivedDate: date("received_date"),

    // Delivery location
    deliveryLocationId: uuid("delivery_location_id").references(() => inventoryLocations.id, {
      onDelete: "set null",
    }),

    // Created by
    createdBy: uuid("created_by"), // Staff member ID

    // Notes
    notes: text("notes"),

    // Metadata
    metadata: json("metadata").$type<Record<string, unknown>>(),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("vet_purchase_orders_clinic_id_idx").on(table.clinicId),
    index("vet_purchase_orders_status_idx").on(table.status),
    index("vet_purchase_orders_po_number_idx").on(table.poNumber),
  ]
);

// ============================================================================
// RELATIONS
// ============================================================================

export const inventoryLocationsRelations = relations(inventoryLocations, ({ one, many }) => ({
  clinic: one(clinics, {
    fields: [inventoryLocations.clinicId],
    references: [clinics.id],
  }),
  inventoryItems: many(inventoryItems),
}));

export const inventoryItemsRelations = relations(inventoryItems, ({ one, many }) => ({
  product: one(products, {
    fields: [inventoryItems.productId],
    references: [products.id],
  }),
  clinic: one(clinics, {
    fields: [inventoryItems.clinicId],
    references: [clinics.id],
  }),
  location: one(inventoryLocations, {
    fields: [inventoryItems.locationId],
    references: [inventoryLocations.id],
  }),
  batches: many(inventoryBatches),
  transactions: many(inventoryTransactions),
}));

export const inventoryBatchesRelations = relations(inventoryBatches, ({ one }) => ({
  inventoryItem: one(inventoryItems, {
    fields: [inventoryBatches.inventoryItemId],
    references: [inventoryItems.id],
  }),
}));

export const inventoryTransactionsRelations = relations(inventoryTransactions, ({ one }) => ({
  inventoryItem: one(inventoryItems, {
    fields: [inventoryTransactions.inventoryItemId],
    references: [inventoryItems.id],
  }),
  batch: one(inventoryBatches, {
    fields: [inventoryTransactions.batchId],
    references: [inventoryBatches.id],
  }),
  fromLocation: one(inventoryLocations, {
    fields: [inventoryTransactions.fromLocationId],
    references: [inventoryLocations.id],
    relationName: "fromLocation",
  }),
  toLocation: one(inventoryLocations, {
    fields: [inventoryTransactions.toLocationId],
    references: [inventoryLocations.id],
    relationName: "toLocation",
  }),
}));

export const purchaseOrdersRelations = relations(purchaseOrders, ({ one }) => ({
  clinic: one(clinics, {
    fields: [purchaseOrders.clinicId],
    references: [clinics.id],
  }),
  deliveryLocation: one(inventoryLocations, {
    fields: [purchaseOrders.deliveryLocationId],
    references: [inventoryLocations.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type InventoryLocationRow = typeof inventoryLocations.$inferSelect;
export type NewInventoryLocationRow = typeof inventoryLocations.$inferInsert;

export type InventoryItemRow = typeof inventoryItems.$inferSelect;
export type NewInventoryItemRow = typeof inventoryItems.$inferInsert;

export type InventoryBatchRow = typeof inventoryBatches.$inferSelect;
export type NewInventoryBatchRow = typeof inventoryBatches.$inferInsert;

export type InventoryTransactionRow = typeof inventoryTransactions.$inferSelect;
export type NewInventoryTransactionRow = typeof inventoryTransactions.$inferInsert;

export type PurchaseOrderRow = typeof purchaseOrders.$inferSelect;
export type NewPurchaseOrderRow = typeof purchaseOrders.$inferInsert;
