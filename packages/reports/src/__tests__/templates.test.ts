import { describe, expect, it } from "vitest";
import {
  createTemplateEngine,
  TemplateCompileError,
  TemplateEngine,
  TemplateRenderError,
} from "../templates/engine";
import { TemplateHelpers } from "../templates/helpers";

interface TestProduct {
  name: string;
  price: number;
  quantity: number;
}

const TEST_DATA: TestProduct[] = [
  { name: "Widget A", price: 29.99, quantity: 100 },
  { name: "Widget B", price: 49.99, quantity: 50 },
  { name: "Gadget X", price: 199.99, quantity: 25 },
];

describe("Template Engine", () => {
  const engine = new TemplateEngine();

  it("should render simple template", async () => {
    const template = "Hello, <%= it.params.name %>!";
    const result = await engine.render(template, {
      data: [],
      metadata: { generatedAt: new Date(), rowCount: 0 },
      params: { name: "World" },
    });

    expect(result).toBe("Hello, World!");
  });

  it("should render template with data array", async () => {
    const template = `
<% for (const item of it.data) { %>
- <%= item.name %>
<% } %>
`.trim();

    const result = await engine.render(template, {
      data: TEST_DATA,
      metadata: { generatedAt: new Date(), rowCount: TEST_DATA.length },
    });

    expect(result).toContain("Widget A");
    expect(result).toContain("Widget B");
    expect(result).toContain("Gadget X");
  });

  it("should render metadata", async () => {
    const template =
      "Generated at: <%= it.metadata.generatedAt.toISOString() %> | Rows: <%= it.metadata.rowCount %>";
    const generatedAt = new Date("2024-03-15T12:00:00Z");

    const result = await engine.render(template, {
      data: TEST_DATA,
      metadata: { generatedAt, rowCount: 3 },
    });

    expect(result).toContain("2024-03-15T12:00:00.000Z");
    expect(result).toContain("Rows: 3");
  });

  it("should provide helper functions", async () => {
    const template = `
Total: <%= it.formatCurrency(it.data.reduce((sum, item) => sum + item.price, 0)) %>
`.trim();

    const result = await engine.render(template, {
      data: TEST_DATA,
      metadata: { generatedAt: new Date(), rowCount: 3 },
    });

    expect(result).toContain("$");
  });

  it("should throw TemplateRenderError for invalid template syntax", async () => {
    const invalidTemplate = "<% for (const x of items { %>";

    await expect(
      engine.render(invalidTemplate, {
        data: [],
        metadata: { generatedAt: new Date(), rowCount: 0 },
      })
    ).rejects.toThrow(TemplateRenderError);
  });

  it("should validate valid template", () => {
    const validTemplate = "<%= it.data.length %>";
    const result = engine.validate(validTemplate);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should detect invalid template syntax", () => {
    const invalidTemplate = "<% for (const x %>";
    const result = engine.validate(invalidTemplate);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]?.message).toBeDefined();
  });

  it("should compile template for reuse", () => {
    const template = "Hello, <%= it.name %>!";
    const compiled = engine.compile(template);

    expect(typeof compiled).toBe("function");
    expect(compiled({ name: "World" })).toBe("Hello, World!");
    expect(compiled({ name: "Test" })).toBe("Hello, Test!");
  });

  it("should throw TemplateCompileError for invalid compile", () => {
    const invalidTemplate = "<% for (const x %>";

    expect(() => engine.compile(invalidTemplate)).toThrow(TemplateCompileError);
  });

  it("should list available helpers", () => {
    const helpers = engine.getAvailableHelpers();

    expect(helpers).toContain("formatCurrency");
    expect(helpers).toContain("formatDate");
    expect(helpers).toContain("formatNumber");
    expect(helpers).toContain("sum");
    expect(helpers).toContain("avg");
  });

  it("should allow custom helpers", async () => {
    const template = "<%= it.customHelper('test') %>";

    const result = await engine.render(
      template,
      {
        data: [],
        metadata: { generatedAt: new Date(), rowCount: 0 },
      },
      {
        helpers: {
          customHelper: (value: unknown) => `Custom: ${value}`,
        },
      }
    );

    expect(result).toBe("Custom: test");
  });

  it("should auto-escape HTML by default", async () => {
    const template = "<%= it.params.html %>";

    const result = await engine.render(template, {
      data: [],
      metadata: { generatedAt: new Date(), rowCount: 0 },
      params: { html: "<script>alert('xss')</script>" },
    });

    expect(result).not.toContain("<script>");
    expect(result).toContain("&lt;script&gt;");
  });
});

