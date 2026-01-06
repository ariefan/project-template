import { describe, expect, it } from "vitest";
import {
  formatByType,
  formatValue,
  getAccessor,
  getNestedValue,
} from "../exporters/utils";
import type { ColumnConfig } from "../types";

describe("getNestedValue", () => {
  const testObj = {
    name: "John",
    address: {
      city: "New York",
      zip: "10001",
      coordinates: {
        lat: 40.7128,
        lng: -74.006,
      },
    },
    tags: ["developer", "designer"],
  };

  it("should get top-level value", () => {
    expect(getNestedValue(testObj, "name")).toBe("John");
  });

  it("should get nested value with dot notation", () => {
    expect(getNestedValue(testObj, "address.city")).toBe("New York");
  });

  it("should get deeply nested value", () => {
    expect(getNestedValue(testObj, "address.coordinates.lat")).toBe(40.7128);
  });

  it("should return undefined for non-existent path", () => {
    expect(getNestedValue(testObj, "nonexistent")).toBeUndefined();
    expect(getNestedValue(testObj, "address.country")).toBeUndefined();
  });

  it("should handle null objects", () => {
    expect(getNestedValue(null, "name")).toBeUndefined();
  });

  it("should handle undefined objects", () => {
    expect(getNestedValue(undefined, "name")).toBeUndefined();
  });
});

describe("getAccessor", () => {
  interface TestRow {
    id: number;
    user: { name: string; email: string };
  }

  const testRow: TestRow = {
    id: 1,
    user: { name: "John", email: "john@test.com" },
  };

  it("should use accessorKey when provided", () => {
    const col: ColumnConfig = {
      id: "id",
      header: "ID",
      accessorKey: "id",
    };
    const accessor = getAccessor<TestRow>(col);
    expect(accessor(testRow)).toBe(1);
  });

  it("should support nested accessorKey", () => {
    const col: ColumnConfig = {
      id: "userName",
      header: "User Name",
      accessorKey: "user.name",
    };
    const accessor = getAccessor<TestRow>(col);
    expect(accessor(testRow)).toBe("John");
  });

  it("should fall back to id when no accessorKey", () => {
    const col: ColumnConfig = {
      id: "id",
      header: "ID",
    };
    const accessor = getAccessor<TestRow>(col);
    expect(accessor(testRow)).toBe(1);
  });
});

describe("formatByType", () => {
  describe("text format", () => {
    it("should return string as-is", () => {
      expect(formatByType("hello", "text")).toBe("hello");
    });

    it("should convert non-string to string", () => {
      expect(formatByType(123, "text")).toBe("123");
      expect(formatByType(true, "text")).toBe("true");
    });
  });

  describe("number format", () => {
    it("should format number with locale separators", () => {
      expect(formatByType(1_234_567, "number")).toBe("1,234,567");
    });

    it("should handle decimal numbers", () => {
      expect(formatByType(1234.56, "number")).toBe("1,234.56");
    });

    it("should handle zero", () => {
      expect(formatByType(0, "number")).toBe("0");
    });

    it("should return string for NaN", () => {
      expect(formatByType("not-a-number", "number")).toBe("not-a-number");
    });
  });

  describe("currency format", () => {
    it("should format as USD by default", () => {
      expect(formatByType(1234.56, "currency")).toBe("$1,234.56");
    });

    it("should handle zero", () => {
      expect(formatByType(0, "currency")).toBe("$0.00");
    });

    it("should handle negative amounts", () => {
      expect(formatByType(-100, "currency")).toBe("-$100.00");
    });
  });

  describe("date format", () => {
    it("should format Date object", () => {
      const date = new Date("2024-03-15T00:00:00Z");
      expect(formatByType(date, "date")).toBe("2024-03-15");
    });

    it("should format ISO string", () => {
      expect(formatByType("2024-03-15T12:00:00Z", "date")).toBe("2024-03-15");
    });

    it("should use custom pattern", () => {
      const date = new Date("2024-03-15T00:00:00Z");
      expect(formatByType(date, "date", "MM/dd/yyyy")).toBe("03/15/2024");
    });
  });

  describe("datetime format", () => {
    it("should format with time", () => {
      const date = new Date("2024-03-15T14:30:45Z");
      const result = formatByType(date, "datetime");
      expect(result).toContain("2024-03-15");
      expect(result).toMatch(/\d{2}:\d{2}:\d{2}/);
    });
  });

  describe("boolean format", () => {
    it("should return Yes for truthy", () => {
      expect(formatByType(true, "boolean")).toBe("Yes");
      expect(formatByType(1, "boolean")).toBe("Yes");
      expect(formatByType("yes", "boolean")).toBe("Yes");
    });

    it("should return No for falsy", () => {
      expect(formatByType(false, "boolean")).toBe("No");
      expect(formatByType(0, "boolean")).toBe("No");
      expect(formatByType("", "boolean")).toBe("No");
    });
  });

  describe("percentage format", () => {
    it("should format as percentage", () => {
      expect(formatByType(0.5, "percentage")).toBe("50.00%");
      expect(formatByType(0.1234, "percentage")).toBe("12.34%");
      expect(formatByType(1, "percentage")).toBe("100.00%");
    });

    it("should handle zero", () => {
      expect(formatByType(0, "percentage")).toBe("0.00%");
    });
  });
});

describe("formatValue", () => {
  it("should return empty string for null", () => {
    const col: ColumnConfig = { id: "test", header: "Test" };
    expect(formatValue(null, col)).toBe("");
  });

  it("should return empty string for undefined", () => {
    const col: ColumnConfig = { id: "test", header: "Test" };
    expect(formatValue(undefined, col)).toBe("");
  });

  it("should use column format", () => {
    const col: ColumnConfig = {
      id: "price",
      header: "Price",
      format: "currency",
    };
    expect(formatValue(99.99, col)).toBe("$99.99");
  });

  it("should use format pattern", () => {
    const col: ColumnConfig = {
      id: "date",
      header: "Date",
      format: "date",
      formatPattern: "dd/MM/yyyy",
    };
    expect(formatValue(new Date("2024-03-15"), col)).toBe("15/03/2024");
  });

  it("should default to text format", () => {
    const col: ColumnConfig = { id: "name", header: "Name" };
    expect(formatValue("John Doe", col)).toBe("John Doe");
  });
});
