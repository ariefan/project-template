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
import { appointments } from "./appointments";
import { clients } from "./clients";
import { patients } from "./patients";
import { veterinarians } from "./veterinarians";

// ============================================================================
// ENUMS
// ============================================================================

export const treatmentTypeEnum = pgEnum("treatment_type", [
  "medication",
  "injection",
  "infusion",
  "surgery",
  "therapy",
  "bandaging",
  "wound_care",
  "dental_procedure",
  "vaccination",
]);

export const prescriptionStatusEnum = pgEnum("prescription_status", [
  "active",
  "completed",
  "discontinued",
  "expired",
]);

export const medicationRouteEnum = pgEnum("medication_route", [
  "oral",
  "topical",
  "injection_subcutaneous",
  "injection_intramuscular",
  "injection_intravenous",
  "inhalation",
  "rectal",
  "ophthalmic",
  "otic",
]);

export const deaScheduleEnum = pgEnum("dea_schedule", [
  "schedule_1",
  "schedule_2",
  "schedule_3",
  "schedule_4",
  "schedule_5",
  "non_controlled",
]);

// Type exports
export type TreatmentType = (typeof treatmentTypeEnum.enumValues)[number];
export type PrescriptionStatus =
  (typeof prescriptionStatusEnum.enumValues)[number];
export type MedicationRoute = (typeof medicationRouteEnum.enumValues)[number];
export type DeaSchedule = (typeof deaScheduleEnum.enumValues)[number];

// ============================================================================
// TABLES
// ============================================================================

export const treatments = pgTable(
  "vet_treatments",
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

    // Treatment information
    treatmentType: treatmentTypeEnum("treatment_type").notNull(),
    treatmentName: text("treatment_name").notNull(),
    description: text("description"),

    // Timing
    performedAt: timestamp("performed_at"),
    duration: text("duration"), // e.g., "30 minutes"

    // Dosage/quantity
    dosage: decimal("dosage", { precision: 10, scale: 3 }),
    dosageUnit: text("dosage_unit"),

    // Administration
    administrationRoute: medicationRouteEnum("administration_route"),
    administeredBy: uuid("administered_by"), // Staff member ID

    // Clinical notes
    indication: text("indication"),
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
    index("vet_treatments_appointment_id_idx").on(table.appointmentId),
    index("vet_treatments_animal_id_idx").on(table.animalId),
    index("vet_treatments_performed_at_idx").on(table.performedAt),
  ]
);

export const prescriptions = pgTable(
  "vet_prescriptions",
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
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),

    // Prescription details
    prescriptionNumber: text("prescription_number").notNull().unique(),
    medicationName: text("medication_name").notNull(),
    genericName: text("generic_name"),

    // DEA controlled substance
    deaSchedule: deaScheduleEnum("dea_schedule")
      .default("non_controlled")
      .notNull(),
    isControlledSubstance: boolean("is_controlled_substance")
      .default(false)
      .notNull(),

    // Dosage instructions
    dosage: decimal("dosage", { precision: 10, scale: 3 }).notNull(),
    dosageUnit: text("dosage_unit").notNull(),
    route: medicationRouteEnum("route").notNull(),
    frequency: text("frequency").notNull(), // e.g., "twice daily", "every 8 hours"
    duration: text("duration"), // e.g., "7 days", "14 days"

    // Quantity and refills
    quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
    quantityUnit: text("quantity_unit").notNull(),
    refillsAllowed: integer("refills_allowed").default(0).notNull(),
    refillsRemaining: integer("refills_remaining").default(0).notNull(),

    // Instructions
    instructions: text("instructions").notNull(),
    warnings: text("warnings"),

    // Status
    status: prescriptionStatusEnum("status").default("active").notNull(),

    // Dates
    prescribedAt: timestamp("prescribed_at").defaultNow().notNull(),
    startDate: timestamp("start_date"),
    endDate: timestamp("end_date"),
    discontinuedAt: timestamp("discontinued_at"),
    discontinuationReason: text("discontinuation_reason"),

    // Withdrawal period (for food animals)
    meatWithdrawalDays: integer("meat_withdrawal_days"),
    milkWithdrawalDays: integer("milk_withdrawal_days"),

    // Pharmacy
    pharmacyName: text("pharmacy_name"),
    dispensedAt: timestamp("dispensed_at"),

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
    index("vet_prescriptions_appointment_id_idx").on(table.appointmentId),
    index("vet_prescriptions_animal_id_idx").on(table.animalId),
    index("vet_prescriptions_owner_id_idx").on(table.ownerId),
    index("vet_prescriptions_status_idx").on(table.status),
    index("vet_prescriptions_prescription_number_idx").on(
      table.prescriptionNumber
    ),
    check(
      "end_date_after_start_date",
      sql`${table.endDate} > ${table.startDate} OR ${table.endDate} IS NULL OR ${table.startDate} IS NULL`
    ),
    check("dosage_positive", sql`${table.dosage} >= 0`),
    check("quantity_positive", sql`${table.quantity} >= 0`),
  ]
);

