import type {
  AsyncExportResponse,
  ErrorResponse,
  ExportRequest,
  StreamExportRequest,
} from "@workspace/contracts";
import { zExportRequest, zStreamExportRequest } from "@workspace/contracts/zod";
import type { FastifyInstance } from "fastify";
import { handleError, ValidationError } from "../../../lib/errors";
import { createMeta } from "../../../lib/response";
import { requirePermission } from "../../auth/authorization-middleware";
import { jobsService } from "../../jobs";
import * as templatesService from "../services/templates.service";

// Import from @workspace/reports package
// These will be used when the package is fully integrated
// import { createExporterRegistry, createPrinterRegistry } from "@workspace/reports";

const MIME_TYPES: Record<string, string> = {
  csv: "text/csv",
  excel: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf",
  thermal: "application/octet-stream",
  dotmatrix: "text/plain",
};

const EXTENSIONS: Record<string, string> = {
  csv: "csv",
  excel: "xlsx",
  pdf: "pdf",
  thermal: "bin",
  dotmatrix: "txt",
};

function getExportMetadata(format: string) {
  return {
    mimeType: MIME_TYPES[format] ?? "text/csv",
    extension: EXTENSIONS[format] ?? "csv",
  };
}

export function exportRoutes(app: FastifyInstance) {
  // Synchronous export
  app.post<{
    Params: { orgId: string };
    Body: ExportRequest;
  }>(
    "/:orgId/reports/export",
    { preHandler: [requirePermission("reports", "create")] },
    async (
      request,
      reply
    ): Promise<AsyncExportResponse | ErrorResponse | undefined> => {
      try {
        const { orgId } = request.params;
        const userId = request.user?.id;

        if (!userId) {
          throw new ValidationError("User not authenticated");
        }

        const validatedBody = zExportRequest.parse(request.body);

        // If async flag is set, create a background job
        if (validatedBody.async) {
          const format = validatedBody.format ?? "csv";

          const job = await jobsService.createJob({
            orgId,
            type: "report",
            createdBy: userId,
            input: {
              templateId: validatedBody.templateId,
              parameters: validatedBody.parameters,
            },
            metadata: {
              templateId: validatedBody.templateId,
              format,
            },
          });

          // Queue the job for processing with pg-boss
          await jobsService.enqueueJob(job.id, "report");

          return {
            jobId: job.id,
            status: job.status,
            statusUrl: `/v1/orgs/${orgId}/jobs/${job.id}`,
            meta: createMeta(request.id),
          };
        }

        // Synchronous export
        let columns = validatedBody.columns ?? [];
        const data = validatedBody.data ?? [];
        const format = validatedBody.format ?? "csv";

        // If templateId is provided, load template configuration
        if (validatedBody.templateId) {
          const template = await templatesService.getTemplate(
            validatedBody.templateId,
            orgId
          );
          columns = template.columns;
          // In real implementation, would also fetch data using template.dataSource
        }

        if (columns.length === 0) {
          throw new ValidationError("No columns configured for export");
        }

        // For now, return a placeholder response
        // In real implementation, use @workspace/reports exporters
        const { mimeType, extension } = getExportMetadata(format);
        const filename = `export-${Date.now()}.${extension}`;

        // Generate export content (placeholder)
        // In real implementation:
        // const exporterRegistry = createExporterRegistry();
        // const result = await exporterRegistry.export(format, data, columns, options);
        // reply.send(result.buffer);

        const placeholderContent = generatePlaceholderExport(
          format,
          columns,
          data
        );

        reply.header("Content-Type", mimeType);
        reply.header(
          "Content-Disposition",
          `attachment; filename="${filename}"`
        );
        reply.send(Buffer.from(placeholderContent));
      } catch (error) {
        const { statusCode, response } = handleError(error, request.id);
        reply.status(statusCode);
        return response;
      }
    }
  );

  // Streaming export
  app.post<{
    Params: { orgId: string };
    Body: StreamExportRequest;
  }>(
    "/:orgId/reports/export/stream",
    { preHandler: [requirePermission("reports", "create")] },
    async (request, reply): Promise<ErrorResponse | undefined> => {
      try {
        const { orgId } = request.params;
        const userId = request.user?.id;

        if (!userId) {
          throw new ValidationError("User not authenticated");
        }

        const validatedBody = zStreamExportRequest.parse(request.body);
        const format = validatedBody.format;

        // Only CSV and Excel support streaming
        if (format !== "csv" && format !== "excel") {
          throw new ValidationError(
            `Streaming not supported for format: ${format}. Use synchronous export instead.`
          );
        }

        // Streaming export requires a template
        if (!validatedBody.templateId) {
          throw new ValidationError("Streaming export requires a templateId");
        }

        const template = await templatesService.getTemplate(
          validatedBody.templateId,
          orgId
        );
        const columns = template.columns;

        if (columns.length === 0) {
          throw new ValidationError("No columns configured for export");
        }

        const { mimeType, extension } = getExportMetadata(format);
        const filename = `export-${Date.now()}.${extension}`;

        reply.header("Content-Type", mimeType);
        reply.header(
          "Content-Disposition",
          `attachment; filename="${filename}"`
        );
        reply.header("Transfer-Encoding", "chunked");

        // In real implementation:
        // const stream = createCsvStream() or createExcelStream()
        // For now, return placeholder
        reply.send(Buffer.from("Streaming content placeholder\n"));
      } catch (error) {
        const { statusCode, response } = handleError(error, request.id);
        reply.status(statusCode);
        return response;
      }
    }
  );

  // Preview export
  app.post<{
    Params: { orgId: string };
    Body: ExportRequest & { limit?: number };
  }>(
    "/:orgId/reports/export/preview",
    { preHandler: [requirePermission("reports", "read")] },
    async (
      request,
      reply
    ): Promise<
      | {
          data: {
            rows: unknown[];
            totalCount?: number;
            columns: string[];
            columnKeys?: string[];
          };
          meta: { requestId: string; timestamp: string };
        }
      | ErrorResponse
    > => {
      try {
        const { orgId } = request.params;

        const validatedBody = zExportRequest.parse(request.body);
        const limit = Math.min(
          (request.body as { limit?: number }).limit ?? 10,
          100
        );

        let columns = validatedBody.columns ?? [];
        let data = validatedBody.data ?? [];

        // If templateId is provided, load template configuration
        if (validatedBody.templateId) {
          const template = await templatesService.getTemplate(
            validatedBody.templateId,
            orgId
          );
          columns = template.columns;
        }

        // Generate sample data if no data provided
        if (data.length === 0 && columns.length > 0) {
          data = generateSampleData(columns, limit);
        }

        // Return preview data with both headers and keys for proper data access
        const previewRows = data.slice(0, limit);
        const columnInfo = columns.map((col) => ({
          key: col.accessorKey ?? col.id,
          header: col.header,
        }));

        return {
          data: {
            rows: previewRows,
            totalCount: data.length,
            columns: columnInfo.map((c) => c.header),
            columnKeys: columnInfo.map((c) => c.key),
          },
          meta: createMeta(request.id),
        };
      } catch (error) {
        const { statusCode, response } = handleError(error, request.id);
        reply.status(statusCode);
        return response;
      }
    }
  );
}

