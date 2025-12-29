# Vet Plan - Complete Implementation Framework
## Phases 1-7 Production Readiness

This document provides complete, ready-to-implement code for all remaining production readiness phases.

---

# PHASE 1 COMPLETION: FK & Check Constraints

## Step 1: Add Remaining FK Constraints

### Files to Update with animalId → patients.id FK:

**emergency.ts** (2 tables need updates)
**surgeries.ts** (2 tables need updates)
**diagnostics.ts** (2 tables need updates)
**preventive.ts** (4 tables need updates)
**treatments.ts** (3 tables need updates)

### Pattern for each file:

```typescript
// ADD to imports at top:
import { patients } from "./patients";
import { clients } from "./clients";

// CHANGE animalId field from:
animalId: uuid("animal_id").notNull(),

// TO:
animalId: uuid("animal_id")
  .notNull()
  .references(() => patients.id, { onDelete: "cascade" }),

// CHANGE ownerId field (if exists) from:
ownerId: uuid("owner_id").notNull(),

// TO:
ownerId: uuid("owner_id")
  .notNull()
  .references(() => clients.id, { onDelete: "cascade" }),

// ADD to relations section:
patient: one(patients, {
  fields: [tableName.animalId],
  references: [patients.id],
}),
client: one(clients, {
  fields: [tableName.ownerId],
  references: [clients.id],
}),
```

## Step 2: Add Staff Member FK Constraints

### Create staff.id references for all these fields:

**Pattern:**
```typescript
// ADD to imports:
import { staff } from "./staff";

// CHANGE from:
administeredBy: uuid("administered_by"), // Staff member ID

// TO:
administeredBy: uuid("administered_by").references(() => staff.id, {
  onDelete: "set null",
}),
```

**Files needing staff FK constraints:**
- medical-records.ts: dischargedBy, cancelledBy, uploadedBy
- treatments.ts: administeredBy
- patients.ts: measuredBy, uploadedBy
- diagnostics.ts: resultedBy, reviewedBy, performedBy, interpretedBy
- preventive.ts: administeredBy
- inventory.ts: performedBy, createdBy
- communication.ts: sentBy, createdBy
- billing.ts: processedBy, createdBy
- staff.ts: approvedBy
- surgeries.ts: monitoredBy

## Step 3: Add Cross-Table FK Constraints

### communication.ts:
```typescript
// Template ID reference
templateId: uuid("template_id").references(() => messageTemplates.id, {
  onDelete: "set null",
}),

// Invoice ID reference
invoiceId: uuid("invoice_id").references(() => invoices.id, {
  onDelete: "set null",
}),
```

### services.ts:
```typescript
// Parent category reference
parentCategoryId: uuid("parent_category_id").references(
  () => serviceCategories.id,
  { onDelete: "set null" }
),
```

## Step 4: Add Check Constraints

### Import sql helper:
```typescript
import { sql } from "drizzle-orm";
```

### appointments.ts - Add to table definition:
```typescript
export const appointments = pgTable(
  "vet_appointments",
  {
    // ... fields ...
  },
  (table) => [
    // ... existing indexes ...

    // CHECK CONSTRAINTS:
    check(
      "scheduled_end_after_start",
      sql`${table.scheduledEndAt} > ${table.scheduledAt}`
    ),
    check(
      "checkout_after_checkin",
      sql`${table.checkedOutAt} >= ${table.checkedInAt} OR ${table.checkedOutAt} IS NULL`
    ),
    check(
      "cancelled_must_have_reason",
      sql`(${table.status} != 'cancelled') OR (${table.cancellationReason} IS NOT NULL)`
    ),
  ]
);
```

### medical-records.ts:
```typescript
check(
  "actual_end_after_start",
  sql`${table.actualEndAt} >= ${table.actualStartAt} OR ${table.actualEndAt} IS NULL`
),
check(
  "estimated_cost_positive",
  sql`${table.estimatedCost} >= 0 OR ${table.estimatedCost} IS NULL`
),
check(
  "actual_cost_positive",
  sql`${table.actualCost} >= 0 OR ${table.actualCost} IS NULL`
),
```

