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

export const triageLevelEnum = pgEnum("triage_level", [
  "immediate", // Life-threatening, requires immediate attention
  "urgent", // Serious but not immediately life-threatening
  "semi_urgent", // Needs treatment but can wait
  "non_urgent", // Minor issues, routine care
]);

export const emergencyCategoryEnum = pgEnum("emergency_category", [
  "trauma",
  "toxicity",
  "respiratory_distress",
  "cardiac_arrest",
  "seizure",
  "gastric_dilatation_volvulus",
  "urinary_obstruction",
  "dystocia",
  "heatstroke",
  "hemorrhage",
  "anaphylaxis",
  "neurological",
]);

export const dispositionEnum = pgEnum("disposition", [
  "treated_and_released",
  "admitted",
  "transferred",
  "referred",
  "euthanized",
  "deceased",
  "left_against_advice",
]);

// Type exports
export type TriageLevel = (typeof triageLevelEnum.enumValues)[number];
export type EmergencyCategory =
  (typeof emergencyCategoryEnum.enumValues)[number];
export type Disposition = (typeof dispositionEnum.enumValues)[number];

// ============================================================================
// TABLES
// ============================================================================

export const emergencyCases = pgTable(
  "vet_emergency_cases",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    appointmentId: uuid("appointment_id").references(() => appointments.id, {
      onDelete: "set null",
    }),

    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),

    // Patient reference
    animalId: uuid("animal_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),

    // Emergency details
    emergencyCategory: emergencyCategoryEnum("emergency_category"),
    chiefComplaint: text("chief_complaint").notNull(),

    // Triage
    triageLevel: triageLevelEnum("triage_level").notNull(),
    triagedBy: uuid("triaged_by").notNull(), // Staff member ID
    triagedAt: timestamp("triaged_at").defaultNow().notNull(),

    // Presentation
    presentedAt: timestamp("presented_at").defaultNow().notNull(),
    arrivalMethod: text("arrival_method"), // e.g., "walk-in", "ambulance", "transfer"

    // Initial assessment
    initialVitalSigns: json("initial_vital_signs").$type<{
      temperature?: number;
      heartRate?: number;
      respiratoryRate?: number;
      bloodPressure?: string;
      capillaryRefillTime?: string;
      mucousMembrane?: string;
      consciousness?: string;
    }>(),

    triageNotes: text("triage_notes"),

    // Treatment
    assignedVeterinarianId: uuid("assigned_veterinarian_id").references(
      () => veterinarians.id,
      {
        onDelete: "set null",
      }
    ),
    treatmentStartedAt: timestamp("treatment_started_at"),
    treatmentSummary: text("treatment_summary"),

    // Stabilization
    isStabilized: boolean("is_stabilized").default(false).notNull(),
    stabilizedAt: timestamp("stabilized_at"),

    // Disposition
    disposition: dispositionEnum("disposition"),
    dispositionAt: timestamp("disposition_at"),
    dispositionNotes: text("disposition_notes"),

    // Transfer/referral
    transferredTo: text("transferred_to"), // Clinic or hospital name
    referralReason: text("referral_reason"),
    transferDocuments: json("transfer_documents").$type<string[]>(),

    // Outcome
    outcome: text("outcome"),
    outcomeNotes: text("outcome_notes"),

    // Follow-up
    followUpRequired: text("follow_up_required"),
    followUpInstructions: text("follow_up_instructions"),

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
    index("vet_emergency_cases_clinic_id_idx").on(table.clinicId),
    index("vet_emergency_cases_animal_id_idx").on(table.animalId),
    index("vet_emergency_cases_triage_level_idx").on(table.triageLevel),
    index("vet_emergency_cases_presented_at_idx").on(table.presentedAt),
  ]
);

export const criticalCareRecords = pgTable(
  "vet_critical_care_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    emergencyCaseId: uuid("emergency_case_id")
      .notNull()
      .references(() => emergencyCases.id, { onDelete: "cascade" }),

    // Patient reference
    animalId: uuid("animal_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),

    // Monitoring period
    recordedAt: timestamp("recorded_at").notNull(),
    recordedBy: uuid("recorded_by").notNull(), // Staff member ID

    // Vital signs
    temperature: decimal("temperature", { precision: 4, scale: 1 }),
    heartRate: text("heart_rate"),
    respiratoryRate: text("respiratory_rate"),
    bloodPressureSystolic: text("blood_pressure_systolic"),
    bloodPressureDiastolic: text("blood_pressure_diastolic"),
    oxygenSaturation: text("oxygen_saturation"),

    // Neurological status
    consciousnessLevel: text("consciousness_level"), // e.g., "alert", "responsive", "unresponsive"
    pupilResponse: text("pupil_response"),

    // Perfusion parameters
    capillaryRefillTime: text("capillary_refill_time"),
    mucousMembrane: text("mucous_membrane"), // e.g., "pink", "pale", "cyanotic"

    // Pain assessment
    painScore: text("pain_score"), // e.g., 0-10 scale

    // Inputs and outputs
    fluidInputMl: decimal("fluid_input_ml", { precision: 8, scale: 2 }),
    urineOutputMl: decimal("urine_output_ml", { precision: 8, scale: 2 }),

    // Interventions
    interventions:
      json("interventions").$type<
        Array<{
          time: string;
          intervention: string;
          performedBy: string;
          notes: string;
        }>
      >(),

    // Clinical notes
    notes: text("notes"),
    concerns: text("concerns"),

    // Metadata
    metadata: json("metadata").$type<Record<string, unknown>>(),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("vet_critical_care_records_emergency_case_id_idx").on(
      table.emergencyCaseId
    ),
    index("vet_critical_care_records_animal_id_idx").on(table.animalId),
    index("vet_critical_care_records_recorded_at_idx").on(table.recordedAt),
  ]
);

// ============================================================================
// RELATIONS
// ============================================================================

export const emergencyCasesRelations = relations(
  emergencyCases,
  ({ one, many }) => ({
    appointment: one(appointments, {
      fields: [emergencyCases.appointmentId],
      references: [appointments.id],
    }),
    clinic: one(clinics, {
      fields: [emergencyCases.clinicId],
      references: [clinics.id],
    }),
    patient: one(patients, {
      fields: [emergencyCases.animalId],
      references: [patients.id],
    }),
    client: one(clients, {
      fields: [emergencyCases.ownerId],
      references: [clients.id],
    }),
    assignedVeterinarian: one(veterinarians, {
      fields: [emergencyCases.assignedVeterinarianId],
      references: [veterinarians.id],
    }),
    criticalCareRecords: many(criticalCareRecords),
  })
);

export const criticalCareRecordsRelations = relations(
  criticalCareRecords,
  ({ one }) => ({
    emergencyCase: one(emergencyCases, {
      fields: [criticalCareRecords.emergencyCaseId],
      references: [emergencyCases.id],
    }),
    patient: one(patients, {
      fields: [criticalCareRecords.animalId],
      references: [patients.id],
    }),
  })
);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type EmergencyCaseRow = typeof emergencyCases.$inferSelect;
export type NewEmergencyCaseRow = typeof emergencyCases.$inferInsert;

export type CriticalCareRecordRow = typeof criticalCareRecords.$inferSelect;
export type NewCriticalCareRecordRow = typeof criticalCareRecords.$inferInsert;
