import { relations } from "drizzle-orm";
import {
  boolean,
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
import { appointments } from "./appointments";
import { metadata, timestamps } from "./helpers";
import { patients } from "./patients";
import { veterinarians } from "./veterinarians";

// ============================================================================
// ENUMS
// ============================================================================

export const vaccinationStatusEnum = pgEnum("vaccination_status", [
  "scheduled",
  "administered",
  "overdue",
  "declined",
  "exempted",
]);

export const parasiticControlTypeEnum = pgEnum("parasitic_control_type", [
  "heartworm_prevention",
  "flea_prevention",
  "tick_prevention",
  "intestinal_parasite",
  "deworming",
]);

export const dentalProcedureTypeEnum = pgEnum("dental_procedure_type", [
  "cleaning",
  "polishing",
  "extraction",
  "fluoride_treatment",
  "dental_xray",
]);

// Type exports
export type VaccinationStatus =
  (typeof vaccinationStatusEnum.enumValues)[number];
export type ParasiticControlType =
  (typeof parasiticControlTypeEnum.enumValues)[number];
export type DentalProcedureType =
  (typeof dentalProcedureTypeEnum.enumValues)[number];

// ============================================================================
// TABLES
// ============================================================================

export const vaccinationRecords = pgTable(
  "vet_vaccination_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    appointmentId: uuid("appointment_id").references(() => appointments.id, {
      onDelete: "set null",
    }),

    veterinarianId: uuid("veterinarian_id").references(() => veterinarians.id, {
      onDelete: "set null",
    }),

    // Patient reference
    animalId: uuid("animal_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),

    // Vaccine information
    vaccineName: text("vaccine_name").notNull(),
    manufacturer: text("manufacturer"),
    lotNumber: text("lot_number"),
    serialNumber: text("serial_number"),

    // Administration
    administeredAt: timestamp("administered_at"),
    administeredBy: uuid("administered_by"), // Staff member ID
    dosage: decimal("dosage", { precision: 8, scale: 3 }),
    dosageUnit: text("dosage_unit"),
    route: text("route"), // e.g., "subcutaneous", "intramuscular"
    site: text("site"), // e.g., "left shoulder", "right hip"

    // Status
    status: vaccinationStatusEnum("status").default("administered").notNull(),

    // Scheduling
    scheduledDate: date("scheduled_date"),
    dueDate: date("due_date"),
    nextDueDate: date("next_due_date"),

    // Reaction monitoring
    adverseReaction: text("adverse_reaction"),
    reactionSeverity: text("reaction_severity"), // e.g., "mild", "moderate", "severe"

    // Certificate
    certificateNumber: text("certificate_number"),
    certificateUrl: text("certificate_url"),

    // Notes
    notes: text("notes"),

    // Metadata & timestamps
    ...metadata,
    ...timestamps,
  },
  (table) => [
    index("vet_vaccination_records_animal_id_idx").on(table.animalId),
    index("vet_vaccination_records_status_idx").on(table.status),
    index("vet_vaccination_records_next_due_date_idx").on(table.nextDueDate),
  ]
);

export const parasiticControlRecords = pgTable(
  "vet_parasitic_control_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    appointmentId: uuid("appointment_id").references(() => appointments.id, {
      onDelete: "set null",
    }),

    veterinarianId: uuid("veterinarian_id").references(() => veterinarians.id, {
      onDelete: "set null",
    }),

    // Patient reference
    animalId: uuid("animal_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),

    // Treatment type
    controlType: parasiticControlTypeEnum("control_type").notNull(),

    // Product information
    productName: text("product_name").notNull(),
    manufacturer: text("manufacturer"),
    lotNumber: text("lot_number"),

    // Administration
    administeredAt: timestamp("administered_at").notNull(),
    administeredBy: uuid("administered_by"), // Staff member ID
    dosage: decimal("dosage", { precision: 8, scale: 3 }),
    dosageUnit: text("dosage_unit"),
    route: text("route"),

    // Effectiveness
    nextDueDate: date("next_due_date"),
    durationDays: integer("duration_days"), // Protection duration

    // Test results (for heartworm, etc.)
    testResult: text("test_result"), // e.g., "negative", "positive"
    testDate: date("test_date"),

    // Notes
    notes: text("notes"),

    // Metadata & timestamps
    ...metadata,
    ...timestamps,
  },
  (table) => [
    index("vet_parasitic_control_records_animal_id_idx").on(table.animalId),
    index("vet_parasitic_control_records_control_type_idx").on(
      table.controlType
    ),
    index("vet_parasitic_control_records_next_due_date_idx").on(
      table.nextDueDate
    ),
  ]
);