### billing.ts:
```typescript
check("subtotal_positive", sql`${table.subtotal} >= 0`),
check("tax_amount_positive", sql`${table.taxAmount} >= 0`),
check("total_amount_positive", sql`${table.totalAmount} >= 0`),
check("amount_paid_positive", sql`${table.amountPaid} >= 0`),
check("amount_due_positive", sql`${table.amountDue} >= 0`),
check(
  "amount_due_equals_total_minus_paid",
  sql`${table.amountDue} = ${table.totalAmount} - ${table.amountPaid}`
),
check(
  "discount_percentage_valid",
  sql`${table.discountPercentage} >= 0 AND ${table.discountPercentage} <= 100 OR ${table.discountPercentage} IS NULL`
),
check(
  "tax_rate_valid",
  sql`${table.taxRate} >= 0 AND ${table.taxRate} <= 100 OR ${table.taxRate} IS NULL`
),
```

### services.ts:
```typescript
check("base_price_positive", sql`${table.basePrice} >= 0`),
check(
  "max_price_gte_base",
  sql`${table.maxPrice} >= ${table.basePrice} OR ${table.maxPrice} IS NULL`
),
```

### inventory.ts:
```typescript
check("quantity_on_hand_positive", sql`${table.quantityOnHand} >= 0`),
check("quantity_reserved_positive", sql`${table.quantityReserved} >= 0`),
check("reorder_point_positive", sql`${table.reorderPoint} >= 0`),
check("unit_cost_positive", sql`${table.unitCost} >= 0 OR ${table.unitCost} IS NULL`),
check("selling_price_positive", sql`${table.sellingPrice} >= 0 OR ${table.sellingPrice} IS NULL`),
check(
  "profit_margin_valid",
  sql`${table.profitMarginPercentage} >= 0 AND ${table.profitMarginPercentage} <= 100 OR ${table.profitMarginPercentage} IS NULL`
),
```

---

# PHASE 2: Audit & Compliance System

## Complete audit-logging.ts Implementation

