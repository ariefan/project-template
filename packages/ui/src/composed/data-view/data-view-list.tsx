"use client";

import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from "@workspace/ui/components/item";
import { cn } from "@workspace/ui/lib/utils";
import * as React from "react";
import { DataViewActionMenu } from "./action-menu";
import { ContentPlaceholder } from "./content-placeholder";
import { useDataView } from "./context";
import type { ColumnDef, FieldDef, RowAction } from "./types";
import {
  deriveFieldsFromColumns,
  filterVisibleActions,
  getFieldValue,
  isActionDisabled,
} from "./utils";

// ============================================================================
// Smart Field Detection
// ============================================================================

/**
 * Auto-detect primary (title) field from columns.
 * Priority: "title" > "name" > "label" > first non-ID column
 */
function detectPrimaryField<T>(
  columns: ColumnDef<T>[]
): ColumnDef<T> | undefined {
  const patterns = ["title", "name", "label", "subject"];
  for (const pattern of patterns) {
    const match = columns.find(
      (col) =>
        col.id.toLowerCase() === pattern ||
        String(col.accessorKey).toLowerCase() === pattern
    );
    if (match) {
      return match;
    }
  }
  // Fall back to first column that's not named exactly "id"
  return columns.find((col) => col.id.toLowerCase() !== "id");
}

// ============================================================================
// DataViewList
// ============================================================================

interface DataViewListProps<T = unknown> {
  className?: string;
  fields?: FieldDef<T>[];
  rowActions?: RowAction<T>[];
  itemRenderer?: (props: {
    row: T;
    fields: FieldDef<T>[];
    selected: boolean;
    onSelect: () => void;
  }) => React.ReactNode;
}

export function DataViewList<T>({
  className,
  fields: overrideFields,
  rowActions: overrideRowActions,
  itemRenderer: overrideItemRenderer,
}: DataViewListProps<T>) {
  const {
    config,
    paginatedData,
    loading,
    selectedIds,
    toggleRowSelection,
    columnVisibility,
  } = useDataView<T>();

  const fields: FieldDef<T>[] = React.useMemo(() => {
    if (overrideFields) {
      return overrideFields;
    }
    if (config.fields) {
      return config.fields as FieldDef<T>[];
    }
    return deriveFieldsFromColumns(
      config.columns,
      "hideInList"
    ) as FieldDef<T>[];
  }, [overrideFields, config.fields, config.columns]);

  // Smart detection - only need primary field
  const primaryField = React.useMemo(
    () => detectPrimaryField(config.columns as ColumnDef<T>[]),
    [config.columns]
  );

  const rowActions =
    overrideRowActions ?? (config.rowActions as RowAction<T>[] | undefined);
  const itemRenderer = overrideItemRenderer ?? config.listItemRenderer;

  // Filter fields based on visibility settings
  const visibleFields = React.useMemo(() => {
    return fields.filter((field) => {
      // If configured to hide in list specifically, always hide
      if (field.hideInList) {
        return false;
      }

      // Check column visibility state (if undefined, default to true unless hidden by default)
      if (columnVisibility[field.id] !== undefined) {
        return columnVisibility[field.id];
      }

      return true;
    });
  }, [fields, columnVisibility]);

  if (loading || paginatedData.length === 0) {
    return (
      <ContentPlaceholder
        emptyMessage={config.emptyMessage}
        isEmpty={paginatedData.length === 0}
        loading={loading}
        loadingMessage={config.loadingMessage}
        viewMode="list"
      />
    );
  }

  return (
    <ItemGroup className={className}>
      {paginatedData.map((row, index) => {
        const rowId = config.getRowId(row);
        const isSelected = selectedIds.has(rowId);

        if (itemRenderer) {
          return (
            <React.Fragment key={rowId}>
              {itemRenderer({
                row,
                fields: visibleFields,
                selected: isSelected,
                onSelect: () => toggleRowSelection(rowId),
              })}
              {index !== paginatedData.length - 1 && <ItemSeparator />}
            </React.Fragment>
          );
        }

        return (
          <React.Fragment key={rowId}>
            <SmartListItem
              columns={config.columns.filter((col) =>
                visibleFields.some((f) => f.id === col.id)
              )}
              dense={config.dense}
              hoverable={config.hoverable}
              onSelect={() => toggleRowSelection(rowId)}
              primaryField={primaryField}
              row={row}
              rowActions={rowActions}
              selectable={config.selectable}
              selected={isSelected}
            />
            {index !== paginatedData.length - 1 && <ItemSeparator />}
          </React.Fragment>
        );
      })}
    </ItemGroup>
  );
}

