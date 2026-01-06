/**
 * Template Service
 *
 * CRUD operations for report templates
 */

import { nanoid } from "nanoid";
import type {
  ColumnConfig,
  DataSourceConfig,
  ExportOptions,
  ReportFormat,
} from "../types";

export interface ReportTemplate {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  format: ReportFormat;
  templateEngine: string;
  templateContent: string;
  options?: ExportOptions;
  dataSource?: DataSourceConfig;
  columns: ColumnConfig[];
  isPublic: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface CreateTemplateInput {
  organizationId: string;
  name: string;
  description?: string;
  format: ReportFormat;
  templateContent: string;
  options?: ExportOptions;
  dataSource?: DataSourceConfig;
  columns: ColumnConfig[];
  isPublic?: boolean;
  createdBy: string;
}

export interface UpdateTemplateInput {
  name?: string;
  description?: string;
  format?: ReportFormat;
  templateContent?: string;
  options?: ExportOptions;
  dataSource?: DataSourceConfig;
  columns?: ColumnConfig[];
  isPublic?: boolean;
}

export interface TemplateFilters {
  format?: ReportFormat;
  isPublic?: boolean;
  createdBy?: string;
  search?: string;
  includeDeleted?: boolean;
}

export interface TemplateServiceDeps {
  db: {
    insert: (data: Omit<ReportTemplate, "id">) => Promise<ReportTemplate>;
    findById: (id: string, orgId: string) => Promise<ReportTemplate | null>;
    update: (
      id: string,
      orgId: string,
      data: Partial<ReportTemplate>
    ) => Promise<ReportTemplate>;
    softDelete: (id: string, orgId: string) => Promise<void>;
    restore: (id: string, orgId: string) => Promise<ReportTemplate>;
    findMany: (
      orgId: string,
      filters?: TemplateFilters
    ) => Promise<ReportTemplate[]>;
  };
}

export class TemplateService {
  private readonly deps: TemplateServiceDeps;

  constructor(deps: TemplateServiceDeps) {
    this.deps = deps;
  }

  /**
   * Create a new report template
   */
  async createTemplate(input: CreateTemplateInput): Promise<ReportTemplate> {
    const template = await this.deps.db.insert({
      organizationId: input.organizationId,
      name: input.name,
      description: input.description,
      format: input.format,
      templateEngine: "eta",
      templateContent: input.templateContent,
      options: input.options,
      dataSource: input.dataSource,
      columns: input.columns,
      isPublic: input.isPublic ?? false,
      createdBy: input.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return template;
  }

  /**
   * Get a template by ID
   */
  async getTemplate(
    templateId: string,
    organizationId: string
  ): Promise<ReportTemplate | null> {
    return await this.deps.db.findById(templateId, organizationId);
  }

  /**
   * Update a template
   */
  async updateTemplate(
    templateId: string,
    organizationId: string,
    updates: UpdateTemplateInput
  ): Promise<ReportTemplate> {
    return await this.deps.db.update(templateId, organizationId, {
      ...updates,
      updatedAt: new Date(),
    });
  }

  /**
   * Soft delete a template
   */
  async deleteTemplate(
    templateId: string,
    organizationId: string
  ): Promise<void> {
    await this.deps.db.softDelete(templateId, organizationId);
  }

  /**
   * Restore a soft-deleted template
   */
  async restoreTemplate(
    templateId: string,
    organizationId: string
  ): Promise<ReportTemplate> {
    return await this.deps.db.restore(templateId, organizationId);
  }

  /**
   * List templates for an organization
   */
  async listTemplates(
    organizationId: string,
    filters?: TemplateFilters
  ): Promise<ReportTemplate[]> {
    return await this.deps.db.findMany(organizationId, filters);
  }

  /**
   * Clone a template
   */
  async cloneTemplate(
    templateId: string,
    organizationId: string,
    newName: string,
    createdBy: string
  ): Promise<ReportTemplate> {
    const original = await this.getTemplate(templateId, organizationId);

    if (!original) {
      throw new Error(`Template not found: ${templateId}`);
    }

    return this.createTemplate({
      organizationId,
      name: newName,
      description: original.description,
      format: original.format,
      templateContent: original.templateContent,
      options: original.options,
      dataSource: original.dataSource,
      columns: original.columns,
      isPublic: false,
      createdBy,
    });
  }
}

/**
 * Generate a template ID
 */
export function generateTemplateId(): string {
  return `tpl_${nanoid(12)}`;
}

/**
 * Create a template service instance
 */
export function createTemplateService(
  deps: TemplateServiceDeps
): TemplateService {
  return new TemplateService(deps);
}
