/**
 * Indonesian Regulatory Compliance Schema
 *
 * This module implements comprehensive regulatory compliance for Indonesian
 * livestock and food production operations, covering four major regulatory bodies:
 *
 * 1. Kementan (Ministry of Agriculture) - Animal health and movement control
 * 2. BPOM (Food & Drug Authority) - Product registration and safety
 * 3. SNI (Indonesian National Standard) - Quality standards certification
 * 4. MUI (Indonesian Ulema Council) - Halal certification
 */

import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  json,
  pgEnum,
  pgTable,
  serial,
  text,
  time,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { farms } from "./farms";
import { timestamps } from "./helpers";
import { herds } from "./herds";
import { livestock } from "./livestock";
import { cities, provinces } from "./locations";
import { premises } from "./traceability";

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Kementan (Ministry of Agriculture) Enums
 */

export const nkvStatusEnum = pgEnum("nkv_status", [
  "active",
  "expired",
  "suspended",
  "revoked",
]);

export const skkhTypeEnum = pgEnum("skkh_type", [
  "intra_district",
  "inter_district",
  "inter_province",
  "export",
]);

export const skkhStatusEnum = pgEnum("skkh_status", [
  "draft",
  "issued",
  "used",
  "expired",
  "cancelled",
]);

/**
 * BPOM (Food & Drug Authority) Enums
 */

export const bpomProductCategoryEnum = pgEnum("bpom_product_category", [
  "dairy_processed",
  "meat_processed",
  "feed_supplement",
  "other",
]);

export const bpomRegistrationStatusEnum = pgEnum("bpom_registration_status", [
  "pending",
  "approved",
  "expired",
  "revoked",
  "renewal_required",
]);

/**
 * SNI (Indonesian National Standard) Enums
 */

export const sniCertificationTypeEnum = pgEnum("sni_certification_type", [
  "dairy_products",
  "meat_products",
  "feed_products",
  "processing_facility",
  "other",
]);

export const sniCertificationStatusEnum = pgEnum("sni_certification_status", [
  "active",
  "pending_renewal",
  "expired",
  "suspended",
  "revoked",
]);

/**
 * MUI (Halal Certification) Enums
 */

export const halalCertificationStatusEnum = pgEnum(
  "halal_certification_status",
  ["active", "pending_renewal", "expired", "suspended", "revoked"]
);

export const slaughterMethodEnum = pgEnum("slaughter_method", [
  "manual_islamic",
  "mechanical_stunning_islamic",
  "other",
]);

export const halalChainStageEnum = pgEnum("halal_chain_stage", [
  "slaughter",
  "processing",
  "storage",
  "transport",
  "retail",
]);

// ============================================================================
// KEMENTAN TABLES (Ministry of Agriculture)
// ============================================================================

/**
 * NKV (Nomor Kontrol Veteriner) - Veterinary Control Numbers
 *
 * Issued by: Dinas Peternakan (District/Provincial Livestock Services)
 * Purpose: Certify animal health status for movement or slaughter
 * Valid: Typically 7 days for movement, 24 hours for slaughter
 */
export const kementanNkvRecords = pgTable(
  "kementan_nkv_records",
  {
    id: serial("id").primaryKey(),

    // References
    farmId: uuid("farm_id")
      .notNull()
      .references(() => farms.id, { onDelete: "cascade" }),
    slaughterPremisesId: uuid("slaughter_premises_id").references(
      () => premises.id,
      { onDelete: "set null" }
    ),

    // NKV Information
    nkvNumber: varchar("nkv_number", { length: 100 }).notNull().unique(),
    issueDate: date("issue_date").notNull(),
    expiryDate: date("expiry_date").notNull(),

    // Issuing Authority
    issuingAuthority: varchar("issuing_authority", { length: 255 }).notNull(), // e.g., "Dinas Peternakan Provinsi Jawa Timur"
    issuingProvinceId: integer("issuing_province_id").references(
      () => provinces.id,
      { onDelete: "set null" }
    ),
    issuingCityId: integer("issuing_city_id").references(() => cities.id, {
      onDelete: "set null",
    }),

    // Veterinarian Information
    veterinarianName: varchar("veterinarian_name", { length: 255 }).notNull(),
    veterinarianLicense: varchar("veterinarian_license", {
      length: 100,
    }).notNull(),

    // Livestock Details
    livestockSpecies: varchar("livestock_species", { length: 100 }),
    livestockCount: integer("livestock_count").notNull(),
    healthStatus: text("health_status"), // Overall health assessment

    // Status & Documentation
    status: nkvStatusEnum("status").default("active").notNull(),
    certificatePath: varchar("certificate_path", { length: 500 }), // Path to PDF/scan
    notes: text("notes"),

    ...timestamps,
  },
  (table) => [
    index("kementan_nkv_records_farm_id_idx").on(table.farmId),
    index("kementan_nkv_records_nkv_number_idx").on(table.nkvNumber),
    index("kementan_nkv_records_status_idx").on(table.status),
    index("kementan_nkv_records_expiry_date_idx").on(table.expiryDate),
    index("kementan_nkv_records_slaughter_premises_idx").on(
      table.slaughterPremisesId
    ),
    check(
      "kementan_nkv_records_dates_valid",
      sql`${table.expiryDate} >= ${table.issueDate}`
    ),
    check(
      "kementan_nkv_records_livestock_count_positive",
      sql`${table.livestockCount} > 0`
    ),
  ]
);