describe("createTemplateEngine", () => {
  it("should create a new template engine instance", () => {
    const engine = createTemplateEngine();

    expect(engine).toBeInstanceOf(TemplateEngine);
  });
});

describe("Template Helpers", () => {
  describe("formatCurrency", () => {
    it("should format number as currency", () => {
      expect(TemplateHelpers.formatCurrency(1234.56)).toBe("$1,234.56");
    });

    it("should use custom currency code", () => {
      expect(TemplateHelpers.formatCurrency(1234.56, "EUR")).toContain("€");
    });

    it("should handle zero", () => {
      expect(TemplateHelpers.formatCurrency(0)).toBe("$0.00");
    });

    it("should handle negative amounts", () => {
      expect(TemplateHelpers.formatCurrency(-100)).toBe("-$100.00");
    });
  });

  describe("formatDate", () => {
    it("should format date with default pattern", () => {
      const date = new Date("2024-03-15T12:00:00Z");
      expect(TemplateHelpers.formatDate(date)).toBe("2024-03-15");
    });

    it("should use custom pattern", () => {
      const date = new Date("2024-03-15T12:00:00Z");
      expect(TemplateHelpers.formatDate(date, "MM/dd/yyyy")).toBe("03/15/2024");
    });

    it("should handle ISO string", () => {
      expect(TemplateHelpers.formatDate("2024-03-15")).toBe("2024-03-15");
    });
  });

  describe("formatNumber", () => {
    it("should format number with locale separators", () => {
      expect(TemplateHelpers.formatNumber(1_234_567, 0)).toBe("1,234,567");
    });

    it("should handle decimal numbers", () => {
      expect(TemplateHelpers.formatNumber(1234.56, 2)).toBe("1,234.56");
    });

    it("should use default 2 decimal places", () => {
      expect(TemplateHelpers.formatNumber(1234)).toBe("1,234.00");
    });
  });

  describe("sum", () => {
    it("should sum array of numbers", () => {
      expect(TemplateHelpers.sum([1, 2, 3, 4, 5])).toBe(15);
    });

    it("should return 0 for empty array", () => {
      expect(TemplateHelpers.sum([])).toBe(0);
    });
  });

  describe("avg", () => {
    it("should calculate average of numbers", () => {
      expect(TemplateHelpers.avg([10, 20, 30])).toBe(20);
    });

    it("should return 0 for empty array", () => {
      expect(TemplateHelpers.avg([])).toBe(0);
    });
  });

  describe("min", () => {
    it("should find minimum value", () => {
      expect(TemplateHelpers.min([5, 2, 8, 1, 9])).toBe(1);
    });

    it("should return 0 for empty array", () => {
      expect(TemplateHelpers.min([])).toBe(0);
    });
  });

  describe("max", () => {
    it("should find maximum value", () => {
      expect(TemplateHelpers.max([5, 2, 8, 1, 9])).toBe(9);
    });

    it("should return 0 for empty array", () => {
      expect(TemplateHelpers.max([])).toBe(0);
    });
  });

  describe("count", () => {
    it("should count array items", () => {
      expect(TemplateHelpers.count([1, 2, 3, 4, 5])).toBe(5);
    });

    it("should return 0 for empty array", () => {
      expect(TemplateHelpers.count([])).toBe(0);
    });
  });

  describe("truncate", () => {
    it("should truncate long strings", () => {
      expect(TemplateHelpers.truncate("Hello World", 8)).toBe("Hello...");
    });

    it("should not truncate short strings", () => {
      expect(TemplateHelpers.truncate("Hello", 10)).toBe("Hello");
    });

    it("should use custom suffix", () => {
      expect(TemplateHelpers.truncate("Hello World", 9, "…")).toBe("Hello Wo…");
    });
  });

  describe("padLeft", () => {
    it("should pad string on left", () => {
      expect(TemplateHelpers.padLeft("5", 3, "0")).toBe("005");
    });

    it("should not pad if already long enough", () => {
      expect(TemplateHelpers.padLeft("123", 3, "0")).toBe("123");
    });
  });

  describe("padRight", () => {
    it("should pad string on right", () => {
      expect(TemplateHelpers.padRight("5", 3, "0")).toBe("500");
    });
  });

  describe("upper", () => {
    it("should convert to uppercase", () => {
      expect(TemplateHelpers.upper("hello")).toBe("HELLO");
    });
  });

  describe("lower", () => {
    it("should convert to lowercase", () => {
      expect(TemplateHelpers.lower("HELLO")).toBe("hello");
    });
  });
});