export const medicationAdministrationRecords = pgTable(
  "vet_medication_administration_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    prescriptionId: uuid("prescription_id")
      .notNull()
      .references(() => prescriptions.id, { onDelete: "cascade" }),

    // Patient reference
    animalId: uuid("animal_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),

    // Administration details
    administeredAt: timestamp("administered_at").notNull(),
    administeredBy: uuid("administered_by").notNull(), // Staff member ID

    dosageGiven: decimal("dosage_given", { precision: 10, scale: 3 }).notNull(),
    dosageUnit: text("dosage_unit").notNull(),
    route: medicationRouteEnum("route").notNull(),

    // Notes
    notes: text("notes"),
    adverseReactions: text("adverse_reactions"),

    // Metadata
    metadata: json("metadata").$type<Record<string, unknown>>(),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("vet_med_admin_records_prescription_id_idx").on(table.prescriptionId),
    index("vet_med_admin_records_animal_id_idx").on(table.animalId),
    index("vet_med_admin_records_administered_at_idx").on(table.administeredAt),
  ]
);

// ============================================================================
// RELATIONS
// ============================================================================

export const treatmentsRelations = relations(treatments, ({ one }) => ({
  appointment: one(appointments, {
    fields: [treatments.appointmentId],
    references: [appointments.id],
  }),
  patient: one(patients, {
    fields: [treatments.animalId],
    references: [patients.id],
  }),
  veterinarian: one(veterinarians, {
    fields: [treatments.veterinarianId],
    references: [veterinarians.id],
  }),
}));

export const prescriptionsRelations = relations(
  prescriptions,
  ({ one, many }) => ({
    appointment: one(appointments, {
      fields: [prescriptions.appointmentId],
      references: [appointments.id],
    }),
    patient: one(patients, {
      fields: [prescriptions.animalId],
      references: [patients.id],
    }),
    client: one(clients, {
      fields: [prescriptions.ownerId],
      references: [clients.id],
    }),
    veterinarian: one(veterinarians, {
      fields: [prescriptions.veterinarianId],
      references: [veterinarians.id],
    }),
    administrationRecords: many(medicationAdministrationRecords),
  })
);

export const medicationAdministrationRecordsRelations = relations(
  medicationAdministrationRecords,
  ({ one }) => ({
    prescription: one(prescriptions, {
      fields: [medicationAdministrationRecords.prescriptionId],
      references: [prescriptions.id],
    }),
    patient: one(patients, {
      fields: [medicationAdministrationRecords.animalId],
      references: [patients.id],
    }),
  })
);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type TreatmentRow = typeof treatments.$inferSelect;
export type NewTreatmentRow = typeof treatments.$inferInsert;

export type PrescriptionRow = typeof prescriptions.$inferSelect;
export type NewPrescriptionRow = typeof prescriptions.$inferInsert;

export type MedicationAdministrationRecordRow =
  typeof medicationAdministrationRecords.$inferSelect;
export type NewMedicationAdministrationRecordRow =
  typeof medicationAdministrationRecords.$inferInsert;
