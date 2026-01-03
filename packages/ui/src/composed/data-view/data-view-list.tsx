"use client";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from "@workspace/ui/components/item";
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
            <ListItem
              dense={config.dense}
              fields={visibleFields}
              hoverable={config.hoverable}
              onSelect={() => toggleRowSelection(rowId)}
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

  // Build description from other fields
  const descriptionContent =
    otherFields.length > 0
      ? otherFields
          .slice(0, 4)
          .map((field) => {
            const value = getFieldValue(field);
            return `${field.label}: ${String(value ?? "")}`;
          })
          .join(" · ")
      : null;

  return (
    <Item
      className={cn(
        hoverable !== false && "hover:bg-muted/50",
        selected && "bg-muted ring-1 ring-primary"
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

      <ItemContent>
        <ItemTitle>
          {primaryField && renderFieldValue(primaryField)}
          {secondaryField && (
            <span className="font-normal text-muted-foreground">
              {renderFieldValue(secondaryField)}
            </span>
          )}
        </ItemTitle>
        {descriptionContent && (
          <ItemDescription>{descriptionContent}</ItemDescription>
        )}
      </ItemContent>

      {rowActions && rowActions.length > 0 && (
        <ItemActions>
          <ListItemActionsMenu actions={rowActions} row={row} />
        </ItemActions>
      )}
    </Item>
  );
}

// ============================================================================
// List Item Actions Menu
// ============================================================================

interface ListItemActionsMenuProps<T> {
  row: T;
  actions: RowAction<T>[];
}

function ListItemActionsMenu<T>({ row, actions }: ListItemActionsMenuProps<T>) {
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
      <DropdownMenuTrigger asChild>
        <Button className="rounded-full" size="icon" variant="ghost">
          <MoreHorizontal className="size-4" />
          <span className="sr-only">Open menu</span>
        </Button>
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