```typescript
import { relations } from "drizzle-orm";
import {
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

export const auditActionEnum = pgEnum("audit_action", [
  "create",
  "read",
  "update",
  "delete",
  "login",
  "logout",
  "export",
  "print",
  "share",
  "prescribe",
  "administer",
  "authorize",
]);

export const auditEntityTypeEnum = pgEnum("audit_entity_type", [
  "patient",
  "client",
  "appointment",
  "medical_encounter",
  "prescription",
  "invoice",
  "payment",
  "staff",
  "veterinarian",
  "inventory",
  "diagnostic_result",
  "surgery",
  "consent_form",
]);

// ============================================================================
// TABLES
// ============================================================================

/**
 * Audit Log - Comprehensive tracking of all system actions
 * Required for HIPAA compliance and security
 */
export const auditLogs = pgTable(
  "vet_audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Who performed the action
    userId: uuid("user_id").notNull(), // Staff/Vet/Admin user ID
    userName: text("user_name").notNull(), // Cached for reporting
    userRole: text("user_role").notNull(), // Cached role at time of action

    // What action was performed
    action: auditActionEnum("action").notNull(),
    entityType: auditEntityTypeEnum("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(), // ID of affected record

    // Details
    description: text("description").notNull(),

    // Before/after data for updates
    changeSet: json("change_set").$type<{
      before?: Record<string, unknown>;
      after?: Record<string, unknown>;
      changes?: Array<{
        field: string;
        oldValue: unknown;
        newValue: unknown;
      }>;
    }>(),

    // Context
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    sessionId: text("session_id"),
    clinicId: uuid("clinic_id"), // Which clinic context

    // Compliance flags
    isPHI: boolean("is_phi").default(false).notNull(), // Protected Health Information
    isFinancial: boolean("is_financial").default(false).notNull(),
    isDEAControlled: boolean("is_dea_controlled").default(false).notNull(),

    // Metadata
    metadata: json("metadata").$type<Record<string, unknown>>(),

    // Timestamp
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("vet_audit_logs_user_id_idx").on(table.userId),
    index("vet_audit_logs_entity_type_idx").on(table.entityType),
    index("vet_audit_logs_entity_id_idx").on(table.entityId),
    index("vet_audit_logs_action_idx").on(table.action),
    index("vet_audit_logs_created_at_idx").on(table.createdAt),
    index("vet_audit_logs_clinic_id_idx").on(table.clinicId),
    // Composite index for common queries
    index("vet_audit_logs_entity_lookup_idx").on(
      table.entityType,
      table.entityId,
      table.createdAt
    ),
  ]
);

/**
 * Consent Forms - Track client consent for procedures, data usage, etc.
 * Required for legal compliance
 */
export const consentForms = pgTable(
  "vet_consent_forms",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Template information
    templateName: text("template_name").notNull(),
    templateVersion: text("template_version").notNull(),

    // Who consented
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    patientId: uuid("patient_id").references(() => patients.id, {
      onDelete: "set null",
    }),

    // What they consented to
    consentType: text("consent_type").notNull(), // e.g., "surgery", "anesthesia", "euthanasia", "data_sharing"
    procedureDescription: text("procedure_description"),

    // Related records
    encounterId: uuid("encounter_id").references(() => medicalEncounters.id, {
      onDelete: "set null",
    }),
    surgeryId: uuid("surgery_id"),
    appointmentId: uuid("appointment_id"),

    // Consent details
    consentText: text("consent_text").notNull(), // Full legal text
    risksDisclosed: json("risks_disclosed").$type<string[]>(),
    alternativesDisclosed: json("alternatives_disclosed").$type<string[]>(),

    // Signature
    signedBy: text("signed_by").notNull(), // Client name
    signatureData: text("signature_data"), // Base64 signature image or digital signature
    signedAt: timestamp("signed_at").notNull(),
    witnessedBy: uuid("witnessed_by"), // Staff member ID
    witnessedAt: timestamp("witnessed_at"),

    // Expiration
    expiresAt: timestamp("expires_at"),
    isRevoked: boolean("is_revoked").default(false).notNull(),
    revokedAt: timestamp("revoked_at"),
    revocationReason: text("revocation_reason"),

    // Storage
    documentUrl: text("document_url"), // PDF stored in S3/storage

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
    index("vet_consent_forms_client_id_idx").on(table.clientId),
    index("vet_consent_forms_patient_id_idx").on(table.patientId),
    index("vet_consent_forms_encounter_id_idx").on(table.encounterId),
    index("vet_consent_forms_consent_type_idx").on(table.consentType),
    index("vet_consent_forms_signed_at_idx").on(table.signedAt),
  ]
);

/**
 * Data Retention Policies - Track what data should be kept/deleted
 * Required for GDPR/privacy compliance
 */
export const dataRetentionPolicies = pgTable(
  "vet_data_retention_policies",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Policy details
    policyName: text("policy_name").notNull().unique(),
    entityType: auditEntityTypeEnum("entity_type").notNull(),

    // Retention period
    retentionDays: integer("retention_days").notNull(), // e.g., 2555 = 7 years
    deleteAfterDays: integer("delete_after_days"), // Hard delete after this many days

    // Policy rules
    conditions: json("conditions").$type<{
      status?: string[];
      hasActiveRelations?: boolean;
      isArchived?: boolean;
    }>(),

    // Legal basis
    legalBasis: text("legal_basis"), // e.g., "HIPAA requires 7 years", "State law XYZ"
    regulatoryRequirement: text("regulatory_requirement"),

    // Actions
    archiveAction: text("archive_action"), // e.g., "move_to_cold_storage", "anonymize"
    deleteAction: text("delete_action"), // e.g., "soft_delete", "hard_delete", "anonymize"

    // Status
    isActive: boolean("is_active").default(true).notNull(),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("vet_data_retention_policies_entity_type_idx").on(table.entityType),
  ]
);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type AuditLogRow = typeof auditLogs.$inferSelect;
export type NewAuditLogRow = typeof auditLogs.$inferInsert;

export type ConsentFormRow = typeof consentForms.$inferSelect;
export type NewConsentFormRow = typeof consentForms.$inferInsert;

export type DataRetentionPolicyRow = typeof dataRetentionPolicies.$inferSelect;
export type NewDataRetentionPolicyRow = typeof dataRetentionPolicies.$inferInsert;
```