/**
 * SKKH (Surat Keterangan Kesehatan Hewan) - Animal Health Certificates
 *
 * Required for: Inter-district, inter-province, and export movements
 * Issued by: Official veterinarian with government authorization
 */
export const kementanSkkhCertificates = pgTable(
  "kementan_skkh_certificates",
  {
    id: serial("id").primaryKey(),

    // References
    farmId: uuid("farm_id")
      .notNull()
      .references(() => farms.id, { onDelete: "cascade" }),
    movementRecordId: uuid("movement_record_id"), // Link to movement if available

    // Certificate Information
    certificateNumber: varchar("certificate_number", { length: 100 })
      .notNull()
      .unique(),
    certificateType: skkhTypeEnum("certificate_type").notNull(),
    issueDate: date("issue_date").notNull(),
    expiryDate: date("expiry_date").notNull(),

    // Origin and Destination
    originPremisesId: uuid("origin_premises_id").references(() => premises.id, {
      onDelete: "set null",
    }),
    destinationPremisesId: uuid("destination_premises_id").references(
      () => premises.id,
      { onDelete: "set null" }
    ),

    // Geographic Details
    destinationDistrict: varchar("destination_district", { length: 255 }),
    destinationProvince: varchar("destination_province", { length: 255 }),
    destinationCountry: varchar("destination_country", { length: 100 }).default(
      "ID"
    ), // For exports

    // Livestock Information
    livestockCount: integer("livestock_count").notNull(),
    livestockSpecies: varchar("livestock_species", { length: 100 }),
    totalWeight: integer("total_weight"), // In kg

    // Health Inspection
    healthInspectionDate: date("health_inspection_date").notNull(),
    inspectorName: varchar("inspector_name", { length: 255 }).notNull(),
    inspectorLicense: varchar("inspector_license", { length: 100 }).notNull(),
    healthAssessment: text("health_assessment"), // Detailed health findings
    vaccinationStatus: text("vaccination_status"), // Vaccination records
    diseaseFreeStatus: boolean("disease_free_status").default(true).notNull(),

    // Transport Details
    transportMethod: varchar("transport_method", { length: 100 }),
    estimatedDuration: integer("estimated_duration"), // In hours
    transportDate: date("transport_date"),

    // Status & Documentation
    status: skkhStatusEnum("status").default("draft").notNull(),
    certificatePath: varchar("certificate_path", { length: 500 }),
    notes: text("notes"),

    ...timestamps,
  },
  (table) => [
    index("kementan_skkh_certificates_farm_id_idx").on(table.farmId),
    index("kementan_skkh_certificates_certificate_number_idx").on(
      table.certificateNumber
    ),
    index("kementan_skkh_certificates_movement_record_idx").on(
      table.movementRecordId
    ),
    index("kementan_skkh_certificates_status_idx").on(table.status),
    index("kementan_skkh_certificates_expiry_date_idx").on(table.expiryDate),
    index("kementan_skkh_certificates_type_idx").on(table.certificateType),
    check(
      "kementan_skkh_certificates_dates_valid",
      sql`${table.expiryDate} >= ${table.issueDate}`
    ),
    check(
      "kementan_skkh_certificates_livestock_count_positive",
      sql`${table.livestockCount} > 0`
    ),
  ]
);

/**
 * Movement Permits - District and Province-level permits
 *
 * Required for livestock transport across administrative boundaries
 */
export const kementanMovementPermits = pgTable(
  "kementan_movement_permits",
  {
    id: serial("id").primaryKey(),

    // References
    farmId: uuid("farm_id")
      .notNull()
      .references(() => farms.id, { onDelete: "cascade" }),
    skkhCertificateId: integer("skkh_certificate_id").references(
      () => kementanSkkhCertificates.id,
      { onDelete: "set null" }
    ),

    // Permit Information
    permitNumber: varchar("permit_number", { length: 100 }).notNull().unique(),
    permitType: varchar("permit_type", { length: 50 }).notNull(), // "intra_district", "inter_district", "inter_province"
    issueDate: date("issue_date").notNull(),
    expiryDate: date("expiry_date").notNull(),

    // Geographic Scope
    originDistrictId: integer("origin_district_id").references(
      () => cities.id,
      {
        onDelete: "set null",
      }
    ),
    destinationDistrictId: integer("destination_district_id").references(
      () => cities.id,
      { onDelete: "set null" }
    ),
    originProvinceId: integer("origin_province_id").references(
      () => provinces.id,
      { onDelete: "set null" }
    ),
    destinationProvinceId: integer("destination_province_id").references(
      () => provinces.id,
      { onDelete: "set null" }
    ),

    // Issuing Authority
    issuingAuthority: varchar("issuing_authority", { length: 255 }).notNull(),
    authorizedBy: varchar("authorized_by", { length: 255 }), // Officer name
    authorityContact: varchar("authority_contact", { length: 100 }),

    // Livestock Details
    livestockCount: integer("livestock_count").notNull(),
    livestockSpecies: varchar("livestock_species", { length: 100 }),
    purpose: text("purpose"), // Purpose of movement

    // Documentation
    permitPath: varchar("permit_path", { length: 500 }),
    notes: text("notes"),

    ...timestamps,
  },
  (table) => [
    index("kementan_movement_permits_farm_id_idx").on(table.farmId),
    index("kementan_movement_permits_permit_number_idx").on(table.permitNumber),
    index("kementan_movement_permits_permit_type_idx").on(table.permitType),
    index("kementan_movement_permits_expiry_date_idx").on(table.expiryDate),
    index("kementan_movement_permits_skkh_certificate_idx").on(
      table.skkhCertificateId
    ),
    check(
      "kementan_movement_permits_dates_valid",
      sql`${table.expiryDate} >= ${table.issueDate}`
    ),
    check(
      "kementan_movement_permits_livestock_count_positive",
      sql`${table.livestockCount} > 0`
    ),
  ]
);