export const wellnessExams = pgTable(
  "vet_wellness_exams",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    appointmentId: uuid("appointment_id")
      .notNull()
      .references(() => appointments.id, { onDelete: "cascade" }),

    veterinarianId: uuid("veterinarian_id")
      .notNull()
      .references(() => veterinarians.id, { onDelete: "cascade" }),

    // Patient reference
    animalId: uuid("animal_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),

    // Exam date
    examDate: date("exam_date").notNull(),

    // Physical measurements
    weight: decimal("weight", { precision: 6, scale: 2 }), // kg
    bodyConditionScore: text("body_condition_score"), // 1-9 scale
    temperature: decimal("temperature", { precision: 4, scale: 1 }), // Celsius
    heartRate: text("heart_rate"),
    respiratoryRate: text("respiratory_rate"),

    // System review
    eyesEarsNose: text("eyes_ears_nose"),
    oralCavity: text("oral_cavity"),
    cardiovascular: text("cardiovascular"),
    respiratory: text("respiratory"),
    gastrointestinal: text("gastrointestinal"),
    urogenital: text("urogenital"),
    musculoskeletal: text("musculoskeletal"),
    integumentary: text("integumentary"), // Skin and coat
    lymphNodes: text("lymph_nodes"),
    neurologicalStatus: text("neurological_status"),

    // Behavioral assessment
    behavioralAssessment: text("behavioral_assessment"),

    // Overall assessment
    generalAssessment: text("general_assessment"),
    abnormalFindings: json("abnormal_findings").$type<string[]>(),

    // Recommendations
    recommendations: json("recommendations").$type<string[]>(),
    dietRecommendations: text("diet_recommendations"),
    exerciseRecommendations: text("exercise_recommendations"),

    // Next exam
    nextExamDue: date("next_exam_due"),

    // Overall health status
    healthStatus: text("health_status"), // e.g., "excellent", "good", "fair", "poor"

    // Notes
    notes: text("notes"),

    // Metadata & timestamps
    ...metadata,
    ...timestamps,
  },
  (table) => [
    index("vet_wellness_exams_appointment_id_idx").on(table.appointmentId),
    index("vet_wellness_exams_animal_id_idx").on(table.animalId),
    index("vet_wellness_exams_exam_date_idx").on(table.examDate),
  ]
);

