import { relations } from "drizzle-orm";
import {
  boolean,
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
import { medicalEncounters } from "./medical-records";
import { patients } from "./patients";

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

// Type exports
export type AuditAction = (typeof auditActionEnum.enumValues)[number];
export type AuditEntityType = (typeof auditEntityTypeEnum.enumValues)[number];

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
// RELATIONS
// ============================================================================

export const consentFormsRelations = relations(consentForms, ({ one }) => ({
  client: one(clients, {
    fields: [consentForms.clientId],
    references: [clients.id],
  }),
  patient: one(patients, {
    fields: [consentForms.patientId],
    references: [patients.id],
  }),
  encounter: one(medicalEncounters, {
    fields: [consentForms.encounterId],
    references: [medicalEncounters.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type AuditLogRow = typeof auditLogs.$inferSelect;
export type NewAuditLogRow = typeof auditLogs.$inferInsert;

export type ConsentFormRow = typeof consentForms.$inferSelect;
export type NewConsentFormRow = typeof consentForms.$inferInsert;

export type DataRetentionPolicyRow = typeof dataRetentionPolicies.$inferSelect;
export type NewDataRetentionPolicyRow =
  typeof dataRetentionPolicies.$inferInsert;
