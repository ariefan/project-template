import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
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
import { clients } from "./clients";
import { metadata, timestamps } from "./helpers";
import { medicalEncounters } from "./medical-records";
import { patients } from "./patients";

// ============================================================================
// ENUMS
// ============================================================================

export const insuranceProviderEnum = pgEnum("insurance_provider", [
  "nationwide",
  "trupanion",
  "petplan",
  "embrace",
  "healthy_paws",
  "aspca",
  "figo",
  "other",
]);

export const claimStatusEnum = pgEnum("claim_status", [
  "draft",
  "submitted",
  "pending",
  "under_review",
  "approved",
  "partially_approved",
  "denied",
  "paid",
  "appealed",
]);

// Type exports
export type InsuranceProvider =
  (typeof insuranceProviderEnum.enumValues)[number];
export type ClaimStatus = (typeof claimStatusEnum.enumValues)[number];

// ============================================================================
// TABLES
// ============================================================================

export const insurancePolicies = pgTable(
  "vet_insurance_policies",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Policy holder
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),

    // Provider information
    provider: insuranceProviderEnum("provider").notNull(),
    providerName: text("provider_name"),
    policyNumber: text("policy_number").notNull().unique(),
    groupNumber: text("group_number"),

    // Coverage details
    coverageType: text("coverage_type"), // e.g., "accident_illness", "accident_only", "wellness"
    annualLimit: decimal("annual_limit", { precision: 12, scale: 2 }),
    deductible: decimal("deductible", { precision: 12, scale: 2 }),
    reimbursementRate: integer("reimbursement_rate"), // Percentage (0-100)

    // Coverage periods
    effectiveDate: timestamp("effective_date").notNull(),
    expirationDate: timestamp("expiration_date"),

    // Pre-existing conditions
    preExistingConditions: json("pre_existing_conditions").$type<string[]>(),
    exclusions: json("exclusions").$type<string[]>(),

    // Status
    isActive: boolean("is_active").default(true).notNull(),

    // Contact
    providerPhone: text("provider_phone"),
    providerEmail: text("provider_email"),
    providerWebsite: text("provider_website"),

    // Metadata & timestamps
    ...metadata,
    ...timestamps,
  },
  (table) => [
    index("vet_insurance_policies_client_id_idx").on(table.clientId),
    index("vet_insurance_policies_patient_id_idx").on(table.patientId),
    index("vet_insurance_policies_policy_number_idx").on(table.policyNumber),
    check(
      "reimbursement_rate_valid",
      sql`${table.reimbursementRate} >= 0 AND ${table.reimbursementRate} <= 100 OR ${table.reimbursementRate} IS NULL`
    ),
  ]
);

export const insuranceClaims = pgTable(
  "vet_insurance_claims",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Claim identification
    claimNumber: text("claim_number").notNull().unique(),

    // Related records
    policyId: uuid("policy_id")
      .notNull()
      .references(() => insurancePolicies.id, { onDelete: "cascade" }),
    encounterId: uuid("encounter_id")
      .notNull()
      .references(() => medicalEncounters.id, { onDelete: "cascade" }),
    invoiceId: uuid("invoice_id"),

    // Claim details
    status: claimStatusEnum("status").default("draft").notNull(),
    diagnosisCodes: json("diagnosis_codes").$type<string[]>(), // ICD-10 codes
    procedureCodes: json("procedure_codes").$type<string[]>(), // CPT codes

    // Financial
    totalCharges: decimal("total_charges", {
      precision: 12,
      scale: 2,
    }).notNull(),
    claimedAmount: decimal("claimed_amount", {
      precision: 12,
      scale: 2,
    }).notNull(),
    approvedAmount: decimal("approved_amount", { precision: 12, scale: 2 }),
    paidAmount: decimal("paid_amount", { precision: 12, scale: 2 }),
    deniedAmount: decimal("denied_amount", { precision: 12, scale: 2 }),

    // Dates
    serviceDate: timestamp("service_date").notNull(),
    submittedAt: timestamp("submitted_at"),
    responseReceivedAt: timestamp("response_received_at"),
    paidAt: timestamp("paid_at"),

    // Documents
    supportingDocuments: json("supporting_documents").$type<
      Array<{
        type: string;
        url: string;
        uploadedAt: string;
      }>
    >(),

    // Notes and communication
    clinicNotes: text("clinic_notes"),
    insuranceNotes: text("insurance_notes"),
    denialReason: text("denial_reason"),

    // Appeal information
    isAppealed: boolean("is_appealed").default(false).notNull(),
    appealSubmittedAt: timestamp("appeal_submitted_at"),
    appealNotes: text("appeal_notes"),

    // Metadata & timestamps
    ...metadata,
    ...timestamps,
  },
  (table) => [
    index("vet_insurance_claims_policy_id_idx").on(table.policyId),
    index("vet_insurance_claims_encounter_id_idx").on(table.encounterId),
    index("vet_insurance_claims_status_idx").on(table.status),
    index("vet_insurance_claims_claim_number_idx").on(table.claimNumber),
    check("total_charges_positive", sql`${table.totalCharges} >= 0`),
    check("claimed_amount_positive", sql`${table.claimedAmount} >= 0`),
    check(
      "approved_amount_positive",
      sql`${table.approvedAmount} >= 0 OR ${table.approvedAmount} IS NULL`
    ),
    check(
      "paid_amount_positive",
      sql`${table.paidAmount} >= 0 OR ${table.paidAmount} IS NULL`
    ),
  ]
);

// ============================================================================
// RELATIONS
// ============================================================================

export const insurancePoliciesRelations = relations(
  insurancePolicies,
  ({ one, many }) => ({
    client: one(clients, {
      fields: [insurancePolicies.clientId],
      references: [clients.id],
    }),
    patient: one(patients, {
      fields: [insurancePolicies.patientId],
      references: [patients.id],
    }),
    claims: many(insuranceClaims),
  })
);

export const insuranceClaimsRelations = relations(
  insuranceClaims,
  ({ one }) => ({
    policy: one(insurancePolicies, {
      fields: [insuranceClaims.policyId],
      references: [insurancePolicies.id],
    }),
    encounter: one(medicalEncounters, {
      fields: [insuranceClaims.encounterId],
      references: [medicalEncounters.id],
    }),
  })
);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type InsurancePolicyRow = typeof insurancePolicies.$inferSelect;
export type NewInsurancePolicyRow = typeof insurancePolicies.$inferInsert;

export type InsuranceClaimRow = typeof insuranceClaims.$inferSelect;
export type NewInsuranceClaimRow = typeof insuranceClaims.$inferInsert;
