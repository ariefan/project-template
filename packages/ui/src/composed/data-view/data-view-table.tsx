"use client";

import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { cn } from "@workspace/ui/lib/utils";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import * as React from "react";
import { DataViewActionMenu } from "./action-menu";
import { ContentPlaceholder } from "./content-placeholder";
import { useDataView } from "./context";
import type { ColumnDef, RowAction } from "./types";
import { filterVisibleActions, getFieldValue, isActionDisabled } from "./utils";

// ============================================================================
// Table Components
// ============================================================================

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div className="relative w-full overflow-auto">
      <table
        className={cn("w-full caption-bottom text-sm", className)}
        data-slot="table"
        {...props}
      />
    </div>
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      className={cn("[&_tr]:border-b", className)}
      data-slot="table-header"
      {...props}
    />
  );
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      className={cn("[&_tr:last-child]:border-0", className)}
      data-slot="table-body"
      {...props}
    />
  );
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      className={cn("border-b transition-colors hover:bg-muted/50", className)}
      data-slot="table-row"
      {...props}
    />
  );
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      className={cn(
        "h-10 px-3 text-left align-middle font-medium text-muted-foreground text-xs uppercase tracking-wider first:pl-4 last:pr-4 [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className
      )}
      data-slot="table-head"
      {...props}
    />
  );
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      className={cn(
        "p-3 align-middle first:pl-4 last:pr-4 [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className
      )}
      data-slot="table-cell"
      {...props}
    />
  );
}

// ============================================================================
// DataViewTable
// ============================================================================

interface DataViewTableProps<T = unknown> {
  className?: string;
  columns?: ColumnDef<T>[];
  rowActions?: RowAction<T>[];
}

export function DataViewTable<T>({
  className,
  columns: overrideColumns,
  rowActions: overrideRowActions,
}: DataViewTableProps<T>) {
  const {
    config,
    paginatedData,
    loading,
    sort,
    toggleSort,
    selectedIds,
    toggleRowSelection,
    toggleSelectAll,
    isAllSelected,
    isSomeSelected,
    columnVisibility,
  } = useDataView<T>();

  const columns = overrideColumns ?? (config.columns as ColumnDef<T>[]);
  const rowActions =
    overrideRowActions ?? (config.rowActions as RowAction<T>[] | undefined);

  const visibleColumns = React.useMemo(() => {
    return columns.filter((col) => {
      if (columnVisibility[col.id] !== undefined) {
        return columnVisibility[col.id];
      }
      return !col.hidden;
    });
  }, [columns, columnVisibility]);

  const renderCellContent = (row: T, column: ColumnDef<T>) => {
    const value = getFieldValue(row, column);

    if (column.cell) {
      return column.cell({ row, value });
    }

    const content = String(value ?? "");
    const ellipsis = column.ellipsis !== false;

    if (ellipsis) {
      return (
        <div
          className="truncate"
          style={{ maxWidth: column.maxWidth ?? "16rem" }}
          title={content}
        >
          {content}
        </div>
      );
    }

    return content;
  };

  const getSortIcon = (columnId: string) => {
    if (sort?.field !== columnId) {
      return <ArrowUpDown className="ml-2 size-4 opacity-50" />;
    }
    return sort.direction === "asc" ? (
      <ArrowUp className="ml-2 size-4" />
    ) : (
      <ArrowDown className="ml-2 size-4" />
    );
  };

  const renderActionCell = (row: T) => {
    if (!rowActions || rowActions.length === 0) {
      return null;
    }

    const visibleActions = filterVisibleActions(rowActions, row);
    const inlineActions = visibleActions.filter((action) => action.inline);
    const menuActions = visibleActions.filter((action) => !action.inline);

    return (
      <div className="flex items-center justify-end gap-1">
        {inlineActions.map((action) => {
          const disabled = isActionDisabled(action, row);
          return (
            <Button
              className="size-8"
              disabled={disabled}
              key={action.id}
              onClick={() => action.onAction(row)}
              size="icon"
              title={action.label}
              variant={action.variant === "destructive" ? "ghost" : "ghost"}
            >
              {action.icon && (
                <action.icon
                  className={cn(
                    "size-4",
                    action.variant === "destructive" && "text-destructive"
                  )}
                />
              )}
              <span className="sr-only">{action.label}</span>
            </Button>
          );
        })}
        {menuActions.length > 0 && (
          <DataViewActionMenu
            actions={menuActions}
            row={row}
            triggerVariant="icon"
          />
        )}
      </div>
    );
  };

  const hasActions = rowActions && rowActions.length > 0;

  // Use ContentPlaceholder for loading/empty states
  if (loading || paginatedData.length === 0) {
    return (
      <ContentPlaceholder
        emptyMessage={config.emptyMessage}
        isEmpty={paginatedData.length === 0}
        loading={loading}
        loadingMessage={config.loadingMessage}
        viewMode="table"
      />
    );
  }

  return (
    <Table className={className}>
      <TableHeader>
        <TableRow
          className={cn(
            config.hoverable === false && "hover:bg-transparent",
            "bg-muted hover:bg-muted/50"
          )}
        >
          {config.selectable && (
            <TableHead className="w-10">
              <Checkbox
                aria-label="Select all"
                checked={isSomeSelected ? "indeterminate" : isAllSelected}
                onCheckedChange={toggleSelectAll}
              />
            </TableHead>
          )}
          {visibleColumns.map((column) => (
            <TableHead
              className={cn(
                column.headerClassName,
                column.align === "center" && "text-center",
                column.align === "right" && "text-right"
              )}
              key={column.id}
              style={{
                width: column.width,
                minWidth: column.minWidth,
                maxWidth: column.maxWidth,
              }}
            >
              {column.sortable !== false && config.sortable !== false ? (
                <button
                  className="-ml-2 inline-flex items-center gap-1 rounded px-2 py-1 uppercase transition-colors hover:text-foreground"
                  onClick={() => toggleSort(column.id)}
                  type="button"
                >
                  {column.header}
                  {getSortIcon(column.id)}
                </button>
              ) : (
                column.header
              )}
            </TableHead>
          ))}
          {hasActions && (
            <TableHead className="w-10">
              <span className="sr-only">Actions</span>
            </TableHead>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {paginatedData.map((row) => {
          const rowId = config.getRowId(row);
          const isSelected = selectedIds.has(rowId);

          return (
            <TableRow
              className={cn(
                config.hoverable === false && "hover:bg-transparent",
                config.striped && "odd:bg-muted/40",
                config.dense && "[&>td]:py-1.5",
                // Subtle primary hover for branded feel
                "hover:bg-primary/5",
                // Ensure selected state interacts nicely with hover/stripe
                isSelected && "bg-primary/10 hover:bg-primary/10"
              )}
              data-state={isSelected ? "selected" : undefined}
              key={rowId}
            >
              {config.selectable && (
                <TableCell>
                  <Checkbox
                    aria-label={`Select row ${rowId}`}
                    checked={isSelected}
                    onCheckedChange={() => toggleRowSelection(rowId)}
                  />
                </TableCell>
              )}
              {visibleColumns.map((column) => (
                <TableCell
                  className={cn(
                    column.className,
                    column.align === "center" && "text-center",
                    column.align === "right" && "text-right"
                  )}
                  key={column.id}
                  style={{
                    width: column.width,
                    minWidth: column.minWidth,
                    maxWidth: column.maxWidth,
                  }}
                >
                  {renderCellContent(row, column)}
                </TableCell>
              ))}
              {hasActions && <TableCell>{renderActionCell(row)}</TableCell>}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export { Table, TableBody, TableCell, TableHead, TableHeader, TableRow };
