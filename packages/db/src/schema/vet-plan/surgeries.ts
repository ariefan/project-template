import { relations, sql } from "drizzle-orm";
import {
  check,
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
import { patients } from "./patients";
import { veterinarians } from "./veterinarians";

// ============================================================================
// ENUMS
// ============================================================================

export const surgeryTypeEnum = pgEnum("surgery_type", [
  "spay",
  "neuter",
  "dental_extraction",
  "mass_removal",
  "orthopedic",
  "soft_tissue",
  "ophthalmic",
  "emergency",
  "exploratory",
  "amputation",
  "cesarean",
]);

export const surgeryStatusEnum = pgEnum("surgery_status", [
  "scheduled",
  "pre_op",
  "in_progress",
  "completed",
  "cancelled",
  "postponed",
]);

export const anesthesiaTypeEnum = pgEnum("anesthesia_type", [
  "general",
  "local",
  "regional",
  "sedation",
]);

export const asaClassificationEnum = pgEnum("asa_classification", [
  "asa_1", // Normal healthy patient
  "asa_2", // Patient with mild systemic disease
  "asa_3", // Patient with severe systemic disease
  "asa_4", // Patient with severe systemic disease that is a constant threat to life
  "asa_5", // Moribund patient not expected to survive without the operation
]);

// Type exports
export type SurgeryType = (typeof surgeryTypeEnum.enumValues)[number];
export type SurgeryStatus = (typeof surgeryStatusEnum.enumValues)[number];
export type AnesthesiaType = (typeof anesthesiaTypeEnum.enumValues)[number];
export type AsaClassification =
  (typeof asaClassificationEnum.enumValues)[number];

// ============================================================================
// TABLES
// ============================================================================

export const surgeries = pgTable(
  "vet_surgeries",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    appointmentId: uuid("appointment_id")
      .notNull()
      .references(() => appointments.id, { onDelete: "cascade" }),

    // Patient reference
    animalId: uuid("animal_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),

    // Surgery details
    surgeryType: surgeryTypeEnum("surgery_type").notNull(),
    procedureName: text("procedure_name").notNull(),
    description: text("description"),

    // Status
    status: surgeryStatusEnum("status").default("scheduled").notNull(),

    // Surgical team
    primarySurgeonId: uuid("primary_surgeon_id")
      .notNull()
      .references(() => veterinarians.id, { onDelete: "cascade" }),
    assistingSurgeonId: uuid("assisting_surgeon_id").references(
      () => veterinarians.id,
      {
        onDelete: "set null",
      }
    ),
    anesthesiologistId: uuid("anesthesiologist_id").references(
      () => veterinarians.id,
      {
        onDelete: "set null",
      }
    ),

    // Scheduling
    scheduledAt: timestamp("scheduled_at").notNull(),
    estimatedDuration: text("estimated_duration"), // e.g., "90 minutes"

    // Pre-operative
    preOpAssessment: text("pre_op_assessment"),
    preOpBloodwork: json("pre_op_bloodwork").$type<Record<string, unknown>>(),
    fastingInstructions: text("fasting_instructions"),

    // Timing
    preOpStartedAt: timestamp("pre_op_started_at"),
    anesthesiaInducedAt: timestamp("anesthesia_induced_at"),
    surgeryStartedAt: timestamp("surgery_started_at"),
    surgeryCompletedAt: timestamp("surgery_completed_at"),
    recoveryStartedAt: timestamp("recovery_started_at"),
    recoveryCompletedAt: timestamp("recovery_completed_at"),

    // Surgical notes
    findings: text("findings"),
    procedureNotes: text("procedure_notes"),
    complications: text("complications"),

    // Post-operative care
    postOpInstructions: text("post_op_instructions"),
    painManagementPlan: text("pain_management_plan"),
    followUpDate: timestamp("follow_up_date"),

    // Discharge
    dischargedAt: timestamp("discharged_at"),
    dischargeNotes: text("discharge_notes"),

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
    index("vet_surgeries_appointment_id_idx").on(table.appointmentId),
    index("vet_surgeries_animal_id_idx").on(table.animalId),
    index("vet_surgeries_status_idx").on(table.status),
    index("vet_surgeries_scheduled_at_idx").on(table.scheduledAt),
    check(
      "surgery_completion_after_start",
      sql`${table.surgeryCompletedAt} > ${table.surgeryStartedAt} OR ${table.surgeryCompletedAt} IS NULL OR ${table.surgeryStartedAt} IS NULL`
    ),
    check(
      "recovery_completion_after_start",
      sql`${table.recoveryCompletedAt} > ${table.recoveryStartedAt} OR ${table.recoveryCompletedAt} IS NULL OR ${table.recoveryStartedAt} IS NULL`
    ),
  ]
);

export const anesthesiaRecords = pgTable(
  "vet_anesthesia_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    surgeryId: uuid("surgery_id")
      .notNull()
      .references(() => surgeries.id, { onDelete: "cascade" }),

    // Patient reference
    animalId: uuid("animal_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),

    // Pre-anesthetic assessment
    asaClassification: asaClassificationEnum("asa_classification"),
    preAnestheticWeight: decimal("pre_anesthetic_weight", {
      precision: 6,
      scale: 2,
    }), // kg
    preAnestheticAssessment: text("pre_anesthetic_assessment"),

    // Anesthesia protocol
    anesthesiaType: anesthesiaTypeEnum("anesthesia_type").notNull(),
    inductionAgent: text("induction_agent"),
    inductionDose: text("induction_dose"),
    maintenanceAgent: text("maintenance_agent"),
    maintenanceDose: text("maintenance_dose"),

    // Pre-medications
    premedicationAgents: json("premedication_agents").$type<
      Array<{
        drug: string;
        dose: string;
        route: string;
        time: string;
      }>
    >(),

    // Monitoring
    vitalSignsRecords: json("vital_signs_records").$type<
      Array<{
        time: string;
        heartRate: number;
        respiratoryRate: number;
        temperature: number;
        bloodPressure: string;
        spo2: number; // Oxygen saturation
        etco2: number; // End-tidal CO2
        notes: string;
      }>
    >(),

    // Complications
    complications: text("complications"),
    adverseEvents: text("adverse_events"),

    // Recovery
    recoveryQuality: text("recovery_quality"), // e.g., "smooth", "moderate", "rough"
    recoveryNotes: text("recovery_notes"),

    // Post-anesthetic care
    postAnestheticInstructions: text("post_anesthetic_instructions"),

    // Staff
    monitoredBy: uuid("monitored_by"), // Technician/veterinarian ID

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
    index("vet_anesthesia_records_surgery_id_idx").on(table.surgeryId),
    index("vet_anesthesia_records_animal_id_idx").on(table.animalId),
  ]
);

// ============================================================================
// RELATIONS
// ============================================================================

export const surgeriesRelations = relations(surgeries, ({ one }) => ({
  appointment: one(appointments, {
    fields: [surgeries.appointmentId],
    references: [appointments.id],
  }),
  patient: one(patients, {
    fields: [surgeries.animalId],
    references: [patients.id],
  }),
  primarySurgeon: one(veterinarians, {
    fields: [surgeries.primarySurgeonId],
    references: [veterinarians.id],
  }),
  anesthesiaRecord: one(anesthesiaRecords),
}));

export const anesthesiaRecordsRelations = relations(
  anesthesiaRecords,
  ({ one }) => ({
    surgery: one(surgeries, {
      fields: [anesthesiaRecords.surgeryId],
      references: [surgeries.id],
    }),
    patient: one(patients, {
      fields: [anesthesiaRecords.animalId],
      references: [patients.id],
    }),
  })
);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type SurgeryRow = typeof surgeries.$inferSelect;
export type NewSurgeryRow = typeof surgeries.$inferInsert;

export type AnesthesiaRecordRow = typeof anesthesiaRecords.$inferSelect;
export type NewAnesthesiaRecordRow = typeof anesthesiaRecords.$inferInsert;
