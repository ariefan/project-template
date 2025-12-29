import { relations } from "drizzle-orm";
import {
  boolean,
  date,
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

// ============================================================================
// ENUMS
// ============================================================================

export const staffRoleEnum = pgEnum("staff_role", [
  "veterinarian",
  "veterinary_technician",
  "veterinary_assistant",
  "receptionist",
  "practice_manager",
  "groomer",
  "kennel_attendant",
  "laboratory_technician",
  "radiology_technician",
  "surgery_technician",
  "anesthesia_technician",
  "pharmacy_technician",
  "cleaner",
  "security",
  "other",
]);

export const employmentTypeEnum = pgEnum("employment_type", [
  "full_time",
  "part_time",
  "contract",
  "temporary",
  "intern",
  "volunteer",
]);

export const staffStatusEnum = pgEnum("staff_status", [
  "active",
  "on_leave",
  "suspended",
  "terminated",
  "resigned",
]);

// Type exports
export type StaffRole = (typeof staffRoleEnum.enumValues)[number];
export type EmploymentType = (typeof employmentTypeEnum.enumValues)[number];
export type StaffStatus = (typeof staffStatusEnum.enumValues)[number];

// ============================================================================
// TABLES
// ============================================================================

export const staff = pgTable(
  "vet_staff",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // User reference (isolated - no FK constraint)
    userId: uuid("user_id"),

    // Employee identification
    employeeNumber: text("employee_number").notNull().unique(),

    // Personal information
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    dateOfBirth: date("date_of_birth"),

    // Contact information
    email: text("email").notNull(),
    phone: text("phone"),
    mobilePhone: text("mobile_phone"),

    // Address
    address: text("address"),
    city: text("city"),
    state: text("state"),
    postalCode: text("postal_code"),
    country: text("country").default("ID").notNull(),

    // Emergency contact
    emergencyContactName: text("emergency_contact_name"),
    emergencyContactPhone: text("emergency_contact_phone"),
    emergencyContactRelationship: text("emergency_contact_relationship"),

    // Employment details
    role: staffRoleEnum("role").notNull(),
    employmentType: employmentTypeEnum("employment_type").notNull(),
    department: text("department"),

    // Status
    status: staffStatusEnum("status").default("active").notNull(),

    // Dates
    hireDate: date("hire_date").notNull(),
    terminationDate: date("termination_date"),
    lastWorkingDate: date("last_working_date"),

    // Compensation
    hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }),
    salary: decimal("salary", { precision: 12, scale: 2 }),
    payFrequency: text("pay_frequency"), // e.g., "hourly", "monthly", "biweekly"

    // Work schedule
    workSchedule: json("work_schedule").$type<
      Record<string, { start: string; end: string; isWorkday: boolean } | null>
    >(),

    // Certifications and licenses
    certifications: json("certifications").$type<
      Array<{
        name: string;
        issuingOrganization: string;
        issueDate: string;
        expiryDate?: string;
        certificateNumber?: string;
      }>
    >(),

    // Skills and specializations
    skills: json("skills").$type<string[]>(),
    specializations: json("specializations").$type<string[]>(),
    languages: json("languages").$type<string[]>(),

    // Access and permissions
    canAccessMedicalRecords: boolean("can_access_medical_records").default(false).notNull(),
    canProcessPayments: boolean("can_process_payments").default(false).notNull(),
    canPrescribeMedication: boolean("can_prescribe_medication").default(false).notNull(),
    canPerformSurgery: boolean("can_perform_surgery").default(false).notNull(),

    // Photo
    profilePhotoUrl: text("profile_photo_url"),

    // Notes
    notes: text("notes"),

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
    index("vet_staff_user_id_idx").on(table.userId),
    index("vet_staff_role_idx").on(table.role),
    index("vet_staff_status_idx").on(table.status),
    index("vet_staff_employee_number_idx").on(table.employeeNumber),
  ]
);

export const staffClinicAssignments = pgTable(
  "vet_staff_clinic_assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    staffId: uuid("staff_id")
      .notNull()
      .references(() => staff.id, { onDelete: "cascade" }),

    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),

    // Assignment details
    isPrimary: boolean("is_primary").default(false).notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date"),

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
  },
  (table) => [
    index("vet_staff_clinic_assignments_staff_id_idx").on(table.staffId),
    index("vet_staff_clinic_assignments_clinic_id_idx").on(table.clinicId),
    index("vet_staff_clinic_assignments_is_active_idx").on(table.isActive),
  ]
);

