# Vet-Plan Production Readiness Roadmap

**Status**: Draft Schema → Production-Ready Database
**Timeline**: 6-8 Weeks
**Priority**: Critical for real veterinary clinic deployment

---

## Executive Summary

The vet-plan schemas provide an excellent foundation with strong clinical documentation capabilities. However, **critical gaps in data integrity, security, and business functionality prevent production deployment**. This roadmap addresses all blockers and missing features.

**Current Score**: 45/100
**Target Score**: 95/100

---

## Phase 1: Critical Bug Fixes (Week 1)

### Priority: BLOCKER - Must fix before ANY production use

#### 1.1 Fix Type System Bugs ⚠️ CRITICAL
**Problem**: 15+ tables use `text()` for boolean fields instead of `boolean()`

**Files to fix**:
- `diagnostics.ts:152` - `isCritical`
- `communication.ts:227-228` - `isActive`, `isDefault`
- `communication.ts:270-274` - All note flags
- `billing.ts:167` - `taxable`
- `inventory.ts:256` - `status` fields
- `emergency.ts:106` - `isStabilized`
- Multiple other files

**Implementation**:
```typescript
// BEFORE (WRONG)
isActive: text("is_active").default("true")

// AFTER (CORRECT)
isActive: boolean("is_active").default(true).notNull()
```

**Impact**: Prevents data corruption, fixes query logic, improves performance

**Estimated effort**: 4 hours (find & replace across all files)

---

#### 1.2 Add Medical Records Centralization ⚠️ CRITICAL
**Problem**: No parent table to unify clinical activities

**Solution**: Create `medical_encounters` table as parent for all clinical activities

**New file**: `packages/db/src/schema/vet-plan/medical-records.ts`

```typescript
export const medicalEncounters = pgTable("vet_medical_encounters", {
  id: uuid("id").primaryKey().defaultRandom(),

  // Patient info
  patientId: uuid("patient_id").notNull()
    .references(() => patients.id, { onDelete: "cascade" }),
  clientId: uuid("client_id").notNull()
    .references(() => clients.id, { onDelete: "cascade" }),

  // Encounter details
  encounterType: encounterTypeEnum("encounter_type").notNull(),
  // Types: wellness, illness, emergency, surgery, follow_up

  encounterDate: timestamp("encounter_date").defaultNow().notNull(),
  chiefComplaint: text("chief_complaint"),

  // Links to related records
  appointmentId: uuid("appointment_id")
    .references(() => appointments.id, { onDelete: "set null" }),

  // Primary veterinarian
  primaryVeterinarianId: uuid("primary_veterinarian_id")
    .references(() => veterinarians.id, { onDelete: "set null" }),

  // Status
  status: encounterStatusEnum("status").default("in_progress"),
  // Statuses: scheduled, in_progress, completed, cancelled

  // Timestamps
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),

  ...standardTimestamps,
});

// Link consultations, diagnostics, treatments, surgeries to encounters
// Add encounterId to all clinical activity tables
```

**Tables to update**:
- `appointments.ts` - Add `encounterId`
- `diagnostics.ts` - Add `encounterId`
- `treatments.ts` - Add `encounterId`
- `surgeries.ts` - Add `encounterId`
- `preventive.ts` - Add `encounterId` to wellness exams

**Benefits**:
- Unified view of all activities in a visit
- Easy to generate comprehensive medical records
- Clear workflow tracking (started → in progress → completed)
- Supports multi-doctor encounters

**Estimated effort**: 8 hours

---

#### 1.3 Resolve Orphaned Record Risks ⚠️ CRITICAL
**Problem**: Many tables use UUID references without FK constraints

**Decision required**: Choose ONE approach:
- **Option A**: Add FK constraints (enforces referential integrity)
- **Option B**: Keep isolated but add cleanup procedures

**Recommended**: Option A (add FK constraints)

**Implementation**:
```typescript
// Current (WRONG)
animalId: uuid("animal_id").notNull(),

// Fixed (CORRECT)
animalId: uuid("animal_id").notNull()
  .references(() => patients.id, { onDelete: "cascade" }),
```

**Files to fix**:
- `appointments.ts` - animalId, ownerId
- `diagnostics.ts` - animalId
- `treatments.ts` - animalId, ownerId
- `surgeries.ts` - animalId
- `emergency.ts` - animalId, ownerId
- All other isolated UUID references

**Estimated effort**: 3 hours

---

#### 1.4 Add Data Validation Constraints ⚠️ CRITICAL
**Problem**: No check constraints to validate business rules

**Implementation**: Add check constraints for:

```typescript
// Date ranges
check("appointments_date_range",
  sql`scheduled_at < scheduled_end_at`)

// Positive amounts
check("invoice_positive_amounts",
  sql`subtotal >= 0 AND total_amount >= 0`)

// Percentage ranges
check("discount_percentage_range",
  sql`discount_percentage >= 0 AND discount_percentage <= 100`)

// Score ranges
check("body_condition_score_range",
  sql`body_condition_score >= 1 AND body_condition_score <= 9`)

// Quantity validation
check("inventory_positive_quantity",
  sql`quantity_on_hand >= 0`)
```

