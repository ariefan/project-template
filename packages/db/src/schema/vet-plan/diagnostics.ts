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
import { appointments } from "./appointments";
import { patients } from "./patients";
import { veterinarians } from "./veterinarians";

// ============================================================================
// ENUMS
// ============================================================================

export const diagnosticTestTypeEnum = pgEnum("diagnostic_test_type", [
  "blood_test",
  "urine_test",
  "fecal_test",
  "skin_scraping",
  "cytology",
  "biopsy",
  "culture",
  "xray",
  "ultrasound",
  "ecg",
  "endoscopy",
  "mri",
  "ct_scan",
]);

export const testStatusEnum = pgEnum("test_status", [
  "ordered",
  "sample_collected",
  "in_progress",
  "completed",
  "cancelled",
  "resulted",
]);

export const resultStatusEnum = pgEnum("result_status", [
  "normal",
  "abnormal",
  "critical",
  "pending",
]);

// Type exports
export type DiagnosticTestType =
  (typeof diagnosticTestTypeEnum.enumValues)[number];
export type TestStatus = (typeof testStatusEnum.enumValues)[number];
export type ResultStatus = (typeof resultStatusEnum.enumValues)[number];

// ============================================================================
// TABLES
// ============================================================================

export const diagnosticTests = pgTable(
  "vet_diagnostic_tests",
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

    // Test information
    testType: diagnosticTestTypeEnum("test_type").notNull(),
    testName: text("test_name").notNull(),
    testCode: text("test_code"), // Lab test code

    // Status
    status: testStatusEnum("status").default("ordered").notNull(),

    // Ordering
    orderedAt: timestamp("ordered_at").defaultNow().notNull(),
    orderedBy: uuid("ordered_by").notNull(), // Veterinarian ID

    // Sample collection
    sampleCollectedAt: timestamp("sample_collected_at"),
    sampleType: text("sample_type"), // e.g., "blood", "urine", "tissue"

    // Laboratory
    laboratoryName: text("laboratory_name"),
    laboratoryReferenceNumber: text("laboratory_reference_number"),

    // Clinical indication
    clinicalIndication: text("clinical_indication"),
    notes: text("notes"),

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
    index("vet_diagnostic_tests_appointment_id_idx").on(table.appointmentId),
    index("vet_diagnostic_tests_animal_id_idx").on(table.animalId),
    index("vet_diagnostic_tests_status_idx").on(table.status),
  ]
);

export const testResults = pgTable(
  "vet_test_results",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    diagnosticTestId: uuid("diagnostic_test_id")
      .notNull()
      .references(() => diagnosticTests.id, { onDelete: "cascade" }),

    // Result information
    resultStatus: resultStatusEnum("result_status"),
    resultedAt: timestamp("resulted_at").notNull(),
    resultedBy: uuid("resulted_by"), // Veterinarian or lab technician ID

    // Findings
    findings: text("findings"),
    interpretation: text("interpretation"),

    // Values
    testValues:
      json("test_values").$type<
        Array<{
          parameter: string;
          value: string;
          unit: string;
          referenceRange: string;
          status: "normal" | "low" | "high" | "critical";
        }>
      >(),

    // Images and attachments
    imageUrls: json("image_urls").$type<string[]>(),
    documentUrls: json("document_urls").$type<string[]>(),

    // Critical values notification
    isCritical: boolean("is_critical").default(false).notNull(),
    criticalNotifiedAt: timestamp("critical_notified_at"),

    // Reviewed by
    reviewedBy: uuid("reviewed_by"), // Reviewing veterinarian ID
    reviewedAt: timestamp("reviewed_at"),
    reviewNotes: text("review_notes"),

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
    index("vet_test_results_diagnostic_test_id_idx").on(table.diagnosticTestId),
    index("vet_test_results_resulted_at_idx").on(table.resultedAt),
  ]
);

export const imagingStudies = pgTable(
  "vet_imaging_studies",
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

    // Study information
    studyType: text("study_type").notNull(), // e.g., "X-Ray", "Ultrasound", "CT"
    studyDescription: text("study_description"),
    bodyPart: text("body_part"),

    // Ordering
    orderedAt: timestamp("ordered_at").defaultNow().notNull(),
    performedAt: timestamp("performed_at"),

    // Technician
    performedBy: uuid("performed_by"), // Technician or vet ID

    // Clinical indication
    clinicalIndication: text("clinical_indication"),

    // Images
    imageUrls: json("image_urls").$type<string[]>(),
    dicomUrls: json("dicom_urls").$type<string[]>(), // DICOM format images

    // Radiologist interpretation
    interpretedBy: uuid("interpreted_by"), // Radiologist/veterinarian ID
    interpretedAt: timestamp("interpreted_at"),
    findings: text("findings"),
    impression: text("impression"),

    // Measurements
    measurements:
      json("measurements").$type<
        Array<{
          name: string;
          value: number;
          unit: string;
          location: string;
        }>
      >(),

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
    index("vet_imaging_studies_appointment_id_idx").on(table.appointmentId),
    index("vet_imaging_studies_animal_id_idx").on(table.animalId),
    index("vet_imaging_studies_performed_at_idx").on(table.performedAt),
  ]
);

// ============================================================================
// RELATIONS
// ============================================================================

export const diagnosticTestsRelations = relations(
  diagnosticTests,
  ({ one, many }) => ({
    appointment: one(appointments, {
      fields: [diagnosticTests.appointmentId],
      references: [appointments.id],
    }),
    patient: one(patients, {
      fields: [diagnosticTests.animalId],
      references: [patients.id],
    }),
    veterinarian: one(veterinarians, {
      fields: [diagnosticTests.veterinarianId],
      references: [veterinarians.id],
    }),
    results: many(testResults),
  })
);

export const testResultsRelations = relations(testResults, ({ one }) => ({
  diagnosticTest: one(diagnosticTests, {
    fields: [testResults.diagnosticTestId],
    references: [diagnosticTests.id],
  }),
}));

export const imagingStudiesRelations = relations(imagingStudies, ({ one }) => ({
  appointment: one(appointments, {
    fields: [imagingStudies.appointmentId],
    references: [appointments.id],
  }),
  patient: one(patients, {
    fields: [imagingStudies.animalId],
    references: [patients.id],
  }),
  veterinarian: one(veterinarians, {
    fields: [imagingStudies.veterinarianId],
    references: [veterinarians.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type DiagnosticTestRow = typeof diagnosticTests.$inferSelect;
export type NewDiagnosticTestRow = typeof diagnosticTests.$inferInsert;

export type TestResultRow = typeof testResults.$inferSelect;
export type NewTestResultRow = typeof testResults.$inferInsert;

export type ImagingStudyRow = typeof imagingStudies.$inferSelect;
export type NewImagingStudyRow = typeof imagingStudies.$inferInsert;
