/**
 * Schema Helper Functions
 *
 * Reusable patterns for common database schema elements
 * to maintain consistency and reduce duplication (DRY principle)
 */

import { json, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Standard timestamp fields for audit tracking
 * Includes created_at and updated_at with automatic management
 */
export const timestamps = {
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
} as const;

/**
 * Timestamp fields with soft delete support
 * Includes created_at, updated_at, and deleted_at
 */
export const timestampsWithSoftDelete = {
  ...timestamps,
  deletedAt: timestamp("deleted_at"),
} as const;

/**
 * Generic metadata JSON field for extensibility
 * Allows storing additional unstructured data without schema changes
 */
export const metadata = {
  metadata: json("metadata").$type<Record<string, unknown>>(),
} as const;

/**
 * Notes field for additional context/comments
 */
export const notes = {
  notes: text("notes"),
} as const;

/**
 * User tracking field for who created/recorded an action
 * @param fieldName - Custom field name (default: "created_by_user_id")
 */
export function createdByUser(fieldName = "created_by_user_id") {
  return {
    [fieldName]: uuid(fieldName).notNull(),
  } as const;
}

/**
 * User tracking field for who performed an action (generic)
 * @param fieldName - Field name like "recorded_by", "administered_by", "performed_by"
 */
export function performedByUser(fieldName: string) {
  return {
    [fieldName]: uuid(fieldName).notNull(),
  } as const;
}

/**
 * Optional user tracking field
 * @param fieldName - Field name for the user reference
 */
export function optionalUser(fieldName: string) {
  return {
    [fieldName]: uuid(fieldName),
  } as const;
}

/**
 * Clinic reference foreign key (required)
 * Used across most tables to associate records with a clinic
 */
export function clinicReference(_tableName: string) {
  return uuid("clinic_id")
    .notNull()
    .references(
      () => {
        // Dynamic import to avoid circular dependencies
        const { clinics } = require("./clinics");
        return clinics.id;
      },
      { onDelete: "cascade" }
    );
}

/**
 * Patient (animal) reference foreign key (required)
 * Used across clinical tables to associate records with a patient
 */
export function patientReference(_tableName: string) {
  return uuid("animal_id")
    .notNull()
    .references(
      () => {
        // Dynamic import to avoid circular dependencies
        const { patients } = require("./patients");
        return patients.id;
      },
      { onDelete: "cascade" }
    );
}

/**
 * Client (owner) reference foreign key (required)
 * Used across tables to associate records with a client
 */
export function clientReference(_tableName: string) {
  return uuid("owner_id")
    .notNull()
    .references(
      () => {
        // Dynamic import to avoid circular dependencies
        const { clients } = require("./clients");
        return clients.id;
      },
      { onDelete: "cascade" }
    );
}

/**
 * Veterinarian reference foreign key (required)
 * Used across clinical tables to track which vet performed the action
 */
export function veterinarianReference(
  fieldName: string,
  _tableName: string,
  options: { onDelete?: "cascade" | "set null" | "restrict" } = {
    onDelete: "cascade",
  }
) {
  return uuid(fieldName)
    .notNull()
    .references(
      () => {
        // Dynamic import to avoid circular dependencies
        const { veterinarians } = require("./veterinarians");
        return veterinarians.id;
      },
      { onDelete: options.onDelete }
    );
}

/**
 * Optional veterinarian reference foreign key
 * Used when the vet assignment is not required
 */
export function optionalVeterinarianReference(
  fieldName: string,
  _tableName: string
) {
  return uuid(fieldName).references(
    () => {
      // Dynamic import to avoid circular dependencies
      const { veterinarians } = require("./veterinarians");
      return veterinarians.id;
    },
    { onDelete: "set null" }
  );
}

/**
 * Appointment reference foreign key (required)
 * Used to link clinical activities to appointments
 */
export function appointmentReference(
  _tableName: string,
  options: { onDelete?: "cascade" | "set null" | "restrict" } = {
    onDelete: "cascade",
  }
) {
  return uuid("appointment_id")
    .notNull()
    .references(
      () => {
        // Dynamic import to avoid circular dependencies
        const { appointments } = require("./appointments");
        return appointments.id;
      },
      { onDelete: options.onDelete }
    );
}

/**
 * Optional appointment reference foreign key
 * Used when the appointment link is not required
 */
export function optionalAppointmentReference(_tableName: string) {
  return uuid("appointment_id").references(
    () => {
      // Dynamic import to avoid circular dependencies
      const { appointments } = require("./appointments");
      return appointments.id;
    },
    { onDelete: "set null" }
  );
}
