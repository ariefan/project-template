import { relations } from "drizzle-orm";
import {
  decimal,
  index,
  json,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { clinics } from "./clinics";
import { veterinarians } from "./veterinarians";

// ============================================================================
// ENUMS
// ============================================================================

export const appointmentTypeEnum = pgEnum("appointment_type", [
  "wellness_exam",
  "vaccination",
  "follow_up",
  "emergency",
  "surgery_consultation",
  "diagnostic",
  "dental",
  "grooming",
  "consultation",
  "euthanasia",
]);

export const appointmentStatusEnum = pgEnum("appointment_status", [
  "scheduled",
  "confirmed",
  "checked_in",
  "in_progress",
  "completed",
  "cancelled",
  "no_show",
  "rescheduled",
]);

export const visitReasonEnum = pgEnum("visit_reason", [
  "routine_checkup",
  "vaccination",
  "illness",
  "injury",
  "behavior_issue",
  "dental_issue",
  "skin_issue",
  "digestive_issue",
  "respiratory_issue",
  "emergency",
  "follow_up",
  "other",
]);

// Type exports
export type AppointmentType = (typeof appointmentTypeEnum.enumValues)[number];
export type AppointmentStatus =
  (typeof appointmentStatusEnum.enumValues)[number];
export type VisitReason = (typeof visitReasonEnum.enumValues)[number];

// ============================================================================
// TABLES
// ============================================================================

export const appointments = pgTable(
  "vet_appointments",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Clinic and veterinarian
    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),

    veterinarianId: uuid("veterinarian_id")
      .notNull()
      .references(() => veterinarians.id, { onDelete: "cascade" }),

    // Patient (animal) reference - isolated, no FK
    animalId: uuid("animal_id").notNull(),
    ownerId: uuid("owner_id").notNull(), // Pet owner user ID

    // Appointment details
    appointmentType: appointmentTypeEnum("appointment_type").notNull(),
    status: appointmentStatusEnum("status").default("scheduled").notNull(),

    // Scheduling
    scheduledAt: timestamp("scheduled_at").notNull(),
    scheduledEndAt: timestamp("scheduled_end_at"),
    duration: text("duration"), // e.g., "30 minutes"

    // Visit information
    visitReason: visitReasonEnum("visit_reason"),
    chiefComplaint: text("chief_complaint"),
    notes: text("notes"),

    // Check-in/out
    checkedInAt: timestamp("checked_in_at"),
    checkedOutAt: timestamp("checked_out_at"),

    // Cancellation
    cancelledAt: timestamp("cancelled_at"),
    cancellationReason: text("cancellation_reason"),

    // Reminders
    reminderSentAt: timestamp("reminder_sent_at"),

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
    index("vet_appointments_clinic_id_idx").on(table.clinicId),
    index("vet_appointments_vet_id_idx").on(table.veterinarianId),
    index("vet_appointments_animal_id_idx").on(table.animalId),
    index("vet_appointments_owner_id_idx").on(table.ownerId),
    index("vet_appointments_status_idx").on(table.status),
    index("vet_appointments_scheduled_at_idx").on(table.scheduledAt),
  ]
);

export const consultations = pgTable(
  "vet_consultations",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    appointmentId: uuid("appointment_id")
      .notNull()
      .references(() => appointments.id, { onDelete: "cascade" }),

    // SOAP notes structure
    // S - Subjective (what the owner reports)
    subjective: text("subjective"),

    // O - Objective (physical examination findings)
    objective: text("objective"),

    // Physical examination
    temperature: decimal("temperature", { precision: 4, scale: 1 }), // Celsius
    heartRate: text("heart_rate"), // beats per minute
    respiratoryRate: text("respiratory_rate"), // breaths per minute
    weight: decimal("weight", { precision: 6, scale: 2 }), // kg
    bodyConditionScore: text("body_condition_score"), // 1-9 scale

    // Vital signs
    vitalSigns: json("vital_signs").$type<Record<string, unknown>>(),

    // A - Assessment (diagnosis)
    assessment: text("assessment"),
    diagnosis: json("diagnosis").$type<string[]>(),

    // P - Plan (treatment plan)
    plan: text("plan"),
    recommendations: json("recommendations").$type<string[]>(),

    // Follow-up
    followUpRequired: text("follow_up_required"),
    followUpDate: timestamp("follow_up_date"),

    // Prognosis
    prognosis: text("prognosis"), // e.g., "good", "guarded", "poor"

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
    index("vet_consultations_appointment_id_idx").on(table.appointmentId),
  ]
);

// ============================================================================
// RELATIONS
// ============================================================================

export const appointmentsRelations = relations(
  appointments,
  ({ one, many }) => ({
    clinic: one(clinics, {
      fields: [appointments.clinicId],
      references: [clinics.id],
    }),
    veterinarian: one(veterinarians, {
      fields: [appointments.veterinarianId],
      references: [veterinarians.id],
    }),
    consultation: one(consultations),
  })
);

export const consultationsRelations = relations(consultations, ({ one }) => ({
  appointment: one(appointments, {
    fields: [consultations.appointmentId],
    references: [appointments.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type AppointmentRow = typeof appointments.$inferSelect;
export type NewAppointmentRow = typeof appointments.$inferInsert;

export type ConsultationRow = typeof consultations.$inferSelect;
export type NewConsultationRow = typeof consultations.$inferInsert;