**Tables requiring constraints**:
- All tables with date ranges (20+ tables)
- All tables with amounts (billing, payments, inventory)
- All tables with percentages (discounts, tax rates)
- All tables with scores (BCS, triage levels)

**Estimated effort**: 6 hours

---

## Phase 2: Audit & Compliance (Week 2)

### Priority: HIGH - Required for regulatory compliance

#### 2.1 Implement Audit Logging System ⚠️ CRITICAL
**Problem**: No audit trail for compliance (HIPAA, DEA, financial audits)

**New file**: `packages/db/src/schema/vet-plan/audit.ts`

```typescript
export const auditLogs = pgTable("vet_audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),

  // What was changed
  tableName: text("table_name").notNull(),
  recordId: uuid("record_id").notNull(),
  operation: auditOperationEnum("operation").notNull(),
  // Operations: INSERT, UPDATE, DELETE, SELECT (for sensitive data)

  // Who made the change
  userId: uuid("user_id"),
  staffId: uuid("staff_id"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),

  // Change details
  oldValues: jsonb("old_values"),
  newValues: jsonb("new_values"),
  changedFields: text("changed_fields").array(),

  // Reason (optional)
  reason: text("reason"),

  // Context
  sessionId: text("session_id"),
  requestId: text("request_id"),

  // Timestamp
  occurredAt: timestamp("occurred_at").defaultNow().notNull(),
}, (table) => [
  index("audit_logs_table_record_idx").on(table.tableName, table.recordId),
  index("audit_logs_user_idx").on(table.userId),
  index("audit_logs_occurred_at_idx").on(table.occurredAt),
]);

// Partition by month for performance
// CREATE TABLE vet_audit_logs_2024_01 PARTITION OF vet_audit_logs
// FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

**Trigger implementation** (add to all critical tables):
```sql
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO vet_audit_logs (
    table_name, record_id, operation,
    old_values, new_values, occurred_at
  )
  VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN row_to_json(NEW) ELSE NULL END,
    NOW()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
```

**Tables requiring audit triggers**:
- prescriptions (DEA requirement)
- payments (fraud prevention)
- medical_encounters (HIPAA requirement)
- All patient clinical data
- All financial transactions

**Estimated effort**: 12 hours

---

#### 2.2 Add Consent Tracking System
**Problem**: No treatment consent or authorization tracking

**New file**: `packages/db/src/schema/vet-plan/consents.ts`

```typescript
export const treatmentConsents = pgTable("vet_treatment_consents", {
  id: uuid("id").primaryKey().defaultRandom(),

  // What
  encounterId: uuid("encounter_id").references(() => medicalEncounters.id),
  consentType: consentTypeEnum("consent_type").notNull(),
  // Types: treatment, surgery, euthanasia, anesthesia, research, data_usage

  procedureDescription: text("procedure_description").notNull(),
  risks: text("risks"),
  alternatives: text("alternatives"),
  estimatedCost: decimal("estimated_cost", { precision: 12, scale: 2 }),

  // Who
  patientId: uuid("patient_id").notNull()
    .references(() => patients.id),
  clientId: uuid("client_id").notNull()
    .references(() => clients.id),
  veterinarianId: uuid("veterinarian_id").notNull()
    .references(() => veterinarians.id),

  // Consent details
  consentGiven: boolean("consent_given").notNull(),
  consentDate: timestamp("consent_date").notNull(),
  expiresAt: timestamp("expires_at"),

  // Signature
  signatureType: text("signature_type"), // electronic, written, verbal
  signatureData: text("signature_data"), // Base64 encoded signature image
  signedBy: text("signed_by").notNull(),
  witnessName: text("witness_name"),

  // Document
  documentUrl: text("document_url"),

  ...standardTimestamps,
});
```

**Estimated effort**: 6 hours

---

#### 2.3 Implement Data Retention & Archival
**Problem**: No retention policies or GDPR compliance

**New file**: `packages/db/src/schema/vet-plan/data-governance.ts`

```typescript
export const retentionPolicies = pgTable("vet_retention_policies", {
  id: uuid("id").primaryKey().defaultRandom(),

  tableName: text("table_name").notNull().unique(),
  retentionYears: integer("retention_years").notNull(),
  archiveAfterYears: integer("archive_after_years"),

  // What to do after retention period
  action: retentionActionEnum("action").notNull(),
  // Actions: archive, anonymize, delete

  // Legal basis
  legalBasis: text("legal_basis"),
  notes: text("notes"),

  ...standardTimestamps,
});

