import { relations } from "drizzle-orm";
import {
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
import { appointments } from "./appointments";
import { clients } from "./clients";
import { patients } from "./patients";

// ============================================================================
// ENUMS
// ============================================================================

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "draft",
  "pending",
  "sent",
  "partially_paid",
  "paid",
  "overdue",
  "cancelled",
  "refunded",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "processing",
  "completed",
  "failed",
  "refunded",
  "cancelled",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "cash",
  "credit_card",
  "debit_card",
  "bank_transfer",
  "mobile_payment",
  "check",
  "insurance",
  "account_credit",
]);

export const taxTypeEnum = pgEnum("tax_type", [
  "vat",
  "sales_tax",
  "gst",
  "none",
]);

// Type exports
export type InvoiceStatus = (typeof invoiceStatusEnum.enumValues)[number];
export type PaymentStatus = (typeof paymentStatusEnum.enumValues)[number];
export type PaymentMethod = (typeof paymentMethodEnum.enumValues)[number];
export type TaxType = (typeof taxTypeEnum.enumValues)[number];

// ============================================================================
// TABLES
// ============================================================================

export const invoices = pgTable(
  "vet_invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Invoice identification
    invoiceNumber: text("invoice_number").notNull().unique(),

    // Client and patient
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    patientId: uuid("patient_id").references(() => patients.id, { onDelete: "set null" }),

    // Related appointment
    appointmentId: uuid("appointment_id").references(() => appointments.id, {
      onDelete: "set null",
    }),

    // Invoice details
    status: invoiceStatusEnum("status").default("draft").notNull(),
    issueDate: timestamp("issue_date").defaultNow().notNull(),
    dueDate: timestamp("due_date"),

    // Amounts
    subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
    discountAmount: decimal("discount_amount", { precision: 12, scale: 2 }).default("0"),
    discountPercentage: decimal("discount_percentage", { precision: 5, scale: 2 }),
    taxAmount: decimal("tax_amount", { precision: 12, scale: 2 }).default("0"),
    taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).default("0"), // e.g., 11% PPN in Indonesia
    totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),

    // Payment tracking
    amountPaid: decimal("amount_paid", { precision: 12, scale: 2 }).default("0").notNull(),
    amountDue: decimal("amount_due", { precision: 12, scale: 2 }).notNull(),

    // Tax
    taxType: taxTypeEnum("tax_type").default("vat"),
    taxId: text("tax_id"), // Tax invoice number

    // Notes
    notes: text("notes"),
    internalNotes: text("internal_notes"),
    termsConditions: text("terms_conditions"),

    // Timestamps
    paidAt: timestamp("paid_at"),
    sentAt: timestamp("sent_at"),
    cancelledAt: timestamp("cancelled_at"),
    cancellationReason: text("cancellation_reason"),

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
    index("vet_invoices_client_id_idx").on(table.clientId),
    index("vet_invoices_patient_id_idx").on(table.patientId),
    index("vet_invoices_status_idx").on(table.status),
    index("vet_invoices_invoice_number_idx").on(table.invoiceNumber),
    index("vet_invoices_due_date_idx").on(table.dueDate),
  ]
);

export const invoiceItems = pgTable(
  "vet_invoice_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),

    // Item details
    itemType: text("item_type").notNull(), // e.g., "service", "product", "medication", "procedure"
    itemId: uuid("item_id"), // Reference to service, product, or medication

    description: text("description").notNull(),
    quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
    unitPrice: decimal("unit_price", { precision: 12, scale: 2 }).notNull(),

    // Discount
    discountAmount: decimal("discount_amount", { precision: 12, scale: 2 }).default("0"),
    discountPercentage: decimal("discount_percentage", { precision: 5, scale: 2 }),

    // Tax
    taxable: text("taxable").default("true"),
    taxAmount: decimal("tax_amount", { precision: 12, scale: 2 }).default("0"),

    // Total
    totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),

    // Notes
    notes: text("notes"),

    // Sorting
    sortOrder: integer("sort_order").default(0),

    // Metadata
    metadata: json("metadata").$type<Record<string, unknown>>(),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("vet_invoice_items_invoice_id_idx").on(table.invoiceId),
    index("vet_invoice_items_item_type_idx").on(table.itemType),
  ]
);