---

# PHASE 3: Core Features

## Complete insurance.ts Implementation

```typescript
import { relations } from "drizzle-orm";
import {
  boolean,
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
import { sql } from "drizzle-orm";
import { clients } from "./clients";
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
    index("vet_insurance_policies_client_id_idx").on(table.clientId),
    index("vet_insurance_policies_patient_id_idx").on(table.patientId),
    index("vet_insurance_policies_policy_number_idx").on(table.policyNumber),
    check("reimbursement_rate_valid",
      sql`${table.reimbursementRate} >= 0 AND ${table.reimbursementRate} <= 100`
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
    totalCharges: decimal("total_charges", { precision: 12, scale: 2 }).notNull(),
    claimedAmount: decimal("claimed_amount", { precision: 12, scale: 2 }).notNull(),
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
    index("vet_insurance_claims_policy_id_idx").on(table.policyId),
    index("vet_insurance_claims_encounter_id_idx").on(table.encounterId),
    index("vet_insurance_claims_status_idx").on(table.status),
    index("vet_insurance_claims_claim_number_idx").on(table.claimNumber),
    check("total_charges_positive", sql`${table.totalCharges} >= 0`),
    check("claimed_amount_positive", sql`${table.claimedAmount} >= 0`),
  ]
);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type InsurancePolicyRow = typeof insurancePolicies.$inferSelect;
export type NewInsurancePolicyRow = typeof insurancePolicies.$inferInsert;

export type InsuranceClaimRow = typeof insuranceClaims.$inferSelect;
export type NewInsuranceClaimRow = typeof insuranceClaims.$inferInsert;
```

## Complete boarding.ts Implementation

