import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  json,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { farms } from "./farms";
import { treatmentPlans } from "./health";
import { herds } from "./herds";
import { livestock } from "./livestock";

// ============================================================================
// ENUMS
// ============================================================================

export const diseaseReportStatusEnum = pgEnum("disease_report_status", [
  "draft",
  "submitted",
  "acknowledged",
  "closed",
]);

export const certificationTypeEnum = pgEnum("certification_type", [
  "organic",
  "grass_fed",
  "humane",
  "halal",
  "kosher",
  "other",
]);

export const certificationStatusEnum = pgEnum("certification_status", [
  "active",
  "pending",
  "expired",
  "revoked",
]);

export const administrationRouteEnum = pgEnum("administration_route", [
  "oral",
  "injection_im",
  "injection_sc",
  "injection_iv",
  "topical",
  "intramammary",
  "intrauterine",
  "other",
]);

// ============================================================================
// TABLES
// ============================================================================

export const diseaseReports = pgTable(
  "disease_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    farmId: uuid("farm_id")
      .notNull()
      .references(() => farms.id, { onDelete: "cascade" }),
    livestockId: uuid("livestock_id").references(() => livestock.id, {
      onDelete: "set null",
    }),
    herdId: uuid("herd_id").references(() => herds.id, {
      onDelete: "set null",
    }),

    diseaseName: text("disease_name").notNull(),
    diseaseCode: text("disease_code"),
    isNotifiable: boolean("is_notifiable").default(false).notNull(),

    reportStatus: diseaseReportStatusEnum("report_status")
      .default("draft")
      .notNull(),

    detectionDate: date("detection_date").notNull(),
    reportedDate: date("reported_date"),

    reportingAgency: text("reporting_agency"),
    reportReferenceNumber: text("report_reference_number"),

    veterinarianName: text("veterinarian_name"),
    veterinarianLicense: text("veterinarian_license"),

    affectedCount: integer("affected_count"),

    quarantineStartDate: date("quarantine_start_date"),
    quarantineEndDate: date("quarantine_end_date"),

    symptoms: text("symptoms"),
    diagnosis: text("diagnosis"),
    resolutionNotes: text("resolution_notes"),

    reportedBy: uuid("reported_by").notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("disease_reports_farm_id_idx").on(table.farmId),
    index("disease_reports_livestock_id_idx").on(table.livestockId),
    index("disease_reports_detection_date_idx").on(table.detectionDate),
    index("disease_reports_status_idx").on(table.reportStatus),
    index("disease_reports_is_notifiable_idx").on(table.isNotifiable),
  ]
);

export const antimicrobialUsages = pgTable(
  "antimicrobial_usages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    farmId: uuid("farm_id")
      .notNull()
      .references(() => farms.id, { onDelete: "cascade" }),
    livestockId: uuid("livestock_id").references(() => livestock.id, {
      onDelete: "set null",
    }),
    herdId: uuid("herd_id").references(() => herds.id, {
      onDelete: "set null",
    }),
    treatmentPlanId: uuid("treatment_plan_id").references(
      () => treatmentPlans.id,
      { onDelete: "set null" }
    ),

    medicationName: text("medication_name").notNull(),
    activeIngredient: text("active_ingredient"),
    batchNumber: text("batch_number"),

    dosage: text("dosage").notNull(),
    dosageUnit: text("dosage_unit"),
    administrationRoute: administrationRouteEnum("administration_route"),

    startDate: date("start_date").notNull(),
    endDate: date("end_date"),

    withdrawalPeriodDays: integer("withdrawal_period_days").notNull(),
    withdrawalEndDate: date("withdrawal_end_date").notNull(),

    meatWithdrawalMet: boolean("meat_withdrawal_met").default(false).notNull(),
    milkWithdrawalMet: boolean("milk_withdrawal_met").default(false).notNull(),

    prescribedBy: text("prescribed_by"),
    prescriptionNumber: text("prescription_number"),
    administeredBy: uuid("administered_by"),

    reason: text("reason"),
    notes: text("notes"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("antimicrobial_usages_farm_id_idx").on(table.farmId),
    index("antimicrobial_usages_livestock_id_idx").on(table.livestockId),
    index("antimicrobial_usages_withdrawal_end_date_idx").on(
      table.withdrawalEndDate
    ),
    index("antimicrobial_usages_start_date_idx").on(table.startDate),
    index("antimicrobial_usages_meat_withdrawal_idx").on(
      table.meatWithdrawalMet
    ),
    index("antimicrobial_usages_milk_withdrawal_idx").on(
      table.milkWithdrawalMet
    ),
  ]
);

