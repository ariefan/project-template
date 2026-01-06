/**
 * Template Helpers
 *
 * Custom helpers for Eta templates
 */

import { format as formatDate } from "date-fns";

/**
 * Available template helpers
 */
export const TemplateHelpers = {
  /**
   * Format a number with locale-specific formatting
   */
  formatNumber: (value: unknown, decimals = 2): string => {
    const num = Number(value);
    if (Number.isNaN(num)) {
      return String(value);
    }
    return num.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  },

  /**
   * Format a value as currency
   */
  formatCurrency: (value: unknown, currency = "USD"): string => {
    const num = Number(value);
    if (Number.isNaN(num)) {
      return String(value);
    }
    return num.toLocaleString("en-US", {
      style: "currency",
      currency,
    });
  },

  /**
   * Format a date with a pattern
   */
  formatDate: (value: unknown, pattern = "yyyy-MM-dd"): string => {
    const date = value instanceof Date ? value : new Date(String(value));
    if (Number.isNaN(date.getTime())) {
      return String(value);
    }
    return formatDate(date, pattern);
  },

  /**
   * Format a date and time
   */
  formatDateTime: (value: unknown, pattern = "yyyy-MM-dd HH:mm:ss"): string => {
    return TemplateHelpers.formatDate(value, pattern);
  },

  /**
   * Format a value as percentage
   */
  formatPercentage: (value: unknown, decimals = 2): string => {
    const num = Number(value);
    if (Number.isNaN(num)) {
      return String(value);
    }
    return `${(num * 100).toFixed(decimals)}%`;
  },

  /**
   * Format a boolean value
   */
  formatBoolean: (
    value: unknown,
    trueLabel = "Yes",
    falseLabel = "No"
  ): string => {
    return value ? trueLabel : falseLabel;
  },

  /**
   * Sum an array of numbers
   */
  sum: (arr: unknown[]): number => {
    return arr.reduce((acc: number, val) => acc + Number(val), 0);
  },

  /**
   * Calculate average of an array
   */
  avg: (arr: unknown[]): number => {
    if (arr.length === 0) {
      return 0;
    }
    return TemplateHelpers.sum(arr) / arr.length;
  },

  /**
   * Find minimum value in array
   */
  min: (arr: unknown[]): number => {
    const nums = arr.map(Number).filter((n) => !Number.isNaN(n));
    return nums.length > 0 ? Math.min(...nums) : 0;
  },

  /**
   * Find maximum value in array
   */
  max: (arr: unknown[]): number => {
    const nums = arr.map(Number).filter((n) => !Number.isNaN(n));
    return nums.length > 0 ? Math.max(...nums) : 0;
  },

  /**
   * Count items in array
   */
  count: (arr: unknown[]): number => {
    return arr.length;
  },

  /**
   * Group array by property
   */
  groupBy: <T>(arr: T[], key: keyof T): Record<string, T[]> => {
    return arr.reduce(
      (groups, item) => {
        const groupKey = String(item[key]);
        if (!groups[groupKey]) {
          groups[groupKey] = [];
        }
        groups[groupKey].push(item);
        return groups;
      },
      {} as Record<string, T[]>
    );
  },

  /**
   * Sort array by property
   */
  sortBy: <T>(
    arr: T[],
    key: keyof T,
    direction: "asc" | "desc" = "asc"
  ): T[] => {
    const sorted = [...arr].sort((a, b) => {
      const aVal = a[key];
      const bVal = b[key];
      if (aVal < bVal) {
        return -1;
      }
      if (aVal > bVal) {
        return 1;
      }
      return 0;
    });
    return direction === "desc" ? sorted.reverse() : sorted;
  },

  /**
   * Pad a string to a specific length
   */
  padLeft: (value: unknown, length: number, char = " "): string => {
    return String(value).padStart(length, char);
  },

  /**
   * Pad a string to a specific length
   */
  padRight: (value: unknown, length: number, char = " "): string => {
    return String(value).padEnd(length, char);
  },

  /**
   * Truncate a string
   */
  truncate: (value: unknown, length: number, suffix = "..."): string => {
    const str = String(value);
    if (str.length <= length) {
      return str;
    }
    return `${str.substring(0, length - suffix.length)}${suffix}`;
  },

  /**
   * Uppercase a string
   */
  upper: (value: unknown): string => {
    return String(value).toUpperCase();
  },

  /**
   * Lowercase a string
   */
  lower: (value: unknown): string => {
    return String(value).toLowerCase();
  },

  /**
   * Capitalize first letter
   */
  capitalize: (value: unknown): string => {
    const str = String(value);
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  },

  /**
   * Repeat a string n times
   */
  repeat: (value: unknown, times: number): string => {
    return String(value).repeat(times);
  },

  /**
   * Check if value is empty/null/undefined
   */
  isEmpty: (value: unknown): boolean => {
    if (value === null || value === undefined) {
      return true;
    }
    if (typeof value === "string") {
      return value.length === 0;
    }
    if (Array.isArray(value)) {
      return value.length === 0;
    }
    if (typeof value === "object") {
      return Object.keys(value).length === 0;
    }
    return false;
  },

  /**
   * Return default value if empty
   */
  defaultValue: <T>(value: T | null | undefined, defaultVal: T): T => {
    return value ?? defaultVal;
  },
};

export type TemplateHelpersType = typeof TemplateHelpers;
