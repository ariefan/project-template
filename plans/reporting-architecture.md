# Comprehensive Reporting & Export Architecture

## Overview

This document outlines the architecture for a full-featured reporting and export system that can be reused across all applications in the workspace.

## Architecture Decision

**Recommendation: Create a dedicated `@workspace/reports` package**

### Why a Dedicated Package?

1. **Separation of Concerns**: Reporting logic is distinct from UI components
2. **Reusability**: Can be used across web, mobile, and API apps
3. **Server-Side Support**: Export utilities can run on the server for large datasets
4. **Maintainability**: Focused package with clear boundaries
5. **Testing**: Easier to test in isolation

## Package Structure

```
packages/reports/
├── src/
│   ├── core/                    # Core export functionality
│   │   ├── exporters/           # Format-specific exporters
│   │   │   ├── csv.ts
│   │   │   ├── excel.ts
│   │   │   ├── pdf.ts
│   │   │   └── index.ts
│   │   ├── types.ts             # Shared types
│   │   └── utils.ts             # Utility functions
│   ├── templates/               # Template-based reports
│   │   ├── engine.ts            # Template engine
│   │   ├── types.ts
│   │   └── default-templates/   # Built-in templates
│   ├── scheduler/               # Scheduled reports
│   │   ├── scheduler.ts
│   │   ├── queue.ts
│   │   └── types.ts
│   ├── delivery/                # Report delivery
│   │   ├── email.ts
│   │   ├── storage.ts
│   │   └── types.ts
│   ├── server/                  # Server-side exports
│   │   ├── export-handler.ts
│   │   └── stream-handler.ts
│   └── index.ts                 # Public API
├── package.json
├── tsconfig.json
└── README.md
```

## Core Components

### 1. Exporters

**CSV Exporter**

- Already implemented in data-view
- Move to reports package for reuse
- Support for custom delimiters, encoding
- Large file streaming support

**Excel Exporter**

- Use `xlsx` library (SheetJS)
- Multiple sheets support
- Styling and formatting
- Charts and images
- Cell validation

**PDF Exporter**

- Use `jspdf` + `jspdf-autotable`
- Custom layouts with headers/footers
- Images and logos
- Page numbers
- Watermarks

### 2. Template Engine

**Features**

- Handlebars-based templates
- Dynamic data injection
- Conditional sections
- Loops and iterations
- Custom helpers
- Template inheritance

**Template Structure**

```typescript
interface ReportTemplate {
  id: string;
  name: string;
  description?: string;
  format: "pdf" | "excel" | "csv";
  template: string; // Handlebars template
  defaultOptions?: ReportOptions;
  metadata?: Record<string, unknown>;
}
```

### 3. Scheduled Reports

**Features**

- Cron-based scheduling
- Report generation queue
- Retry logic with exponential backoff
- Status tracking (pending, processing, completed, failed)
- History and audit logs

**Data Structure**

```typescript
interface ScheduledReport {
  id: string;
  name: string;
  templateId: string;
  schedule: string; // cron expression
  recipients: string[]; // email addresses
  parameters?: Record<string, unknown>;
  status: "active" | "paused" | "disabled";
  lastRun?: Date;
  nextRun?: Date;
}
```

### 4. Delivery System

**Email Delivery**

- SMTP integration
- HTML email templates
- Attachments (reports)
- Batching for multiple recipients
- Delivery tracking

**Storage Delivery**

- Upload to S3/Local storage
- Public/private URLs
- Expiration policies
- Versioning support

### 5. Server-Side Exports

**Features**

- Stream-based processing for large datasets
- Memory-efficient
- Progress tracking
- Cancellation support
- Worker thread support for CPU-intensive operations

## Integration Points

### With Existing Data View