/**
 * Livestock Inspections - Regular veterinary health inspections
 *
 * Frequency: Quarterly or as required by local regulations
 */
export const kementanLivestockInspections = pgTable(
  "kementan_livestock_inspections",
  {
    id: serial("id").primaryKey(),

    // References
    farmId: uuid("farm_id")
      .notNull()
      .references(() => farms.id, { onDelete: "cascade" }),
    herdId: uuid("herd_id").references(() => herds.id, {
      onDelete: "set null",
    }),

    // Inspection Details
    inspectionDate: date("inspection_date").notNull(),
    inspectionType: varchar("inspection_type", { length: 100 }), // "routine", "disease_surveillance", "export_preparation"

    // Inspector Information
    inspectorName: varchar("inspector_name", { length: 255 }).notNull(),
    inspectorCredentials: varchar("inspector_credentials", {
      length: 100,
    }).notNull(),
    issuingAuthority: varchar("issuing_authority", { length: 255 }).notNull(),

    // Inspection Results
    livestockInspected: integer("livestock_inspected").notNull(),
    healthyCount: integer("healthy_count"),
    sickCount: integer("sick_count"),
    healthStatus: varchar("health_status", { length: 100 }), // Overall herd health

    // Disease Detection
    diseasesDetected:
      json("diseases_detected").$type<
        Array<{
          diseaseName: string;
          affectedCount: number;
          severity: string;
        }>
      >(),

    // Recommendations
    recommendedActions: text("recommended_actions"),
    treatmentPrescribed: text("treatment_prescribed"),

    // Follow-up
    followUpRequired: boolean("follow_up_required").default(false).notNull(),
    followUpDate: date("follow_up_date"),
    followUpNotes: text("follow_up_notes"),

    // Documentation
    certificatePath: varchar("certificate_path", { length: 500 }),
    notes: text("notes"),

    ...timestamps,
  },
  (table) => [
    index("kementan_livestock_inspections_farm_id_idx").on(table.farmId),
    index("kementan_livestock_inspections_herd_id_idx").on(table.herdId),
    index("kementan_livestock_inspections_inspection_date_idx").on(
      table.inspectionDate
    ),
    index("kementan_livestock_inspections_follow_up_idx").on(
      table.followUpRequired,
      table.followUpDate
    ),
    check(
      "kementan_livestock_inspections_livestock_positive",
      sql`${table.livestockInspected} > 0`
    ),
    check(
      "kementan_livestock_inspections_counts_valid",
      sql`${table.healthyCount} IS NULL OR ${table.sickCount} IS NULL OR (${table.healthyCount} + ${table.sickCount} <= ${table.livestockInspected})`
    ),
  ]
);

/**
 * Junction table linking livestock to Kementan compliance documents
 */
export const indonesianComplianceLivestock = pgTable(
  "indonesian_compliance_livestock",
  {
    id: serial("id").primaryKey(),

    livestockId: uuid("livestock_id")
      .notNull()
      .references(() => livestock.id, { onDelete: "cascade" }),

    // Polymorphic reference to compliance records
    complianceRecordType: varchar("compliance_record_type", {
      length: 50,
    }).notNull(), // "nkv", "skkh"
    nkvRecordId: integer("nkv_record_id").references(
      () => kementanNkvRecords.id,
      { onDelete: "cascade" }
    ),
    skkhCertificateId: integer("skkh_certificate_id").references(
      () => kementanSkkhCertificates.id,
      { onDelete: "cascade" }
    ),

    ...timestamps,
  },
  (table) => [
    index("indonesian_compliance_livestock_livestock_id_idx").on(
      table.livestockId
    ),
    index("indonesian_compliance_livestock_nkv_id_idx").on(table.nkvRecordId),
    index("indonesian_compliance_livestock_skkh_id_idx").on(
      table.skkhCertificateId
    ),
    index("indonesian_compliance_livestock_type_idx").on(
      table.complianceRecordType
    ),
  ]
);

// ============================================================================
// BPOM TABLES (Food & Drug Authority)
// ============================================================================

/**
 * BPOM Product Registrations - MD/ML Registration Numbers
 *
 * MD (Makanan Dalam Negeri): Domestic food products
 * ML (Makanan Luar Negeri): Imported food products
 * Valid: 5 years, renewable
 */
