import { db } from "@workspace/db";
import {
  type NewReportTemplateRow,
  type ReportFormat,
  type ReportTemplateRow,
  reportTemplates,
} from "@workspace/db/schema";
import { and, desc, eq, ilike, isNull, or } from "drizzle-orm";
import { nanoid } from "nanoid";

export interface ListTemplatesParams {
  page?: number;
  pageSize?: number;
  orderBy?: string;
  format?: ReportFormat;
  isPublic?: boolean;
  createdBy?: string;
  search?: string;
  includeDeleted?: boolean;
}

export interface ListTemplatesResult {
  templates: ReportTemplateRow[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/**
 * Generate a unique template ID
 */
export function generateTemplateId(): string {
  return `tpl_${nanoid(12)}`;
}

/**
 * List templates for an organization with filtering and pagination
 */
export async function listTemplates(
  orgId: string,
  params: ListTemplatesParams = {}
): Promise<ListTemplatesResult> {
  const page = params.page ?? 1;
  const pageSize = Math.min(params.pageSize ?? 50, 100);
  const offset = (page - 1) * pageSize;

  const conditions = [eq(reportTemplates.organizationId, orgId)];

  // Only include non-deleted by default
  if (!params.includeDeleted) {
    conditions.push(isNull(reportTemplates.deletedAt));
  }

  if (params.format) {
    conditions.push(eq(reportTemplates.format, params.format));
  }

  if (params.isPublic !== undefined) {
    conditions.push(eq(reportTemplates.isPublic, params.isPublic));
  }

  if (params.createdBy) {
    conditions.push(eq(reportTemplates.createdBy, params.createdBy));
  }

  if (params.search) {
    const searchTerm = `%${params.search}%`;
    const searchCondition = or(
      ilike(reportTemplates.name, searchTerm),
      ilike(reportTemplates.description, searchTerm)
    );
    if (searchCondition) {
      conditions.push(searchCondition);
    }
  }

  const whereClause = and(...conditions);

  // Get total count
  const countResult = await db
    .select({ count: reportTemplates.id })
    .from(reportTemplates)
    .where(whereClause);

  const totalCount = countResult.length;
  const totalPages = Math.ceil(totalCount / pageSize);

  // Get templates
  const templates = await db
    .select()
    .from(reportTemplates)
    .where(whereClause)
    .orderBy(desc(reportTemplates.createdAt))
    .limit(pageSize)
    .offset(offset);

  return {
    templates,
    page,
    pageSize,
    totalCount,
    totalPages,
    hasNext: page < totalPages,
    hasPrevious: page > 1,
  };
}

/**
 * Get a template by ID
 */
export async function getTemplateById(
  templateId: string,
  orgId: string
): Promise<ReportTemplateRow | null> {
  const result = await db
    .select()
    .from(reportTemplates)
    .where(
      and(
        eq(reportTemplates.id, templateId),
        eq(reportTemplates.organizationId, orgId),
        isNull(reportTemplates.deletedAt)
      )
    )
    .limit(1);

  return result[0] ?? null;
}

/**
 * Create a new template
 */
export async function createTemplate(
  data: Omit<NewReportTemplateRow, "id">
): Promise<ReportTemplateRow> {
  const id = generateTemplateId();

  const result = await db
    .insert(reportTemplates)
    .values({ ...data, id })
    .returning();

  return result[0] as ReportTemplateRow;
}

/**
 * Update a template
 */
export async function updateTemplate(
  templateId: string,
  orgId: string,
  data: Partial<NewReportTemplateRow>
): Promise<ReportTemplateRow | null> {
  const result = await db
    .update(reportTemplates)
    .set({ ...data, updatedAt: new Date() })
    .where(
      and(
        eq(reportTemplates.id, templateId),
        eq(reportTemplates.organizationId, orgId),
        isNull(reportTemplates.deletedAt)
      )
    )
    .returning();

  return result[0] ?? null;
}

/**
 * Soft delete a template
 */
export async function deleteTemplate(
  templateId: string,
  orgId: string
): Promise<boolean> {
  const result = await db
    .update(reportTemplates)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(reportTemplates.id, templateId),
        eq(reportTemplates.organizationId, orgId),
        isNull(reportTemplates.deletedAt)
      )
    )
    .returning({ id: reportTemplates.id });

  return result.length > 0;
}

/**
 * Restore a soft-deleted template
 */
export async function restoreTemplate(
  templateId: string,
  orgId: string
): Promise<ReportTemplateRow | null> {
  const result = await db
    .update(reportTemplates)
    .set({ deletedAt: null })
    .where(
      and(
        eq(reportTemplates.id, templateId),
        eq(reportTemplates.organizationId, orgId)
      )
    )
    .returning();

  return result[0] ?? null;
}

/**
 * Check if a template with the given name exists
 */
export async function templateNameExists(
  orgId: string,
  name: string,
  excludeId?: string
): Promise<boolean> {
  const conditions = [
    eq(reportTemplates.organizationId, orgId),
    eq(reportTemplates.name, name),
    isNull(reportTemplates.deletedAt),
  ];

  if (excludeId) {
    conditions.push(eq(reportTemplates.id, excludeId));
  }

  const result = await db
    .select({ id: reportTemplates.id })
    .from(reportTemplates)
    .where(and(...conditions))
    .limit(1);

  return result.length > 0;
}
