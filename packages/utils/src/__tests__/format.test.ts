import { describe, expect, it } from "vitest";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  slugify,
  truncate,
} from "../format.js";

// Top-level regex patterns for date matching
const MARCH_15_2024_LONG = /March 15, 2024/;
const MARCH_15_2024_SHORT = /Mar 15, 2024/;
const TIME_PATTERN = /\d{1,2}:\d{2}/;

describe("format utilities", () => {
  describe("formatDate", () => {
    it("should format Date object to readable string", () => {
      const date = new Date("2024-03-15T12:00:00Z");
      const result = formatDate(date);
      expect(result).toMatch(MARCH_15_2024_LONG);
    });

    it("should format ISO string to readable string", () => {
      const result = formatDate("2024-03-15T12:00:00Z");
      expect(result).toMatch(MARCH_15_2024_LONG);
    });

    it("should accept custom format options", () => {
      const date = new Date("2024-03-15T12:00:00Z");
      const result = formatDate(date, { month: "short" });
      expect(result).toMatch(MARCH_15_2024_SHORT);
    });
  });

  describe("formatDateTime", () => {
    it("should format Date object with time", () => {
      const date = new Date("2024-03-15T14:30:00Z");
      const result = formatDateTime(date);
      expect(result).toMatch(MARCH_15_2024_SHORT);
      expect(result).toMatch(TIME_PATTERN);
    });

    it("should format ISO string with time", () => {
      const result = formatDateTime("2024-03-15T14:30:00Z");
      expect(result).toMatch(MARCH_15_2024_SHORT);
    });

    it("should accept custom format options", () => {
      const date = new Date("2024-03-15T14:30:00Z");
      const result = formatDateTime(date, { hour12: false });
      expect(result).toMatch(MARCH_15_2024_SHORT);
    });
  });

  describe("formatCurrency", () => {
    it("should format USD by default", () => {
      const result = formatCurrency(1234.56);
      expect(result).toBe("$1,234.56");
    });

    it("should format different currencies", () => {
      expect(formatCurrency(1234.56, "EUR", "de-DE")).toBe("1.234,56\u00A0€");
      expect(formatCurrency(1234.56, "GBP")).toBe("£1,234.56");
    });

    it("should handle zero", () => {
      expect(formatCurrency(0)).toBe("$0.00");
    });

    it("should handle negative amounts", () => {
      expect(formatCurrency(-100)).toBe("-$100.00");
    });

    it("should handle large numbers", () => {
      expect(formatCurrency(1_000_000)).toBe("$1,000,000.00");
    });
  });

  describe("formatNumber", () => {
    it("should format number with default locale", () => {
      expect(formatNumber(1_234_567.89)).toBe("1,234,567.89");
    });

    it("should accept custom options", () => {
      expect(
        formatNumber(0.1234, { style: "percent", maximumFractionDigits: 1 })
      ).toBe("12.3%");
    });

    it("should handle different locales", () => {
      expect(formatNumber(1234.56, undefined, "de-DE")).toBe("1.234,56");
    });

    it("should handle integers", () => {
      expect(formatNumber(1000)).toBe("1,000");
    });
  });

  describe("slugify", () => {
    it("should convert text to lowercase", () => {
      expect(slugify("Hello World")).toBe("hello-world");
    });

    it("should replace spaces with hyphens", () => {
      expect(slugify("foo bar baz")).toBe("foo-bar-baz");
    });

    it("should remove special characters", () => {
      expect(slugify("Hello! World?")).toBe("hello-world");
    });

    it("should handle multiple spaces and dashes", () => {
      expect(slugify("foo   bar--baz")).toBe("foo-bar-baz");
    });

    it("should trim leading and trailing spaces", () => {
      expect(slugify("  hello world  ")).toBe("hello-world");
    });

    it("should remove leading and trailing hyphens", () => {
      expect(slugify("-hello-world-")).toBe("hello-world");
    });

    it("should handle underscores", () => {
      expect(slugify("hello_world")).toBe("hello-world");
    });

    it("should handle empty string", () => {
      expect(slugify("")).toBe("");
    });

    it("should handle string with only special characters", () => {
      expect(slugify("!@#$%")).toBe("");
    });
  });

  describe("truncate", () => {
    it("should not truncate text shorter than length", () => {
      expect(truncate("hello", 10)).toBe("hello");
    });

    it("should truncate text longer than length", () => {
      expect(truncate("hello world", 8)).toBe("hello...");
    });

    it("should use custom suffix", () => {
      expect(truncate("hello world", 9, "…")).toBe("hello wo…");
    });

    it("should handle exact length match", () => {
      expect(truncate("hello", 5)).toBe("hello");
    });

    it("should handle empty string", () => {
      expect(truncate("", 10)).toBe("");
    });

    it("should handle suffix longer than remaining space", () => {
      expect(truncate("hi", 5, "...")).toBe("hi");
    });
  });
});
