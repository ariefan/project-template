import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  decimal,
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { farms } from "./farms";
import { herds } from "./herds";
import { livestock } from "./livestock";

// ============================================================================
// ENUMS
// ============================================================================

export const workerRoleEnum = pgEnum("worker_role", [
  "owner",
  "manager",
  "veterinarian",
  "farmhand",
  "milker",
  "butcher",
  "driver",
  "temporary",
]);

export const taskStatusEnum = pgEnum("task_status", [
  "pending",
  "in_progress",
  "completed",
  "cancelled",
  "overdue",
]);

export const taskPriorityEnum = pgEnum("task_priority", [
  "low",
  "medium",
  "high",
  "urgent",
]);

export const shiftTypeEnum = pgEnum("shift_type", [
  "morning",
  "afternoon",
  "night",
  "full_day",
  "custom",
]);

export const workerCertificationStatusEnum = pgEnum(
  "worker_certification_status",
  ["active", "expired", "pending_renewal"]
);

// ============================================================================
// TABLES
// ============================================================================

export const farmWorkers = pgTable(
  "farm_workers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    farmId: uuid("farm_id")
      .notNull()
      .references(() => farms.id, { onDelete: "cascade" }),
    userId: uuid("user_id"),

    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email"),
    phone: text("phone"),

    role: workerRoleEnum("role").notNull(),
    hireDate: date("hire_date").notNull(),
    terminationDate: date("termination_date"),
    isActive: boolean("is_active").default(true).notNull(),

    hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }),

    emergencyContactName: text("emergency_contact_name"),
    emergencyContactPhone: text("emergency_contact_phone"),

    notes: text("notes"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("farm_workers_farm_id_idx").on(table.farmId),
    index("farm_workers_is_active_idx").on(table.isActive),
    index("farm_workers_role_idx").on(table.role),
    index("farm_workers_user_id_idx").on(table.userId),
  ]
);

export const workerCertifications = pgTable(
  "worker_certifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workerId: uuid("worker_id")
      .notNull()
      .references(() => farmWorkers.id, { onDelete: "cascade" }),

    certificationType: text("certification_type").notNull(),
    certificationNumber: text("certification_number"),
    issuingAuthority: text("issuing_authority").notNull(),

    issueDate: date("issue_date").notNull(),
    expiryDate: date("expiry_date"),
    status: workerCertificationStatusEnum("status").default("active").notNull(),

    certificatePath: text("certificate_path"),
    reminderDays: integer("reminder_days").default(30),

    notes: text("notes"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("worker_certifications_worker_id_idx").on(table.workerId),
    index("worker_certifications_expiry_date_idx").on(table.expiryDate),
    index("worker_certifications_status_idx").on(table.status),
    index("worker_certifications_type_idx").on(table.certificationType),
  ]
);

export const farmTasks = pgTable(
  "farm_tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    farmId: uuid("farm_id")
      .notNull()
      .references(() => farms.id, { onDelete: "cascade" }),
    assignedToId: uuid("assigned_to_id").references(() => farmWorkers.id, {
      onDelete: "set null",
    }),
    assignedById: uuid("assigned_by_id").notNull(),

    title: text("title").notNull(),
    description: text("description"),
    category: text("category"),
    priority: taskPriorityEnum("priority").default("medium").notNull(),
    status: taskStatusEnum("status").default("pending").notNull(),

    dueDate: timestamp("due_date"),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),

    // Recurring tasks
    isRecurring: boolean("is_recurring").default(false).notNull(),
    recurrencePattern: text("recurrence_pattern"),

    // Related entities (no FK to avoid circular deps, relations handle this)
    livestockId: uuid("livestock_id").references(() => livestock.id, {
      onDelete: "set null",
    }),
    herdId: uuid("herd_id").references(() => herds.id, {
      onDelete: "set null",
    }),
    equipmentId: uuid("equipment_id"), // FK added in equipment.ts to avoid circular

    completionNotes: text("completion_notes"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("farm_tasks_farm_id_idx").on(table.farmId),
    index("farm_tasks_assigned_to_id_idx").on(table.assignedToId),
    index("farm_tasks_status_idx").on(table.status),
    index("farm_tasks_due_date_idx").on(table.dueDate),
    index("farm_tasks_priority_idx").on(table.priority),
    index("farm_tasks_category_idx").on(table.category),
    index("farm_tasks_equipment_id_idx").on(table.equipmentId),
  ]
);

