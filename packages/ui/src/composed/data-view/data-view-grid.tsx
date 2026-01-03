"use client";

import { Badge } from "@workspace/ui/components/badge";
import { Card, CardContent, CardHeader } from "@workspace/ui/components/card";
import { Checkbox } from "@workspace/ui/components/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { cn } from "@workspace/ui/lib/utils";
import { MoreHorizontal } from "lucide-react";
import * as React from "react";
import { useDataView } from "./context";
import type { FieldDef, RowAction } from "./types";

// ============================================================================
// DataViewGrid
// ============================================================================

interface DataViewGridProps<T = unknown> {
  className?: string;
  fields?: FieldDef<T>[];
  rowActions?: RowAction<T>[];
  cardRenderer?: (props: {
    row: T;
    fields: FieldDef<T>[];
    selected: boolean;
    onSelect: () => void;
  }) => React.ReactNode;
  columns?: 1 | 2 | 3 | 4 | 5 | 6;
}

export function DataViewGrid<T>({
  className,
  fields: overrideFields,
  rowActions: overrideRowActions,
  cardRenderer: overrideCardRenderer,
  columns = 3,
}: DataViewGridProps<T>) {
  const { config, paginatedData, loading, selectedIds, toggleRowSelection } =
    useDataView<T>();

  // Derive fields from columns if not provided
  const fields: FieldDef<T>[] = React.useMemo(() => {
    if (overrideFields) {
      return overrideFields;
    }
    if (config.fields) {
      return config.fields as FieldDef<T>[];
    }

    // Derive from columns
    return config.columns.map((col, index) => ({
      id: col.id,
      label: col.header,
      accessorKey: col.accessorKey as keyof T | undefined,
      accessorFn: col.accessorFn as ((row: T) => unknown) | undefined,
      ellipsis: col.ellipsis,
      primary: index === 0,
      secondary: index === 1,
      hideInGrid: col.hidden,
    }));
  }, [overrideFields, config.fields, config.columns]);

  const rowActions =
    overrideRowActions ?? (config.rowActions as RowAction<T>[] | undefined);
  const cardRenderer = overrideCardRenderer ?? config.gridCardRenderer;

  const visibleFields = fields.filter((field) => !field.hideInGrid);

  const gridCols = {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
    5: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
    6: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="text-muted-foreground">
          {config.loadingMessage ?? "Loading..."}
        </div>
      </div>
    );
  }

  if (paginatedData.length === 0) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="text-muted-foreground">
          {config.emptyMessage ?? "No data available"}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("grid gap-4", gridCols[columns], className)}>
      {paginatedData.map((row) => {
        const rowId = config.getRowId(row);
        const isSelected = selectedIds.has(rowId);

        if (cardRenderer) {
          return (
            <div key={rowId}>
              {cardRenderer({
                row,
                fields: visibleFields,
                selected: isSelected,
                onSelect: () => toggleRowSelection(rowId),
              })}
            </div>
          );
        }

        return (
          <GridCard
            cardClassName={config.gridCardClassName}
            fields={visibleFields}
            hoverable={config.hoverable}
            key={rowId}
            onSelect={() => toggleRowSelection(rowId)}
            row={row}
            rowActions={rowActions}
            selectable={config.selectable}
            selected={isSelected}
          />
        );
      })}
    </div>
  );
}

// ============================================================================
// GridCard
// ============================================================================

interface GridCardProps<T> {
  row: T;
  fields: FieldDef<T>[];
  rowActions?: RowAction<T>[];
  selected: boolean;
  onSelect: () => void;
  selectable?: boolean;
  hoverable?: boolean;
  cardClassName?: string;
}

function GridCard<T>({
  row,
  fields,
  rowActions,
  selected,
  onSelect,
  selectable,
  hoverable,
  cardClassName,
}: GridCardProps<T>) {
  const primaryField = fields.find((f) => f.primary);
  const secondaryField = fields.find((f) => f.secondary);
  const otherFields = fields.filter((f) => !(f.primary || f.secondary));

  const getFieldValue = (field: FieldDef<T>): unknown => {
    if (field.accessorFn) {
      return field.accessorFn(row);
    }
    if (field.accessorKey) {
      return (row as Record<string, unknown>)[field.accessorKey as string];
    }
    return null;
  };

  const renderFieldValue = (field: FieldDef<T>) => {
    const value = getFieldValue(field);

    if (field.render) {
      return field.render({ row, value });
    }

    if (field.type === "badge" && field.badgeVariants) {
      const variant = field.badgeVariants[String(value)];
      const safeVariant =
        variant === "success" || variant === "warning" ? "secondary" : variant;
      return <Badge variant={safeVariant ?? "default"}>{String(value)}</Badge>;
    }

    const content = String(value ?? "");
    const ellipsis = field.ellipsis !== false;

    if (ellipsis) {
      return (
        <span className="truncate" title={content}>
          {content}
        </span>
      );
    }

    return content;
  };

  return (
    <Card
      className={cn(
        "transition-all",
        hoverable !== false && "hover:border-primary/20 hover:shadow-md",
        selected && "ring-2 ring-primary",
        cardClassName
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-start gap-2">
            {selectable && (
              <Checkbox
                aria-label="Select item"
                checked={selected}
                className="mt-0.5"
                onCheckedChange={onSelect}
              />
            )}
            <div className="min-w-0 flex-1">
              {primaryField && (
                <div className="truncate font-semibold">
                  {renderFieldValue(primaryField)}
                </div>
              )}
              {secondaryField && (
                <div className="truncate text-muted-foreground text-sm">
                  {renderFieldValue(secondaryField)}
                </div>
              )}
            </div>
          </div>

          {rowActions && rowActions.length > 0 && (
            <GridCardActions actions={rowActions} row={row} />
          )}
        </div>
      </CardHeader>

      {otherFields.length > 0 && (
        <CardContent className="pt-0">
          <div className="space-y-1.5">
            {otherFields.slice(0, 4).map((field) => (
              <div
                className="flex items-center justify-between gap-2 text-sm"
                key={field.id}
              >
                <span className="shrink-0 text-muted-foreground">
                  {field.label}
                </span>
                <span className="truncate text-right">
                  {renderFieldValue(field)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ============================================================================
// Grid Card Actions
// ============================================================================

interface GridCardActionsProps<T> {
  row: T;
  actions: RowAction<T>[];
}

function GridCardActions<T>({ row, actions }: GridCardActionsProps<T>) {
  const visibleActions = actions.filter((action) => {
    if (typeof action.hidden === "function") {
      return !action.hidden(row);
    }
    return !action.hidden;
  });

  if (visibleActions.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="-mt-1 -mr-2 inline-flex size-8 shrink-0 items-center justify-center rounded-md font-medium text-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
        <MoreHorizontal className="size-4" />
        <span className="sr-only">Open menu</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {visibleActions.map((action, index) => {
          const isDisabled =
            typeof action.disabled === "function"
              ? action.disabled(row)
              : action.disabled;

          return (
            <React.Fragment key={action.id}>
              {index > 0 && action.variant === "destructive" && (
                <DropdownMenuSeparator />
              )}
              <DropdownMenuItem
                className={cn(
                  action.variant === "destructive" && "text-destructive"
                )}
                disabled={isDisabled}
                onClick={() => action.onAction(row)}
              >
                {action.icon && <action.icon className="size-4" />}
                {action.label}
              </DropdownMenuItem>
            </React.Fragment>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
