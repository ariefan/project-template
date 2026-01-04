"use client";

import { Button } from "@workspace/ui/components/button";
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
import type { RowAction } from "./types";
import { filterVisibleActions, isActionDisabled } from "./utils";

// ============================================================================
// DataViewActionMenu
// ============================================================================

export interface DataViewActionMenuProps<T> {
  /** The row data */
  row: T;
  /** Array of row actions */
  actions: RowAction<T>[];
  /** Trigger button variant */
  triggerVariant?: "icon" | "button" | "ghost-button";
  /** Dropdown alignment */
  align?: "start" | "end";
  /** Additional trigger className */
  triggerClassName?: string;
}

/**
 * Unified action menu component used by table, list, and grid views.
 * Renders a dropdown menu with row-specific actions.
 */
export function DataViewActionMenu<T>({
  row,
  actions,
  triggerVariant = "icon",
  align = "end",
  triggerClassName,
}: DataViewActionMenuProps<T>) {
  const visibleActions = filterVisibleActions(actions, row);

  if (visibleActions.length === 0) {
    return null;
  }

  const renderTrigger = () => {
    const iconContent = (
      <>
        <MoreHorizontal className="size-4" />
        <span className="sr-only">Open menu</span>
      </>
    );

    if (triggerVariant === "button") {
      return (
        <DropdownMenuTrigger asChild>
          <Button
            className={cn("rounded-full", triggerClassName)}
            size="icon"
            variant="ghost"
          >
            {iconContent}
          </Button>
        </DropdownMenuTrigger>
      );
    }

    if (triggerVariant === "ghost-button") {
      return (
        <DropdownMenuTrigger asChild>
          <Button
            className={cn("-mt-1 -mr-2 shrink-0", triggerClassName)}
            size="icon"
            variant="ghost"
          >
            {iconContent}
          </Button>
        </DropdownMenuTrigger>
      );
    }

    // Default: icon trigger (inline button without Button component)
    return (
      <DropdownMenuTrigger
        className={cn(
          "inline-flex size-8 items-center justify-center rounded-md font-medium text-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
          triggerClassName
        )}
      >
        {iconContent}
      </DropdownMenuTrigger>
    );
  };

  return (
    <DropdownMenu>
      {renderTrigger()}
      <DropdownMenuContent align={align}>
        {visibleActions.map((action, index) => {
          const disabled = isActionDisabled(action, row);

          return (
            <React.Fragment key={action.id}>
              {index > 0 && action.variant === "destructive" && (
                <DropdownMenuSeparator />
              )}
              <DropdownMenuItem
                className={cn(
                  action.variant === "destructive" && "text-destructive"
                )}
                disabled={disabled}
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
