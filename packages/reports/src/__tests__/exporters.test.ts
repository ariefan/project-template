import { describe, expect, it } from "vitest";
import { CsvExporter, ExcelExporter, ExporterRegistry } from "../exporters";
import type { ColumnConfig } from "../types";

interface TestProduct {
  id: number;
  name: string;
  price: number;
  quantity: number;
  createdAt: Date;
  isActive: boolean;
}

const TEST_DATA: TestProduct[] = [
  {
    id: 1,
    name: "Widget A",
    price: 29.99,
    quantity: 100,
    createdAt: new Date("2024-01-15"),
    isActive: true,
  },
  {
    id: 2,
    name: "Widget B",
    price: 49.99,
    quantity: 50,
    createdAt: new Date("2024-02-20"),
    isActive: false,
  },
  {
    id: 3,
    name: "Gadget X",
    price: 199.99,
    quantity: 25,
    createdAt: new Date("2024-03-10"),
    isActive: true,
  },
];

const TEST_COLUMNS: ColumnConfig[] = [
  { id: "id", header: "ID", accessorKey: "id" },
  { id: "name", header: "Product Name", accessorKey: "name" },
  { id: "price", header: "Price", accessorKey: "price", format: "currency" },
  { id: "quantity", header: "Qty", accessorKey: "quantity", format: "number" },
  {
    id: "createdAt",
    header: "Created",
    accessorKey: "createdAt",
    format: "date",
  },
  {
    id: "isActive",
    header: "Active",
    accessorKey: "isActive",
    format: "boolean",
  },
];

describe("CSV Exporter", () => {
  const csvExporter = new CsvExporter<TestProduct>();

  it("should export data to CSV format", () => {
    const result = csvExporter.export(TEST_DATA, TEST_COLUMNS);

    expect(result.success).toBe(true);
    expect(result.mimeType).toBe("text/csv");
    expect(result.filename).toMatch(/^export-\d+\.csv$/);
    expect(result.rowCount).toBe(3);
    expect(result.buffer).toBeDefined();
    expect(result.buffer.length).toBeGreaterThan(0);
  });

  it("should include headers by default", () => {
    const result = csvExporter.export(TEST_DATA, TEST_COLUMNS);
    const content = result.buffer.toString("utf-8");

    expect(content).toContain("ID");
    expect(content).toContain("Product Name");
    expect(content).toContain("Price");
    expect(content).toContain("Qty");
  });

  it("should exclude headers when option is set", () => {
    const result = csvExporter.export(TEST_DATA, TEST_COLUMNS, {
      includeHeaders: false,
    });
    const content = result.buffer.toString("utf-8");
    const lines = content.trim().split("\n");

    // Should only have data rows (no header)
    expect(lines.length).toBe(3);
    expect(content).not.toContain('"ID","Product Name"');
  });

  it("should use custom delimiter", () => {
    const result = csvExporter.export(TEST_DATA, TEST_COLUMNS, {
      delimiter: ";",
    });
    const content = result.buffer.toString("utf-8");

    expect(content).toContain(";");
  });

  it("should format currency values", () => {
    const result = csvExporter.export(TEST_DATA, TEST_COLUMNS);
    const content = result.buffer.toString("utf-8");

    expect(content).toContain("$29.99");
    expect(content).toContain("$49.99");
    expect(content).toContain("$199.99");
  });

  it("should format boolean values", () => {
    const result = csvExporter.export(TEST_DATA, TEST_COLUMNS);
    const content = result.buffer.toString("utf-8");

    expect(content).toContain("Yes");
    expect(content).toContain("No");
  });

  it("should hide columns marked as hidden", () => {
    const columnsWithHidden: ColumnConfig[] = TEST_COLUMNS.map((col, i) =>
      i === 0 ? { ...col, hidden: true } : col
    );

    const result = csvExporter.export(TEST_DATA, columnsWithHidden);
    const content = result.buffer.toString("utf-8");
    const headerLine = content.split("\n")[0];

    expect(headerLine).not.toContain('"ID"');
    expect(headerLine).toContain("Product Name");
  });

  it("should handle empty data array", () => {
    const result = csvExporter.export([], TEST_COLUMNS);

    expect(result.success).toBe(true);
    expect(result.rowCount).toBe(0);
  });

  it("should report export duration", () => {
    const result = csvExporter.export(TEST_DATA, TEST_COLUMNS);

    expect(result.duration).toBeGreaterThanOrEqual(0);
    expect(typeof result.duration).toBe("number");
  });
});

describe("Excel Exporter", () => {
  const excelExporter = new ExcelExporter<TestProduct>();

  it("should export data to Excel format", async () => {
    const result = await excelExporter.export(TEST_DATA, TEST_COLUMNS);

    expect(result.success).toBe(true);
    expect(result.mimeType).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    expect(result.filename).toMatch(/^export-\d+\.xlsx$/);
    expect(result.rowCount).toBe(3);
    expect(result.buffer).toBeDefined();
    expect(result.buffer.length).toBeGreaterThan(0);
  });

  it("should handle custom sheet name", async () => {
    const result = await excelExporter.export(TEST_DATA, TEST_COLUMNS, {
      sheetName: "Products",
    });

    expect(result.success).toBe(true);
  });

  it("should handle empty data array", async () => {
    const result = await excelExporter.export([], TEST_COLUMNS);

    expect(result.success).toBe(true);
    expect(result.rowCount).toBe(0);
  });
});

describe("Exporter Registry", () => {
  const registry = new ExporterRegistry<TestProduct>();

  it("should export to CSV via registry", async () => {
    const result = await registry.export("csv", TEST_DATA, TEST_COLUMNS);

    expect(result.success).toBe(true);
    expect(result.mimeType).toBe("text/csv");
  });

  it("should export to Excel via registry", async () => {
    const result = await registry.export("excel", TEST_DATA, TEST_COLUMNS);

    expect(result.success).toBe(true);
    expect(result.mimeType).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
  });

  it("should get list of supported formats", () => {
    const formats = registry.getSupportedFormats();

    expect(formats).toContain("csv");
    expect(formats).toContain("excel");
    expect(formats).toContain("pdf");
  });

  it("should throw error for unsupported format", async () => {
    await expect(
      // @ts-expect-error Testing invalid format
      registry.export("invalid", TEST_DATA, TEST_COLUMNS)
    ).rejects.toThrow("Unsupported export format");
  });
});
