"use client";

import { Button } from "@workspace/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { cn } from "@workspace/ui/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import * as React from "react";
import { useDataView } from "./context";

// ============================================================================
// DataViewPagination
// ============================================================================

interface DataViewPaginationProps {
  className?: string;
  showPageSizeSelector?: boolean;
  showPageInfo?: boolean;
  showFirstLast?: boolean;
  showTotal?: boolean;
  pageSizeOptions?: number[];
}

export function DataViewPagination({
  className,
  showPageSizeSelector = true,
  showPageInfo = true,
  showFirstLast = true,
  showTotal = true,
  pageSizeOptions: overrideSizeOptions,
}: DataViewPaginationProps) {
  const { pagination, setPage, setPageSize, totalPages, config } =
    useDataView();

  if (!config.paginated) {
    return null;
  }

  const pageSizeOptions = overrideSizeOptions ??
    pagination.pageSizeOptions ??
    config.pageSizeOptions ?? [10, 25, 50, 100];

  const { page, pageSize, total } = pagination;

  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  const canGoPrevious = page > 1;
  const canGoNext = page < totalPages;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      {/* Left side: Page size selector and info */}
      <div className="flex items-center gap-4 text-sm">
        {showPageSizeSelector && (
          <div className="flex items-center gap-2">
            <span className="hidden text-muted-foreground sm:inline">
              Rows per page:
            </span>
            <Select
              onValueChange={(value) => setPageSize(Number(value))}
              value={String(pageSize)}
            >
              <SelectTrigger className="w-16" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {showTotal && (
          <span className="text-muted-foreground">
            {showPageInfo ? (
              <>
                {startItem}-{endItem} of {total}
              </>
            ) : (
              <>{total} items</>
            )}
          </span>
        )}
      </div>

      {/* Right side: Page navigation */}
      <div className="flex items-center gap-1">
        {showFirstLast && (
          <Button
            aria-label="Go to first page"
            className="size-8"
            disabled={!canGoPrevious}
            onClick={() => setPage(1)}
            size="icon"
            variant="outline"
          >
            <ChevronsLeft className="size-4" />
          </Button>
        )}

        <Button
          aria-label="Go to previous page"
          className="size-8"
          disabled={!canGoPrevious}
          onClick={() => setPage(page - 1)}
          size="icon"
          variant="outline"
        >
          <ChevronLeft className="size-4" />
        </Button>

        <PageNumbers
          currentPage={page}
          onPageChange={setPage}
          totalPages={totalPages}
        />

        <Button
          aria-label="Go to next page"
          className="size-8"
          disabled={!canGoNext}
          onClick={() => setPage(page + 1)}
          size="icon"
          variant="outline"
        >
          <ChevronRight className="size-4" />
        </Button>

        {showFirstLast && (
          <Button
            aria-label="Go to last page"
            className="size-8"
            disabled={!canGoNext}
            onClick={() => setPage(totalPages)}
            size="icon"
            variant="outline"
          >
            <ChevronsRight className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Page Numbers
// ============================================================================

interface PageNumbersProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  maxVisible?: number;
}

function PageNumbers({
  currentPage,
  totalPages,
  onPageChange,
  maxVisible = 5,
}: PageNumbersProps) {
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: pagination logic requires handling edge cases for ellipsis display
  const pages = React.useMemo(() => {
    if (totalPages <= maxVisible) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const half = Math.floor(maxVisible / 2);
    let start = currentPage - half;
    let end = currentPage + half;

    if (start < 1) {
      start = 1;
      end = maxVisible;
    }

    if (end > totalPages) {
      end = totalPages;
      start = totalPages - maxVisible + 1;
    }

    const result: (number | "ellipsis-start" | "ellipsis-end")[] = [];

    if (start > 1) {
      result.push(1);
      if (start > 2) {
        result.push("ellipsis-start");
      }
    }

    for (let i = start; i <= end; i++) {
      result.push(i);
    }

    if (end < totalPages) {
      if (end < totalPages - 1) {
        result.push("ellipsis-end");
      }
      result.push(totalPages);
    }

    return result;
  }, [currentPage, totalPages, maxVisible]);

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex items-center gap-1">
      {pages.map((page) => {
        if (page === "ellipsis-start" || page === "ellipsis-end") {
          return (
            <span
              className="flex size-8 items-center justify-center text-muted-foreground"
              key={page}
            >
              ...
            </span>
          );
        }

        return (
          <Button
            aria-current={page === currentPage ? "page" : undefined}
            aria-label={`Go to page ${page}`}
            className="size-8"
            key={page}
            onClick={() => onPageChange(page)}
            size="icon"
            variant={page === currentPage ? "secondary" : "ghost"}
          >
            {page}
          </Button>
        );
      })}
    </div>
  );
}

// ============================================================================
// Simple Pagination (mobile-friendly)
// ============================================================================

interface SimplePaginationProps {
  className?: string;
}

export function SimplePagination({ className }: SimplePaginationProps) {
  const { pagination, setPage, totalPages, config } = useDataView();

  if (!config.paginated || totalPages <= 1) {
    return null;
  }

  const { page } = pagination;

  return (
    <div className={cn("flex items-center justify-center gap-2", className)}>
      <Button
        disabled={page <= 1}
        onClick={() => setPage(page - 1)}
        size="sm"
        variant="outline"
      >
        <ChevronLeft className="mr-1 size-4" />
        Previous
      </Button>

      <span className="px-2 text-muted-foreground text-sm">
        Page {page} of {totalPages}
      </span>

      <Button
        disabled={page >= totalPages}
        onClick={() => setPage(page + 1)}
        size="sm"
        variant="outline"
      >
        Next
        <ChevronRight className="ml-1 size-4" />
      </Button>
    </div>
  );
}