export const payments = pgTable(
  "vet_payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Payment identification
    paymentNumber: text("payment_number").notNull().unique(),

    // Invoice
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),

    // Client
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),

    // Payment details
    paymentMethod: paymentMethodEnum("payment_method").notNull(),
    status: paymentStatusEnum("status").default("pending").notNull(),

    // Amounts
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),

    // Payment date
    paymentDate: timestamp("payment_date").defaultNow().notNull(),

    // Payment processor details
    transactionId: text("transaction_id"), // External transaction ID
    processorName: text("processor_name"), // e.g., "Stripe", "Bank Transfer"

    // Card/Check details
    cardLast4: text("card_last4"),
    checkNumber: text("check_number"),

    // Bank transfer details
    bankName: text("bank_name"),
    accountNumber: text("account_number"),

    // Insurance payment
    insuranceClaimNumber: text("insurance_claim_number"),

    // Receipt
    receiptNumber: text("receipt_number"),
    receiptUrl: text("receipt_url"),

    // Notes
    notes: text("notes"),

    // Refund tracking
    refundedAmount: decimal("refunded_amount", { precision: 12, scale: 2 }).default("0"),
    refundedAt: timestamp("refunded_at"),
    refundReason: text("refund_reason"),

    // Processed by
    processedBy: uuid("processed_by"), // Staff member ID

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
    index("vet_payments_invoice_id_idx").on(table.invoiceId),
    index("vet_payments_client_id_idx").on(table.clientId),
    index("vet_payments_status_idx").on(table.status),
    index("vet_payments_payment_number_idx").on(table.paymentNumber),
    index("vet_payments_payment_date_idx").on(table.paymentDate),
  ]
);

export const estimates = pgTable(
  "vet_estimates",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Estimate identification
    estimateNumber: text("estimate_number").notNull().unique(),

    // Client and patient
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    patientId: uuid("patient_id").references(() => patients.id, { onDelete: "set null" }),

    // Estimate details
    title: text("title").notNull(),
    description: text("description"),

    // Status
    status: text("status").default("draft").notNull(), // draft, sent, accepted, declined, expired

    // Amounts
    subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
    taxAmount: decimal("tax_amount", { precision: 12, scale: 2 }).default("0"),
    totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),

    // Dates
    issueDate: timestamp("issue_date").defaultNow().notNull(),
    expiryDate: timestamp("expiry_date"),

    // Items (stored as JSON for flexibility)
    items: json("items").$type<
      Array<{
        description: string;
        quantity: number;
        unitPrice: number;
        totalAmount: number;
      }>
    >(),

    // Notes
    notes: text("notes"),

    // Conversion tracking
    convertedToInvoiceId: uuid("converted_to_invoice_id").references(() => invoices.id, {
      onDelete: "set null",
    }),
    convertedAt: timestamp("converted_at"),

    // Created by
    createdBy: uuid("created_by"), // Staff member ID

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
    index("vet_estimates_client_id_idx").on(table.clientId),
    index("vet_estimates_patient_id_idx").on(table.patientId),
    index("vet_estimates_status_idx").on(table.status),
    index("vet_estimates_estimate_number_idx").on(table.estimateNumber),
  ]
);

// ============================================================================
// RELATIONS
// ============================================================================

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  client: one(clients, {
    fields: [invoices.clientId],
    references: [clients.id],
  }),
  patient: one(patients, {
    fields: [invoices.patientId],
    references: [patients.id],
  }),
  appointment: one(appointments, {
    fields: [invoices.appointmentId],
    references: [appointments.id],
  }),
  items: many(invoiceItems),
  payments: many(payments),
}));

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceItems.invoiceId],
    references: [invoices.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  invoice: one(invoices, {
    fields: [payments.invoiceId],
    references: [invoices.id],
  }),
  client: one(clients, {
    fields: [payments.clientId],
    references: [clients.id],
  }),
}));

export const estimatesRelations = relations(estimates, ({ one }) => ({
  client: one(clients, {
    fields: [estimates.clientId],
    references: [clients.id],
  }),
  patient: one(patients, {
    fields: [estimates.patientId],
    references: [patients.id],
  }),
  convertedInvoice: one(invoices, {
    fields: [estimates.convertedToInvoiceId],
    references: [invoices.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type InvoiceRow = typeof invoices.$inferSelect;
export type NewInvoiceRow = typeof invoices.$inferInsert;

export type InvoiceItemRow = typeof invoiceItems.$inferSelect;
export type NewInvoiceItemRow = typeof invoiceItems.$inferInsert;

export type PaymentRow = typeof payments.$inferSelect;
export type NewPaymentRow = typeof payments.$inferInsert;

export type EstimateRow = typeof estimates.$inferSelect;
export type NewEstimateRow = typeof estimates.$inferInsert;