// Sample data constants
const SAMPLE_NAMES = [
  "Alice Johnson",
  "Bob Smith",
  "Carol Williams",
  "David Brown",
  "Emma Davis",
  "Frank Miller",
  "Grace Wilson",
  "Henry Moore",
  "Ivy Taylor",
  "Jack Anderson",
];

const SAMPLE_PRODUCTS = [
  "Widget Pro",
  "Gadget Plus",
  "Super Tool",
  "Mega Pack",
  "Basic Kit",
];

const SAMPLE_EMAILS = SAMPLE_NAMES.map(
  (n) => `${n.toLowerCase().replace(" ", ".")}@example.com`
);

const MS_PER_DAY = 86_400_000;

function generateTextValue(key: string, header: string, idx: number): string {
  const k = key.toLowerCase();
  if (k.includes("name") || k.includes("user")) {
    return SAMPLE_NAMES[idx % SAMPLE_NAMES.length] ?? `User ${idx + 1}`;
  }
  if (k.includes("email")) {
    return (
      SAMPLE_EMAILS[idx % SAMPLE_EMAILS.length] ?? `user${idx + 1}@example.com`
    );
  }
  if (k.includes("product") || k.includes("item")) {
    return (
      SAMPLE_PRODUCTS[idx % SAMPLE_PRODUCTS.length] ?? `Product ${idx + 1}`
    );
  }
  if (k.includes("id")) {
    return `${key.toUpperCase()}-${String(idx + 1001).padStart(4, "0")}`;
  }
  if (k.includes("description")) {
    return `Sample ${header} for row ${idx + 1}`;
  }
  return `${header} ${idx + 1}`;
}

function generateValueByFormat(
  format: string,
  key: string,
  header: string,
  idx: number
): unknown {
  const daysAgo = Math.floor(Math.random() * 30);
  const randomDate = new Date(Date.now() - daysAgo * MS_PER_DAY);

  const formatGenerators: Record<string, () => unknown> = {
    number: () => Math.floor(Math.random() * 1000) + 1,
    currency: () => Number.parseFloat((Math.random() * 10_000).toFixed(2)),
    percentage: () => Number.parseFloat((Math.random() * 100).toFixed(1)),
    date: () => randomDate.toISOString().split("T")[0],
    datetime: () => randomDate.toISOString(),
    boolean: () => Math.random() > 0.5,
  };

  const generator = formatGenerators[format];
  return generator ? generator() : generateTextValue(key, header, idx);
}

/**
 * Generate sample data based on column definitions
 */
function generateSampleData(
  columns: Array<{
    id: string;
    header: string;
    format?: string;
    accessorKey?: string;
  }>,
  rowCount: number
): Record<string, unknown>[] {
  return Array.from({ length: rowCount }, (_, i) => {
    const row: Record<string, unknown> = {};
    for (const col of columns) {
      const key = col.accessorKey ?? col.id;
      row[key] = generateValueByFormat(
        col.format ?? "text",
        key,
        col.header,
        i
      );
    }
    return row;
  });
}

/**
 * Generate placeholder export content for demonstration
 */
function generatePlaceholderExport(
  format: string,
  columns: Array<{ id: string; header: string }>,
  data: unknown[]
): string {
  if (format === "csv") {
    const headers = columns.map((c) => c.header).join(",");
    const rows = data
      .slice(0, 10)
      .map((row) => {
        const values = columns.map((col) => {
          const value = (row as Record<string, unknown>)[col.id];
          return String(value ?? "");
        });
        return values.join(",");
      })
      .join("\n");
    return `${headers}\n${rows}`;
  }

  // For other formats, return a simple placeholder
  return `Export placeholder for format: ${format}\nColumns: ${columns.length}\nRows: ${data.length}`;
}
