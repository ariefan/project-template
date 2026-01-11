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
import { metadata, timestamps } from "./helpers";

// ============================================================================
// ENUMS
// ============================================================================

export const clinicTypeEnum = pgEnum("clinic_type", [
  "general_practice",
  "emergency_hospital",
  "specialty_hospital",
  "mobile_clinic",
  "farm_service",
  "mixed_practice",
]);

export const facilityTypeEnum = pgEnum("facility_type", [
  "examination_room",
  "surgery_suite",
  "diagnostic_lab",
  "pharmacy",
  "radiology",
  "isolation_ward",
  "recovery_area",
  "grooming",
]);

// Type exports
export type ClinicType = (typeof clinicTypeEnum.enumValues)[number];
export type FacilityType = (typeof facilityTypeEnum.enumValues)[number];

// ============================================================================
// TABLES
// ============================================================================

export const clinics = pgTable(
  "vet_clinics",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Basic information
    name: text("name").notNull(),
    description: text("description"),
    clinicType: clinicTypeEnum("clinic_type").notNull(),

    // Contact information
    email: text("email"),
    phone: text("phone"),
    website: text("website"),

    // Location
    address: text("address"),
    city: text("city"),
    state: text("state"),
    postalCode: text("postal_code"),
    country: text("country").default("ID").notNull(),
    latitude: text("latitude"),
    longitude: text("longitude"),

    // Operating hours (JSON format: { monday: { open: "08:00", close: "18:00" }, ... })
    operatingHours:
      json("operating_hours").$type<
        Record<string, { open: string; close: string } | null>
      >(),

    // Emergency services
    providesEmergencyService: boolean("provides_emergency_service")
      .default(false)
      .notNull(),
    emergencyHours:
      json("emergency_hours").$type<
        Record<string, { open: string; close: string } | null>
      >(),

    // Licensing and accreditation
    licenseNumber: text("license_number"),
    accreditations: json("accreditations").$type<string[]>(),

    // Status
    isActive: boolean("is_active").default(true).notNull(),

    // Metadata & timestamps
    ...metadata,
    ...timestamps,
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    index("vet_clinics_clinic_type_idx").on(table.clinicType),
    index("vet_clinics_is_active_idx").on(table.isActive),
    index("vet_clinics_city_idx").on(table.city),
  ]
);

export const clinicFacilities = pgTable(
  "vet_clinic_facilities",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),

    name: text("name").notNull(),
    facilityType: facilityTypeEnum("facility_type").notNull(),
    description: text("description"),

    // Capacity and availability
    capacity: text("capacity"), // e.g., "2 examination tables"
    isAvailable: boolean("is_available").default(true).notNull(),

    // Equipment
    equipment: json("equipment").$type<string[]>(),

    // Metadata & timestamps
    ...metadata,
    ...timestamps,
  },
  (table) => [
    index("vet_clinic_facilities_clinic_id_idx").on(table.clinicId),
    index("vet_clinic_facilities_type_idx").on(table.facilityType),
  ]
);

// ============================================================================
// RELATIONS
// ============================================================================

export const clinicsRelations = relations(clinics, ({ many }) => ({
  facilities: many(clinicFacilities),
}));

export const clinicFacilitiesRelations = relations(
  clinicFacilities,
  ({ one }) => ({
    clinic: one(clinics, {
      fields: [clinicFacilities.clinicId],
      references: [clinics.id],
    }),
  })
);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type ClinicRow = typeof clinics.$inferSelect;
export type NewClinicRow = typeof clinics.$inferInsert;

export type ClinicFacilityRow = typeof clinicFacilities.$inferSelect;
export type NewClinicFacilityRow = typeof clinicFacilities.$inferInsert;