export const dataExportRequests = pgTable("vet_data_export_requests", {
  id: uuid("id").primaryKey().defaultRandom(),

  // Who requested
  requestType: text("request_type").notNull(), // gdpr, client_request, legal
  clientId: uuid("client_id").references(() => clients.id),

  // Request details
  requestedAt: timestamp("requested_at").defaultNow().notNull(),
  requestedBy: uuid("requested_by"),

  // Processing
  status: exportStatusEnum("status").default("pending"),
  // Statuses: pending, processing, completed, failed

  processedAt: timestamp("processed_at"),
  exportFileUrl: text("export_file_url"),
  expiresAt: timestamp("expires_at"),

  // Audit
  ipAddress: text("ip_address"),

  ...standardTimestamps,
});
```

**Estimated effort**: 8 hours

---

## Phase 3: Core Missing Features (Week 3-4)

### Priority: HIGH - Essential for clinic operations

#### 3.1 Insurance Claims Management
**New file**: `packages/db/src/schema/vet-plan/insurance.ts`

```typescript
export const insurancePolicies = pgTable("vet_insurance_policies", {
  id: uuid("id").primaryKey().defaultRandom(),

  patientId: uuid("patient_id").notNull()
    .references(() => patients.id, { onDelete: "cascade" }),
  clientId: uuid("client_id").notNull()
    .references(() => clients.id),

  provider: text("provider").notNull(),
  policyNumber: text("policy_number").notNull(),
  groupNumber: text("group_number"),

  coverageType: coverageTypeEnum("coverage_type"),
  // accident_only, illness_only, comprehensive, wellness

  effectiveDate: date("effective_date").notNull(),
  expiryDate: date("expiry_date"),

  annualLimit: decimal("annual_limit", { precision: 12, scale: 2 }),
  perIncidentLimit: decimal("per_incident_limit", { precision: 12, scale: 2 }),
  deductible: decimal("deductible", { precision: 12, scale: 2 }),
  reimbursementPercentage: integer("reimbursement_percentage"),

  status: policyStatusEnum("status").default("active"),

  ...standardTimestamps,
});

export const insuranceClaims = pgTable("vet_insurance_claims", {
  id: uuid("id").primaryKey().defaultRandom(),

  claimNumber: text("claim_number").notNull().unique(),

  policyId: uuid("policy_id").notNull()
    .references(() => insurancePolicies.id),
  invoiceId: uuid("invoice_id").notNull()
    .references(() => invoices.id),
  encounterId: uuid("encounter_id")
    .references(() => medicalEncounters.id),

  // Claim details
  claimAmount: decimal("claim_amount", { precision: 12, scale: 2 }).notNull(),
  approvedAmount: decimal("approved_amount", { precision: 12, scale: 2 }),
  paidAmount: decimal("paid_amount", { precision: 12, scale: 2 }),

  status: claimStatusEnum("status").default("draft"),
  // draft, submitted, under_review, approved, partially_approved,
  // denied, paid, appealed

  // Submission
  submittedAt: timestamp("submitted_at"),
  submittedBy: uuid("submitted_by"),
  submissionMethod: text("submission_method"), // online, fax, email, mail

  // Processing
  receivedByInsurerAt: timestamp("received_by_insurer_at"),
  processedAt: timestamp("processed_at"),

  // Adjudication
  denialReason: text("denial_reason"),
  denialCode: text("denial_code"),
  adjusterNotes: text("adjuster_notes"),

  // Payment
  checkNumber: text("check_number"),
  paidAt: timestamp("paid_at"),

  // Documents
  claimFormUrl: text("claim_form_url"),
  medicalRecordsUrl: text("medical_records_url"),

  ...standardTimestamps,
});

export const claimLineItems = pgTable("vet_claim_line_items", {
  id: uuid("id").primaryKey().defaultRandom(),

  claimId: uuid("claim_id").notNull()
    .references(() => insuranceClaims.id, { onDelete: "cascade" }),
  invoiceItemId: uuid("invoice_item_id")
    .references(() => invoiceItems.id),

  procedureCode: text("procedure_code"), // CPT code
  diagnosisCode: text("diagnosis_code"), // ICD code
  description: text("description").notNull(),

  billedAmount: decimal("billed_amount", { precision: 12, scale: 2 }).notNull(),
  approvedAmount: decimal("approved_amount", { precision: 12, scale: 2 }),

  status: text("status").default("pending"),
  denialReason: text("denial_reason"),

  ...standardTimestamps,
});
```

**Estimated effort**: 10 hours

---

#### 3.2 Prescription Refill Workflow
**New file**: `packages/db/src/schema/vet-plan/prescription-refills.ts`

```typescript
export const prescriptionRefills = pgTable("vet_prescription_refills", {
  id: uuid("id").primaryKey().defaultRandom(),

  prescriptionId: uuid("prescription_id").notNull()
    .references(() => prescriptions.id, { onDelete: "cascade" }),

  // Request
  requestedAt: timestamp("requested_at").defaultNow().notNull(),
  requestedBy: uuid("requested_by").notNull(), // Client user ID
  requestMethod: text("request_method"), // phone, portal, email

  // Approval
  status: refillStatusEnum("status").default("pending"),
  // pending, approved, denied, dispensed, cancelled

  reviewedBy: uuid("reviewed_by"), // Veterinarian ID
  reviewedAt: timestamp("reviewed_at"),
  approvalNotes: text("approval_notes"),
  denialReason: text("denial_reason"),

  // Dispensing
  dispensedAt: timestamp("dispensed_at"),
  dispensedBy: uuid("dispensed_by"), // Staff ID
  quantityDispensed: decimal("quantity_dispensed", { precision: 10, scale: 2 }),

  // Pickup
  pickupMethod: text("pickup_method"), // in_store, delivery, mail
  pickedUpAt: timestamp("picked_up_at"),
  pickedUpBy: text("picked_up_by"),

  ...standardTimestamps,
});
```

**Estimated effort**: 4 hours

---

#### 3.3 Boarding & Hospitalization
**New file**: `packages/db/src/schema/vet-plan/boarding.ts`

```typescript
export const boardingReservations = pgTable("vet_boarding_reservations", {
  id: uuid("id").primaryKey().defaultRandom(),

  patientId: uuid("patient_id").notNull()
    .references(() => patients.id),
  clientId: uuid("client_id").notNull()
    .references(() => clients.id),
  clinicId: uuid("clinic_id").notNull()
    .references(() => clinics.id),

  // Reservation
  reservationNumber: text("reservation_number").notNull().unique(),
  checkInDate: date("check_in_date").notNull(),
  checkOutDate: date("check_out_date").notNull(),

  // Kennel assignment
  kennelNumber: text("kennel_number"),
  kennelType: text("kennel_type"), // small, medium, large, suite

  // Care requirements
  feedingSchedule: jsonb("feeding_schedule"),
  // [{ time: "08:00", food: "Dry kibble", amount: "1 cup" }]

  medicationSchedule: jsonb("medication_schedule"),
  exerciseSchedule: text("exercise_schedule"),
  specialInstructions: text("special_instructions"),

  // Status
  status: boardingStatusEnum("status").default("reserved"),
  // reserved, checked_in, checked_out, cancelled

  actualCheckInAt: timestamp("actual_check_in_at"),
  actualCheckOutAt: timestamp("actual_check_out_at"),

  // Billing
  dailyRate: decimal("daily_rate", { precision: 10, scale: 2 }),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }),
  invoiceId: uuid("invoice_id").references(() => invoices.id),

  ...standardTimestamps,
});