```typescript
import { relations } from "drizzle-orm";
import {
  boolean,
  decimal,
  index,
  json,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { clients } from "./clients";
import { patients } from "./patients";

// ============================================================================
// ENUMS
// ============================================================================

export const boardingStatusEnum = pgEnum("boarding_status", [
  "reserved",
  "checked_in",
  "in_care",
  "checked_out",
  "cancelled",
]);

export const kennelSizeEnum = pgEnum("kennel_size", [
  "small",
  "medium",
  "large",
  "extra_large",
  "suite",
]);

// ============================================================================
// TABLES
// ============================================================================

export const boardingReservations = pgTable(
  "vet_boarding_reservations",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Reservation details
    reservationNumber: text("reservation_number").notNull().unique(),

    // Who
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),

    // When
    checkInDate: timestamp("check_in_date").notNull(),
    checkOutDate: timestamp("check_out_date").notNull(),
    actualCheckInAt: timestamp("actual_check_in_at"),
    actualCheckOutAt: timestamp("actual_check_out_at"),

    // Status
    status: boardingStatusEnum("status").default("reserved").notNull(),

    // Kennel assignment
    kennelSize: kennelSizeEnum("kennel_size").notNull(),
    kennelNumber: text("kennel_number"),

    // Pet care requirements
    feedingInstructions: text("feeding_instructions"),
    feedingSchedule: json("feeding_schedule").$type<
      Array<{ time: string; food: string; amount: string }>
    >(),
    medicationInstructions: text("medication_instructions"),
    medications: json("medications").$type<
      Array<{
        name: string;
        dosage: string;
        frequency: string;
        instructions: string;
      }>
    >(),
    specialNeeds: text("special_needs"),
    behavioralNotes: text("behavioral_notes"),

    // Services
    includedServices: json("included_services").$type<string[]>(),
    addOnServices: json("add_on_services").$type<
      Array<{ service: string; price: number }>
    >(),

    // Emergency contact
    emergencyContactName: text("emergency_contact_name"),
    emergencyContactPhone: text("emergency_contact_phone"),
    vetAuthorizationForEmergency: boolean("vet_authorization_for_emergency")
      .default(false)
      .notNull(),

    // Financial
    dailyRate: decimal("daily_rate", { precision: 10, scale: 2 }).notNull(),
    totalEstimate: decimal("total_estimate", { precision: 12, scale: 2 }),
    totalActual: decimal("total_actual", { precision: 12, scale: 2 }),
    depositPaid: decimal("deposit_paid", { precision: 12, scale: 2 }),

    // Check-in/out notes
    checkInNotes: text("check_in_notes"),
    checkInCondition: text("check_in_condition"),
    checkOutNotes: text("check_out_notes"),
    checkOutCondition: text("check_out_condition"),

    // Items brought
    itemsBrought: json("items_brought").$type<string[]>(), // e.g., ["bed", "toys", "food"]

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
    index("vet_boarding_reservations_client_id_idx").on(table.clientId),
    index("vet_boarding_reservations_patient_id_idx").on(table.patientId),
    index("vet_boarding_reservations_status_idx").on(table.status),
    index("vet_boarding_reservations_check_in_date_idx").on(table.checkInDate),
    check("checkout_after_checkin",
      sql`${table.checkOutDate} > ${table.checkInDate}`
    ),
    check("daily_rate_positive", sql`${table.dailyRate} > 0`),
  ]
);

export const boardingDailyLogs = pgTable(
  "vet_boarding_daily_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    reservationId: uuid("reservation_id")
      .notNull()
      .references(() => boardingReservations.id, { onDelete: "cascade" }),

    logDate: timestamp("log_date").notNull(),

    // Feeding
    mealsEaten: json("meals_eaten").$type<
      Array<{ time: string; amountEaten: string; notes: string }>
    >(),

    // Activity
    exerciseTimes: json("exercise_times").$type<
      Array<{ time: string; duration: string; activity: string }>
    >(),

    // Health observations
    behaviorNotes: text("behavior_notes"),
    healthObservations: text("health_observations"),
    vomitingOrDiarrhea: boolean("vomiting_or_diarrhea").default(false).notNull(),

    // Medications given
    medicationsAdministered: json("medications_administered").$type<
      Array<{ medication: string; time: string; administeredBy: string }>
    >(),

    // Photos
    photoUrls: json("photo_urls").$type<string[]>(),

    // Staff
    loggedBy: uuid("logged_by"), // Staff member ID

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("vet_boarding_daily_logs_reservation_id_idx").on(table.reservationId),
    index("vet_boarding_daily_logs_log_date_idx").on(table.logDate),
  ]
);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type BoardingReservationRow = typeof boardingReservations.$inferSelect;
export type NewBoardingReservationRow = typeof boardingReservations.$inferInsert;

export type BoardingDailyLogRow = typeof boardingDailyLogs.$inferSelect;
export type NewBoardingDailyLogRow = typeof boardingDailyLogs.$inferInsert;
```

---

# PHASE 4: Security (RBAC)

## Complete rbac.ts Implementation

