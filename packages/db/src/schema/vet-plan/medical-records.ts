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
import { appointments } from "./appointments";
import { clients } from "./clients";
import { clinics } from "./clinics";
import { patients } from "./patients";
import { veterinarians } from "./veterinarians";

// ============================================================================
// ENUMS
// ============================================================================

export const encounterTypeEnum = pgEnum("encounter_type", [
  "wellness",
  "sick_visit",
  "emergency",
  "surgery",
  "follow_up",
  "vaccination",
  "dental",
  "grooming",
  "boarding_checkin",
  "boarding_checkout",
  "euthanasia",
]);

export const encounterStatusEnum = pgEnum("encounter_status", [
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
  "no_show",
]);

// Type exports
export type EncounterType = (typeof encounterTypeEnum.enumValues)[number];
export type EncounterStatus = (typeof encounterStatusEnum.enumValues)[number];

// ============================================================================
// TABLES
// ============================================================================

/**
 * Medical Encounters - The central record for every veterinary visit
 * This table unifies all clinical activities and answers "what happened during this visit?"
 */
export const medicalEncounters = pgTable(
  "vet_medical_encounters",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Encounter identification
    encounterNumber: text("encounter_number").notNull().unique(), // e.g., "ENC-00001"

    // Core references
    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),

    // Linked appointment (optional - walk-ins may not have appointments)
    appointmentId: uuid("appointment_id").references(() => appointments.id, {
      onDelete: "set null",
    }),

    // Encounter type and status
    encounterType: encounterTypeEnum("encounter_type").notNull(),
    status: encounterStatusEnum("status").default("scheduled").notNull(),

    // Attending veterinarian
    veterinarianId: uuid("veterinarian_id").references(() => veterinarians.id, {
      onDelete: "set null",
    }),

    // Timing
    scheduledStartAt: timestamp("scheduled_start_at"),
    actualStartAt: timestamp("actual_start_at"),
    actualEndAt: timestamp("actual_end_at"),
    duration: text("duration"), // e.g., "45 minutes"

    // Chief complaint and presenting problem
    chiefComplaint: text("chief_complaint"), // Why the patient came in
    presentingProblem: text("presenting_problem"), // Detailed description

    // Clinical notes (SOAP format)
    subjective: text("subjective"), // What owner reports
    objective: text("objective"), // Physical exam findings
    assessment: text("assessment"), // Diagnosis/impressions
    plan: text("plan"), // Treatment plan

    // Vital signs recorded during encounter
    vitalSigns: json("vital_signs").$type<{
      temperature?: number;
      temperatureUnit?: string;
      heartRate?: number;
      respiratoryRate?: number;
      bloodPressure?: string;
      weight?: number;
      weightUnit?: string;
      bodyConditionScore?: number;
      mucousMembranes?: string;
      capillaryRefillTime?: string;
      hydrationStatus?: string;
    }>(),

    // Diagnoses made during this encounter
    diagnoses:
      json("diagnoses").$type<
        Array<{
          code?: string; // ICD-10 or other coding system
          description: string;
          isPrimary: boolean;
          severity?: string;
        }>
      >(),

    // Procedures performed
    proceduresSummary: text("procedures_summary"),

    // Medications prescribed/administered
    medicationsSummary: text("medications_summary"),

    // Follow-up instructions
    followUpInstructions: text("follow_up_instructions"),
    followUpDate: timestamp("follow_up_date"),

    // Discharge information
    dischargeInstructions: text("discharge_instructions"),
    dischargedAt: timestamp("discharged_at"),
    dischargedBy: uuid("discharged_by"), // Staff member ID

    // Clinical alerts and warnings
    clinicalAlerts:
      json("clinical_alerts").$type<
        Array<{
          alertType: string;
          message: string;
          severity: string;
        }>
      >(),

    // Financial summary
    estimatedCost: decimal("estimated_cost", { precision: 12, scale: 2 }),
    actualCost: decimal("actual_cost", { precision: 12, scale: 2 }),
    invoiceId: uuid("invoice_id"), // Link to billing

    // Quality and compliance
    requiresFollowUp: boolean("requires_follow_up").default(false).notNull(),
    followUpCompleted: boolean("follow_up_completed").default(false).notNull(),
    consentFormsObtained: boolean("consent_forms_obtained")
      .default(false)
      .notNull(),
    consentFormUrls: json("consent_form_urls").$type<string[]>(),

    // Internal notes (not visible to client)
    internalNotes: text("internal_notes"),

    // Staff involved
    staffInvolved:
      json("staff_involved").$type<
        Array<{
          staffId: string;
          role: string;
          responsibilities?: string;
        }>
      >(),

    // Cancellation information
    cancelledAt: timestamp("cancelled_at"),
    cancelledBy: uuid("cancelled_by"),
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
    index("vet_medical_encounters_clinic_id_idx").on(table.clinicId),
    index("vet_medical_encounters_patient_id_idx").on(table.patientId),
    index("vet_medical_encounters_client_id_idx").on(table.clientId),
    index("vet_medical_encounters_veterinarian_id_idx").on(
      table.veterinarianId
    ),
    index("vet_medical_encounters_encounter_number_idx").on(
      table.encounterNumber
    ),
    index("vet_medical_encounters_status_idx").on(table.status),
    index("vet_medical_encounters_encounter_type_idx").on(table.encounterType),
    index("vet_medical_encounters_scheduled_start_at_idx").on(
      table.scheduledStartAt
    ),
    index("vet_medical_encounters_actual_start_at_idx").on(table.actualStartAt),
  ]
);