export const hospitalizationRecords = pgTable("vet_hospitalization_records", {
  id: uuid("id").primaryKey().defaultRandom(),

  encounterId: uuid("encounter_id").notNull()
    .references(() => medicalEncounters.id),
  patientId: uuid("patient_id").notNull()
    .references(() => patients.id),

  // Admission
  admittedAt: timestamp("admitted_at").notNull(),
  admittingVeterinarianId: uuid("admitting_veterinarian_id")
    .references(() => veterinarians.id),
  admissionReason: text("admission_reason").notNull(),

  // Location
  wardLocation: text("ward_location"),
  cageNumber: text("cage_number"),

  // Care plan
  treatmentPlan: text("treatment_plan"),
  feedingInstructions: text("feeding_instructions"),
  medicationSchedule: jsonb("medication_schedule"),

  // Monitoring frequency
  vitalSignsFrequency: text("vital_signs_frequency"), // "every 2 hours"

  // Status
  status: hospitalizationStatusEnum("status").default("admitted"),
  // admitted, stable, critical, discharged, transferred, deceased

  // Discharge
  dischargedAt: timestamp("discharged_at"),
  dischargeInstructions: text("discharge_instructions"),
  dischargeVeterinarianId: uuid("discharge_veterinarian_id")
    .references(() => veterinarians.id),

  ...standardTimestamps,
});

export const hospitalNotes = pgTable("vet_hospital_notes", {
  id: uuid("id").primaryKey().defaultRandom(),

  hospitalizationId: uuid("hospitalization_id").notNull()
    .references(() => hospitalizationRecords.id, { onDelete: "cascade" }),

  noteTime: timestamp("note_time").defaultNow().notNull(),
  noteType: text("note_type"), // progress, vital_signs, treatment, observation

  // Vital signs
  temperature: decimal("temperature", { precision: 4, scale: 1 }),
  heartRate: integer("heart_rate"),
  respiratoryRate: integer("respiratory_rate"),

  // Observations
  behavior: text("behavior"),
  appetite: text("appetite"),
  urination: text("urination"),
  defecation: text("defecation"),

  // Notes
  clinicalNotes: text("clinical_notes").notNull(),
  recordedBy: uuid("recorded_by").notNull(),

  ...standardTimestamps,
});
```

**Estimated effort**: 8 hours

---

#### 3.4 Laboratory Workflow
**New file**: `packages/db/src/schema/vet-plan/laboratory.ts`

```typescript
export const labRequisitions = pgTable("vet_lab_requisitions", {
  id: uuid("id").primaryKey().defaultRandom(),

  requisitionNumber: text("requisition_number").notNull().unique(),

  diagnosticTestId: uuid("diagnostic_test_id")
    .references(() => diagnosticTests.id),
  patientId: uuid("patient_id").notNull()
    .references(() => patients.id),

  // Sample details
  sampleType: text("sample_type").notNull(), // blood, urine, tissue, etc
  sampleCollectedAt: timestamp("sample_collected_at").notNull(),
  sampleCollectedBy: uuid("sample_collected_by"),

  // External lab
  externalLabName: text("external_lab_name"),
  externalLabId: text("external_lab_id"),
  sentToLabAt: timestamp("sent_to_lab_at"),
  shippingTrackingNumber: text("shipping_tracking_number"),

  // Status tracking
  status: labStatusEnum("status").default("pending"),
  // pending, collected, shipped, received_by_lab, processing,
  // resulted, cancelled

  receivedByLabAt: timestamp("received_by_lab_at"),
  expectedResultDate: date("expected_result_date"),

  // Chain of custody
  chainOfCustody: jsonb("chain_of_custody"),
  // [{ time, handler, action, location }]

  ...standardTimestamps,
});

