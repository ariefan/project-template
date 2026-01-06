import type {
  DataSourceConfig,
  ReportColumnConfig,
  ReportFormat,
  ReportOptions,
  ReportTemplateRow,
} from "@workspace/db/schema";
import { ConflictError, NotFoundError } from "../../../lib/errors";
import * as templatesRepo from "../repositories/templates.repository";

export interface CreateTemplateInput {
  name: string;
  description?: string;
  format: ReportFormat;
  templateContent: string;
  options?: ReportOptions;
  dataSource?: DataSourceConfig;
  columns: ReportColumnConfig[];
  isPublic?: boolean;
}

export interface UpdateTemplateInput {
  name?: string;
  description?: string;
  format?: ReportFormat;
  templateContent?: string;
  options?: ReportOptions;
  dataSource?: DataSourceConfig;
  columns?: ReportColumnConfig[];
  isPublic?: boolean;
}

/**
 * List templates for an organization
 */
export function listTemplates(
  orgId: string,
  params: templatesRepo.ListTemplatesParams = {}
) {
  return templatesRepo.listTemplates(orgId, params);
}

/**
 * Get a template by ID
 */
export async function getTemplate(
  templateId: string,
  orgId: string
): Promise<ReportTemplateRow> {
  const template = await templatesRepo.getTemplateById(templateId, orgId);

  if (!template) {
    throw new NotFoundError(`Template not found: ${templateId}`);
  }

  return template;
}

/**
 * Create a new template
 */
export async function createTemplate(
  orgId: string,
  userId: string,
  input: CreateTemplateInput
): Promise<ReportTemplateRow> {
  // Check for duplicate name
  const exists = await templatesRepo.templateNameExists(orgId, input.name);
  if (exists) {
    throw new ConflictError(
      `Template with name "${input.name}" already exists`
    );
  }

  return templatesRepo.createTemplate({
    organizationId: orgId,
    name: input.name,
    description: input.description,
    format: input.format,
    templateEngine: "eta",
    templateContent: input.templateContent,
    options: input.options,
    dataSource: input.dataSource,
    columns: input.columns,
    isPublic: input.isPublic ?? false,
    createdBy: userId,
  });
}

/**
 * Update a template
 */
export async function updateTemplate(
  templateId: string,
  orgId: string,
  input: UpdateTemplateInput
): Promise<ReportTemplateRow> {
  // Check if template exists
  const existing = await templatesRepo.getTemplateById(templateId, orgId);
  if (!existing) {
    throw new NotFoundError(`Template not found: ${templateId}`);
  }

  // Check for duplicate name if name is being changed
  if (input.name && input.name !== existing.name) {
    const exists = await templatesRepo.templateNameExists(
      orgId,
      input.name,
      templateId
    );
    if (exists) {
      throw new ConflictError(
        `Template with name "${input.name}" already exists`
      );
    }
  }

  const updated = await templatesRepo.updateTemplate(templateId, orgId, input);
  if (!updated) {
    throw new NotFoundError(`Template not found: ${templateId}`);
  }

  return updated;
}

/**
 * Delete a template (soft delete)
 */
export async function deleteTemplate(
  templateId: string,
  orgId: string
): Promise<void> {
  const deleted = await templatesRepo.deleteTemplate(templateId, orgId);

  if (!deleted) {
    throw new NotFoundError(`Template not found: ${templateId}`);
  }
}

/**
 * Clone a template
 */
export async function cloneTemplate(
  templateId: string,
  orgId: string,
  userId: string,
  newName: string,
  description?: string
): Promise<ReportTemplateRow> {
  // Get original template
  const original = await templatesRepo.getTemplateById(templateId, orgId);
  if (!original) {
    throw new NotFoundError(`Template not found: ${templateId}`);
  }

  // Check for duplicate name
  const exists = await templatesRepo.templateNameExists(orgId, newName);
  if (exists) {
    throw new ConflictError(`Template with name "${newName}" already exists`);
  }

  return templatesRepo.createTemplate({
    organizationId: orgId,
    name: newName,
    description: description ?? original.description,
    format: original.format,
    templateEngine: original.templateEngine,
    templateContent: original.templateContent,
    options: original.options,
    dataSource: original.dataSource,
    columns: original.columns,
    isPublic: false, // Cloned templates are private by default
    createdBy: userId,
  });
}

/**
 * Get template owner ID (for authorization checks)
 */
export async function getTemplateOwnerId(
  templateId: string,
  orgId: string
): Promise<string | undefined> {
  const template = await templatesRepo.getTemplateById(templateId, orgId);
  return template?.createdBy;
}