/**
 * Encounter Attachments - Files and documents associated with an encounter
 * (x-rays, lab reports, consent forms, photos, etc.)
 */
export const encounterAttachments = pgTable(
  "vet_encounter_attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    encounterId: uuid("encounter_id")
      .notNull()
      .references(() => medicalEncounters.id, { onDelete: "cascade" }),

    // Attachment details
    attachmentType: text("attachment_type").notNull(), // e.g., "xray", "lab_report", "consent_form", "photo"
    title: text("title").notNull(),
    description: text("description"),

    // File information
    fileUrl: text("file_url").notNull(),
    fileName: text("file_name").notNull(),
    fileSize: text("file_size"), // bytes
    mimeType: text("mime_type"),

    // Categorization
    category: text("category"), // e.g., "diagnostic", "administrative", "clinical"
    tags: json("tags").$type<string[]>(),

    // Visibility
    visibleToClient: boolean("visible_to_client").default(false).notNull(),

    // Uploaded by
    uploadedBy: uuid("uploaded_by"), // Staff member ID

    // Metadata
    metadata: json("metadata").$type<Record<string, unknown>>(),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("vet_encounter_attachments_encounter_id_idx").on(table.encounterId),
    index("vet_encounter_attachments_attachment_type_idx").on(
      table.attachmentType
    ),
  ]
);

// ============================================================================
// RELATIONS
// ============================================================================

export const medicalEncountersRelations = relations(
  medicalEncounters,
  ({ one, many }) => ({
    clinic: one(clinics, {
      fields: [medicalEncounters.clinicId],
      references: [clinics.id],
    }),
    patient: one(patients, {
      fields: [medicalEncounters.patientId],
      references: [patients.id],
    }),
    client: one(clients, {
      fields: [medicalEncounters.clientId],
      references: [clients.id],
    }),
    appointment: one(appointments, {
      fields: [medicalEncounters.appointmentId],
      references: [appointments.id],
    }),
    veterinarian: one(veterinarians, {
      fields: [medicalEncounters.veterinarianId],
      references: [veterinarians.id],
    }),
    attachments: many(encounterAttachments),
  })
);

export const encounterAttachmentsRelations = relations(
  encounterAttachments,
  ({ one }) => ({
    encounter: one(medicalEncounters, {
      fields: [encounterAttachments.encounterId],
      references: [medicalEncounters.id],
    }),
  })
);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type MedicalEncounterRow = typeof medicalEncounters.$inferSelect;
export type NewMedicalEncounterRow = typeof medicalEncounters.$inferInsert;

export type EncounterAttachmentRow = typeof encounterAttachments.$inferSelect;
export type NewEncounterAttachmentRow =
  typeof encounterAttachments.$inferInsert;