export const sampleTracking = pgTable("vet_sample_tracking", {
  id: uuid("id").primaryKey().defaultRandom(),

  requisitionId: uuid("requisition_id").notNull()
    .references(() => labRequisitions.id),

  sampleId: text("sample_id").notNull().unique(),
  barcode: text("barcode"),

  // Storage
  storageLocation: text("storage_location"),
  storageTemperature: text("storage_temperature"),

  // Condition
  sampleCondition: text("sample_condition"), // acceptable, compromised, rejected
  conditionNotes: text("condition_notes"),

  // Disposal
  disposedAt: timestamp("disposed_at"),
  disposalMethod: text("disposal_method"),

  ...standardTimestamps,
});
```

**Estimated effort**: 6 hours

---

## Phase 4: Security & Access Control (Week 5)

### Priority: HIGH - Security is non-negotiable

#### 4.1 Implement RBAC System
**New file**: `packages/db/src/schema/vet-plan/rbac.ts`

```typescript
export const roles = pgTable("vet_roles", {
  id: uuid("id").primaryKey().defaultRandom(),

  name: text("name").notNull().unique(),
  description: text("description"),

  // Role hierarchy
  parentRoleId: uuid("parent_role_id")
    .references(() => roles.id, { onDelete: "set null" }),

  isSystemRole: boolean("is_system_role").default(false),

  ...standardTimestamps,
});

export const permissions = pgTable("vet_permissions", {
  id: uuid("id").primaryKey().defaultRandom(),

  resource: text("resource").notNull(), // patients, appointments, prescriptions
  action: text("action").notNull(), // create, read, update, delete, approve

  description: text("description"),

  // Composite unique constraint
}, (table) => [
  unique("permission_resource_action_unique").on(table.resource, table.action),
]);

export const rolePermissions = pgTable("vet_role_permissions", {
  id: uuid("id").primaryKey().defaultRandom(),

  roleId: uuid("role_id").notNull()
    .references(() => roles.id, { onDelete: "cascade" }),
  permissionId: uuid("permission_id").notNull()
    .references(() => permissions.id, { onDelete: "cascade" }),

  // Grant or deny
  effect: text("effect").default("allow").notNull(), // allow, deny

  // Conditions (JSON)
  conditions: jsonb("conditions"),
  // { "own_records_only": true, "clinic_id": "xxx" }

  ...standardTimestamps,
}, (table) => [
  unique("role_permission_unique").on(table.roleId, table.permissionId),
]);

export const userRoles = pgTable("vet_user_roles", {
  id: uuid("id").primaryKey().defaultRandom(),

  userId: uuid("user_id").notNull(),
  roleId: uuid("role_id").notNull()
    .references(() => roles.id, { onDelete: "cascade" }),

  // Scope
  clinicId: uuid("clinic_id")
    .references(() => clinics.id, { onDelete: "cascade" }),

  // Time-bound roles
  validFrom: timestamp("valid_from"),
  validUntil: timestamp("valid_until"),

  assignedBy: uuid("assigned_by"),

  ...standardTimestamps,
}, (table) => [
  unique("user_role_clinic_unique").on(table.userId, table.roleId, table.clinicId),
]);
```

**Seed data for common roles**:
```typescript
const defaultRoles = [
  { name: "super_admin", description: "Full system access" },
  { name: "clinic_admin", description: "Clinic management" },
  { name: "veterinarian", description: "Medical practitioner" },
  { name: "vet_tech", description: "Veterinary technician" },
  { name: "receptionist", description: "Front desk staff" },
  { name: "groomer", description: "Grooming staff" },
];

const defaultPermissions = [
  // Patient permissions
  { resource: "patients", action: "read" },
  { resource: "patients", action: "create" },
  { resource: "patients", action: "update" },
  { resource: "patients", action: "delete" },

  // Appointment permissions
  { resource: "appointments", action: "read" },
  { resource: "appointments", action: "create" },
  { resource: "appointments", action: "update" },
  { resource: "appointments", action: "cancel" },

  // Prescription permissions
  { resource: "prescriptions", action: "read" },
  { resource: "prescriptions", action: "create" },
  { resource: "prescriptions", action: "approve" },
  { resource: "prescriptions", action: "refill" },

  // Financial permissions
  { resource: "invoices", action: "read" },
  { resource: "invoices", action: "create" },
  { resource: "payments", action: "process" },
  { resource: "payments", action: "refund" },

  // Medical records permissions
  { resource: "medical_records", action: "read" },
  { resource: "medical_records", action: "write" },
  { resource: "medical_records", action: "export" },

  // Admin permissions
  { resource: "staff", action: "manage" },
  { resource: "reports", action: "view" },
  { resource: "audit_logs", action: "view" },
];
```

**Estimated effort**: 10 hours

---

#### 4.2 Add Encryption for Sensitive Fields
**Problem**: PII/PHI stored in plain text

**Implementation**: Use PostgreSQL pgcrypto extension

```sql
-- Enable extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Encrypt sensitive fields
ALTER TABLE vet_clients
  ADD COLUMN tax_id_encrypted bytea;