export const bpomProductRegistrations = pgTable(
  "bpom_product_registrations",
  {
    id: serial("id").primaryKey(),

    // References
    farmId: uuid("farm_id")
      .notNull()
      .references(() => farms.id, { onDelete: "cascade" }),

    // Registration Information
    registrationNumber: varchar("registration_number", { length: 100 })
      .notNull()
      .unique(), // Format: MD-xxxx or ML-xxxx
    productName: varchar("product_name", { length: 255 }).notNull(),
    productCategory: bpomProductCategoryEnum("product_category").notNull(),
    brandName: varchar("brand_name", { length: 255 }),

    // Registration Details
    registrationDate: date("registration_date").notNull(),
    expiryDate: date("expiry_date").notNull(),
    status: bpomRegistrationStatusEnum("status").default("pending").notNull(),
    renewalDate: date("renewal_date"),

    // Manufacturer Information
    manufacturerName: varchar("manufacturer_name", { length: 255 }).notNull(),
    manufacturerAddress: text("manufacturer_address"),
    productionFacilityId: uuid("production_facility_id").references(
      () => premises.id,
      { onDelete: "set null" }
    ),

    // Product Composition
    productComposition: json("product_composition").$type<
      Array<{
        ingredient: string;
        percentage?: number;
        purpose?: string;
      }>
    >(),

    // Label Information
    labelSpecifications: json("label_specifications").$type<{
      servingSize?: string;
      caloriesPerServing?: number;
      allergens?: string[];
      storageInstructions?: string;
      shelfLife?: string;
    }>(),
    approvedLabelPath: varchar("approved_label_path", { length: 500 }),

    // Documentation
    productCertificatePath: varchar("product_certificate_path", {
      length: 500,
    }),
    notes: text("notes"),

    ...timestamps,
  },
  (table) => [
    index("bpom_product_registrations_farm_id_idx").on(table.farmId),
    index("bpom_product_registrations_registration_number_idx").on(
      table.registrationNumber
    ),
    index("bpom_product_registrations_status_idx").on(table.status),
    index("bpom_product_registrations_expiry_date_idx").on(table.expiryDate),
    index("bpom_product_registrations_product_category_idx").on(
      table.productCategory
    ),
    check(
      "bpom_product_registrations_dates_valid",
      sql`${table.expiryDate} >= ${table.registrationDate}`
    ),
  ]
);

/**
 * BPOM Product Batches - Batch tracking for recalls
 */
export const bpomProductBatches = pgTable(
  "bpom_product_batches",
  {
    id: serial("id").primaryKey(),

    // References
    registrationId: integer("registration_id")
      .notNull()
      .references(() => bpomProductRegistrations.id, { onDelete: "cascade" }),

    // Batch Information
    batchNumber: varchar("batch_number", { length: 100 }).notNull(),
    productionDate: date("production_date").notNull(),
    expiryDate: date("expiry_date").notNull(),
    productQuantity: integer("product_quantity"), // Number of units produced

    // Production Facility
    productionFacilityId: uuid("production_facility_id").references(
      () => premises.id,
      { onDelete: "set null" }
    ),

    // Quality Testing
    qualityTestResults: json("quality_test_results").$type<
      Array<{
        testType: string;
        testDate: string;
        result: string;
        isPassed: boolean;
      }>
    >(),

    // Status
    batchStatus: varchar("batch_status", { length: 50 }).default("active"), // "active", "recalled", "expired", "disposed"

    // Recall Information
    recallStatus: varchar("recall_status", { length: 50 }), // "none", "partial", "full"
    recallDate: date("recall_date"),
    recallReason: text("recall_reason"),
    dispositionMethod: text("disposition_method"), // How recalled product was handled

    notes: text("notes"),

    ...timestamps,
  },
  (table) => [
    index("bpom_product_batches_registration_id_idx").on(table.registrationId),
    index("bpom_product_batches_batch_number_idx").on(table.batchNumber),
    index("bpom_product_batches_production_date_idx").on(table.productionDate),
    index("bpom_product_batches_recall_status_idx").on(table.recallStatus),
    unique("bpom_product_batches_registration_batch_unique").on(
      table.registrationId,
      table.batchNumber
    ),
    check(
      "bpom_product_batches_dates_valid",
      sql`${table.expiryDate} >= ${table.productionDate}`
    ),
  ]
);

/**
 * BPOM Label Approvals - Label compliance tracking
 */
export const bpomLabelApprovals = pgTable(
  "bpom_label_approvals",
  {
    id: serial("id").primaryKey(),

    // References
    registrationId: integer("registration_id")
      .notNull()
      .references(() => bpomProductRegistrations.id, { onDelete: "cascade" }),

    // Approval Information
    approvalNumber: varchar("approval_number", { length: 100 }).notNull(),
    approvalDate: date("approval_date").notNull(),
    expiryDate: date("expiry_date"),

    // Label Details
    labelVersion: varchar("label_version", { length: 50 }).notNull(),
    labelDesignPath: varchar("label_design_path", { length: 500 }),

    // Compliance Checks
    nutritionalInfoCompliant: boolean("nutritional_info_compliant")
      .default(false)
      .notNull(),
    ingredientsListCompliant: boolean("ingredients_list_compliant")
      .default(false)
      .notNull(),
    allergenWarningsCompliant: boolean("allergen_warnings_compliant")
      .default(false)
      .notNull(),
    halalLogoApproved: boolean("halal_logo_approved").default(false),

    // Approval Status
    status: varchar("status", { length: 50 }).default("pending").notNull(), // "pending", "approved", "rejected", "revision_required"
    approvedBy: varchar("approved_by", { length: 255 }),
    rejectionReason: text("rejection_reason"),

    notes: text("notes"),

    ...timestamps,
  },
  (table) => [
    index("bpom_label_approvals_registration_id_idx").on(table.registrationId),
    index("bpom_label_approvals_approval_number_idx").on(table.approvalNumber),
    index("bpom_label_approvals_status_idx").on(table.status),
    unique("bpom_label_approvals_registration_version_unique").on(
      table.registrationId,
      table.labelVersion
    ),
  ]
);

