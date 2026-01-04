"use client";

import { Card, CardContent, CardHeader } from "@workspace/ui/components/card";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { cn } from "@workspace/ui/lib/utils";
import * as React from "react";
import { DataViewActionMenu } from "./action-menu";
import { ContentPlaceholder } from "./content-placeholder";
import { useDataView } from "./context";
import type { FieldDef, RowAction } from "./types";
import {
  deriveFieldsFromColumns,
  getFieldValue,
  renderFieldContent,
} from "./utils";

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
    return deriveFieldsFromColumns(
      config.columns,
      "hideInGrid"
    ) as FieldDef<T>[];
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

  // Use ContentPlaceholder for loading/empty states
  if (loading || paginatedData.length === 0) {
    return (
      <ContentPlaceholder
        emptyMessage={config.emptyMessage}
        isEmpty={paginatedData.length === 0}
        loading={loading}
        loadingMessage={config.loadingMessage}
      />
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

  const renderField = (field: FieldDef<T>) => {
    const value = getFieldValue(row, field);
    return renderFieldContent({
      row,
      value,
      render: field.render,
      ellipsis: field.ellipsis,
      type: field.type,
      badgeVariants: field.badgeVariants,
    });
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
                  {renderField(primaryField)}
                </div>
              )}
              {secondaryField && (
                <div className="truncate text-muted-foreground text-sm">
                  {renderField(secondaryField)}
                </div>
              )}
            </div>
          </div>

          {rowActions && rowActions.length > 0 && (
            <DataViewActionMenu
              actions={rowActions}
              row={row}
              triggerClassName="-mt-1 -mr-2 shrink-0"
              triggerVariant="icon"
            />
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
                  {renderField(field)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