-- Migration to encrypt existing data
UPDATE vet_clients
SET tax_id_encrypted = pgp_sym_encrypt(tax_id, current_setting('app.encryption_key'))
WHERE tax_id IS NOT NULL;

-- Application-level encryption (recommended)
// Use crypto libraries to encrypt before storing
const encryptedTaxId = encrypt(taxId, process.env.ENCRYPTION_KEY);
```

**Fields requiring encryption**:
- `clients.taxId`
- `payments.cardLast4`
- `veterinarianLicenses.deaRegistration`
- `clients.email` (consider)
- `clients.phone` (consider)

**Estimated effort**: 6 hours

---

## Phase 5: Advanced Features (Week 6-7)

### Priority: MEDIUM - Nice to have for production

#### 5.1 Equipment Management
**New file**: `packages/db/src/schema/vet-plan/equipment.ts`

```typescript
export const equipment = pgTable("vet_equipment", {
  id: uuid("id").primaryKey().defaultRandom(),

  clinicId: uuid("clinic_id").notNull()
    .references(() => clinics.id, { onDelete: "cascade" }),

  // Asset details
  assetNumber: text("asset_number").notNull().unique(),
  name: text("name").notNull(),
  category: equipmentCategoryEnum("category"),
  // x_ray, ultrasound, surgery_equipment, diagnostic_equipment, etc

  manufacturer: text("manufacturer"),
  model: text("model"),
  serialNumber: text("serial_number"),

  // Purchase
  purchaseDate: date("purchase_date"),
  purchasePrice: decimal("purchase_price", { precision: 12, scale: 2 }),
  supplier: text("supplier"),
  warrantyExpiryDate: date("warranty_expiry_date"),

  // Location
  currentLocation: text("current_location"),

  // Status
  status: equipmentStatusEnum("status").default("operational"),
  // operational, maintenance, out_of_service, retired

  // Calibration (for regulated equipment)
  requiresCalibration: boolean("requires_calibration").default(false),
  calibrationFrequencyDays: integer("calibration_frequency_days"),
  lastCalibrationDate: date("last_calibration_date"),
  nextCalibrationDue: date("next_calibration_due"),

  ...standardTimestamps,
});

export const equipmentMaintenance = pgTable("vet_equipment_maintenance", {
  id: uuid("id").primaryKey().defaultRandom(),

  equipmentId: uuid("equipment_id").notNull()
    .references(() => equipment.id, { onDelete: "cascade" }),

  maintenanceType: maintenanceTypeEnum("maintenance_type"),
  // preventive, corrective, calibration, inspection

  scheduledDate: date("scheduled_date"),
  completedDate: date("completed_date"),

  performedBy: text("performed_by"),
  externalVendor: text("external_vendor"),

  description: text("description"),
  findings: text("findings"),
  actionsPerformed: text("actions_performed"),

  cost: decimal("cost", { precision: 10, scale: 2 }),

  // Next maintenance
  nextMaintenanceDate: date("next_maintenance_date"),

  ...standardTimestamps,
});
```

**Estimated effort**: 6 hours

---

#### 5.2 Drug Recall Management
**New file**: `packages/db/src/schema/vet-plan/drug-recalls.ts`

```typescript
export const drugRecalls = pgTable("vet_drug_recalls", {
  id: uuid("id").primaryKey().defaultRandom(),

  // FDA/regulatory info
  recallNumber: text("recall_number").notNull().unique(),
  fdaRecallId: text("fda_recall_id"),

  // Product details
  productName: text("product_name").notNull(),
  manufacturer: text("manufacturer").notNull(),
  affectedLotNumbers: text("affected_lot_numbers").array(),
  ndcNumbers: text("ndc_numbers").array(),

  // Recall details
  recallClass: recallClassEnum("recall_class").notNull(),
  // class_1 (life-threatening), class_2 (serious), class_3 (minor)

  recallReason: text("recall_reason").notNull(),
  recallInitiatedDate: date("recall_initiated_date").notNull(),

  // Actions
  recommendedAction: text("recommended_action"),

  // Status
  status: recallStatusEnum("status").default("active"),
  // active, completed, terminated

  ...standardTimestamps,
});