export const farmCertifications = pgTable(
  "farm_certifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    farmId: uuid("farm_id")
      .notNull()
      .references(() => farms.id, { onDelete: "cascade" }),

    certificationType: certificationTypeEnum("certification_type").notNull(),
    certificationBody: text("certification_body").notNull(),
    certificateNumber: text("certificate_number"),

    issueDate: date("issue_date").notNull(),
    expiryDate: date("expiry_date"),

    status: certificationStatusEnum("status").default("active").notNull(),

    certificatePath: text("certificate_path"),

    auditDate: date("audit_date"),
    nextAuditDate: date("next_audit_date"),

    scope: text("scope"),
    notes: text("notes"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("farm_certifications_farm_id_idx").on(table.farmId),
    index("farm_certifications_status_idx").on(table.status),
    index("farm_certifications_type_idx").on(table.certificationType),
    index("farm_certifications_expiry_date_idx").on(table.expiryDate),
  ]
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: serial("id").primaryKey(),
    farmId: uuid("farm_id")
      .notNull()
      .references(() => farms.id, { onDelete: "cascade" }),

    tableName: text("table_name").notNull(),
    recordId: text("record_id").notNull(),
    action: text("action").notNull(),

    changedFields: json("changed_fields").$type<Record<
      string,
      { old: unknown; new: unknown }
    > | null>(),

    changedBy: uuid("changed_by").notNull(),
    changedAt: timestamp("changed_at").defaultNow().notNull(),

    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
  },
  (table) => [
    index("audit_logs_farm_id_idx").on(table.farmId),
    index("audit_logs_table_name_idx").on(table.tableName),
    index("audit_logs_record_id_idx").on(table.recordId),
    index("audit_logs_changed_at_idx").on(table.changedAt),
    index("audit_logs_changed_by_idx").on(table.changedBy),
  ]
);

// ============================================================================
// RELATIONS
// ============================================================================

export const diseaseReportsRelations = relations(diseaseReports, ({ one }) => ({
  farm: one(farms, {
    fields: [diseaseReports.farmId],
    references: [farms.id],
  }),
  livestock: one(livestock, {
    fields: [diseaseReports.livestockId],
    references: [livestock.id],
  }),
  herd: one(herds, {
    fields: [diseaseReports.herdId],
    references: [herds.id],
  }),
}));

export const antimicrobialUsagesRelations = relations(
  antimicrobialUsages,
  ({ one }) => ({
    farm: one(farms, {
      fields: [antimicrobialUsages.farmId],
      references: [farms.id],
    }),
    livestock: one(livestock, {
      fields: [antimicrobialUsages.livestockId],
      references: [livestock.id],
    }),
    herd: one(herds, {
      fields: [antimicrobialUsages.herdId],
      references: [herds.id],
    }),
    treatmentPlan: one(treatmentPlans, {
      fields: [antimicrobialUsages.treatmentPlanId],
      references: [treatmentPlans.id],
    }),
  })
);

export const farmCertificationsRelations = relations(
  farmCertifications,
  ({ one }) => ({
    farm: one(farms, {
      fields: [farmCertifications.farmId],
      references: [farms.id],
    }),
  })
);

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  farm: one(farms, {
    fields: [auditLogs.farmId],
    references: [farms.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type DiseaseReportRow = typeof diseaseReports.$inferSelect;
export type NewDiseaseReportRow = typeof diseaseReports.$inferInsert;
export type AntimicrobialUsageRow = typeof antimicrobialUsages.$inferSelect;
export type NewAntimicrobialUsageRow = typeof antimicrobialUsages.$inferInsert;
export type FarmCertificationRow = typeof farmCertifications.$inferSelect;
export type NewFarmCertificationRow = typeof farmCertifications.$inferInsert;
export type AuditLogRow = typeof auditLogs.$inferSelect;
export type NewAuditLogRow = typeof auditLogs.$inferInsert;

export type DiseaseReportStatus =
  (typeof diseaseReportStatusEnum.enumValues)[number];
export type CertificationType =
  (typeof certificationTypeEnum.enumValues)[number];
export type CertificationStatus =
  (typeof certificationStatusEnum.enumValues)[number];
export type AdministrationRoute =
  (typeof administrationRouteEnum.enumValues)[number];
