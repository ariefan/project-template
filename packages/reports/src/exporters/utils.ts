/**
 * Shared utilities for exporters
 */

import { format as formatDate } from "date-fns";
import type { ColumnConfig, ColumnFormat } from "../types";

/**
 * Get accessor function from column config
 */
export function getAccessor<T>(col: ColumnConfig): (row: T) => unknown {
  if (col.accessorKey) {
    return (row: T) => getNestedValue(row, col.accessorKey as string);
  }
  if (col.accessorFn) {
    // Safe evaluation of accessor function
    const fn = new Function("row", `return ${col.accessorFn}`);
    return (row: T) => fn(row);
  }
  return (row: T) => getNestedValue(row, col.id);
}

/**
 * Get nested value from object using dot notation
 */
export function getNestedValue(obj: unknown, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * Format value based on column configuration
 */
export function formatValue(value: unknown, col: ColumnConfig): string {
  if (value === null || value === undefined) {
    return "";
  }

  const format = col.format ?? "text";
  const pattern = col.formatPattern;

  return formatByType(value, format, pattern);
}

/**
 * Format value by type
 */
export function formatByType(
  value: unknown,
  format: ColumnFormat,
  pattern?: string
): string {
  switch (format) {
    case "number":
      return formatNumber(value);
    case "currency":
      return formatCurrency(value, pattern);
    case "date":
      return formatDateValue(value, pattern ?? "yyyy-MM-dd");
    case "datetime":
      return formatDateValue(value, pattern ?? "yyyy-MM-dd HH:mm:ss");
    case "boolean":
      return formatBoolean(value);
    case "percentage":
      return formatPercentage(value);
    default:
      return String(value);
  }
}

function formatNumber(value: unknown): string {
  const num = Number(value);
  if (Number.isNaN(num)) {
    return String(value);
  }
  return num.toLocaleString("en-US");
}

function formatCurrency(value: unknown, currencyCode?: string): string {
  const num = Number(value);
  if (Number.isNaN(num)) {
    return String(value);
  }
  return num.toLocaleString("en-US", {
    style: "currency",
    currency: currencyCode ?? "USD",
  });
}

function formatDateValue(value: unknown, pattern: string): string {
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return formatDate(date, pattern);
}

function formatBoolean(value: unknown): string {
  return value ? "Yes" : "No";
}

function formatPercentage(value: unknown): string {
  const num = Number(value);
  if (Number.isNaN(num)) {
    return String(value);
  }
  return `${(num * 100).toFixed(2)}%`;
}
