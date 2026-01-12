"use client";

import { cn } from "@workspace/ui/lib/utils";
import { Inbox } from "lucide-react";
import type * as React from "react";
import { Card, CardContent, CardHeader } from "../../components/card";
import { Skeleton } from "../../components/skeleton";
import type { ViewMode } from "./types";

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
  /** View mode for skeleton loading (table, list, grid) */
  viewMode?: ViewMode;
  /** Additional className */
  className?: string;
}

/**
 * Unified placeholder component for loading and empty states.
 * Uses skeleton loading based on view mode for a premium feel.
 */
export function ContentPlaceholder({
  loading,
  isEmpty,
  loadingMessage,
  emptyMessage = "No data available",
  emptyIcon,
  viewMode = "table",
  className,
}: ContentPlaceholderProps) {
  if (loading) {
    return (
      <div className={cn("w-full", className)}>
        {viewMode === "table" && <TableSkeleton />}
        {viewMode === "list" && <ListSkeleton />}
        {viewMode === "grid" && <GridSkeleton />}
        {loadingMessage && (
          <div className="py-2 text-center text-muted-foreground text-sm">
            {loadingMessage}
          </div>
        )}
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

// ============================================================================
// Skeleton Components
// ============================================================================

function TableSkeleton() {
  return (
    <div className="w-full">
      {/* Header row */}
      <div className="flex gap-4 border-b bg-muted/20 px-4 py-3">
        <Skeleton className="h-4 w-8" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="ml-auto h-4 w-28" />
      </div>
      {/* Data rows */}
      {Array.from({ length: 5 }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: Skeleton list is static
        <div className="flex items-center gap-4 border-b px-4 py-3" key={i}>
          <Skeleton className="size-4 rounded" />
          <Skeleton
            className="h-4"
            style={{ width: `${80 + (i % 3) * 20}px` }}
          />
          <Skeleton
            className="h-4"
            style={{ width: `${100 + (i % 2) * 40}px` }}
          />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="ml-auto h-4 w-24" />
        </div>
      ))}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="w-full divide-y">
      {Array.from({ length: 5 }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: Skeleton list is static
        <div className="flex items-center gap-4 px-4 py-3" key={i}>
          <Skeleton className="size-4 rounded" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton
                className="h-4"
                style={{ width: `${120 + (i % 3) * 40}px` }}
              />
            </div>
            <Skeleton
              className="h-3"
              style={{ width: `${180 + (i % 2) * 60}px` }}
            />
          </div>
          <Skeleton className="size-8 rounded" />
        </div>
      ))}
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: Skeleton list is static
        <Card key={i}>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton
                  className="h-4"
                  style={{ width: `${100 + (i % 3) * 30}px` }}
                />
              </div>
              <Skeleton className="size-8 rounded" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-3 w-16" />
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-3 w-20" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
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
