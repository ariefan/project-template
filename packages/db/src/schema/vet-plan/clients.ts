import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  decimal,
  index,
  json,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// ============================================================================
// ENUMS
// ============================================================================

export const clientTypeEnum = pgEnum("client_type", [
  "individual",
  "family",
  "breeder",
  "farm",
  "rescue_organization",
  "corporate",
]);

export const clientStatusEnum = pgEnum("client_status", [
  "active",
  "inactive",
  "blocked",
]);

export const preferredContactMethodEnum = pgEnum("preferred_contact_method", [
  "email",
  "phone",
  "sms",
  "whatsapp",
]);

// Type exports
export type ClientType = (typeof clientTypeEnum.enumValues)[number];
export type ClientStatus = (typeof clientStatusEnum.enumValues)[number];
export type PreferredContactMethod = (typeof preferredContactMethodEnum.enumValues)[number];

// ============================================================================
// TABLES
// ============================================================================

export const clients = pgTable(
  "vet_clients",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // User reference (isolated - no FK constraint)
    userId: uuid("user_id"),

    // Client information
    clientType: clientTypeEnum("client_type").default("individual").notNull(),
    clientNumber: text("client_number").notNull().unique(), // e.g., "CL-00001"

    // Personal information
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    dateOfBirth: date("date_of_birth"),

    // Contact information
    email: text("email"),
    phone: text("phone"),
    mobilePhone: text("mobile_phone"),
    alternatePhone: text("alternate_phone"),

    // Preferred contact
    preferredContactMethod: preferredContactMethodEnum("preferred_contact_method").default("email"),
    preferredLanguage: text("preferred_language").default("id"),

    // Address
    address: text("address"),
    city: text("city"),
    state: text("state"),
    postalCode: text("postal_code"),
    country: text("country").default("ID").notNull(),

    // Emergency contact
    emergencyContactName: text("emergency_contact_name"),
    emergencyContactPhone: text("emergency_contact_phone"),
    emergencyContactRelationship: text("emergency_contact_relationship"),

    // Business information (for corporate/breeders)
    companyName: text("company_name"),
    taxId: text("tax_id"),
    businessLicense: text("business_license"),

    // Status
    status: clientStatusEnum("status").default("active").notNull(),

    // Preferences
    allowSms: boolean("allow_sms").default(true).notNull(),
    allowEmail: boolean("allow_email").default(true).notNull(),
    allowMarketing: boolean("allow_marketing").default(false).notNull(),

    // Referral source
    referralSource: text("referral_source"), // e.g., "Google", "Friend", "Veterinarian"
    referredBy: uuid("referred_by"), // Client ID who referred

    // Notes
    notes: text("notes"),

    // Financial
    accountBalance: decimal("account_balance", { precision: 12, scale: 2 }).default("0").notNull(),
    creditLimit: decimal("credit_limit", { precision: 12, scale: 2 }),

    // Important dates
    firstVisitDate: date("first_visit_date"),
    lastVisitDate: date("last_visit_date"),

    // Metadata
    metadata: json("metadata").$type<Record<string, unknown>>(),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    index("vet_clients_user_id_idx").on(table.userId),
    index("vet_clients_status_idx").on(table.status),
    index("vet_clients_client_number_idx").on(table.clientNumber),
    index("vet_clients_email_idx").on(table.email),
    index("vet_clients_phone_idx").on(table.phone),
  ]
);

export const clientRelationships = pgTable(
  "vet_client_relationships",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    primaryClientId: uuid("primary_client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),

    relatedClientId: uuid("related_client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),

    relationshipType: text("relationship_type").notNull(), // e.g., "spouse", "partner", "family_member", "co-owner"

    // Permissions
    canViewMedicalRecords: boolean("can_view_medical_records").default(false).notNull(),
    canMakeAppointments: boolean("can_make_appointments").default(false).notNull(),
    canAuthorizePayments: boolean("can_authorize_payments").default(false).notNull(),
    canPickUpPet: boolean("can_pick_up_pet").default(false).notNull(),

    // Notes
    notes: text("notes"),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("vet_client_relationships_primary_idx").on(table.primaryClientId),
    index("vet_client_relationships_related_idx").on(table.relatedClientId),
  ]
);

// ============================================================================
// RELATIONS
// ============================================================================

export const clientsRelations = relations(clients, ({ many }) => ({
  primaryRelationships: many(clientRelationships, {
    relationName: "primaryClient",
  }),
  relatedRelationships: many(clientRelationships, {
    relationName: "relatedClient",
  }),
}));

export const clientRelationshipsRelations = relations(clientRelationships, ({ one }) => ({
  primaryClient: one(clients, {
    fields: [clientRelationships.primaryClientId],
    references: [clients.id],
    relationName: "primaryClient",
  }),
  relatedClient: one(clients, {
    fields: [clientRelationships.relatedClientId],
    references: [clients.id],
    relationName: "relatedClient",
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type ClientRow = typeof clients.$inferSelect;
export type NewClientRow = typeof clients.$inferInsert;

export type ClientRelationshipRow = typeof clientRelationships.$inferSelect;
export type NewClientRelationshipRow = typeof clientRelationships.$inferInsert;
