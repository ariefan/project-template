/**
 * Report Job Queue using pg-boss
 *
 * Provides async processing of report generation jobs with:
 * - Progress tracking
 * - Concurrent processing
 * - Job status updates
 * - Real file generation using @workspace/reports exporters
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import {
  type ColumnConfig,
  createExporterRegistry,
  type ReportFormat,
} from "@workspace/reports";
import PgBoss, { type Job } from "pg-boss";
import * as jobsService from "../services/jobs.service";
import * as templatesService from "../services/templates.service";

const QUEUE_NAME = "report-jobs";

// Storage path for generated reports (configurable via config)
const storageBasePath = "./uploads";

export interface ReportQueueConfig {
  connectionString: string;
  concurrency?: number;
  storagePath?: string;
}

export interface ReportJobData {
  jobId: string;
  orgId: string;
  templateId?: string;
  format: string;
  parameters?: Record<string, unknown>;
  data?: Record<string, unknown>[];
}

export interface ReportQueue {
  start(): Promise<void>;
  stop(): Promise<void>;
  enqueue(data: ReportJobData): Promise<string>;
  getStats(): Promise<{
    pending: number;
    active: number;
    completed: number;
    failed: number;
  }>;
}

// Sample data constants
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

async function processReportJob(jobData: ReportJobData): Promise<void> {
  const { jobId, orgId, templateId, format, data: providedData } = jobData;

  try {
    // Mark job as processing
    await jobsService.startJob(jobId);
    await jobsService.updateJobProgress(jobId, 0, 100);

    // Get template columns if templateId provided
    let columns: ColumnConfig[] = [];
    if (templateId) {
      const template = await templatesService.getTemplate(templateId, orgId);
      columns = template.columns as ColumnConfig[];
    }

    // Get data - use provided data, or generate sample data
    const data = providedData ?? generateSampleData(columns, 50);
    const totalRows = data.length;

    await jobsService.updateJobProgress(jobId, 25, 100);

    // Create exporter and generate file
    const exporterRegistry = createExporterRegistry();
    const exportFormat = format as ReportFormat;

    if (!exporterRegistry.supports(exportFormat)) {
      throw new Error(`Unsupported export format: ${format}`);
    }

    await jobsService.updateJobProgress(jobId, 50, 100);

    // Generate export
    const result = await exporterRegistry.export(
      exportFormat,
      data,
      columns,
      {}
    );

    await jobsService.updateJobProgress(jobId, 75, 100);

    // Save file to storage
    const reportsDir = path.join(storageBasePath, "reports", jobId);
    await fs.mkdir(reportsDir, { recursive: true });

    const extension = format === "excel" ? "xlsx" : format;
    const filePath = path.join(reportsDir, `report.${extension}`);
    await fs.writeFile(filePath, result.buffer);

    // Complete the job with result metadata
    await jobsService.completeJob(jobId, {
      fileSize: result.size,
      rowCount: totalRows,
      filePath,
      mimeType: result.mimeType,
    });

    console.log(
      `Report job ${jobId} completed: ${filePath} (${result.size} bytes)`
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Report job ${jobId} failed:`, message);

    await jobsService.failJob(jobId, {
      code: "GENERATION_FAILED",
      message,
      retryable: true,
    });
  }
}

export function createReportQueue(config: ReportQueueConfig): ReportQueue {
  const boss = new PgBoss(config.connectionString);
  const concurrency = config.concurrency ?? 3;
  let isStarted = false;

  return {
    async start(): Promise<void> {
      await boss.start();

      // Create the queue explicitly to ensure it exists
      await boss.createQueue(QUEUE_NAME);

      await boss.work<ReportJobData>(
        QUEUE_NAME,
        { batchSize: concurrency },
        async (jobs: Job<ReportJobData>[]) => {
          for (const job of jobs) {
            await processReportJob(job.data);
          }
        }
      );

      isStarted = true;
      console.log(`Report queue started with concurrency: ${concurrency}`);
    },

    async stop(): Promise<void> {
      await boss.stop();
      console.log("Report queue stopped");
    },

    async enqueue(data: ReportJobData): Promise<string> {
      if (!isStarted) {
        throw new Error("Report queue not started");
      }

      const queueJobId = await boss.send(QUEUE_NAME, data);

      if (!queueJobId) {
        throw new Error("Failed to enqueue report job - pg-boss returned null");
      }

      console.log(`Report job ${data.jobId} enqueued as ${queueJobId}`);
      return queueJobId;
    },

    async getStats() {
      const [pending, active, completed, failed] = await Promise.all([
        boss.getQueueSize(QUEUE_NAME, { before: "active" }),
        boss.getQueueSize(QUEUE_NAME, { before: "completed" }),
        boss.getQueueSize(QUEUE_NAME, { before: "failed" }),
        boss.getQueueSize(QUEUE_NAME, { before: "cancelled" }),
      ]);

      return {
        pending,
        active: active - pending,
        completed: completed - active,
        failed,
      };
    },
  };
}
