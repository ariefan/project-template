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
import { appointments } from "./appointments";
import { clients } from "./clients";
import { metadata, timestamps } from "./helpers";
import { patients } from "./patients";

// ============================================================================
// ENUMS
// ============================================================================

export const communicationTypeEnum = pgEnum("communication_type", [
  "email",
  "sms",
  "whatsapp",
  "phone_call",
  "push_notification",
]);

export const communicationStatusEnum = pgEnum("communication_status", [
  "pending",
  "sent",
  "delivered",
  "failed",
  "bounced",
  "read",
]);

export const reminderTypeEnum = pgEnum("reminder_type", [
  "appointment",
  "vaccination",
  "medication",
  "checkup",
  "payment",
  "prescription_refill",
  "follow_up",
]);

export const messageTemplateTypeEnum = pgEnum("message_template_type", [
  "appointment_confirmation",
  "appointment_reminder",
  "vaccination_due",
  "payment_reminder",
  "invoice",
  "welcome",
  "birthday",
  "prescription_ready",
  "lab_results_ready",
  "follow_up",
  "custom",
]);

// Type exports
export type CommunicationType =
  (typeof communicationTypeEnum.enumValues)[number];
export type CommunicationStatus =
  (typeof communicationStatusEnum.enumValues)[number];
export type ReminderType = (typeof reminderTypeEnum.enumValues)[number];
export type MessageTemplateType =
  (typeof messageTemplateTypeEnum.enumValues)[number];

// ============================================================================
// TABLES
// ============================================================================

export const communicationLogs = pgTable(
  "vet_communication_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Recipient
    clientId: uuid("client_id").references(() => clients.id, {
      onDelete: "cascade",
    }),
    patientId: uuid("patient_id").references(() => patients.id, {
      onDelete: "set null",
    }),

    // Communication details
    communicationType: communicationTypeEnum("communication_type").notNull(),
    status: communicationStatusEnum("status").default("pending").notNull(),

    // Contact information used
    recipientEmail: text("recipient_email"),
    recipientPhone: text("recipient_phone"),
    recipientName: text("recipient_name"),

    // Message content
    subject: text("subject"),
    messageBody: text("message_body").notNull(),

    // Template used
    templateId: uuid("template_id"),
    templateType: messageTemplateTypeEnum("template_type"),

    // References
    appointmentId: uuid("appointment_id").references(() => appointments.id, {
      onDelete: "set null",
    }),
    invoiceId: uuid("invoice_id"),

    // External provider details
    externalId: text("external_id"), // ID from email/SMS provider
    providerName: text("provider_name"), // e.g., "SendGrid", "Twilio"

    // Delivery tracking
    sentAt: timestamp("sent_at"),
    deliveredAt: timestamp("delivered_at"),
    readAt: timestamp("read_at"),
    failedAt: timestamp("failed_at"),
    failureReason: text("failure_reason"),

    // Cost tracking
    costAmount: text("cost_amount"), // For SMS/WhatsApp

    // Sent by
    sentBy: uuid("sent_by"), // Staff member ID or system

    // Metadata & timestamps
    ...metadata,
    ...timestamps,
  },
  (table) => [
    index("vet_communication_logs_client_id_idx").on(table.clientId),
    index("vet_communication_logs_patient_id_idx").on(table.patientId),
    index("vet_communication_logs_type_idx").on(table.communicationType),
    index("vet_communication_logs_status_idx").on(table.status),
    index("vet_communication_logs_sent_at_idx").on(table.sentAt),
  ]
);

export const reminders = pgTable(
  "vet_reminders",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Recipient
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    patientId: uuid("patient_id").references(() => patients.id, {
      onDelete: "cascade",
    }),

    // Reminder details
    reminderType: reminderTypeEnum("reminder_type").notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),

    // Scheduling
    scheduledAt: timestamp("scheduled_at").notNull(),
    dueDate: timestamp("due_date"),

    // Communication method
    communicationType: communicationTypeEnum("communication_type").notNull(),

    // Status
    status: text("status").default("scheduled").notNull(), // scheduled, sent, acknowledged, dismissed, expired

    // References
    appointmentId: uuid("appointment_id").references(() => appointments.id, {
      onDelete: "set null",
    }),
    referenceType: text("reference_type"), // e.g., "vaccination", "prescription"
    referenceId: uuid("reference_id"),

    // Delivery tracking
    sentAt: timestamp("sent_at"),
    acknowledgedAt: timestamp("acknowledged_at"),

    // Created by
    createdBy: uuid("created_by"), // Staff member ID or system

    // Metadata & timestamps
    ...metadata,
    ...timestamps,
  },
  (table) => [
    index("vet_reminders_client_id_idx").on(table.clientId),
    index("vet_reminders_patient_id_idx").on(table.patientId),
    index("vet_reminders_type_idx").on(table.reminderType),
    index("vet_reminders_status_idx").on(table.status),
    index("vet_reminders_scheduled_at_idx").on(table.scheduledAt),
  ]
);

