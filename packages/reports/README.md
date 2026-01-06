# @workspace/reports

A comprehensive reporting system for the SaaS template with support for multiple export formats, thermal/dot-matrix printers, template engine, scheduler, and streaming for large datasets.

## Features

- **Multiple Export Formats**: CSV, Excel (XLSX), PDF
- **Thermal/Dot-Matrix Printers**: ESC/POS command support for POS/retail applications
- **Template Engine**: Eta-based with custom helpers for complex report logic
- **Scheduler**: pg-boss integration for automated report generation
- **Streaming**: Memory-efficient processing for large datasets
- **Multi-tenant**: Organization-scoped with Casbin authorization

## Installation

```bash
pnpm add @workspace/reports
```

## Usage

### Exporters

Export data to CSV, Excel, or PDF format:

```typescript
import { CsvExporter, ExcelExporter, PdfExporter, ExporterRegistry } from "@workspace/reports/exporters";

// Define columns
const columns = [
  { id: "name", header: "Name", accessorKey: "name" },
  { id: "price", header: "Price", accessorKey: "price", format: "currency" },
  { id: "date", header: "Date", accessorKey: "date", format: "date" },
];

// CSV export
const csvExporter = new CsvExporter();
const csvResult = csvExporter.export(data, columns, { delimiter: "," });

// Excel export
const excelExporter = new ExcelExporter();
const excelResult = await excelExporter.export(data, columns, {
  sheetName: "Sales Report",
  autoFilter: true,
  freezeHeader: true,
});

// PDF export
const pdfExporter = new PdfExporter();
const pdfResult = await pdfExporter.export(data, columns, {
  orientation: "landscape",
  title: "Sales Report",
  includePageNumbers: true,
});

// Or use the registry for unified access
const registry = new ExporterRegistry();
const result = await registry.export("csv", data, columns);
```

### Printers

Generate output for thermal receipt printers or dot-matrix printers:

```typescript
import { ThermalPrinter, DotMatrixPrinter } from "@workspace/reports/printers";

// Thermal printer (ESC/POS)
const thermalPrinter = new ThermalPrinter();
const thermalResult = thermalPrinter.print(data, columns, {
  printerWidth: 80, // 80mm paper
  autoCut: true,
});
// thermalResult.buffer contains ESC/POS commands

// Dot matrix printer
const dotMatrixPrinter = new DotMatrixPrinter();
const dotMatrixResult = dotMatrixPrinter.print(data, columns, {
  lineWidth: 132,
  formFeed: true,
});
```

### Template Engine

Use Eta templates for complex report formatting:

```typescript
import { createTemplateEngine } from "@workspace/reports/templates";

const engine = createTemplateEngine();

const template = `
# Sales Report - <%= it.metadata.title %>
Generated: <%= it.formatDate(it.metadata.generatedAt) %>

Total Revenue: <%= it.formatCurrency(it.sum(it.data.map(r => r.revenue))) %>

<% for (const item of it.data) { %>
- <%= item.product %>: <%= it.formatCurrency(item.revenue) %>
<% } %>
`;

const result = await engine.render(template, {
  data: salesData,
  metadata: {
    title: "Q4 2024",
    generatedAt: new Date(),
    rowCount: salesData.length,
  },
});
```

#### Available Template Helpers

- `formatNumber(value, decimals)` - Format numbers with locale separators
- `formatCurrency(value, currency)` - Format as currency
- `formatDate(value, pattern)` - Format dates
- `formatDateTime(value, pattern)` - Format date and time
- `formatPercentage(value, decimals)` - Format as percentage
- `formatBoolean(value, trueLabel, falseLabel)` - Format booleans
- `sum(array)` - Sum array of numbers
- `avg(array)` - Calculate average
- `min(array)` - Find minimum
- `max(array)` - Find maximum
- `count(array)` - Count items
- `groupBy(array, key)` - Group by property
- `sortBy(array, key, direction)` - Sort by property
- `truncate(value, length, suffix)` - Truncate strings
- `padLeft(value, length, char)` - Left-pad strings
- `padRight(value, length, char)` - Right-pad strings
- `upper(value)` - Uppercase
- `lower(value)` - Lowercase
- `capitalize(value)` - Capitalize first letter

### Streaming

Process large datasets efficiently:

```typescript
import { ChunkProcessor, chunkArray } from "@workspace/reports/streaming";

// For database queries with pagination
const processor = new ChunkProcessor({
  batchSize: 1000,
  onProgress: (processed, total) => {
    console.log(`Progress: ${processed}/${total}`);
  },
});

const fetcher = async (offset, limit) => {
  return await db.query.select().from(table).offset(offset).limit(limit);
};

// Process as async generator
for await (const chunk of processor.processChunks(fetcher)) {
  // Process each chunk
}

// Or collect all
const allData = await processor.collectAll(fetcher);

// For in-memory arrays
for (const chunk of chunkArray(largeArray, 1000)) {
  // Process each chunk
}
```

## Column Configuration

Columns support the following options:

```typescript
interface ColumnConfig {
  id: string;              // Unique identifier
  header: string;          // Display header text
  accessorKey?: string;    // Property key (supports dot notation: "user.name")
  accessorFn?: string;     // Custom accessor function expression
  width?: number;          // Column width in pixels
  align?: "left" | "center" | "right";
  format?: "text" | "number" | "currency" | "date" | "datetime" | "boolean" | "percentage";
  formatPattern?: string;  // Custom format pattern (e.g., "yyyy-MM-dd")
  hidden?: boolean;        // Hide column in output
}
```

## Export Options

### CSV Options

```typescript
interface CsvOptions {
  delimiter?: string;       // Default: ","
  includeHeaders?: boolean; // Default: true
  encoding?: string;        // Default: "utf-8"
}
```

### Excel Options

```typescript
interface ExcelOptions {
  sheetName?: string;       // Default: "Sheet1"
  autoFilter?: boolean;     // Enable auto-filter
  freezeHeader?: boolean;   // Freeze header row
}
```

### PDF Options

```typescript
interface PdfOptions {
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
}
```

### Thermal Printer Options

```typescript
interface ThermalOptions {
  printerWidth?: 58 | 80;   // Paper width in mm
  encoding?: string;        // Default: "utf-8"
  autoCut?: boolean;        // Cut paper after printing
}
```

### Dot Matrix Options

```typescript
interface DotMatrixOptions {
  lineWidth?: number;       // Characters per line (default: 80)
  condensedMode?: boolean;  // Use condensed mode
  formFeed?: boolean;       // Form feed after print
}
```

## Testing

```bash
pnpm test
```

## License

MIT