export const dentalRecords = pgTable(
  "vet_dental_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    appointmentId: uuid("appointment_id")
      .notNull()
      .references(() => appointments.id, { onDelete: "cascade" }),

    veterinarianId: uuid("veterinarian_id")
      .notNull()
      .references(() => veterinarians.id, { onDelete: "cascade" }),

    // Patient reference
    animalId: uuid("animal_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),

    // Exam date
    examDate: date("exam_date").notNull(),

    // Dental assessment
    dentalScore: text("dental_score"), // 0-4 scale (0=healthy, 4=severe disease)
    calculusLevel: text("calculus_level"), // none, mild, moderate, severe
    gingivitisLevel: text("gingivitis_level"),
    periodontitisLevel: text("periodontitis_level"),

    // Missing teeth
    missingTeeth: json("missing_teeth").$type<string[]>(),

    // Procedures performed
    proceduresPerformed: json("procedures_performed").$type<
      Array<{
        type: string;
        tooth?: string;
        notes?: string;
      }>
    >(),

    // Cleaning details
    cleaningPerformed: boolean("cleaning_performed").default(false),
    polishingPerformed: boolean("polishing_performed").default(false),
    fluorideTreatment: boolean("fluoride_treatment").default(false),

    // Extractions
    extractionsPerformed: json("extractions_performed").$type<
      Array<{
        tooth: string;
        reason: string;
        technique: string;
      }>
    >(),

    // Radiographs
    radiographsTaken: boolean("radiographs_taken").default(false),
    radiographFindings: text("radiograph_findings"),

    // Anesthesia used
    anesthesiaUsed: boolean("anesthesia_used").default(false),
    anesthesiaNotes: text("anesthesia_notes"),

    // Home care recommendations
    homeCareInstructions: text("home_care_instructions"),
    dentalProductsRecommended: json("dental_products_recommended").$type<
      string[]
    >(),

    // Follow-up
    nextDentalExamDue: date("next_dental_exam_due"),

    // Notes
    notes: text("notes"),

    // Metadata & timestamps
    ...metadata,
    ...timestamps,
  },
  (table) => [
    index("vet_dental_records_appointment_id_idx").on(table.appointmentId),
    index("vet_dental_records_animal_id_idx").on(table.animalId),
    index("vet_dental_records_exam_date_idx").on(table.examDate),
  ]
);

// ============================================================================
// RELATIONS
// ============================================================================

export const vaccinationRecordsRelations = relations(
  vaccinationRecords,
  ({ one }) => ({
    appointment: one(appointments, {
      fields: [vaccinationRecords.appointmentId],
      references: [appointments.id],
    }),
    patient: one(patients, {
      fields: [vaccinationRecords.animalId],
      references: [patients.id],
    }),
    veterinarian: one(veterinarians, {
      fields: [vaccinationRecords.veterinarianId],
      references: [veterinarians.id],
    }),
  })
);

export const parasiticControlRecordsRelations = relations(
  parasiticControlRecords,
  ({ one }) => ({
    appointment: one(appointments, {
      fields: [parasiticControlRecords.appointmentId],
      references: [appointments.id],
    }),
    patient: one(patients, {
      fields: [parasiticControlRecords.animalId],
      references: [patients.id],
    }),
    veterinarian: one(veterinarians, {
      fields: [parasiticControlRecords.veterinarianId],
      references: [veterinarians.id],
    }),
  })
);

export const wellnessExamsRelations = relations(wellnessExams, ({ one }) => ({
  appointment: one(appointments, {
    fields: [wellnessExams.appointmentId],
    references: [appointments.id],
  }),
  patient: one(patients, {
    fields: [wellnessExams.animalId],
    references: [patients.id],
  }),
  veterinarian: one(veterinarians, {
    fields: [wellnessExams.veterinarianId],
    references: [veterinarians.id],
  }),
}));

export const dentalRecordsRelations = relations(dentalRecords, ({ one }) => ({
  appointment: one(appointments, {
    fields: [dentalRecords.appointmentId],
    references: [appointments.id],
  }),
  patient: one(patients, {
    fields: [dentalRecords.animalId],
    references: [patients.id],
  }),
  veterinarian: one(veterinarians, {
    fields: [dentalRecords.veterinarianId],
    references: [veterinarians.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type VaccinationRecordRow = typeof vaccinationRecords.$inferSelect;
export type NewVaccinationRecordRow = typeof vaccinationRecords.$inferInsert;

export type ParasiticControlRecordRow =
  typeof parasiticControlRecords.$inferSelect;
export type NewParasiticControlRecordRow =
  typeof parasiticControlRecords.$inferInsert;

export type WellnessExamRow = typeof wellnessExams.$inferSelect;
export type NewWellnessExamRow = typeof wellnessExams.$inferInsert;

export type DentalRecordRow = typeof dentalRecords.$inferSelect;
export type NewDentalRecordRow = typeof dentalRecords.$inferInsert;
