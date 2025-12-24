import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getEnv, getEnvBoolean, getEnvNumber } from "../env.js";

describe("env utilities", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("getEnv", () => {
    it("should return environment variable value when set", () => {
      process.env.TEST_VAR = "test-value";
      expect(getEnv("TEST_VAR")).toBe("test-value");
    });

    it("should return default value when env var is not set", () => {
      expect(getEnv("MISSING_VAR", "default")).toBe("default");
    });

    it("should throw error when env var is missing and no default provided", () => {
      expect(() => getEnv("MISSING_VAR")).toThrow(
        "Missing environment variable: MISSING_VAR"
      );
    });

    it("should return empty string when env var is set to empty", () => {
      process.env.EMPTY_VAR = "";
      expect(getEnv("EMPTY_VAR")).toBe("");
    });
  });

  describe("getEnvNumber", () => {
    it("should parse integer environment variable", () => {
      process.env.PORT = "3000";
      expect(getEnvNumber("PORT")).toBe(3000);
    });

    it("should parse float environment variable", () => {
      process.env.RATE = "1.5";
      expect(getEnvNumber("RATE")).toBe(1.5);
    });

    it("should return default value when env var is not set", () => {
      expect(getEnvNumber("MISSING_PORT", 8080)).toBe(8080);
    });

    it("should throw error when env var is missing and no default provided", () => {
      expect(() => getEnvNumber("MISSING_PORT")).toThrow(
        "Missing environment variable: MISSING_PORT"
      );
    });

    it("should throw error when env var is not a valid number", () => {
      process.env.INVALID_NUM = "not-a-number";
      expect(() => getEnvNumber("INVALID_NUM")).toThrow(
        "Environment variable INVALID_NUM is not a valid number: not-a-number"
      );
    });

    it("should parse negative numbers", () => {
      process.env.NEGATIVE = "-42";
      expect(getEnvNumber("NEGATIVE")).toBe(-42);
    });

    it("should parse zero", () => {
      process.env.ZERO = "0";
      expect(getEnvNumber("ZERO")).toBe(0);
    });
  });

  describe("getEnvBoolean", () => {
    it("should return true for 'true' string", () => {
      process.env.ENABLED = "true";
      expect(getEnvBoolean("ENABLED")).toBe(true);
    });

    it("should return true for '1' string", () => {
      process.env.ENABLED = "1";
      expect(getEnvBoolean("ENABLED")).toBe(true);
    });

    it("should return false for 'false' string", () => {
      process.env.ENABLED = "false";
      expect(getEnvBoolean("ENABLED")).toBe(false);
    });

    it("should return false for '0' string", () => {
      process.env.ENABLED = "0";
      expect(getEnvBoolean("ENABLED")).toBe(false);
    });

    it("should return false for any other string", () => {
      process.env.ENABLED = "yes";
      expect(getEnvBoolean("ENABLED")).toBe(false);
    });

    it("should return default value when env var is not set", () => {
      expect(getEnvBoolean("MISSING_BOOL", true)).toBe(true);
      expect(getEnvBoolean("MISSING_BOOL", false)).toBe(false);
    });

    it("should throw error when env var is missing and no default provided", () => {
      expect(() => getEnvBoolean("MISSING_BOOL")).toThrow(
        "Missing environment variable: MISSING_BOOL"
      );
    });
  });
});
