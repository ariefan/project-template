import { Badge } from "@workspace/ui/components/badge";
import type * as React from "react";
import type { ColumnDef, FieldDef, RowAction } from "./types";

// ============================================================================
// Field Value Extraction
// ============================================================================

/**
 * Get the value from a row using either accessorFn or accessorKey
 * Works with both ColumnDef and FieldDef
 */
export function getFieldValue<T>(
  row: T,
  field: { accessorFn?: (row: T) => unknown; accessorKey?: keyof T }
): unknown {
  if (field.accessorFn) {
    return field.accessorFn(row);
  }
  if (field.accessorKey) {
    return (row as Record<string, unknown>)[field.accessorKey as string];
  }
  return null;
}

// ============================================================================
// Field Content Rendering
// ============================================================================

interface RenderFieldContentOptions<T> {
  row: T;
  value: unknown;
  render?: (props: { row: T; value: unknown }) => React.ReactNode;
  ellipsis?: boolean;
  type?: "text" | "number" | "date" | "badge" | "image" | "custom";
  badgeVariants?: Record<
    string,
    "default" | "secondary" | "destructive" | "outline" | "success" | "warning"
  >;
}

/**
 * Render field content with optional badge, ellipsis, and custom render support
 */
export function renderFieldContent<T>(
  options: RenderFieldContentOptions<T>
): React.ReactNode {
  const { row, value, render, ellipsis = true, type, badgeVariants } = options;

  if (render) {
    return render({ row, value });
  }

  if (type === "badge" && badgeVariants) {
    const variant = badgeVariants[String(value)];
    const safeVariant =
      variant === "success" || variant === "warning" ? "secondary" : variant;
    return <Badge variant={safeVariant ?? "default"}>{String(value)}</Badge>;
  }

  const content = String(value ?? "");

  if (ellipsis) {
    return (
      <span
        className="inline-block max-w-full truncate align-bottom"
        title={content}
      >
        {content}
      </span>
    );
  }

  return content;
}

// ============================================================================
// Action Visibility Filtering
// ============================================================================

/**
 * Filter actions based on hidden property (static or function)
 */
export function filterVisibleActions<T>(
  actions: RowAction<T>[],
  row: T
): RowAction<T>[] {
  return actions.filter((action) => {
    if (typeof action.hidden === "function") {
      return !action.hidden(row);
    }
    return !action.hidden;
  });
}

/**
 * Check if an action is disabled (static or function)
 */
export function isActionDisabled<T>(action: RowAction<T>, row: T): boolean {
  if (typeof action.disabled === "function") {
    return action.disabled(row);
  }
  return action.disabled ?? false;
}

// ============================================================================
// Field Derivation from Columns
// ============================================================================

/**
 * Derive FieldDef array from ColumnDef array
 * Used when fields are not explicitly provided for list/grid views
 */
export function deriveFieldsFromColumns<T>(
  columns: ColumnDef<T>[],
  hideKey: "hideInList" | "hideInGrid"
): FieldDef<T>[] {
  return columns.map((col, index) => ({
    id: col.id,
    label: col.header,
    accessorKey: col.accessorKey as keyof T | undefined,
    accessorFn: col.accessorFn as ((row: T) => unknown) | undefined,
    ellipsis: col.ellipsis,
    primary: index === 0,
    secondary: index === 1,
    [hideKey]: col.hidden,
  }));
}
