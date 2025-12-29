import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  json,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { clinics } from "./clinics";

// ============================================================================
// ENUMS
// ============================================================================

export const veterinarianSpecializationEnum = pgEnum(
  "veterinarian_specialization",
  [
    "general_practice",
    "internal_medicine",
    "surgery",
    "emergency_critical_care",
    "cardiology",
    "oncology",
    "dermatology",
    "ophthalmology",
    "dentistry",
    "orthopedics",
    "neurology",
    "radiology",
    "anesthesiology",
    "exotic_animals",
    "large_animal",
    "equine",
    "poultry",
    "aquatic",
  ]
);

export const licenseStatusEnum = pgEnum("license_status", [
  "active",
  "inactive",
  "suspended",
  "revoked",
  "expired",
]);

// Type exports
export type VeterinarianSpecialization =
  (typeof veterinarianSpecializationEnum.enumValues)[number];
export type LicenseStatus = (typeof licenseStatusEnum.enumValues)[number];

// ============================================================================
// TABLES
// ============================================================================

export const veterinarians = pgTable(
  "veterinarians",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // User reference (isolated - no FK constraint)
    userId: uuid("user_id"),

    // Professional information
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    title: text("title"), // e.g., "DVM", "VMD", "BVSc"

    // Contact
    email: text("email").notNull(),
    phone: text("phone"),

    // Specialization
    primarySpecialization: veterinarianSpecializationEnum(
      "primary_specialization"
    ),
    secondarySpecializations: json("secondary_specializations").$type<
      VeterinarianSpecialization[]
    >(),

    // Biography
    bio: text("bio"),
    yearsOfExperience: text("years_of_experience"),

    // Languages spoken
    languages: json("languages").$type<string[]>(),

    // Status
    isActive: boolean("is_active").default(true).notNull(),

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
    index("veterinarians_user_id_idx").on(table.userId),
    index("veterinarians_is_active_idx").on(table.isActive),
    index("veterinarians_specialization_idx").on(table.primarySpecialization),
  ]
);

export const veterinarianLicenses = pgTable(
  "veterinarian_licenses",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    veterinarianId: uuid("veterinarian_id")
      .notNull()
      .references(() => veterinarians.id, { onDelete: "cascade" }),

    // License information
    licenseNumber: text("license_number").notNull(),
    licenseType: text("license_type"), // e.g., "State Veterinary License", "DEA Registration"
    issuingAuthority: text("issuing_authority").notNull(), // e.g., "State Board of Veterinary Medicine"
    issuingCountry: text("issuing_country").default("ID").notNull(),
    issuingState: text("issuing_state"),

    // Validity
    issueDate: date("issue_date").notNull(),
    expiryDate: date("expiry_date"),
    status: licenseStatusEnum("status").default("active").notNull(),

    // Controlled substances (DEA)
    deaRegistration: text("dea_registration"),
    controlledSubstanceSchedules: json("controlled_substance_schedules").$type<
      string[]
    >(),

    // Documentation
    documentUrl: text("document_url"),

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
    index("veterinarian_licenses_vet_id_idx").on(table.veterinarianId),
    index("veterinarian_licenses_status_idx").on(table.status),
    index("veterinarian_licenses_expiry_idx").on(table.expiryDate),
  ]
);

export const veterinarianClinicAssignments = pgTable(
  "veterinarian_clinic_assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    veterinarianId: uuid("veterinarian_id")
      .notNull()
      .references(() => veterinarians.id, { onDelete: "cascade" }),

    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),

    // Assignment details
    role: text("role"), // e.g., "Lead Veterinarian", "Associate Veterinarian", "Consulting Specialist"
    isPrimary: boolean("is_primary").default(false).notNull(),

    // Schedule
    workSchedule:
      json("work_schedule").$type<
        Record<string, { start: string; end: string } | null>
      >(),

    // Status
    isActive: boolean("is_active").default(true).notNull(),
    startDate: date("start_date"),
    endDate: date("end_date"),

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
    index("vet_clinic_assignments_vet_id_idx").on(table.veterinarianId),
    index("vet_clinic_assignments_clinic_id_idx").on(table.clinicId),
    index("vet_clinic_assignments_is_active_idx").on(table.isActive),
  ]
);

// ============================================================================
// RELATIONS
// ============================================================================

export const veterinariansRelations = relations(veterinarians, ({ many }) => ({
  licenses: many(veterinarianLicenses),
  clinicAssignments: many(veterinarianClinicAssignments),
}));

export const veterinarianLicensesRelations = relations(
  veterinarianLicenses,
  ({ one }) => ({
    veterinarian: one(veterinarians, {
      fields: [veterinarianLicenses.veterinarianId],
      references: [veterinarians.id],
    }),
  })
);

export const veterinarianClinicAssignmentsRelations = relations(
  veterinarianClinicAssignments,
  ({ one }) => ({
    veterinarian: one(veterinarians, {
      fields: [veterinarianClinicAssignments.veterinarianId],
      references: [veterinarians.id],
    }),
    clinic: one(clinics, {
      fields: [veterinarianClinicAssignments.clinicId],
      references: [clinics.id],
    }),
  })
);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type VeterinarianRow = typeof veterinarians.$inferSelect;
export type NewVeterinarianRow = typeof veterinarians.$inferInsert;

export type VeterinarianLicenseRow = typeof veterinarianLicenses.$inferSelect;
export type NewVeterinarianLicenseRow =
  typeof veterinarianLicenses.$inferInsert;

export type VeterinarianClinicAssignmentRow =
  typeof veterinarianClinicAssignments.$inferSelect;
export type NewVeterinarianClinicAssignmentRow =
  typeof veterinarianClinicAssignments.$inferInsert;