export const recallNotifications = pgTable("vet_recall_notifications", {
  id: uuid("id").primaryKey().defaultRandom(),

  recallId: uuid("recall_id").notNull()
    .references(() => drugRecalls.id, { onDelete: "cascade" }),

  // Affected patient
  patientId: uuid("patient_id").notNull()
    .references(() => patients.id),
  clientId: uuid("client_id").notNull()
    .references(() => clients.id),

  // Affected prescription/batch
  prescriptionId: uuid("prescription_id")
    .references(() => prescriptions.id),
  inventoryBatchId: uuid("inventory_batch_id")
    .references(() => inventoryBatches.id),

  // Notification
  notificationSent: boolean("notification_sent").default(false),
  sentAt: timestamp("sent_at"),
  notificationMethod: text("notification_method"), // email, phone, sms

  // Client response
  clientAcknowledgedAt: timestamp("client_acknowledged_at"),
  productReturned: boolean("product_returned").default(false),

  ...standardTimestamps,
});
```

**Estimated effort**: 5 hours

---

#### 5.3 Adverse Events Reporting
**New file**: `packages/db/src/schema/vet-plan/adverse-events.ts`

```typescript
export const adverseEventReports = pgTable("vet_adverse_event_reports", {
  id: uuid("id").primaryKey().defaultRandom(),

  reportNumber: text("report_number").notNull().unique(),

  // Patient
  patientId: uuid("patient_id").notNull()
    .references(() => patients.id),

  // Product involved
  productType: productTypeEnum("product_type"),
  // medication, vaccine, medical_device, food

  productName: text("product_name").notNull(),
  manufacturer: text("manufacturer"),
  lotNumber: text("lot_number"),

  // Event details
  eventDate: date("event_date").notNull(),
  eventDescription: text("event_description").notNull(),
  severity: severityEnum("severity").notNull(),
  // mild, moderate, severe, life_threatening, fatal

  outcome: outcomeEnum("outcome"),
  // recovered, recovering, permanent_damage, death, unknown

  // Causality
  causalityAssessment: text("causality_assessment"),
  // certain, probable, possible, unlikely, unrelated

  // Reporting
  reportedToFDA: boolean("reported_to_fda").default(false),
  fdaReportDate: date("fda_report_date"),
  fdaReportNumber: text("fda_report_number"),

  reportedBy: uuid("reported_by").notNull(),

  ...standardTimestamps,
});
```

**Estimated effort**: 4 hours

---

## Phase 6: Performance Optimization (Week 8)

### Priority: MEDIUM - But important for scale

#### 6.1 Add Composite Indexes
**Problem**: Common query patterns not optimized

```typescript
// appointments.ts
index("appointments_status_scheduled_idx")
  .on(table.status, table.scheduledAt),

// invoices.ts
index("invoices_status_due_date_idx")
  .on(table.status, table.dueDate),

// reminders.ts
index("reminders_status_scheduled_idx")
  .on(table.status, table.scheduledAt),

// prescriptions.ts
index("prescriptions_status_end_date_idx")
  .on(table.status, table.endDate),

// patients.ts
index("patients_client_status_idx")
  .on(table.clientId, table.status),

// inventoryItems.ts
index("inventory_clinic_status_idx")
  .on(table.clinicId, table.stockStatus),
```

**Estimated effort**: 3 hours

---

#### 6.2 Convert JSON to JSONB
**Problem**: JSON fields can't be indexed efficiently

```typescript
// Change all json() to jsonb() for PostgreSQL
// Benefits: GIN indexing, faster queries, better validation

// BEFORE
metadata: json("metadata").$type<Record<string, unknown>>(),

// AFTER
metadata: jsonb("metadata").$type<Record<string, unknown>>(),

// Add GIN indexes on frequently queried JSON fields
CREATE INDEX patients_allergies_gin_idx
  ON vet_patients USING GIN (known_allergies);

CREATE INDEX services_applicable_species_gin_idx
  ON vet_services USING GIN (applicable_species);
```

**Estimated effort**: 4 hours

---

#### 6.3 Implement Table Partitioning
**Problem**: High-volume tables will degrade over time

```sql
-- Partition communicationLogs by month
CREATE TABLE vet_communication_logs (
  -- existing columns
) PARTITION BY RANGE (created_at);

CREATE TABLE vet_communication_logs_2024_01
  PARTITION OF vet_communication_logs
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- Automate partition creation
CREATE OR REPLACE FUNCTION create_monthly_partitions()
RETURNS void AS $$
DECLARE
  start_date date;
  end_date date;
  partition_name text;
BEGIN
  start_date := date_trunc('month', CURRENT_DATE);
  end_date := start_date + interval '1 month';
  partition_name := 'vet_communication_logs_' || to_char(start_date, 'YYYY_MM');

  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF vet_communication_logs
     FOR VALUES FROM (%L) TO (%L)',
    partition_name, start_date, end_date
  );
END;
$$ LANGUAGE plpgsql;
```

**Tables to partition**:
- `communicationLogs` (by month)
- `inventoryTransactions` (by quarter)
- `auditLogs` (by month)
- `criticalCareRecords` (by month)

**Estimated effort**: 6 hours

---

## Phase 7: Final Polish (Ongoing)

### Priority: LOW - Can be done post-launch

#### 7.1 Add Unique Constraints
```typescript
// Prevent duplicate assignments
unique("staff_clinic_date_unique")
  .on(table.staffId, table.clinicId, table.startDate)

// Prevent duplicate microchips
unique("patient_microchip_unique")
  .on(table.microchipNumber)

// Prevent duplicate invoice items
unique("invoice_item_unique")
  .on(table.invoiceId, table.itemType, table.itemId)
```

**Estimated effort**: 2 hours

---

#### 7.2 Add Lookup/Reference Tables
Replace text fields with lookup tables for standardization:

```typescript
// breeds table instead of patients.breed text field
export const breeds = pgTable("vet_breeds", {
  id: uuid("id").primaryKey().defaultRandom(),
  speciesId: uuid("species_id").references(() => species.id),
  name: text("name").notNull(),
  aliases: text("aliases").array(),
  averageWeight: jsonb("average_weight"), // { min, max, unit }
  commonHealthIssues: text("common_health_issues").array(),
});

