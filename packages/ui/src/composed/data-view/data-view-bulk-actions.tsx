"use client"

import * as React from "react"
import { X, ChevronDown } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@workspace/ui/components/dropdown-menu"
import { useDataView } from "./context"
import type { BulkAction } from "./types"

// ============================================================================
// DataViewBulkActions
// ============================================================================

interface DataViewBulkActionsProps<T = unknown> {
  className?: string
  actions?: BulkAction<T>[]
  showCount?: boolean
  showClearButton?: boolean
  position?: "top" | "floating"
}

export function DataViewBulkActions<T>({
  className,
  actions: overrideActions,
  showCount = true,
  showClearButton = true,
  position = "top",
}: DataViewBulkActionsProps<T>) {
  const { selectedRows, selectedIds, deselectAll, config } = useDataView<T>()
  const [loading, setLoading] = React.useState<string | null>(null)

  const actions = (overrideActions ?? config.bulkActions) as BulkAction<T>[] | undefined

  if (!config.selectable || !actions || actions.length === 0) return null
  if (selectedIds.size === 0) return null

  const handleAction = async (action: BulkAction<T>) => {
    if (action.confirmMessage) {
      const confirmed = window.confirm(action.confirmMessage)
      if (!confirmed) return
    }

    setLoading(action.id)
    try {
      await action.onAction(selectedRows)
    } finally {
      setLoading(null)
    }
  }

  const isFloating = position === "floating"

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border bg-background p-2",
        isFloating &&
          "fixed bottom-4 left-1/2 -translate-x-1/2 shadow-lg z-50 animate-in fade-in-0 slide-in-from-bottom-4",
        className
      )}
    >
      {showCount && (
        <span className="text-sm font-medium px-2">
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
              : action.disabled)

          return (
            <Button
              key={action.id}
              variant={action.variant ?? "outline"}
              size="sm"
              disabled={isDisabled}
              onClick={() => handleAction(action)}
              className="gap-1.5"
            >
              {action.icon && <action.icon className="size-4" />}
              <span className="hidden sm:inline">{action.label}</span>
            </Button>
          )
        })}

        {actions.length > 3 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                More
                <ChevronDown className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {actions.slice(3).map((action, index) => {
                const isDisabled =
                  loading !== null ||
                  (typeof action.disabled === "function"
                    ? action.disabled(selectedRows)
                    : action.disabled)

                return (
                  <React.Fragment key={action.id}>
                    {index > 0 && action.variant === "destructive" && (
                      <DropdownMenuSeparator />
                    )}
                    <DropdownMenuItem
                      disabled={isDisabled}
                      className={cn(
                        action.variant === "destructive" && "text-destructive"
                      )}
                      onClick={() => handleAction(action)}
                    >
                      {action.icon && <action.icon className="size-4" />}
                      {action.label}
                    </DropdownMenuItem>
                  </React.Fragment>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {showClearButton && (
        <Button
          variant="ghost"
          size="icon"
          className="size-7 shrink-0"
          onClick={deselectAll}
          aria-label="Clear selection"
        >
          <X className="size-4" />
        </Button>
      )}
    </div>
  )
}

// ============================================================================
// Inline Bulk Actions (for toolbar)
// ============================================================================

interface InlineBulkActionsProps<T = unknown> {
  className?: string
  actions?: BulkAction<T>[]
}

export function InlineBulkActions<T>({
  className,
  actions: overrideActions,
}: InlineBulkActionsProps<T>) {
  const { selectedRows, selectedIds, deselectAll, config } = useDataView<T>()
  const [loading, setLoading] = React.useState<string | null>(null)

  const actions = (overrideActions ?? config.bulkActions) as BulkAction<T>[] | undefined

  if (!config.selectable || !actions || actions.length === 0) return null
  if (selectedIds.size === 0) return null

  const handleAction = async (action: BulkAction<T>) => {
    if (action.confirmMessage) {
      const confirmed = window.confirm(action.confirmMessage)
      if (!confirmed) return
    }

    setLoading(action.id)
    try {
      await action.onAction(selectedRows)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="text-sm text-muted-foreground">
        {selectedIds.size} selected
      </span>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            Actions
            <ChevronDown className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {actions.map((action, index) => {
            const isDisabled =
              loading !== null ||
              (typeof action.disabled === "function"
                ? action.disabled(selectedRows)
                : action.disabled)

            return (
              <React.Fragment key={action.id}>
                {index > 0 && action.variant === "destructive" && (
                  <DropdownMenuSeparator />
                )}
                <DropdownMenuItem
                  disabled={isDisabled}
                  className={cn(
                    action.variant === "destructive" && "text-destructive"
                  )}
                  onClick={() => handleAction(action)}
                >
                  {action.icon && <action.icon className="size-4" />}
                  {action.label}
                </DropdownMenuItem>
              </React.Fragment>
            )
          })}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={deselectAll}>
            <X className="size-4" />
            Clear selection
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