// ============================================================================
// SNI TABLES (Indonesian National Standard)
// ============================================================================

/**
 * SNI Certifications - Product and facility certifications
 */
export const sniCertifications = pgTable(
  "sni_certifications",
  {
    id: serial("id").primaryKey(),

    // References
    farmId: uuid("farm_id")
      .notNull()
      .references(() => farms.id, { onDelete: "cascade" }),
    facilityId: uuid("facility_id").references(() => premises.id, {
      onDelete: "set null",
    }),

    // Certification Information
    certificateNumber: varchar("certificate_number", { length: 100 })
      .notNull()
      .unique(),
    certificationType: sniCertificationTypeEnum("certification_type").notNull(),
    certificationStandard: varchar("certification_standard", { length: 100 }), // e.g., "SNI 01-3141-1998" for milk

    // Product or Facility
    productOrFacility: varchar("product_or_facility", {
      length: 255,
    }).notNull(), // Name of certified product/facility

    // Dates
    issueDate: date("issue_date").notNull(),
    expiryDate: date("expiry_date").notNull(),
    status: sniCertificationStatusEnum("status").default("active").notNull(),

    // Certifying Body
    certifyingBody: varchar("certifying_body", { length: 255 }).notNull(), // e.g., "LSSUK" (Lembaga Sertifikasi Sistem Usaha Kehutanan)
    certifierContact: varchar("certifier_contact", { length: 255 }),

    // Audit Information
    auditDate: date("audit_date"),
    nextAuditDate: date("next_audit_date"),
    auditorName: varchar("auditor_name", { length: 255 }),

    // Scope
    scope: text("scope"), // Detailed scope of certification

    // Documentation
    certificatePath: varchar("certificate_path", { length: 500 }),
    notes: text("notes"),

    ...timestamps,
  },
  (table) => [
    index("sni_certifications_farm_id_idx").on(table.farmId),
    index("sni_certifications_facility_id_idx").on(table.facilityId),
    index("sni_certifications_certificate_number_idx").on(
      table.certificateNumber
    ),
    index("sni_certifications_status_idx").on(table.status),
    index("sni_certifications_expiry_date_idx").on(table.expiryDate),
    index("sni_certifications_certification_type_idx").on(
      table.certificationType
    ),
    check(
      "sni_certifications_dates_valid",
      sql`${table.expiryDate} >= ${table.issueDate}`
    ),
  ]
);

/**
 * SNI Compliance Tests - Quality testing against SNI standards
 */
export const sniComplianceTests = pgTable(
  "sni_compliance_tests",
  {
    id: serial("id").primaryKey(),

    // References
    certificationId: integer("certification_id")
      .notNull()
      .references(() => sniCertifications.id, { onDelete: "cascade" }),

    // Test Information
    testDate: date("test_date").notNull(),
    testType: varchar("test_type", { length: 100 }).notNull(), // "microbiological", "compositional", "physical", "chemical"
    standardReference: varchar("standard_reference", { length: 100 }), // e.g., "SNI 01-3141"

    // Testing Laboratory
    testingLaboratory: varchar("testing_laboratory", { length: 255 }).notNull(),
    laboratoryAccreditation: varchar("laboratory_accreditation", {
      length: 100,
    }), // e.g., "KAN" (Komite Akreditasi Nasional)

    // Test Results
    testResults:
      json("test_results").$type<
        Array<{
          parameter: string;
          result: string;
          unit?: string;
          standard?: string;
          isPassed: boolean;
        }>
      >(),
    isPassed: boolean("is_passed").notNull(),

    // Personnel
    testedBy: varchar("tested_by", { length: 255 }),
    verifiedBy: varchar("verified_by", { length: 255 }),

    // Documentation
    testReportPath: varchar("test_report_path", { length: 500 }),
    notes: text("notes"),

    ...timestamps,
  },
  (table) => [
    index("sni_compliance_tests_certification_id_idx").on(
      table.certificationId
    ),
    index("sni_compliance_tests_test_date_idx").on(table.testDate),
    index("sni_compliance_tests_test_type_idx").on(table.testType),
    index("sni_compliance_tests_is_passed_idx").on(table.isPassed),
  ]
);

// ============================================================================
// MUI HALAL TABLES (Halal Certification)
// ============================================================================

/**
 * MUI Halal Certifications
 *
 * Valid: 2 years for facilities and products
 */
export const muiHalalCertifications = pgTable(
  "mui_halal_certifications",
  {
    id: serial("id").primaryKey(),

    // References
    farmId: uuid("farm_id")
      .notNull()
      .references(() => farms.id, { onDelete: "cascade" }),
    facilityId: uuid("facility_id").references(() => premises.id, {
      onDelete: "set null",
    }),

    // Certificate Information
    certificateNumber: varchar("certificate_number", { length: 100 })
      .notNull()
      .unique(),
    certificateType: varchar("certificate_type", { length: 50 }).notNull(), // "facility", "product", "slaughter"

    // Dates
    issueDate: date("issue_date").notNull(),
    expiryDate: date("expiry_date").notNull(),
    status: halalCertificationStatusEnum("status").default("active").notNull(),

    // Issuing Authority
    issuingMuiOffice: varchar("issuing_mui_office", { length: 255 }).notNull(), // e.g., "MUI Provinsi Jawa Timur"
    muiOfficerName: varchar("mui_officer_name", { length: 255 }),
    muiOfficerContact: varchar("mui_officer_contact", { length: 100 }),

    // Audit Information
    auditDate: date("audit_date"),
    nextAuditDate: date("next_audit_date"),
    auditorName: varchar("auditor_name", { length: 255 }),
    auditorCertificate: varchar("auditor_certificate", { length: 100 }),

    // Scope
    scope: text("scope"), // What is covered by this certification

    // Renewal
    renewalApplicationDate: date("renewal_application_date"),

    // Documentation
    certificatePath: varchar("certificate_path", { length: 500 }),
    notes: text("notes"),

    ...timestamps,
  },
  (table) => [
    index("mui_halal_certifications_farm_id_idx").on(table.farmId),
    index("mui_halal_certifications_facility_id_idx").on(table.facilityId),
    index("mui_halal_certifications_certificate_number_idx").on(
      table.certificateNumber
    ),
    index("mui_halal_certifications_status_idx").on(table.status),
    index("mui_halal_certifications_expiry_date_idx").on(table.expiryDate),
    check(
      "mui_halal_certifications_dates_valid",
      sql`${table.expiryDate} >= ${table.issueDate}`
    ),
  ]
);

