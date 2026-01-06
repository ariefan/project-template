import { describe, expect, it } from "vitest";
import { DotMatrixPrinter, ThermalPrinter } from "../printers";
import { ESC_POS } from "../printers/commands";
import type { ColumnConfig } from "../types";

interface TestSale {
  product: string;
  qty: number;
  price: number;
  total: number;
}

const TEST_DATA: TestSale[] = [
  { product: "Widget A", qty: 10, price: 5.0, total: 50.0 },
  { product: "Widget B", qty: 5, price: 12.5, total: 62.5 },
  { product: "Gadget X", qty: 2, price: 99.0, total: 198.0 },
];

const TEST_COLUMNS: ColumnConfig[] = [
  { id: "product", header: "Product", accessorKey: "product" },
  { id: "qty", header: "Qty", accessorKey: "qty", format: "number" },
  { id: "price", header: "Price", accessorKey: "price", format: "currency" },
  { id: "total", header: "Total", accessorKey: "total", format: "currency" },
];

describe("ESC/POS Commands", () => {
  it("should have init command", () => {
    expect(ESC_POS.INIT).toBe("\x1B\x40");
  });

  it("should have bold commands", () => {
    expect(ESC_POS.BOLD_ON).toBe("\x1B\x45\x01");
    expect(ESC_POS.BOLD_OFF).toBe("\x1B\x45\x00");
  });

  it("should have alignment commands", () => {
    expect(ESC_POS.ALIGN_LEFT).toBe("\x1B\x61\x00");
    expect(ESC_POS.ALIGN_CENTER).toBe("\x1B\x61\x01");
    expect(ESC_POS.ALIGN_RIGHT).toBe("\x1B\x61\x02");
  });

  it("should have character widths for different paper sizes", () => {
    expect(ESC_POS.CHARS_PER_LINE_58MM).toBe(32);
    expect(ESC_POS.CHARS_PER_LINE_80MM).toBe(48);
  });

  it("should generate feed lines command", () => {
    expect(ESC_POS.FEED_LINES(3)).toBe("\x1B\x64\x03");
    expect(ESC_POS.FEED_LINES(5)).toBe("\x1B\x64\x05");
  });
});

describe("Thermal Printer", () => {
  const thermalPrinter = new ThermalPrinter<TestSale>();

  it("should generate print output", () => {
    const result = thermalPrinter.print(TEST_DATA, TEST_COLUMNS);

    expect(result.success).toBe(true);
    expect(result.buffer).toBeDefined();
    expect(result.buffer.length).toBeGreaterThan(0);
    expect(result.encoding).toBe("utf-8");
  });

  it("should use 80mm paper width by default", () => {
    const result = thermalPrinter.print(TEST_DATA, TEST_COLUMNS);

    expect(result.printerWidth).toBe(48);
  });

  it("should support 58mm paper width", () => {
    const result = thermalPrinter.print(TEST_DATA, TEST_COLUMNS, {
      printerWidth: 58,
    });

    expect(result.printerWidth).toBe(32);
  });

  it("should include ESC/POS init command", () => {
    const result = thermalPrinter.print(TEST_DATA, TEST_COLUMNS);
    const content = result.buffer.toString("utf-8");

    expect(content).toContain(ESC_POS.INIT);
  });

  it("should include column headers", () => {
    const result = thermalPrinter.print(TEST_DATA, TEST_COLUMNS);
    const content = result.buffer.toString("utf-8");

    expect(content).toContain("Product");
    expect(content).toContain("Qty");
    expect(content).toContain("Price");
    expect(content).toContain("Total");
  });

  it("should include data values", () => {
    const result = thermalPrinter.print(TEST_DATA, TEST_COLUMNS);
    const content = result.buffer.toString("utf-8");

    expect(content).toContain("Widget A");
    expect(content).toContain("Widget B");
    expect(content).toContain("Gadget X");
  });

  it("should include row count", () => {
    const result = thermalPrinter.print(TEST_DATA, TEST_COLUMNS);
    const content = result.buffer.toString("utf-8");

    expect(content).toContain("Total: 3 rows");
  });

  it("should include cut command by default", () => {
    const result = thermalPrinter.print(TEST_DATA, TEST_COLUMNS);
    const content = result.buffer.toString("utf-8");

    expect(content).toContain(ESC_POS.CUT_PARTIAL);
  });

  it("should omit cut command when autoCut is false", () => {
    const result = thermalPrinter.print(TEST_DATA, TEST_COLUMNS, {
      autoCut: false,
    });
    const content = result.buffer.toString("utf-8");

    expect(content).not.toContain(ESC_POS.CUT_PARTIAL);
  });

  it("should handle empty data array", () => {
    const result = thermalPrinter.print([], TEST_COLUMNS);

    expect(result.success).toBe(true);
    expect(result.buffer.length).toBeGreaterThan(0);
  });

  it("should hide columns marked as hidden", () => {
    const columnsWithHidden: ColumnConfig[] = TEST_COLUMNS.map((col, i) =>
      i === 0 ? { ...col, hidden: true } : col
    );

    const result = thermalPrinter.print(TEST_DATA, columnsWithHidden);
    const content = result.buffer.toString("utf-8");

    // Check headers - Product should not be there
    const lines = content.split(ESC_POS.FEED_LINE);
    const hasProductHeader = lines.some(
      (line) => line.includes("Product") && line.includes("Qty")
    );
    expect(hasProductHeader).toBe(false);
  });
});

