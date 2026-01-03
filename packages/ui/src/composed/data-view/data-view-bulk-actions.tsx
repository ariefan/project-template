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
import { ChevronDown, X } from "lucide-react";
import * as React from "react";
import { useDataView } from "./context";
import type { BulkAction } from "./types";

// ============================================================================
// DataViewBulkActions
// ============================================================================

interface DataViewBulkActionsProps<T = unknown> {
  className?: string;
  actions?: BulkAction<T>[];
  showCount?: boolean;
  showClearButton?: boolean;
  position?: "top" | "floating";
}

export function DataViewBulkActions<T>({
  className,
  actions: overrideActions,
  showCount = true,
  showClearButton = true,
  position = "top",
}: DataViewBulkActionsProps<T>) {
  const { selectedRows, selectedIds, deselectAll, config } = useDataView<T>();
  const [loading, setLoading] = React.useState<string | null>(null);

  const actions = (overrideActions ?? config.bulkActions) as
    | BulkAction<T>[]
    | undefined;

  if (!(config.selectable && actions) || actions.length === 0) {
    return null;
  }
  if (selectedIds.size === 0) {
    return null;
  }

  const handleAction = async (action: BulkAction<T>) => {
    if (action.confirmMessage) {
      // biome-ignore lint/suspicious/noAlert: confirmation is intentional for destructive bulk actions
      const confirmed = window.confirm(action.confirmMessage);
      if (!confirmed) {
        return;
      }
    }

    setLoading(action.id);
    try {
      await action.onAction(selectedRows);
    } finally {
      setLoading(null);
    }
  };

  const isFloating = position === "floating";

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border bg-background p-2",
        isFloating &&
          "fade-in-0 slide-in-from-bottom-4 fixed bottom-4 left-1/2 z-50 -translate-x-1/2 animate-in shadow-lg",
        className
      )}
    >
      {showCount && (
        <span className="px-2 font-medium text-sm">
          {selectedIds.size} selected
        </span>
      )}

      <div className="flex items-center gap-1">
        {/* Show first 2-3 actions directly, rest in dropdown */}
        {actions.slice(0, 3).map((action) => {
          const isDisabled =
            loading !== null ||
            (typeof action.disabled === "function"
              ? action.disabled(selectedRows)
              : action.disabled);

          return (
            <Button
              className="gap-1.5"
              disabled={isDisabled}
              key={action.id}
              onClick={() => handleAction(action)}
              size="sm"
              variant={action.variant ?? "outline"}
            >
              {action.icon && <action.icon className="size-4" />}
              <span className="hidden sm:inline">{action.label}</span>
            </Button>
          );
        })}

        {actions.length > 3 && (
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex h-8 items-center justify-center gap-1 whitespace-nowrap rounded-md border border-input bg-background px-3 font-medium text-sm shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
              More
              <ChevronDown className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {actions.slice(3).map((action, index) => {
                const isDisabled =
                  loading !== null ||
                  (typeof action.disabled === "function"
                    ? action.disabled(selectedRows)
                    : action.disabled);

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
                      onClick={() => handleAction(action)}
                    >
                      {action.icon && <action.icon className="size-4" />}
                      {action.label}
                    </DropdownMenuItem>
                  </React.Fragment>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {showClearButton && (
        <Button
          aria-label="Clear selection"
          className="size-7 shrink-0"
          onClick={deselectAll}
          size="icon"
          variant="ghost"
        >
          <X className="size-4" />
        </Button>
      )}
    </div>
  );
}

// ============================================================================
// Inline Bulk Actions (for toolbar)
// ============================================================================

interface InlineBulkActionsProps<T = unknown> {
  className?: string;
  actions?: BulkAction<T>[];
}

export function InlineBulkActions<T>({
  className,
  actions: overrideActions,
}: InlineBulkActionsProps<T>) {
  const { selectedRows, selectedIds, deselectAll, config } = useDataView<T>();
  const [loading, setLoading] = React.useState<string | null>(null);

  const actions = (overrideActions ?? config.bulkActions) as
    | BulkAction<T>[]
    | undefined;

  if (!(config.selectable && actions) || actions.length === 0) {
    return null;
  }
  if (selectedIds.size === 0) {
    return null;
  }

  const handleAction = async (action: BulkAction<T>) => {
    if (action.confirmMessage) {
      // biome-ignore lint/suspicious/noAlert: confirmation is intentional for destructive bulk actions
      const confirmed = window.confirm(action.confirmMessage);
      if (!confirmed) {
        return;
      }
    }

    setLoading(action.id);
    try {
      await action.onAction(selectedRows);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="text-muted-foreground text-sm">
        {selectedIds.size} selected
      </span>

      <DropdownMenu>
        <DropdownMenuTrigger className="inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-input bg-background px-3 font-medium text-sm shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
          Actions
          <ChevronDown className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {actions.map((action, index) => {
            const isDisabled =
              loading !== null ||
              (typeof action.disabled === "function"
                ? action.disabled(selectedRows)
                : action.disabled);

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
                  onClick={() => handleAction(action)}
                >
                  {action.icon && <action.icon className="size-4" />}
                  {action.label}
                </DropdownMenuItem>
              </React.Fragment>
            );
          })}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={deselectAll}>
            <X className="size-4" />
            Clear selection
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