```typescript
import { relations } from "drizzle-orm";
import {
  boolean,
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

export const permissionActionEnum = pgEnum("permission_action", [
  "create",
  "read",
  "update",
  "delete",
  "export",
  "print",
  "prescribe",
  "administer",
  "approve",
  "void",
]);

export const permissionResourceEnum = pgEnum("permission_resource", [
  "patients",
  "clients",
  "appointments",
  "medical_encounters",
  "prescriptions",
  "diagnostics",
  "surgeries",
  "invoices",
  "payments",
  "inventory",
  "staff",
  "reports",
  "settings",
  "audit_logs",
]);

// ============================================================================
// TABLES
// ============================================================================

export const roles = pgTable(
  "vet_roles",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Role details
    name: text("name").notNull().unique(), // e.g., "veterinarian", "receptionist", "admin"
    displayName: text("display_name").notNull(),
    description: text("description"),

    // System role flag (cannot be deleted/modified)
    isSystem: boolean("is_system").default(false).notNull(),

    // Status
    isActive: boolean("is_active").default(true).notNull(),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("vet_roles_name_idx").on(table.name),
  ]
);

export const permissions = pgTable(
  "vet_permissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Permission definition
    action: permissionActionEnum("action").notNull(),
    resource: permissionResourceEnum("resource").notNull(),

    // Optional field-level permissions
    fields: json("fields").$type<string[]>(), // Specific fields allowed

    // Conditions
    conditions: json("conditions").$type<{
      ownRecordsOnly?: boolean;
      clinicOnly?: boolean;
      departmentOnly?: boolean;
    }>(),

    // Description
    name: text("name").notNull().unique(), // e.g., "read_patients", "create_appointments"
    description: text("description"),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("vet_permissions_resource_action_idx").on(table.resource, table.action),
  ]
);

export const rolePermissions = pgTable(
  "vet_role_permissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permissionId: uuid("permission_id")
      .notNull()
      .references(() => permissions.id, { onDelete: "cascade" }),

    // Override conditions specific to this role
    conditionOverrides: json("condition_overrides").$type<Record<string, unknown>>(),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("vet_role_permissions_role_id_idx").on(table.roleId),
    index("vet_role_permissions_permission_id_idx").on(table.permissionId),
  ]
);

export const userRoles = pgTable(
  "vet_user_roles",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    userId: uuid("user_id").notNull(), // Staff/Vet user ID
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),

    // Scope limitations
    clinicId: uuid("clinic_id"), // If role is clinic-specific
    departmentId: uuid("department_id"), // If role is department-specific

    // Validity period
    effectiveFrom: timestamp("effective_from").defaultNow().notNull(),
    effectiveUntil: timestamp("effective_until"),

    // Status
    isActive: boolean("is_active").default(true).notNull(),

    // Assignment tracking
    assignedBy: uuid("assigned_by"), // Who granted this role
    assignmentReason: text("assignment_reason"),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("vet_user_roles_user_id_idx").on(table.userId),
    index("vet_user_roles_role_id_idx").on(table.roleId),
  ]
);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type RoleRow = typeof roles.$inferSelect;
export type NewRoleRow = typeof roles.$inferInsert;

export type PermissionRow = typeof permissions.$inferSelect;
export type NewPermissionRow = typeof permissions.$inferInsert;

export type RolePermissionRow = typeof rolePermissions.$inferSelect;
export type NewRolePermissionRow = typeof rolePermissions.$inferInsert;

export type UserRoleRow = typeof userRoles.$inferSelect;
export type NewUserRoleRow = typeof userRoles.$inferInsert;
```

---

# PHASE 5-7: Quick Reference

## Phase 5: Advanced Features

**Files to create:**
- `equipment.ts` - Medical equipment tracking, maintenance schedules
- `drug-recalls.ts` - FDA recall tracking, affected inventory
- `adverse-events.ts` - Medication adverse event reporting

## Phase 6: Performance

**Optimizations to add:**
- Table partitioning for audit_logs by date
- Materialized views for reporting
- Additional composite indexes

## Phase 7: Final Review

**Tasks:**
- Schema documentation review
- Migration script generation
- Backup/restore procedures
- Performance testing

---

# Implementation Checklist

## Phase 1
- [ ] Add patient/client FK constraints to all tables
- [ ] Add staff member FK constraints
- [ ] Add cross-table FK constraints
- [ ] Add check constraints to all tables
- [ ] Test typecheck
- [ ] Commit Phase 1

## Phase 2
- [ ] Create audit-logging.ts
- [ ] Add to index.ts exports
- [ ] Test typecheck
- [ ] Commit Phase 2

## Phase 3
- [ ] Create insurance.ts
- [ ] Create boarding.ts
- [ ] Create prescription-refills.ts
- [ ] Create lab-workflow.ts
- [ ] Add to index.ts exports
- [ ] Test typecheck
- [ ] Commit Phase 3

## Phase 4
- [ ] Create rbac.ts
- [ ] Create encryption-fields.ts
- [ ] Add to index.ts exports
- [ ] Test typecheck
- [ ] Commit Phase 4

## Phases 5-7
- [ ] Create remaining feature tables
- [ ] Add performance optimizations
- [ ] Generate migration scripts
- [ ] Final documentation
- [ ] Production deployment checklist
