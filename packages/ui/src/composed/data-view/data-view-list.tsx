"use client";

import { Badge } from "@workspace/ui/components/badge";
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
      hideInList: col.hidden,
    }));
  }, [overrideFields, config.fields, config.columns]);

  const rowActions =
    overrideRowActions ?? (config.rowActions as RowAction<T>[] | undefined);
  const itemRenderer = overrideItemRenderer ?? config.listItemRenderer;

  const visibleFields = fields.filter((field) => !field.hideInList);

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
    <div className={cn("space-y-2", className)}>
      {paginatedData.map((row) => {
        const rowId = config.getRowId(row);
        const isSelected = selectedIds.has(rowId);

        if (itemRenderer) {
          return (
            <div key={rowId}>
              {itemRenderer({
                row,
                fields: visibleFields,
                selected: isSelected,
                onSelect: () => toggleRowSelection(rowId),
              })}
            </div>
          );
        }

        return (
          <ListItem
            dense={config.dense}
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
// ListItem
// ============================================================================

interface ListItemProps<T> {
  row: T;
  fields: FieldDef<T>[];
  rowActions?: RowAction<T>[];
  selected: boolean;
  onSelect: () => void;
  selectable?: boolean;
  dense?: boolean;
  hoverable?: boolean;
}

function ListItem<T>({
  row,
  fields,
  rowActions,
  selected,
  onSelect,
  selectable,
  dense,
  hoverable,
}: ListItemProps<T>) {
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
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border bg-card p-3",
        "transition-colors",
        hoverable !== false && "hover:bg-muted/50",
        selected && "bg-muted ring-1 ring-primary",
        dense && "p-2"
      )}
    >
      {selectable && (
        <Checkbox
          aria-label="Select item"
          checked={selected}
          onCheckedChange={onSelect}
        />
      )}

      <div className="min-w-0 flex-1 space-y-1">
        {/* Primary & Secondary */}
        <div className="flex items-center gap-2">
          {primaryField && (
            <div className="truncate font-medium">
              {renderFieldValue(primaryField)}
            </div>
          )}
          {secondaryField && (
            <div className="truncate text-muted-foreground text-sm">
              {renderFieldValue(secondaryField)}
            </div>
          )}
        </div>

        {/* Other fields */}
        {otherFields.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground text-sm">
            {otherFields.slice(0, 4).map((field) => (
              <div className="flex items-center gap-1" key={field.id}>
                <span className="text-xs opacity-70">{field.label}:</span>
                {renderFieldValue(field)}
              </div>
            ))}
          </div>
        )}
      </div>

      {rowActions && rowActions.length > 0 && (
        <ListItemActions actions={rowActions} row={row} />
      )}
    </div>
  );
}

// ============================================================================
// List Item Actions
// ============================================================================

interface ListItemActionsProps<T> {
  row: T;
  actions: RowAction<T>[];
}

function ListItemActions<T>({ row, actions }: ListItemActionsProps<T>) {
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
      <DropdownMenuTrigger className="inline-flex size-8 shrink-0 items-center justify-center rounded-md font-medium text-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
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
