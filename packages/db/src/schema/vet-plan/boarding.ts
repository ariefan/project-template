import { relations, sql } from "drizzle-orm";
import {
  boolean,
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
import { clients } from "./clients";
import { metadata, timestamps } from "./helpers";
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

// Type exports
export type BoardingStatus = (typeof boardingStatusEnum.enumValues)[number];
export type KennelSize = (typeof kennelSizeEnum.enumValues)[number];

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
    feedingSchedule:
      json("feeding_schedule").$type<
        Array<{ time: string; food: string; amount: string }>
      >(),
    medicationInstructions: text("medication_instructions"),
    medications:
      json("medications").$type<
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
    addOnServices:
      json("add_on_services").$type<
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

    // Metadata & timestamps
    ...metadata,
    ...timestamps,
  },
  (table) => [
    index("vet_boarding_reservations_client_id_idx").on(table.clientId),
    index("vet_boarding_reservations_patient_id_idx").on(table.patientId),
    index("vet_boarding_reservations_status_idx").on(table.status),
    index("vet_boarding_reservations_check_in_date_idx").on(table.checkInDate),
    check(
      "checkout_after_checkin",
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
    mealsEaten:
      json("meals_eaten").$type<
        Array<{ time: string; amountEaten: string; notes: string }>
      >(),

    // Activity
    exerciseTimes:
      json("exercise_times").$type<
        Array<{ time: string; duration: string; activity: string }>
      >(),

    // Health observations
    behaviorNotes: text("behavior_notes"),
    healthObservations: text("health_observations"),
    vomitingOrDiarrhea: boolean("vomiting_or_diarrhea")
      .default(false)
      .notNull(),

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
// RELATIONS
// ============================================================================

export const boardingReservationsRelations = relations(
  boardingReservations,
  ({ one, many }) => ({
    client: one(clients, {
      fields: [boardingReservations.clientId],
      references: [clients.id],
    }),
    patient: one(patients, {
      fields: [boardingReservations.patientId],
      references: [patients.id],
    }),
    dailyLogs: many(boardingDailyLogs),
  })
);

export const boardingDailyLogsRelations = relations(
  boardingDailyLogs,
  ({ one }) => ({
    reservation: one(boardingReservations, {
      fields: [boardingDailyLogs.reservationId],
      references: [boardingReservations.id],
    }),
  })
);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type BoardingReservationRow = typeof boardingReservations.$inferSelect;
export type NewBoardingReservationRow =
  typeof boardingReservations.$inferInsert;

export type BoardingDailyLogRow = typeof boardingDailyLogs.$inferSelect;
export type NewBoardingDailyLogRow = typeof boardingDailyLogs.$inferInsert;