export const messageTemplates = pgTable(
  "vet_message_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Template details
    templateType: messageTemplateTypeEnum("template_type").notNull(),
    name: text("name").notNull(),
    description: text("description"),

    // Communication type
    communicationType: communicationTypeEnum("communication_type").notNull(),

    // Content
    subject: text("subject"), // For emails
    messageBody: text("message_body").notNull(),

    // Variables/placeholders
    availableVariables: json("available_variables").$type<string[]>(),

    // Status
    isActive: boolean("is_active").default(true).notNull(),
    isDefault: boolean("is_default").default(false).notNull(),

    // Language
    language: text("language").default("id"),

    // Created by
    createdBy: uuid("created_by"), // Staff member ID

    // Metadata & timestamps
    ...metadata,
    ...timestamps,
  },
  (table) => [
    index("vet_message_templates_type_idx").on(table.templateType),
    index("vet_message_templates_communication_type_idx").on(
      table.communicationType
    ),
  ]
);

export const clientNotes = pgTable(
  "vet_client_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Client
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),

    // Note details
    noteType: text("note_type"), // e.g., "general", "behavioral", "financial", "important"
    subject: text("subject"),
    content: text("content").notNull(),

    // Importance
    isPinned: boolean("is_pinned").default(false).notNull(),
    isImportant: boolean("is_important").default(false).notNull(),

    // Visibility
    isPrivate: boolean("is_private").default(false).notNull(), // Only visible to creator

    // Created by
    createdBy: uuid("created_by").notNull(), // Staff member ID

    // Metadata & timestamps
    ...metadata,
    ...timestamps,
  },
  (table) => [
    index("vet_client_notes_client_id_idx").on(table.clientId),
    index("vet_client_notes_note_type_idx").on(table.noteType),
    index("vet_client_notes_created_by_idx").on(table.createdBy),
  ]
);

export const patientNotes = pgTable(
  "vet_patient_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Patient
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),

    // Note details
    noteType: text("note_type"), // e.g., "behavioral", "dietary", "medical_alert", "general"
    subject: text("subject"),
    content: text("content").notNull(),

    // Importance
    isPinned: boolean("is_pinned").default(false).notNull(),
    isAlert: boolean("is_alert").default(false).notNull(), // Show as alert/warning

    // Visibility
    showOnRecords: boolean("show_on_records").default(true).notNull(), // Show on medical records

    // Created by
    createdBy: uuid("created_by").notNull(), // Staff member ID

    // Metadata & timestamps
    ...metadata,
    ...timestamps,
  },
  (table) => [
    index("vet_patient_notes_patient_id_idx").on(table.patientId),
    index("vet_patient_notes_note_type_idx").on(table.noteType),
    index("vet_patient_notes_created_by_idx").on(table.createdBy),
  ]
);

// ============================================================================
// RELATIONS
// ============================================================================

export const communicationLogsRelations = relations(
  communicationLogs,
  ({ one }) => ({
    client: one(clients, {
      fields: [communicationLogs.clientId],
      references: [clients.id],
    }),
    patient: one(patients, {
      fields: [communicationLogs.patientId],
      references: [patients.id],
    }),
    appointment: one(appointments, {
      fields: [communicationLogs.appointmentId],
      references: [appointments.id],
    }),
  })
);

export const remindersRelations = relations(reminders, ({ one }) => ({
  client: one(clients, {
    fields: [reminders.clientId],
    references: [clients.id],
  }),
  patient: one(patients, {
    fields: [reminders.patientId],
    references: [patients.id],
  }),
  appointment: one(appointments, {
    fields: [reminders.appointmentId],
    references: [appointments.id],
  }),
}));

export const clientNotesRelations = relations(clientNotes, ({ one }) => ({
  client: one(clients, {
    fields: [clientNotes.clientId],
    references: [clients.id],
  }),
}));

export const patientNotesRelations = relations(patientNotes, ({ one }) => ({
  patient: one(patients, {
    fields: [patientNotes.patientId],
    references: [patients.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type CommunicationLogRow = typeof communicationLogs.$inferSelect;
export type NewCommunicationLogRow = typeof communicationLogs.$inferInsert;

export type ReminderRow = typeof reminders.$inferSelect;
export type NewReminderRow = typeof reminders.$inferInsert;

export type MessageTemplateRow = typeof messageTemplates.$inferSelect;
export type NewMessageTemplateRow = typeof messageTemplates.$inferInsert;

export type ClientNoteRow = typeof clientNotes.$inferSelect;
export type NewClientNoteRow = typeof clientNotes.$inferInsert;

export type PatientNoteRow = typeof patientNotes.$inferSelect;
export type NewPatientNoteRow = typeof patientNotes.$inferInsert;
