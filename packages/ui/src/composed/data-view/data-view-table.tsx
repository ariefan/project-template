"use client";

import { Checkbox } from "@workspace/ui/components/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";

import { cn } from "@workspace/ui/lib/utils";
import { ArrowDown, ArrowUp, ArrowUpDown, MoreHorizontal } from "lucide-react";
import * as React from "react";
import { useDataView } from "./context";
import type { ColumnDef, RowAction } from "./types";

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
      className={cn(
        "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
        className
      )}
      data-slot="table-row"
      {...props}
    />
  );
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      className={cn(
        "h-10 px-3 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
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
        "p-3 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
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
  } = useDataView<T>();

  const columns = overrideColumns ?? (config.columns as ColumnDef<T>[]);
  const rowActions =
    overrideRowActions ?? (config.rowActions as RowAction<T>[] | undefined);
  const visibleColumns = columns.filter((col) => !col.hidden);

  const getCellValue = (row: T, column: ColumnDef<T>): unknown => {
    if (column.accessorFn) {
      return column.accessorFn(row);
    }
    if (column.accessorKey) {
      return (row as Record<string, unknown>)[column.accessorKey as string];
    }
    return null;
  };

  const renderCellContent = (row: T, column: ColumnDef<T>) => {
    const value = getCellValue(row, column);

    if (column.cell) {
      return column.cell({ row, value });
    }

    const content = String(value ?? "");
    const ellipsis = column.ellipsis !== false;

    if (ellipsis) {
      return (
        <span className="block truncate" title={content}>
          {content}
        </span>
      );
    }

    return content;
  };

  const getSortIcon = (columnId: string) => {
    if (sort?.field !== columnId) {
      return <ArrowUpDown className="size-4 opacity-50" />;
    }
    return sort.direction === "asc" ? (
      <ArrowUp className="size-4" />
    ) : (
      <ArrowDown className="size-4" />
    );
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
    <Table className={className}>
      <TableHeader>
        <TableRow
          className={cn(config.hoverable === false && "hover:bg-transparent")}
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
                  className="-ml-2 inline-flex items-center gap-1 rounded px-2 py-1 transition-colors hover:text-foreground"
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
          {rowActions && rowActions.length > 0 && (
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
                config.striped && "odd:bg-muted/30",
                config.dense && "[&>td]:py-1.5"
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
              {rowActions && rowActions.length > 0 && (
                <TableCell>
                  <RowActionsMenu actions={rowActions} row={row} />
                </TableCell>
              )}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

// ============================================================================
// Row Actions Menu
// ============================================================================

interface RowActionsMenuProps<T> {
  row: T;
  actions: RowAction<T>[];
}

function RowActionsMenu<T>({ row, actions }: RowActionsMenuProps<T>) {
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
      <DropdownMenuTrigger className="inline-flex size-8 items-center justify-center rounded-md font-medium text-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
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

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell };
