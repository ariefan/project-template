"use client";

import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
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
import * as React from "react";
import { DataViewActionMenu } from "./action-menu";
import { ContentPlaceholder } from "./content-placeholder";
import { useDataView } from "./context";
import type { FieldDef, RowAction } from "./types";
import {
  deriveFieldsFromColumns,
  filterVisibleActions,
  getFieldValue,
  isActionDisabled,
  renderFieldContent,
} from "./utils";

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
    return deriveFieldsFromColumns(
      config.columns,
      "hideInList"
    ) as FieldDef<T>[];
  }, [overrideFields, config.fields, config.columns]);

  const rowActions =
    overrideRowActions ?? (config.rowActions as RowAction<T>[] | undefined);
  const itemRenderer = overrideItemRenderer ?? config.listItemRenderer;

  const visibleFields = fields.filter((field) => !field.hideInList);

  // Use ContentPlaceholder for loading/empty states
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

  // Build description from other fields (limit to 2 fields, truncate values)
  const descriptionContent =
    otherFields.length > 0
      ? otherFields
          .slice(0, 2)
          .map((field) => {
            const value = String(getFieldValue(row, field) ?? "");
            return `${field.label}: ${value}`;
          })
          .join(" · ")
      : null;

  const renderActionCell = () => {
    if (!rowActions || rowActions.length === 0) {
      return null;
    }

    const visibleActions = filterVisibleActions(rowActions, row);
    const inlineActions = visibleActions.filter((action) => action.inline);
    const menuActions = visibleActions.filter((action) => !action.inline);

    return (
      <div className="flex items-center gap-1">
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
              <span className="sr-only">{action.label}</span>
            </Button>
          );
        })}
        {menuActions.length > 0 && (
          <DataViewActionMenu
            actions={menuActions}
            row={row}
            triggerVariant="button"
          />
        )}
      </div>
    );
  };

  const hasActions = rowActions && rowActions.length > 0;

  return (
    <Item
      className={cn(
        // Subtle primary hover for branded feel (consistent with table)
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

      <ItemContent className="min-w-0">
        <ItemTitle className="w-full">
          {primaryField && (
            <span className="min-w-0 truncate">
              {renderField(primaryField)}
            </span>
          )}
          {secondaryField && (
            <span className="min-w-0 truncate font-normal text-muted-foreground">
              {renderField(secondaryField)}
            </span>
          )}
        </ItemTitle>
        {descriptionContent && (
          <ItemDescription>{descriptionContent}</ItemDescription>
        )}
      </ItemContent>

      {hasActions && (
        <ItemActions className="shrink-0">{renderActionCell()}</ItemActions>
      )}
    </Item>
  );
}