/**
 * Halal Slaughter Procedures - Detailed Islamic slaughter documentation
 *
 * Requirements:
 * - Slaughterer must be Muslim with MUI certification
 * - Prayer recitation: "Bismillahi Allahu Akbar"
 * - Animal orientation toward Qibla (Mecca)
 * - Proper cutting method and complete blood drainage
 */
export const halalSlaughterProcedures = pgTable(
  "halal_slaughter_procedures",
  {
    id: serial("id").primaryKey(),

    // References
    halalCertificationId: integer("halal_certification_id").references(
      () => muiHalalCertifications.id,
      { onDelete: "set null" }
    ),
    slaughterFacilityId: uuid("slaughter_facility_id").references(
      () => premises.id,
      { onDelete: "set null" }
    ),

    // Slaughter Details
    slaughterDate: date("slaughter_date").notNull(),
    slaughterTime: time("slaughter_time"),
    slaughterMethod: slaughterMethodEnum("slaughter_method").notNull(),

    // Slaughterer Information
    slaughtererName: varchar("slaughterer_name", { length: 255 }).notNull(),
    slaughtererCertificateNumber: varchar("slaughterer_certificate_number", {
      length: 100,
    }).notNull(), // MUI certification
    slaughtererReligion: varchar("slaughterer_religion", { length: 50 })
      .default("Islam")
      .notNull(),

    // Islamic Requirements
    prayerRecited: boolean("prayer_recited").default(true).notNull(), // "Bismillahi Allahu Akbar"
    animalOrientationMecca: boolean("animal_orientation_mecca")
      .default(true)
      .notNull(),
    cuttingMethod: text("cutting_method"), // Description of cutting procedure
    bleedingMethod: text("bleeding_method"), // Complete blood drainage method

    // Supervision
    supervisionType: varchar("supervision_type", { length: 50 }), // "supervised", "witnessed"
    supervisorName: varchar("supervisor_name", { length: 255 }),
    supervisorCertificate: varchar("supervisor_certificate", { length: 100 }),

    // Witness (if applicable)
    witnessName: varchar("witness_name", { length: 255 }),
    witnessCertificate: varchar("witness_certificate", { length: 100 }),

    // Compliance
    procedureCompliant: boolean("procedure_compliant").default(true).notNull(),
    nonComplianceReason: text("non_compliance_reason"),

    // Documentation
    documentPath: varchar("document_path", { length: 500 }), // Photo/video evidence
    notes: text("notes"),

    ...timestamps,
  },
  (table) => [
    index("halal_slaughter_procedures_halal_certification_idx").on(
      table.halalCertificationId
    ),
    index("halal_slaughter_procedures_slaughter_facility_idx").on(
      table.slaughterFacilityId
    ),
    index("halal_slaughter_procedures_slaughter_date_idx").on(
      table.slaughterDate
    ),
    index("halal_slaughter_procedures_slaughterer_cert_idx").on(
      table.slaughtererCertificateNumber
    ),
  ]
);

/**
 * Halal Supply Chain Records - Track halal integrity throughout processing
 */
export const halalSupplyChainRecords = pgTable(
  "halal_supply_chain_records",
  {
    id: serial("id").primaryKey(),

    // References
    halalCertificationId: integer("halal_certification_id")
      .notNull()
      .references(() => muiHalalCertifications.id, { onDelete: "cascade" }),

    // Record Details
    recordDate: date("record_date").notNull(),
    chainStage: halalChainStageEnum("chain_stage").notNull(), // slaughter, processing, storage, transport, retail

    // Facility
    facilityId: uuid("facility_id").references(() => premises.id, {
      onDelete: "set null",
    }),
    facilityName: varchar("facility_name", { length: 255 }),

    // Halal Status
    halalStatus: varchar("halal_status", { length: 50 })
      .default("compliant")
      .notNull(), // "compliant", "suspect", "non_compliant"

    // Integrity Checks
    contaminationRisk: boolean("contamination_risk").default(false).notNull(),
    separationMaintained: boolean("separation_maintained")
      .default(true)
      .notNull(), // Physical separation from non-halal products
    cleaningProcedure: text("cleaning_procedure"), // How equipment was cleaned between halal/non-halal

    // Personnel
    verifiedBy: varchar("verified_by", { length: 255 }).notNull(),
    verifierCertificate: varchar("verifier_certificate", { length: 100 }),

    // Documentation
    inspectionFindings: text("inspection_findings"),
    correctiveActions: text("corrective_actions"),
    notes: text("notes"),

    ...timestamps,
  },
  (table) => [
    index("halal_supply_chain_records_halal_certification_idx").on(
      table.halalCertificationId
    ),
    index("halal_supply_chain_records_record_date_idx").on(table.recordDate),
    index("halal_supply_chain_records_chain_stage_idx").on(table.chainStage),
    index("halal_supply_chain_records_facility_idx").on(table.facilityId),
    index("halal_supply_chain_records_halal_status_idx").on(table.halalStatus),
  ]
);