export const staffAttendance = pgTable(
  "vet_staff_attendance",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    staffId: uuid("staff_id")
      .notNull()
      .references(() => staff.id, { onDelete: "cascade" }),

    // Date
    attendanceDate: date("attendance_date").notNull(),

    // Clock in/out
    clockInTime: timestamp("clock_in_time"),
    clockOutTime: timestamp("clock_out_time"),

    // Location
    clinicId: uuid("clinic_id").references(() => clinics.id, { onDelete: "set null" }),

    // Hours worked
    totalHours: decimal("total_hours", { precision: 5, scale: 2 }),
    regularHours: decimal("regular_hours", { precision: 5, scale: 2 }),
    overtimeHours: decimal("overtime_hours", { precision: 5, scale: 2 }),

    // Break time
    breakMinutes: text("break_minutes"),

    // Status
    status: text("status"), // e.g., "present", "absent", "late", "half_day", "sick_leave", "vacation"

    // Notes
    notes: text("notes"),

    // Approved by
    approvedBy: uuid("approved_by"), // Manager ID
    approvedAt: timestamp("approved_at"),

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
    index("vet_staff_attendance_staff_id_idx").on(table.staffId),
    index("vet_staff_attendance_date_idx").on(table.attendanceDate),
    index("vet_staff_attendance_clinic_id_idx").on(table.clinicId),
  ]
);

export const staffLeaveRequests = pgTable(
  "vet_staff_leave_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    staffId: uuid("staff_id")
      .notNull()
      .references(() => staff.id, { onDelete: "cascade" }),

    // Leave details
    leaveType: text("leave_type").notNull(), // e.g., "vacation", "sick_leave", "personal", "maternity", "paternity"
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    totalDays: decimal("total_days", { precision: 5, scale: 1 }).notNull(),

    // Reason
    reason: text("reason"),

    // Status
    status: text("status").default("pending").notNull(), // pending, approved, rejected, cancelled

    // Approval
    approvedBy: uuid("approved_by"), // Manager ID
    approvedAt: timestamp("approved_at"),
    rejectionReason: text("rejection_reason"),

    // Notes
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
    index("vet_staff_leave_requests_staff_id_idx").on(table.staffId),
    index("vet_staff_leave_requests_status_idx").on(table.status),
    index("vet_staff_leave_requests_start_date_idx").on(table.startDate),
  ]
);

// ============================================================================
// RELATIONS
// ============================================================================

export const staffRelations = relations(staff, ({ many }) => ({
  clinicAssignments: many(staffClinicAssignments),
  attendance: many(staffAttendance),
  leaveRequests: many(staffLeaveRequests),
}));

export const staffClinicAssignmentsRelations = relations(staffClinicAssignments, ({ one }) => ({
  staff: one(staff, {
    fields: [staffClinicAssignments.staffId],
    references: [staff.id],
  }),
  clinic: one(clinics, {
    fields: [staffClinicAssignments.clinicId],
    references: [clinics.id],
  }),
}));

export const staffAttendanceRelations = relations(staffAttendance, ({ one }) => ({
  staff: one(staff, {
    fields: [staffAttendance.staffId],
    references: [staff.id],
  }),
  clinic: one(clinics, {
    fields: [staffAttendance.clinicId],
    references: [clinics.id],
  }),
}));

export const staffLeaveRequestsRelations = relations(staffLeaveRequests, ({ one }) => ({
  staff: one(staff, {
    fields: [staffLeaveRequests.staffId],
    references: [staff.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type StaffRow = typeof staff.$inferSelect;
export type NewStaffRow = typeof staff.$inferInsert;

export type StaffClinicAssignmentRow = typeof staffClinicAssignments.$inferSelect;
export type NewStaffClinicAssignmentRow = typeof staffClinicAssignments.$inferInsert;

export type StaffAttendanceRow = typeof staffAttendance.$inferSelect;
export type NewStaffAttendanceRow = typeof staffAttendance.$inferInsert;

export type StaffLeaveRequestRow = typeof staffLeaveRequests.$inferSelect;
export type NewStaffLeaveRequestRow = typeof staffLeaveRequests.$inferInsert;
