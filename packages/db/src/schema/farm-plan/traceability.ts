import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  decimal,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { farms } from "./farms";
import { livestock } from "./livestock";

// ============================================================================
// ENUMS
// ============================================================================

export const tagTechnologyEnum = pgEnum("tag_technology", [
  "visual_only",
  "rfid_lf",
  "rfid_uhf",
  "bolus",
  "tattoo",
]);

export const movementTypeEnum = pgEnum("movement_type", [
  "purchase",
  "sale",
  "transfer",
  "slaughter",
  "show",
  "pasture",
]);

export const movementStatusEnum = pgEnum("movement_status", [
  "planned",
  "in_transit",
  "completed",
  "cancelled",
]);

export const premisesTypeEnum = pgEnum("premises_type", [
  "farm",
  "feedlot",
  "slaughter",
  "market",
  "veterinary",
  "quarantine",
  "other",
]);

// ============================================================================
// TABLES
// ============================================================================

export const premises = pgTable(
  "premises",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    farmId: uuid("farm_id").references(() => farms.id, { onDelete: "cascade" }),

    premisesIdentificationNumber: text("premises_identification_number")
      .notNull()
      .unique(),
    premisesName: text("premises_name").notNull(),
    premisesType: premisesTypeEnum("premises_type").default("farm").notNull(),

    address: text("address"),
    city: text("city"),
    state: text("state"),
    postalCode: text("postal_code"),
    country: text("country").default("ID").notNull(),

    latitude: decimal("latitude", { precision: 10, scale: 7 }),
    longitude: decimal("longitude", { precision: 10, scale: 7 }),

    contactName: text("contact_name"),
    contactPhone: text("contact_phone"),
    contactEmail: text("contact_email"),

    registrationDate: date("registration_date"),
    capacity: integer("capacity"),

    isActive: boolean("is_active").default(true).notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("premises_farm_id_idx").on(table.farmId),
    index("premises_pin_idx").on(table.premisesIdentificationNumber),
    index("premises_type_idx").on(table.premisesType),
  ]
);

export const officialIdentifications = pgTable(
  "official_identifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    livestockId: uuid("livestock_id")
      .notNull()
      .references(() => livestock.id, { onDelete: "cascade" }),

    identificationType: text("identification_type").notNull(),
    identificationNumber: text("identification_number").notNull(),

    tagTechnology: tagTechnologyEnum("tag_technology"),
    manufacturer: text("manufacturer"),

    appliedDate: date("applied_date"),
    appliedBy: uuid("applied_by"),

    retiredDate: date("retired_date"),
    retirementReason: text("retirement_reason"),

    isPrimary: boolean("is_primary").default(false).notNull(),
    isActive: boolean("is_active").default(true).notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("official_identifications_livestock_id_idx").on(table.livestockId),
    index("official_identifications_number_idx").on(table.identificationNumber),
    index("official_identifications_type_idx").on(table.identificationType),
    index("official_identifications_is_active_idx").on(table.isActive),
  ]
);

export const movementRecords = pgTable(
  "movement_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    farmId: uuid("farm_id")
      .notNull()
      .references(() => farms.id, { onDelete: "cascade" }),
    livestockId: uuid("livestock_id")
      .notNull()
      .references(() => livestock.id, { onDelete: "cascade" }),

    movementType: movementTypeEnum("movement_type").notNull(),
    movementStatus: movementStatusEnum("movement_status")
      .default("planned")
      .notNull(),

    fromPremisesId: uuid("from_premises_id").references(() => premises.id, {
      onDelete: "set null",
    }),
    toPremisesId: uuid("to_premises_id").references(() => premises.id, {
      onDelete: "set null",
    }),

    departureDate: timestamp("departure_date"),
    arrivalDate: timestamp("arrival_date"),

    transportMethod: text("transport_method"),
    transportDuration: integer("transport_duration"),
    transportCompany: text("transport_company"),
    vehicleRegistration: text("vehicle_registration"),

    icviNumber: text("icvi_number"),
    healthCertificateDate: date("health_certificate_date"),
    veterinarianName: text("veterinarian_name"),
    veterinarianLicense: text("veterinarian_license"),

    reason: text("reason"),
    notes: text("notes"),

    recordedBy: uuid("recorded_by").notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("movement_records_farm_id_idx").on(table.farmId),
    index("movement_records_livestock_id_idx").on(table.livestockId),
    index("movement_records_departure_date_idx").on(table.departureDate),
    index("movement_records_movement_type_idx").on(table.movementType),
    index("movement_records_status_idx").on(table.movementStatus),
    index("movement_records_from_premises_idx").on(table.fromPremisesId),
    index("movement_records_to_premises_idx").on(table.toPremisesId),
  ]
);