export const workLogs = pgTable(
  "work_logs",
  {
    id: serial("id").primaryKey(),
    farmId: uuid("farm_id")
      .notNull()
      .references(() => farms.id, { onDelete: "cascade" }),
    workerId: uuid("worker_id")
      .notNull()
      .references(() => farmWorkers.id, { onDelete: "cascade" }),
    taskId: uuid("task_id").references(() => farmTasks.id, {
      onDelete: "set null",
    }),

    workDate: date("work_date").notNull(),
    shiftType: shiftTypeEnum("shift_type"),
    clockIn: timestamp("clock_in").notNull(),
    clockOut: timestamp("clock_out"),
    breakMinutes: integer("break_minutes").default(0),
    hoursWorked: decimal("hours_worked", { precision: 5, scale: 2 }),

    activities: text("activities"),
    notes: text("notes"),

    approvedBy: uuid("approved_by"),
    approvedAt: timestamp("approved_at"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("work_logs_farm_id_idx").on(table.farmId),
    index("work_logs_worker_id_idx").on(table.workerId),
    index("work_logs_work_date_idx").on(table.workDate),
    index("work_logs_task_id_idx").on(table.taskId),
  ]
);

// ============================================================================
// RELATIONS
// ============================================================================

export const farmWorkersRelations = relations(farmWorkers, ({ one, many }) => ({
  farm: one(farms, {
    fields: [farmWorkers.farmId],
    references: [farms.id],
  }),
  certifications: many(workerCertifications),
  assignedTasks: many(farmTasks),
  workLogs: many(workLogs),
}));

export const workerCertificationsRelations = relations(
  workerCertifications,
  ({ one }) => ({
    worker: one(farmWorkers, {
      fields: [workerCertifications.workerId],
      references: [farmWorkers.id],
    }),
  })
);

export const farmTasksRelations = relations(farmTasks, ({ one, many }) => ({
  farm: one(farms, {
    fields: [farmTasks.farmId],
    references: [farms.id],
  }),
  assignedTo: one(farmWorkers, {
    fields: [farmTasks.assignedToId],
    references: [farmWorkers.id],
  }),
  livestock: one(livestock, {
    fields: [farmTasks.livestockId],
    references: [livestock.id],
  }),
  herd: one(herds, {
    fields: [farmTasks.herdId],
    references: [herds.id],
  }),
  workLogs: many(workLogs),
}));

export const workLogsRelations = relations(workLogs, ({ one }) => ({
  farm: one(farms, {
    fields: [workLogs.farmId],
    references: [farms.id],
  }),
  worker: one(farmWorkers, {
    fields: [workLogs.workerId],
    references: [farmWorkers.id],
  }),
  task: one(farmTasks, {
    fields: [workLogs.taskId],
    references: [farmTasks.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type FarmWorkerRow = typeof farmWorkers.$inferSelect;
export type NewFarmWorkerRow = typeof farmWorkers.$inferInsert;
export type WorkerCertificationRow = typeof workerCertifications.$inferSelect;
export type NewWorkerCertificationRow =
  typeof workerCertifications.$inferInsert;
export type FarmTaskRow = typeof farmTasks.$inferSelect;
export type NewFarmTaskRow = typeof farmTasks.$inferInsert;
export type WorkLogRow = typeof workLogs.$inferSelect;
export type NewWorkLogRow = typeof workLogs.$inferInsert;

export type WorkerRole = (typeof workerRoleEnum.enumValues)[number];
export type TaskStatus = (typeof taskStatusEnum.enumValues)[number];
export type TaskPriority = (typeof taskPriorityEnum.enumValues)[number];
export type ShiftType = (typeof shiftTypeEnum.enumValues)[number];
export type WorkerCertificationStatus =
  (typeof workerCertificationStatusEnum.enumValues)[number];