// ============================================================================
// RELATIONS
// ============================================================================

export const kementanNkvRecordsRelations = relations(
  kementanNkvRecords,
  ({ one, many }) => ({
    farm: one(farms, {
      fields: [kementanNkvRecords.farmId],
      references: [farms.id],
    }),
    slaughterPremises: one(premises, {
      fields: [kementanNkvRecords.slaughterPremisesId],
      references: [premises.id],
    }),
    issuingProvince: one(provinces, {
      fields: [kementanNkvRecords.issuingProvinceId],
      references: [provinces.id],
    }),
    issuingCity: one(cities, {
      fields: [kementanNkvRecords.issuingCityId],
      references: [cities.id],
    }),
    livestockLinks: many(indonesianComplianceLivestock),
  })
);

export const kementanSkkhCertificatesRelations = relations(
  kementanSkkhCertificates,
  ({ one, many }) => ({
    farm: one(farms, {
      fields: [kementanSkkhCertificates.farmId],
      references: [farms.id],
    }),
    originPremises: one(premises, {
      fields: [kementanSkkhCertificates.originPremisesId],
      references: [premises.id],
      relationName: "skkhOrigin",
    }),
    destinationPremises: one(premises, {
      fields: [kementanSkkhCertificates.destinationPremisesId],
      references: [premises.id],
      relationName: "skkhDestination",
    }),
    movementPermits: many(kementanMovementPermits),
    livestockLinks: many(indonesianComplianceLivestock),
  })
);

export const kementanMovementPermitsRelations = relations(
  kementanMovementPermits,
  ({ one }) => ({
    farm: one(farms, {
      fields: [kementanMovementPermits.farmId],
      references: [farms.id],
    }),
    skkhCertificate: one(kementanSkkhCertificates, {
      fields: [kementanMovementPermits.skkhCertificateId],
      references: [kementanSkkhCertificates.id],
    }),
    originDistrict: one(cities, {
      fields: [kementanMovementPermits.originDistrictId],
      references: [cities.id],
      relationName: "permitOriginDistrict",
    }),
    destinationDistrict: one(cities, {
      fields: [kementanMovementPermits.destinationDistrictId],
      references: [cities.id],
      relationName: "permitDestinationDistrict",
    }),
    originProvince: one(provinces, {
      fields: [kementanMovementPermits.originProvinceId],
      references: [provinces.id],
      relationName: "permitOriginProvince",
    }),
    destinationProvince: one(provinces, {
      fields: [kementanMovementPermits.destinationProvinceId],
      references: [provinces.id],
      relationName: "permitDestinationProvince",
    }),
  })
);

export const kementanLivestockInspectionsRelations = relations(
  kementanLivestockInspections,
  ({ one }) => ({
    farm: one(farms, {
      fields: [kementanLivestockInspections.farmId],
      references: [farms.id],
    }),
    herd: one(herds, {
      fields: [kementanLivestockInspections.herdId],
      references: [herds.id],
    }),
  })
);

export const indonesianComplianceLivestockRelations = relations(
  indonesianComplianceLivestock,
  ({ one }) => ({
    livestock: one(livestock, {
      fields: [indonesianComplianceLivestock.livestockId],
      references: [livestock.id],
    }),
    nkvRecord: one(kementanNkvRecords, {
      fields: [indonesianComplianceLivestock.nkvRecordId],
      references: [kementanNkvRecords.id],
    }),
    skkhCertificate: one(kementanSkkhCertificates, {
      fields: [indonesianComplianceLivestock.skkhCertificateId],
      references: [kementanSkkhCertificates.id],
    }),
  })
);

export const bpomProductRegistrationsRelations = relations(
  bpomProductRegistrations,
  ({ one, many }) => ({
    farm: one(farms, {
      fields: [bpomProductRegistrations.farmId],
      references: [farms.id],
    }),
    productionFacility: one(premises, {
      fields: [bpomProductRegistrations.productionFacilityId],
      references: [premises.id],
    }),
    batches: many(bpomProductBatches),
    labelApprovals: many(bpomLabelApprovals),
  })
);

export const bpomProductBatchesRelations = relations(
  bpomProductBatches,
  ({ one }) => ({
    registration: one(bpomProductRegistrations, {
      fields: [bpomProductBatches.registrationId],
      references: [bpomProductRegistrations.id],
    }),
    productionFacility: one(premises, {
      fields: [bpomProductBatches.productionFacilityId],
      references: [premises.id],
    }),
  })
);

export const bpomLabelApprovalsRelations = relations(
  bpomLabelApprovals,
  ({ one }) => ({
    registration: one(bpomProductRegistrations, {
      fields: [bpomLabelApprovals.registrationId],
      references: [bpomProductRegistrations.id],
    }),
  })
);