```typescript
// Enhance existing useDataExport hook
import { exportToExcel, exportToPDF } from "@workspace/reports";

export function useDataExport<T>({ data, columns }: UseDataExportProps<T>) {
  const exportExcel = useCallback(
    async (options?: ExportOptions) => {
      const workbook = exportToExcel(data, columns, options);
      // ... download logic
    },
    [data, columns]
  );

  const exportPDF = useCallback(
    async (options?: ExportOptions) => {
      const pdf = exportToPDF(data, columns, options);
      // ... download logic
    },
    [data, columns]
  );

  return { exportCSV, exportExcel, exportPDF, exportToClipboard };
}
```

### API Routes

```typescript
// apps/api/src/modules/reports/routes.ts
router.post("/export", async (req, res) => {
  const { format, data, options } = req.body;
  const exporter = getExporter(format);
  const result = await exporter.export(data, options);
  res.setHeader("Content-Type", result.mimeType);
  res.send(result.buffer);
});

router.post("/reports/generate", async (req, res) => {
  const { templateId, parameters } = req.body;
  const report = await generateReport(templateId, parameters);
  res.json({ reportId: report.id });
});
```

## Dependencies

### Required Packages

```json
{
  "dependencies": {
    "xlsx": "^0.18.5", // Excel export
    "jspdf": "^2.5.1", // PDF generation
    "jspdf-autotable": "^3.8.2", // PDF tables
    "handlebars": "^4.7.8", // Template engine
    "date-fns": "^4.1.0", // Date formatting
    "bull": "^4.12.2", // Job queue (optional)
    "nodemailer": "^6.9.7" // Email delivery (optional)
  },
  "devDependencies": {
    "@types/xlsx": "^0.0.36",
    "@types/nodemailer": "^6.4.14"
  }
}
```

## Usage Examples

### Simple Export

```typescript
import { exportToExcel, exportToPDF } from "@workspace/reports";

// Export to Excel
const excelBuffer = await exportToExcel(data, columns, {
  filename: "report-2024",
  includeHeaders: true,
  sheetName: "Data",
});

// Export to PDF
const pdfBuffer = await exportToPDF(data, columns, {
  filename: "report-2024",
  title: "Monthly Report",
  author: "Your Company",
  pageSize: "A4",
});
```

### Template-Based Report

```typescript
import { generateReportFromTemplate } from "@workspace/reports";

const report = await generateReportFromTemplate("monthly-sales", {
  month: "January 2024",
  data: salesData,
  logo: companyLogoUrl,
});
```

### Scheduled Report

```typescript
import { createScheduledReport } from "@workspace/reports";

await createScheduledReport({
  name: "Weekly Sales Report",
  templateId: "weekly-sales",
  schedule: "0 9 * * 1", // Every Monday at 9 AM
  recipients: ["manager@company.com"],
  parameters: {
    includeCharts: true,
  },
});
```

### Server-Side Export (Large Dataset)

```typescript
import { streamExport } from "@workspace/reports/server";

router.get("/export/large", async (req, res) => {
  await streamExport(req, res, {
    format: "excel",
    dataStream: getDataStream(), // Readable stream
    columns: reportColumns,
    chunkSize: 10000,
  });
});
```

## Migration Path

### Phase 1: Core Exporters

1. Create `@workspace/reports` package
2. Move CSV exporter from data-view
3. Implement Excel exporter
4. Implement PDF exporter
5. Update data-view to use new package

### Phase 2: Template System

1. Build template engine
2. Create default templates
3. Add template management UI

### Phase 3: Scheduling & Delivery

1. Implement scheduler
2. Add email delivery
3. Create scheduled reports UI

### Phase 4: Server-Side Support

1. Build streaming exporters
2. Add API endpoints
3. Implement progress tracking

## Benefits

1. **Reusability**: Single package for all apps
2. **Consistency**: Same export behavior across apps
3. **Scalability**: Server-side support for large datasets
4. **Flexibility**: Template-based custom reports
5. **Automation**: Scheduled reports with delivery
6. **Maintainability**: Clear separation of concerns

## Next Steps

1. Review and approve this architecture
2. Decide on implementation priority
3. Begin Phase 1 implementation
