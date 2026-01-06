import {
  boolean,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { organizations, users } from "./auth";

// ============ ENUMS ============

export const reportFormatEnum = pgEnum("report_format", [
  "csv",
  "excel",
  "pdf",
  "thermal",
  "dotmatrix",
]);

export const reportOrientationEnum = pgEnum("report_orientation", [
  "portrait",
  "landscape",
]);

export const reportPageSizeEnum = pgEnum("report_page_size", [
  "a4",
  "letter",
  "legal",
  "a3",
]);

export const columnAlignmentEnum = pgEnum("column_alignment", [
  "left",
  "center",
  "right",
]);

export const columnFormatEnum = pgEnum("column_format", [
  "text",
  "number",
  "currency",
  "date",
  "datetime",
  "boolean",
  "percentage",
]);

// ============ NESTED TYPES ============

export interface ReportColumnConfig {
  id: string;
  header: string;
  accessorKey?: string;
  accessorFn?: string;
  width?: number;
  align?: "left" | "center" | "right";
  format?:
    | "text"
    | "number"
    | "currency"
    | "date"
    | "datetime"
    | "boolean"
    | "percentage";
  formatPattern?: string;
  hidden?: boolean;
}

export interface ReportOptions {
  // CSV Options
  delimiter?: string;
  includeHeaders?: boolean;
  // Excel Options
  sheetName?: string;
  autoFilter?: boolean;
  freezeHeader?: boolean;
  // PDF Options
  orientation?: "portrait" | "landscape";
  pageSize?: "a4" | "letter" | "legal" | "a3";
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;
  title?: string;
  subtitle?: string;
  watermark?: string;
  includePageNumbers?: boolean;
  includeTimestamp?: boolean;
  // Thermal Printer Options
  printerWidth?: number;
  encoding?: string;
  autoCut?: boolean;
}

export interface DataSourceConfig {
  type: "query" | "api" | "custom";
  source?: string;
  defaultParams?: Record<string, unknown>;
}

// ============ REPORT TEMPLATES TABLE ============

export const reportTemplates = pgTable(
  "report_templates",
  {
    id: text("id").primaryKey(), // format: tpl_{randomString}

    // Organization scope
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Metadata
    name: text("name").notNull(),
    description: text("description"),

    // Template configuration
    format: reportFormatEnum("format").notNull(),
    templateEngine: text("template_engine").notNull().default("eta"),
    templateContent: text("template_content").notNull(),

    // Format-specific options
    options: jsonb("options").$type<ReportOptions>(),

    // Data source configuration
    dataSource: jsonb("data_source").$type<DataSourceConfig>(),

    // Column configuration
    columns: jsonb("columns").$type<ReportColumnConfig[]>().notNull(),

    // Access control
    isPublic: boolean("is_public").notNull().default(false),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "set null" }),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    index("report_templates_organization_id_idx").on(table.organizationId),
    index("report_templates_format_idx").on(table.format),
    index("report_templates_created_by_idx").on(table.createdBy),
    index("report_templates_is_public_idx").on(table.isPublic),
    index("report_templates_deleted_at_idx").on(table.deletedAt),
    uniqueIndex("report_templates_org_name_uidx").on(
      table.organizationId,
      table.name
    ),
  ]
);

// ============ TYPE EXPORTS ============

export type ReportTemplateRow = typeof reportTemplates.$inferSelect;
export type NewReportTemplateRow = typeof reportTemplates.$inferInsert;

export type ReportFormat = (typeof reportFormatEnum.enumValues)[number];
export type ReportOrientation =
  (typeof reportOrientationEnum.enumValues)[number];
export type ReportPageSize = (typeof reportPageSizeEnum.enumValues)[number];
export type ColumnAlignment = (typeof columnAlignmentEnum.enumValues)[number];
export type ColumnFormat = (typeof columnFormatEnum.enumValues)[number];