export const sniCertificationsRelations = relations(
  sniCertifications,
  ({ one, many }) => ({
    farm: one(farms, {
      fields: [sniCertifications.farmId],
      references: [farms.id],
    }),
    facility: one(premises, {
      fields: [sniCertifications.facilityId],
      references: [premises.id],
    }),
    complianceTests: many(sniComplianceTests),
  })
);

export const sniComplianceTestsRelations = relations(
  sniComplianceTests,
  ({ one }) => ({
    certification: one(sniCertifications, {
      fields: [sniComplianceTests.certificationId],
      references: [sniCertifications.id],
    }),
  })
);

export const muiHalalCertificationsRelations = relations(
  muiHalalCertifications,
  ({ one, many }) => ({
    farm: one(farms, {
      fields: [muiHalalCertifications.farmId],
      references: [farms.id],
    }),
    facility: one(premises, {
      fields: [muiHalalCertifications.facilityId],
      references: [premises.id],
    }),
    slaughterProcedures: many(halalSlaughterProcedures),
    supplyChainRecords: many(halalSupplyChainRecords),
  })
);

export const halalSlaughterProceduresRelations = relations(
  halalSlaughterProcedures,
  ({ one }) => ({
    halalCertification: one(muiHalalCertifications, {
      fields: [halalSlaughterProcedures.halalCertificationId],
      references: [muiHalalCertifications.id],
    }),
    slaughterFacility: one(premises, {
      fields: [halalSlaughterProcedures.slaughterFacilityId],
      references: [premises.id],
    }),
  })
);

export const halalSupplyChainRecordsRelations = relations(
  halalSupplyChainRecords,
  ({ one }) => ({
    halalCertification: one(muiHalalCertifications, {
      fields: [halalSupplyChainRecords.halalCertificationId],
      references: [muiHalalCertifications.id],
    }),
    facility: one(premises, {
      fields: [halalSupplyChainRecords.facilityId],
      references: [premises.id],
    }),
  })
);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

// Kementan Types
export type KementanNkvRecordRow = typeof kementanNkvRecords.$inferSelect;
export type NewKementanNkvRecordRow = typeof kementanNkvRecords.$inferInsert;
export type KementanSkkhCertificateRow =
  typeof kementanSkkhCertificates.$inferSelect;
export type NewKementanSkkhCertificateRow =
  typeof kementanSkkhCertificates.$inferInsert;
export type KementanMovementPermitRow =
  typeof kementanMovementPermits.$inferSelect;
export type NewKementanMovementPermitRow =
  typeof kementanMovementPermits.$inferInsert;
export type KementanLivestockInspectionRow =
  typeof kementanLivestockInspections.$inferSelect;
export type NewKementanLivestockInspectionRow =
  typeof kementanLivestockInspections.$inferInsert;
export type IndonesianComplianceLivestockRow =
  typeof indonesianComplianceLivestock.$inferSelect;
export type NewIndonesianComplianceLivestockRow =
  typeof indonesianComplianceLivestock.$inferInsert;

// BPOM Types
export type BpomProductRegistrationRow =
  typeof bpomProductRegistrations.$inferSelect;
export type NewBpomProductRegistrationRow =
  typeof bpomProductRegistrations.$inferInsert;
export type BpomProductBatchRow = typeof bpomProductBatches.$inferSelect;
export type NewBpomProductBatchRow = typeof bpomProductBatches.$inferInsert;
export type BpomLabelApprovalRow = typeof bpomLabelApprovals.$inferSelect;
export type NewBpomLabelApprovalRow = typeof bpomLabelApprovals.$inferInsert;

// SNI Types
export type SniCertificationRow = typeof sniCertifications.$inferSelect;
export type NewSniCertificationRow = typeof sniCertifications.$inferInsert;
export type SniComplianceTestRow = typeof sniComplianceTests.$inferSelect;
export type NewSniComplianceTestRow = typeof sniComplianceTests.$inferInsert;

// MUI Halal Types
export type MuiHalalCertificationRow =
  typeof muiHalalCertifications.$inferSelect;
export type NewMuiHalalCertificationRow =
  typeof muiHalalCertifications.$inferInsert;
export type HalalSlaughterProcedureRow =
  typeof halalSlaughterProcedures.$inferSelect;
export type NewHalalSlaughterProcedureRow =
  typeof halalSlaughterProcedures.$inferInsert;
export type HalalSupplyChainRecordRow =
  typeof halalSupplyChainRecords.$inferSelect;
export type NewHalalSupplyChainRecordRow =
  typeof halalSupplyChainRecords.$inferInsert;

// Enum Types
export type NkvStatus = (typeof nkvStatusEnum.enumValues)[number];
export type SkkhType = (typeof skkhTypeEnum.enumValues)[number];
export type SkkhStatus = (typeof skkhStatusEnum.enumValues)[number];
export type BpomProductCategory =
  (typeof bpomProductCategoryEnum.enumValues)[number];
export type BpomRegistrationStatus =
  (typeof bpomRegistrationStatusEnum.enumValues)[number];
export type SniCertificationType =
  (typeof sniCertificationTypeEnum.enumValues)[number];
export type SniCertificationStatus =
  (typeof sniCertificationStatusEnum.enumValues)[number];
export type HalalCertificationStatus =
  (typeof halalCertificationStatusEnum.enumValues)[number];
export type SlaughterMethod = (typeof slaughterMethodEnum.enumValues)[number];
export type HalalChainStage = (typeof halalChainStageEnum.enumValues)[number];