export const breedRegistrations = pgTable(
  "breed_registrations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    livestockId: uuid("livestock_id")
      .notNull()
      .references(() => livestock.id, { onDelete: "cascade" }),

    breedSociety: text("breed_society").notNull(),
    registrationNumber: text("registration_number").notNull(),
    registrationDate: date("registration_date"),

    pedigreeLevel: text("pedigree_level"),
    registrationCertificatePath: text("registration_certificate_path"),

    sireRegistrationNumber: text("sire_registration_number"),
    damRegistrationNumber: text("dam_registration_number"),

    isActive: boolean("is_active").default(true).notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("breed_registrations_livestock_id_idx").on(table.livestockId),
    index("breed_registrations_number_idx").on(table.registrationNumber),
    index("breed_registrations_society_idx").on(table.breedSociety),
  ]
);

// ============================================================================
// RELATIONS
// ============================================================================

export const premisesRelations = relations(premises, ({ one, many }) => ({
  farm: one(farms, {
    fields: [premises.farmId],
    references: [farms.id],
  }),
  outgoingMovements: many(movementRecords, { relationName: "fromPremises" }),
  incomingMovements: many(movementRecords, { relationName: "toPremises" }),
}));

export const officialIdentificationsRelations = relations(
  officialIdentifications,
  ({ one }) => ({
    livestock: one(livestock, {
      fields: [officialIdentifications.livestockId],
      references: [livestock.id],
    }),
  })
);

export const movementRecordsRelations = relations(
  movementRecords,
  ({ one }) => ({
    farm: one(farms, {
      fields: [movementRecords.farmId],
      references: [farms.id],
    }),
    livestock: one(livestock, {
      fields: [movementRecords.livestockId],
      references: [livestock.id],
    }),
    fromPremises: one(premises, {
      fields: [movementRecords.fromPremisesId],
      references: [premises.id],
      relationName: "fromPremises",
    }),
    toPremises: one(premises, {
      fields: [movementRecords.toPremisesId],
      references: [premises.id],
      relationName: "toPremises",
    }),
  })
);

export const breedRegistrationsRelations = relations(
  breedRegistrations,
  ({ one }) => ({
    livestock: one(livestock, {
      fields: [breedRegistrations.livestockId],
      references: [livestock.id],
    }),
  })
);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type PremisesRow = typeof premises.$inferSelect;
export type NewPremisesRow = typeof premises.$inferInsert;
export type OfficialIdentificationRow =
  typeof officialIdentifications.$inferSelect;
export type NewOfficialIdentificationRow =
  typeof officialIdentifications.$inferInsert;
export type MovementRecordRow = typeof movementRecords.$inferSelect;
export type NewMovementRecordRow = typeof movementRecords.$inferInsert;
export type BreedRegistrationRow = typeof breedRegistrations.$inferSelect;
export type NewBreedRegistrationRow = typeof breedRegistrations.$inferInsert;

export type TagTechnology = (typeof tagTechnologyEnum.enumValues)[number];
export type MovementType = (typeof movementTypeEnum.enumValues)[number];
export type MovementStatus = (typeof movementStatusEnum.enumValues)[number];
export type PremisesType = (typeof premisesTypeEnum.enumValues)[number];
