"use client";

import { cn } from "@workspace/ui/lib/utils";
import { Inbox, Loader2 } from "lucide-react";
import type * as React from "react";

// ============================================================================
// ContentPlaceholder
// ============================================================================

export interface ContentPlaceholderProps {
  /** Show loading state */
  loading: boolean;
  /** Show empty state (when not loading and no data) */
  isEmpty: boolean;
  /** Loading message */
  loadingMessage?: string;
  /** Empty state message */
  emptyMessage?: string;
  /** Custom empty icon */
  emptyIcon?: React.ReactNode;
  /** Custom loading icon */
  loadingIcon?: React.ReactNode;
  /** Additional className */
  className?: string;
}

/**
 * Unified placeholder component for loading and empty states.
 * Used by table, list, and grid views.
 */
export function ContentPlaceholder({
  loading,
  isEmpty,
  loadingMessage = "Loading...",
  emptyMessage = "No data available",
  emptyIcon,
  loadingIcon,
  className,
}: ContentPlaceholderProps) {
  if (loading) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-3 py-10",
          className
        )}
      >
        {loadingIcon ?? (
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        )}
        <div className="text-muted-foreground text-sm">{loadingMessage}</div>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-3 py-10",
          className
        )}
      >
        {emptyIcon ?? <Inbox className="size-12 text-muted-foreground/50" />}
        <div className="text-muted-foreground">{emptyMessage}</div>
      </div>
    );
  }

  return null;
}

/**
 * Check if placeholder should be shown
 */
export function shouldShowPlaceholder(
  loading: boolean,
  dataLength: number
): boolean {
  return loading || dataLength === 0;
}