// ============================================================================
// SmartListItem
// ============================================================================

interface SmartListItemProps<T> {
  row: T;
  columns: ColumnDef<T>[];
  primaryField: ColumnDef<T> | undefined;
  rowActions?: RowAction<T>[];
  selected: boolean;
  onSelect: () => void;
  selectable?: boolean;
  dense?: boolean;
  hoverable?: boolean;
}

function SmartListItem<T>({
  row,
  columns,
  primaryField,
  rowActions,
  selected,
  onSelect,
  selectable,
  dense,
  hoverable,
}: SmartListItemProps<T>) {
  // Get value from column
  const getValue = (col: ColumnDef<T>) =>
    getFieldValue(row, { accessorKey: col.accessorKey as keyof T });

  // Use column's cell renderer if available
  const renderCellValue = (
    col: ColumnDef<T>,
    value: unknown
  ): React.ReactNode => {
    if (col.cell) {
      return col.cell({ row, value });
    }
    return String(value ?? "");
  };

  const primaryValue = primaryField ? getValue(primaryField) : undefined;

  // All other visible columns (excluding primary and exact "id" column)
  const otherColumns = columns.filter(
    (col) =>
      col.id !== primaryField?.id &&
      col.id.toLowerCase() !== "id" &&
      !col.hidden
  );

  // Actions
  const renderActions = () => {
    if (!rowActions?.length) {
      return null;
    }
    const visible = filterVisibleActions(rowActions, row);
    const inline = visible.filter((a) => a.inline);
    const menu = visible.filter((a) => !a.inline);

    return (
      <div className="flex items-center gap-1">
        {inline.map((action) => (
          <Button
            className="size-8"
            disabled={isActionDisabled(action, row)}
            key={action.id}
            onClick={() => action.onAction(row)}
            size="icon"
            title={action.label}
            variant="ghost"
          >
            {action.icon && (
              <action.icon
                className={cn(
                  "size-4",
                  action.variant === "destructive" && "text-destructive"
                )}
              />
            )}
          </Button>
        ))}
        {menu.length > 0 && (
          <DataViewActionMenu
            actions={menu}
            row={row}
            triggerVariant="button"
          />
        )}
      </div>
    );
  };

  return (
    <Item
      className={cn(
        hoverable !== false && "hover:bg-primary/5",
        selected && "bg-primary/10",
        "flex-nowrap items-start"
      )}
      size={dense ? "sm" : "default"}
    >
      {selectable && (
        <ItemMedia>
          <Checkbox
            aria-label="Select item"
            checked={selected}
            onCheckedChange={onSelect}
          />
        </ItemMedia>
      )}

      <ItemContent className="min-w-0 flex-1 gap-1 overflow-hidden">
        {/* Title: Only primary field */}
        {!!primaryValue && (
          <ItemTitle className="w-full">
            <span className="block truncate font-medium">
              {String(primaryValue)}
            </span>
          </ItemTitle>
        )}

        {/* Description: All other fields (using div to allow block content from cell renderers) */}
        {otherColumns.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 overflow-hidden text-muted-foreground text-sm">
            {otherColumns.map((col) => {
              const value = getValue(col);
              if (value === undefined || value === null) {
                return null;
              }
              return (
                <span
                  className="inline-flex max-w-full items-center gap-1"
                  key={col.id}
                >
                  <span className="shrink-0 text-muted-foreground">
                    {col.header}:
                  </span>
                  <span className="truncate">
                    {renderCellValue(col, value)}
                  </span>
                </span>
              );
            })}
          </div>
        )}
      </ItemContent>

      {rowActions?.length && (
        <ItemActions className="shrink-0">{renderActions()}</ItemActions>
      )}
    </Item>
  );
}