describe("Dot Matrix Printer", () => {
  const dotMatrixPrinter = new DotMatrixPrinter<TestSale>();

  it("should generate print output", () => {
    const result = dotMatrixPrinter.print(TEST_DATA, TEST_COLUMNS);

    expect(result.success).toBe(true);
    expect(result.buffer).toBeDefined();
    expect(result.buffer.length).toBeGreaterThan(0);
    // Default encoding is utf-8 (condensedMode: false)
    expect(result.encoding).toBe("utf-8");
  });

  it("should use 80 characters per line by default", () => {
    const result = dotMatrixPrinter.print(TEST_DATA, TEST_COLUMNS);

    expect(result.printerWidth).toBe(80);
  });

  it("should support custom line width", () => {
    const result = dotMatrixPrinter.print(TEST_DATA, TEST_COLUMNS, {
      lineWidth: 132,
    });

    expect(result.printerWidth).toBe(132);
  });

  it("should include column headers", () => {
    const result = dotMatrixPrinter.print(TEST_DATA, TEST_COLUMNS);
    const content = result.buffer.toString("utf-8");

    expect(content).toContain("Product");
    expect(content).toContain("Qty");
    expect(content).toContain("Price");
    expect(content).toContain("Total");
  });

  it("should include data values", () => {
    const result = dotMatrixPrinter.print(TEST_DATA, TEST_COLUMNS);
    const content = result.buffer.toString("utf-8");

    expect(content).toContain("Widget A");
    expect(content).toContain("Widget B");
    expect(content).toContain("Gadget X");
  });

  it("should include row count", () => {
    const result = dotMatrixPrinter.print(TEST_DATA, TEST_COLUMNS);
    const content = result.buffer.toString("utf-8");

    expect(content).toContain("Total rows: 3");
  });

  it("should not include form feed by default", () => {
    const result = dotMatrixPrinter.print(TEST_DATA, TEST_COLUMNS);
    const content = result.buffer.toString("utf-8");

    expect(content).not.toContain("\f");
  });

  it("should include form feed when formFeed is true", () => {
    const result = dotMatrixPrinter.print(TEST_DATA, TEST_COLUMNS, {
      formFeed: true,
    });
    const content = result.buffer.toString("utf-8");

    expect(content).toContain("\f");
  });

  it("should handle empty data array", () => {
    const result = dotMatrixPrinter.print([], TEST_COLUMNS);

    expect(result.success).toBe(true);
    expect(result.buffer.length).toBeGreaterThan(0);
  });

  it("should use box drawing characters", () => {
    const result = dotMatrixPrinter.print(TEST_DATA, TEST_COLUMNS);
    const content = result.buffer.toString("utf-8");

    // Should have some kind of separator/border characters
    expect(content).toMatch(/[=\-|+]/);
  });

  it("should use ascii encoding when condensedMode is true", () => {
    const result = dotMatrixPrinter.print(TEST_DATA, TEST_COLUMNS, {
      condensedMode: true,
    });

    expect(result.encoding).toBe("ascii");
  });
});
