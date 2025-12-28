import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  decimal,
  index,
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
import { livestock } from "./livestock";

// ============================================================================
// ENUMS
// ============================================================================

export const transactionTypeEnum = pgEnum("financial_transaction_type", [
  "income",
  "expense",
]);

export const transactionStatusEnum = pgEnum("financial_transaction_status", [
  "pending",
  "completed",
  "cancelled",
  "refunded",
]);

export const expenseCategoryTypeEnum = pgEnum("expense_category_type", [
  "feed",
  "veterinary",
  "equipment",
  "labor",
  "utilities",
  "maintenance",
  "transport",
  "insurance",
  "taxes",
  "other",
]);

// ============================================================================
// TABLES
// ============================================================================

export const expenseCategories = pgTable(
  "expense_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    farmId: uuid("farm_id")
      .notNull()
      .references(() => farms.id, { onDelete: "cascade" }),

    name: text("name").notNull(),
    description: text("description"),
    type: expenseCategoryTypeEnum("type").notNull(),

    parentCategoryId: uuid("parent_category_id"),

    icon: text("icon"),
    color: text("color").default("#6b7280").notNull(),

    budgetAmount: decimal("budget_amount", { precision: 15, scale: 2 }),
    budgetPeriod: text("budget_period"),

    isActive: boolean("is_active").default(true).notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("expense_categories_farm_id_idx").on(table.farmId),
    index("expense_categories_type_idx").on(table.type),
    index("expense_categories_is_active_idx").on(table.isActive),
  ]
);

export const financialTransactions = pgTable(
  "financial_transactions",
  {
    id: serial("id").primaryKey(),
    farmId: uuid("farm_id")
      .notNull()
      .references(() => farms.id, { onDelete: "cascade" }),

    type: transactionTypeEnum("type").notNull(),
    status: transactionStatusEnum("status").default("completed").notNull(),

    categoryId: uuid("category_id").references(() => expenseCategories.id, {
      onDelete: "set null",
    }),

    livestockId: uuid("livestock_id").references(() => livestock.id, {
      onDelete: "set null",
    }),
    herdId: uuid("herd_id").references(() => herds.id, {
      onDelete: "set null",
    }),

    referenceType: text("reference_type"),
    referenceId: text("reference_id"),

    description: text("description").notNull(),

    amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
    currency: text("currency").default("IDR").notNull(),

    transactionDate: date("transaction_date").notNull(),

    paymentMethod: text("payment_method"),
    paymentReference: text("payment_reference"),

    partyName: text("party_name"),
    partyPhone: text("party_phone"),
    partyEmail: text("party_email"),

    receiptPath: text("receipt_path"),
    attachments: json("attachments").$type<string[] | null>(),

    notes: text("notes"),
    metadata: json("metadata").$type<Record<string, unknown> | null>(),

    recordedBy: uuid("recorded_by").notNull(),
    approvedBy: uuid("approved_by"),
    approvedAt: timestamp("approved_at"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("financial_transactions_farm_id_idx").on(table.farmId),
    index("financial_transactions_type_idx").on(table.type),
    index("financial_transactions_status_idx").on(table.status),
    index("financial_transactions_category_id_idx").on(table.categoryId),
    index("financial_transactions_transaction_date_idx").on(
      table.transactionDate
    ),
    index("financial_transactions_livestock_id_idx").on(table.livestockId),
    index("financial_transactions_reference_idx").on(
      table.referenceType,
      table.referenceId
    ),
  ]
);

export const livestockTransfers = pgTable(
  "livestock_transfers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    farmId: uuid("farm_id")
      .notNull()
      .references(() => farms.id, { onDelete: "cascade" }),
    livestockId: uuid("livestock_id")
      .notNull()
      .references(() => livestock.id, { onDelete: "cascade" }),

    fromHerdId: uuid("from_herd_id").references(() => herds.id, {
      onDelete: "set null",
    }),
    toHerdId: uuid("to_herd_id").references(() => herds.id, {
      onDelete: "set null",
    }),

    transferDate: timestamp("transfer_date").notNull(),

    reason: text("reason"),
    notes: text("notes"),

    transferredBy: uuid("transferred_by").notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("livestock_transfers_farm_id_idx").on(table.farmId),
    index("livestock_transfers_livestock_id_idx").on(table.livestockId),
    index("livestock_transfers_from_herd_id_idx").on(table.fromHerdId),
    index("livestock_transfers_to_herd_id_idx").on(table.toHerdId),
    index("livestock_transfers_transfer_date_idx").on(table.transferDate),
  ]
);

// ============================================================================
// RELATIONS
// ============================================================================

export const expenseCategoriesRelations = relations(
  expenseCategories,
  ({ one, many }) => ({
    farm: one(farms, {
      fields: [expenseCategories.farmId],
      references: [farms.id],
    }),
    parentCategory: one(expenseCategories, {
      fields: [expenseCategories.parentCategoryId],
      references: [expenseCategories.id],
      relationName: "parentCategory",
    }),
    childCategories: many(expenseCategories, {
      relationName: "parentCategory",
    }),
    transactions: many(financialTransactions),
  })
);

export const financialTransactionsRelations = relations(
  financialTransactions,
  ({ one }) => ({
    farm: one(farms, {
      fields: [financialTransactions.farmId],
      references: [farms.id],
    }),
    category: one(expenseCategories, {
      fields: [financialTransactions.categoryId],
      references: [expenseCategories.id],
    }),
    livestock: one(livestock, {
      fields: [financialTransactions.livestockId],
      references: [livestock.id],
    }),
    herd: one(herds, {
      fields: [financialTransactions.herdId],
      references: [herds.id],
    }),
  })
);

export const livestockTransfersRelations = relations(
  livestockTransfers,
  ({ one }) => ({
    farm: one(farms, {
      fields: [livestockTransfers.farmId],
      references: [farms.id],
    }),
    livestock: one(livestock, {
      fields: [livestockTransfers.livestockId],
      references: [livestock.id],
    }),
    fromHerd: one(herds, {
      fields: [livestockTransfers.fromHerdId],
      references: [herds.id],
      relationName: "transfersOut",
    }),
    toHerd: one(herds, {
      fields: [livestockTransfers.toHerdId],
      references: [herds.id],
      relationName: "transfersIn",
    }),
  })
);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type ExpenseCategoryRow = typeof expenseCategories.$inferSelect;
export type NewExpenseCategoryRow = typeof expenseCategories.$inferInsert;
export type FinancialTransactionRow = typeof financialTransactions.$inferSelect;
export type NewFinancialTransactionRow =
  typeof financialTransactions.$inferInsert;
export type LivestockTransferRow = typeof livestockTransfers.$inferSelect;
export type NewLivestockTransferRow = typeof livestockTransfers.$inferInsert;

export type FinancialTransactionType =
  (typeof transactionTypeEnum.enumValues)[number];
export type FinancialTransactionStatus =
  (typeof transactionStatusEnum.enumValues)[number];
export type ExpenseCategoryType =
  (typeof expenseCategoryTypeEnum.enumValues)[number];