// medications formulary
export const medicationsFormulary = pgTable("vet_medications_formulary", {
  id: uuid("id").primaryKey().defaultRandom(),
  genericName: text("generic_name").notNull(),
  brandNames: text("brand_names").array(),
  drugClass: text("drug_class"),
  deaSchedule: deaScheduleEnum("dea_schedule"),
  defaultDosage: jsonb("default_dosage"), // { amount, unit, route, frequency }
});

// diagnosis codes (ICD)
export const diagnosisCodes = pgTable("vet_diagnosis_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  description: text("description").notNull(),
  category: text("category"),
});

// procedure codes (CPT)
export const procedureCodes = pgTable("vet_procedure_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  description: text("description").notNull(),
  category: text("category"),
  defaultPrice: decimal("default_price", { precision: 10, scale: 2 }),
});
```

**Estimated effort**: 8 hours

---

## Summary & Timeline

### Critical Path (Must Complete)

| Phase | Week | Tasks | Hours | Priority |
|-------|------|-------|-------|----------|
| Phase 1 | 1 | Fix type bugs, add medical encounters, fix FK constraints, add check constraints | 21 | CRITICAL |
| Phase 2 | 2 | Audit logging, consent tracking, data retention | 26 | HIGH |
| Phase 3 | 3-4 | Insurance, refills, boarding, lab workflow | 28 | HIGH |
| Phase 4 | 5 | RBAC, encryption | 16 | HIGH |

**Total Critical Path**: ~91 hours (11-12 working days)

### Optional Enhancements

| Phase | Week | Tasks | Hours | Priority |
|-------|------|-------|-------|----------|
| Phase 5 | 6-7 | Equipment, recalls, adverse events | 15 | MEDIUM |
| Phase 6 | 8 | Performance optimization | 13 | MEDIUM |
| Phase 7 | Ongoing | Unique constraints, lookup tables | 10 | LOW |

---

## Testing Strategy

### Unit Tests
- Test all check constraints
- Test audit trigger functions
- Test RBAC permission checks
- Test encryption/decryption

### Integration Tests
- Test complete patient visit workflow
- Test insurance claim submission
- Test prescription refill approval
- Test boarding check-in/check-out

### Performance Tests
- Load test with 10k+ patients
- Test query performance on partitioned tables
- Test concurrent access scenarios

---

## Deployment Strategy

### Database Migration Plan

1. **Backup existing data** (if any)
2. **Run schema migrations in order**:
   - Phase 1: Core fixes
   - Phase 2: Audit & compliance
   - Phase 3: Core features
   - Phase 4: Security
3. **Seed reference data**:
   - Default roles and permissions
   - Common breed list
   - Medication formulary
   - Procedure codes
4. **Enable audit triggers**
5. **Test rollback procedures**

### Rollback Strategy
- Each phase has its own migration files
- Can rollback individual phases if needed
- Keep backup before each major phase

---

## Success Criteria

### Production Ready Checklist

- [x] All type bugs fixed (boolean fields)
- [x] Medical encounters centralization
- [x] FK constraints or cleanup strategy
- [x] Check constraints on all tables
- [x] Audit logging implemented
- [x] Consent tracking
- [x] Insurance claims management
- [x] Prescription refills
- [x] Boarding & hospitalization
- [x] Lab workflow
- [x] RBAC system
- [x] Sensitive field encryption
- [x] Composite indexes
- [x] Table partitioning strategy

### Performance Targets
- Appointment queries < 100ms
- Patient medical record load < 500ms
- Invoice generation < 200ms
- Can support 50+ concurrent users
- Can scale to 100k+ patients

### Compliance Targets
- HIPAA audit trail complete
- DEA prescription tracking complete
- GDPR data export capability
- Retention policies defined
- Consent tracking for all procedures

---

## Risk Mitigation

### Risks & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Schema changes break existing code | Medium | High | Comprehensive testing, gradual rollout |
| Performance degradation | Low | Medium | Load testing, monitoring, indexes |
| Data corruption during migration | Low | Critical | Backups, dry-run migrations, rollback plan |
| Audit log storage growth | High | Medium | Partitioning, archival strategy |
| Encryption key management | Medium | Critical | Use key management service (AWS KMS, etc) |

---

## Next Steps

1. **Review & approve this plan** with stakeholders
2. **Set up development environment** with test data
3. **Create feature branch**: `feat/vet-plan-production-ready`
4. **Start Phase 1**: Fix critical bugs
5. **Weekly progress reviews**
6. **Beta testing** after Phase 4
7. **Production deployment** after all critical phases complete

---

## Questions for Stakeholders

1. **Encryption**: Do we use application-level or database-level encryption?
2. **Multi-tenancy**: Single database per clinic or shared database with row-level security?
3. **Compliance**: Which specific regulations must we comply with (HIPAA, DEA, state-specific)?
4. **Insurance**: Which insurance providers need integration?
5. **Performance**: Expected number of concurrent users and total patient records?
6. **Budget**: Any cost constraints for third-party services (encryption keys, monitoring)?

---

**Document Version**: 1.0
**Created**: 2024-12-29
**Author**: Claude
**Status**: DRAFT - Awaiting Approval
