/**
 * Report Job Handler
 *
 * Handles report generation jobs including:
 * - Template loading
 * - Data fetching/generation
 * - Export via @workspace/reports
 * - File storage
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import {
  type ColumnConfig,
  createExporterRegistry,
  type ReportFormat,
} from "@workspace/reports";
import * as templatesService from "../../reports/services/templates.service";
import { jobHandlerRegistry } from "./registry";
import type { JobContext, JobResult } from "./types";

// Storage path for generated reports
const STORAGE_BASE_PATH = "./uploads";

// ============ SAMPLE DATA GENERATION ============

const SAMPLE_NAMES = [
  "Alice Johnson",
  "Bob Smith",
  "Carol Williams",
  "David Brown",
  "Emma Davis",
];

const SAMPLE_PRODUCTS = [
  "Widget Pro",
  "Gadget Plus",
  "Super Tool",
  "Mega Pack",
  "Basic Kit",
];

const SAMPLE_STATUSES = ["Active", "Pending", "Completed"];

type ValueGenerator = (key: string, header: string, idx: number) => unknown;

const VALUE_GENERATORS: Array<{ pattern: string; generator: ValueGenerator }> =
  [
    {
      pattern: "name",
      generator: (_, __, i) => SAMPLE_NAMES[i % SAMPLE_NAMES.length],
    },
    {
      pattern: "user",
      generator: (_, __, i) => SAMPLE_NAMES[i % SAMPLE_NAMES.length],
    },
    { pattern: "email", generator: (_, __, i) => `user${i + 1}@example.com` },
    {
      pattern: "product",
      generator: (_, __, i) => SAMPLE_PRODUCTS[i % SAMPLE_PRODUCTS.length],
    },
    {
      pattern: "item",
      generator: (_, __, i) => SAMPLE_PRODUCTS[i % SAMPLE_PRODUCTS.length],
    },
    {
      pattern: "id",
      generator: (k) => `${k.toUpperCase()}-${String(1001).padStart(4, "0")}`,
    },
    {
      pattern: "amount",
      generator: () => Number.parseFloat((Math.random() * 1000).toFixed(2)),
    },
    {
      pattern: "price",
      generator: () => Number.parseFloat((Math.random() * 1000).toFixed(2)),
    },
    {
      pattern: "date",
      generator: () =>
        new Date(
          Date.now() - Math.floor(Math.random() * 30) * 86_400_000
        ).toISOString(),
    },
    {
      pattern: "status",
      generator: (_, __, i) => SAMPLE_STATUSES[i % SAMPLE_STATUSES.length],
    },
  ];

function generateSampleValue(
  key: string,
  header: string,
  idx: number
): unknown {
  const k = key.toLowerCase();
  const match = VALUE_GENERATORS.find((v) => k.includes(v.pattern));
  return match ? match.generator(key, header, idx) : `${header} ${idx + 1}`;
}

/**
 * Generate sample data for a template (used when no data source is configured)
 */
function generateSampleData(
  columns: ColumnConfig[],
  rowCount: number
): Record<string, unknown>[] {
  return Array.from({ length: rowCount }, (_, i) => {
    const row: Record<string, unknown> = {};
    for (const col of columns) {
      const key = col.accessorKey ?? col.id;
      row[key] = generateSampleValue(key, col.header, i);
    }
    return row;
  });
}

// ============ REPORT JOB HANDLER ============

/**
 * Input structure for report jobs
 */
export interface ReportJobInput {
  templateId?: string;
  parameters?: Record<string, unknown>;
  data?: Record<string, unknown>[];
}

/**
 * Output structure for report jobs
 */
export interface ReportJobOutput {
  filePath: string;
  fileSize: number;
  rowCount: number;
  mimeType: string;
}

/**
 * Handle report generation job
 */
async function handleReportJob(context: JobContext): Promise<JobResult> {
  const { jobId, orgId, input, metadata, helpers } = context;

  const { data: providedData, templateId: inputTemplateId } =
    input as ReportJobInput;
  const { templateId = inputTemplateId, format = "csv" } = metadata;

  try {
    await helpers.updateProgress(0, "Starting report generation");

    // Get template columns if templateId provided
    let columns: ColumnConfig[] = [];
    if (templateId) {
      const template = await templatesService.getTemplate(templateId, orgId);
      columns = template.columns as ColumnConfig[];
    }

    await helpers.updateProgress(25, "Fetching data");

    // Get data - use provided data, or generate sample data
    const data = providedData ?? generateSampleData(columns, 50);
    const totalRows = data.length;

    await helpers.updateProcessedItems(0, totalRows);

    // Create exporter and generate file
    const exporterRegistry = createExporterRegistry();
    const exportFormat = format as ReportFormat;

    if (!exporterRegistry.supports(exportFormat)) {
      return {
        error: {
          code: "UNSUPPORTED_FORMAT",
          message: `Unsupported export format: ${format}`,
          retryable: false,
        },
      };
    }

    await helpers.updateProgress(50, "Generating export");

    // Generate export
    const result = await exporterRegistry.export(
      exportFormat,
      data,
      columns,
      {}
    );

    await helpers.updateProgress(75, "Saving file");

    // Save file to storage
    const reportsDir = path.join(STORAGE_BASE_PATH, "reports", jobId);
    await fs.mkdir(reportsDir, { recursive: true });

    const extension = format === "excel" ? "xlsx" : format;
    const filePath = path.join(reportsDir, `report.${extension}`);
    await fs.writeFile(filePath, result.buffer);

    await helpers.updateProcessedItems(totalRows, totalRows);

    console.log(
      `Report job ${jobId} completed: ${filePath} (${result.size} bytes)`
    );

    return {
      output: {
        filePath,
        fileSize: result.size,
        rowCount: totalRows,
        mimeType: result.mimeType,
      } satisfies ReportJobOutput,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Report job ${jobId} failed:`, message);

    return {
      error: {
        code: "GENERATION_FAILED",
        message,
        retryable: true,
      },
    };
  }
}

// ============ REGISTER HANDLER ============

/**
 * Register the report job handler
 */
export function registerReportHandler(): void {
  jobHandlerRegistry.register({
    type: "reports:generate",
    handler: handleReportJob,
    concurrency: 3,
    retryLimit: 3,
    expireInSeconds: 3600, // 1 hour
    // UI metadata
    label: "Report Generation",
    description: "Generate a report from a template with data",
    configSchema:
      '{ templateId: string, format?: "xlsx"|"csv"|"pdf", parameters?: Record<string,unknown> }',
    exampleConfig: { templateId: "tpl_example", format: "xlsx" },
  });
}
