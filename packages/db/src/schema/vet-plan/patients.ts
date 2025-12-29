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
import { clients } from "./clients";

// ============================================================================
// ENUMS
// ============================================================================

export const speciesEnum = pgEnum("species", [
  "dog",
  "cat",
  "bird",
  "rabbit",
  "guinea_pig",
  "hamster",
  "ferret",
  "reptile",
  "fish",
  "horse",
  "cattle",
  "goat",
  "sheep",
  "pig",
  "chicken",
  "other",
]);

export const genderEnum = pgEnum("gender", [
  "male",
  "female",
  "male_neutered",
  "female_spayed",
  "unknown",
]);

export const patientStatusEnum = pgEnum("patient_status", [
  "active",
  "deceased",
  "transferred",
  "lost",
  "inactive",
]);

export const temperamentEnum = pgEnum("temperament", [
  "friendly",
  "nervous",
  "aggressive",
  "shy",
  "playful",
  "calm",
]);

// Type exports
export type Species = (typeof speciesEnum.enumValues)[number];
export type Gender = (typeof genderEnum.enumValues)[number];
export type PatientStatus = (typeof patientStatusEnum.enumValues)[number];
export type Temperament = (typeof temperamentEnum.enumValues)[number];

// ============================================================================
// TABLES
// ============================================================================

export const patients = pgTable(
  "vet_patients",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Owner/Client
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),

    // Basic information
    patientNumber: text("patient_number").notNull().unique(), // e.g., "PT-00001"
    name: text("name").notNull(),
    species: speciesEnum("species").notNull(),
    breed: text("breed"),
    mixedBreed: boolean("mixed_breed").default(false),

    // Physical characteristics
    gender: genderEnum("gender").notNull(),
    color: text("color"),
    markings: text("markings"), // Distinctive markings for identification

    // Birth and age
    dateOfBirth: date("date_of_birth"),
    approximateAge: text("approximate_age"), // If DOB unknown, e.g., "2 years"
    isAgeEstimate: boolean("is_age_estimate").default(false),

    // Weight tracking
    currentWeight: decimal("current_weight", { precision: 6, scale: 2 }), // kg
    weightUnit: text("weight_unit").default("kg"),

    // Microchip and identification
    microchipNumber: text("microchip_number"),
    microchipDate: date("microchip_date"),
    tattooNumber: text("tattoo_number"),
    registrationNumber: text("registration_number"), // Breed registry

    // Insurance
    hasInsurance: boolean("has_insurance").default(false),
    insuranceProvider: text("insurance_provider"),
    insurancePolicyNumber: text("insurance_policy_number"),
    insuranceExpiryDate: date("insurance_expiry_date"),

    // Behavior and temperament
    temperament: temperamentEnum("temperament"),
    behavioralNotes: text("behavioral_notes"),
    handlingInstructions: text("handling_instructions"),

    // Medical summary
    knownAllergies: json("known_allergies").$type<string[]>(),
    chronicConditions: json("chronic_conditions").$type<string[]>(),
    currentMedications: json("current_medications").$type<string[]>(),

    // Diet
    dietType: text("diet_type"), // e.g., "Dry kibble", "Raw", "Prescription"
    dietBrand: text("diet_brand"),
    dietNotes: text("diet_notes"),
    foodAllergies: json("food_allergies").$type<string[]>(),

    // Reproduction
    isNeutered: boolean("is_neutered").default(false),
    neuteredDate: date("neutered_date"),
    isBreedingAnimal: boolean("is_breeding_animal").default(false),

    // Status
    status: patientStatusEnum("status").default("active").notNull(),
    deceasedDate: date("deceased_date"),
    causeOfDeath: text("cause_of_death"),

    // Photos
    profilePhotoUrl: text("profile_photo_url"),
    photoUrls: json("photo_urls").$type<string[]>(),

    // Special care requirements
    specialNeeds: text("special_needs"),
    requiresSedation: boolean("requires_sedation").default(false),
    aggressiveWarning: boolean("aggressive_warning").default(false),

    // Important dates
    firstVisitDate: date("first_visit_date"),
    lastVisitDate: date("last_visit_date"),
    nextAppointmentDate: date("next_appointment_date"),

    // Notes
    generalNotes: text("general_notes"),

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
    index("vet_patients_client_id_idx").on(table.clientId),
    index("vet_patients_status_idx").on(table.status),
    index("vet_patients_patient_number_idx").on(table.patientNumber),
    index("vet_patients_species_idx").on(table.species),
    index("vet_patients_microchip_idx").on(table.microchipNumber),
  ]
);

export const patientWeightHistory = pgTable(
  "vet_patient_weight_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),

    // Weight measurement
    weight: decimal("weight", { precision: 6, scale: 2 }).notNull(),
    weightUnit: text("weight_unit").default("kg").notNull(),

    // Body condition score (1-9 scale)
    bodyConditionScore: integer("body_condition_score"),

    // Measurement context
    measuredAt: timestamp("measured_at").notNull(),
    measuredBy: uuid("measured_by"), // Staff member ID

    // Notes
    notes: text("notes"),

    // Metadata
    metadata: json("metadata").$type<Record<string, unknown>>(),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("vet_patient_weight_history_patient_id_idx").on(table.patientId),
    index("vet_patient_weight_history_measured_at_idx").on(table.measuredAt),
  ]
);

export const patientDocuments = pgTable(
  "vet_patient_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),

    // Document information
    documentType: text("document_type").notNull(), // e.g., "Vaccination Certificate", "Medical Report", "Insurance Claim"
    title: text("title").notNull(),
    description: text("description"),

    // File information
    fileUrl: text("file_url").notNull(),
    fileName: text("file_name").notNull(),
    fileSize: integer("file_size"), // bytes
    mimeType: text("mime_type"),

    // Uploaded by
    uploadedBy: uuid("uploaded_by"), // Staff member ID

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
    index("vet_patient_documents_patient_id_idx").on(table.patientId),
    index("vet_patient_documents_document_type_idx").on(table.documentType),
  ]
);

// ============================================================================
// RELATIONS
// ============================================================================

export const patientsRelations = relations(patients, ({ one, many }) => ({
  client: one(clients, {
    fields: [patients.clientId],
    references: [clients.id],
  }),
  weightHistory: many(patientWeightHistory),
  documents: many(patientDocuments),
}));

export const patientWeightHistoryRelations = relations(
  patientWeightHistory,
  ({ one }) => ({
    patient: one(patients, {
      fields: [patientWeightHistory.patientId],
      references: [patients.id],
    }),
  })
);

export const patientDocumentsRelations = relations(
  patientDocuments,
  ({ one }) => ({
    patient: one(patients, {
      fields: [patientDocuments.patientId],
      references: [patients.id],
    }),
  })
);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type PatientRow = typeof patients.$inferSelect;
export type NewPatientRow = typeof patients.$inferInsert;

export type PatientWeightHistoryRow = typeof patientWeightHistory.$inferSelect;
export type NewPatientWeightHistoryRow =
  typeof patientWeightHistory.$inferInsert;

export type PatientDocumentRow = typeof patientDocuments.$inferSelect;
export type NewPatientDocumentRow = typeof patientDocuments.$inferInsert;
