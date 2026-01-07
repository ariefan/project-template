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
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useDataView } from "./context";

// ============================================================================
// Helper Types
// ============================================================================

type PageItem =
  | { type: "page"; value: number }
  | { type: "ellipsis"; afterPage: number };

// ============================================================================
// Helper Functions
// ============================================================================

function addGapContent(
  result: PageItem[],
  prev: number,
  current: number,
  threshold: number
): void {
  const diff = current - prev;
  if (diff === 2) {
    result.push({ type: "page", value: prev + 1 });
  } else if (diff > threshold) {
    result.push({ type: "ellipsis", afterPage: prev });
  }
}

function buildPagesWithEllipsis(
  pages: number[],
  ellipsisThreshold = 2
): PageItem[] {
  const result: PageItem[] = [];

  for (const [i, page] of pages.entries()) {
    if (i === 0) {
      result.push({ type: "page", value: page });
      continue;
    }

    const prev = pages[i - 1];
    if (prev !== undefined) {
      addGapContent(result, prev, page, ellipsisThreshold);
      result.push({ type: "page", value: page });
    }
  }

  return result;
}

function buildDesktopPageList(
  currentPage: number,
  totalPages: number
): number[] {
  if (totalPages <= 1) {
    return [];
  }

  const pages = new Set<number>();

  // Always show first 2 pages
  pages.add(1);
  if (totalPages >= 2) {
    pages.add(2);
  }

  // Always show last 2 pages
  if (totalPages >= 2) {
    pages.add(totalPages - 1);
  }
  pages.add(totalPages);

  // Calculate window of 5 centered on current page
  const windowSize = 5;
  const halfWindow = Math.floor(windowSize / 2);
  let windowStart = currentPage - halfWindow;
  let windowEnd = currentPage + halfWindow;

  // Shift window if it goes past boundaries
  if (windowStart < 1) {
    windowEnd += 1 - windowStart;
    windowStart = 1;
  }
  if (windowEnd > totalPages) {
    windowStart -= windowEnd - totalPages;
    windowEnd = totalPages;
  }
  windowStart = Math.max(1, windowStart);

  for (let i = windowStart; i <= windowEnd; i++) {
    pages.add(i);
  }

  return Array.from(pages).sort((a, b) => a - b);
}

function buildTabletPageList(
  currentPage: number,
  totalPages: number
): number[] {
  if (totalPages <= 1) {
    return [];
  }

  const pages = new Set<number>();
  pages.add(1);
  pages.add(currentPage);
  pages.add(totalPages);

  return Array.from(pages).sort((a, b) => a - b);
}

// ============================================================================
// DataViewPagination
// ============================================================================

interface DataViewPaginationProps {
  className?: string;
  showPageSizeSelector?: boolean;
  showRowInfo?: boolean;
  showPageNumbers?: boolean;
  pageSizeOptions?: number[];
}

export function DataViewPagination({
  className,
  showPageSizeSelector = true,
  showRowInfo = true,
  showPageNumbers = true,
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

  // Hide pagination when there are no records
  if (total === 0) {
    return null;
  }

  const canPreviousPage = page > 1;
  const canNextPage = page < totalPages;

  const generateDesktopPages = (): PageItem[] => {
    const pages = buildDesktopPageList(page, totalPages);
    return buildPagesWithEllipsis(pages, 2);
  };

  const generateTabletPages = (): PageItem[] => {
    const pages = buildTabletPageList(page, totalPages);
    return buildPagesWithEllipsis(pages, 5);
  };

  const pluralizeRow = (count: number) => (count === 1 ? "row" : "rows");

  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      {/* Left side: Page size selector */}
      {showPageSizeSelector && (
        <div className="flex items-center gap-2 text-sm">
          <span className="hidden text-muted-foreground sm:inline">
            Rows per page:
          </span>
          <Select
            onValueChange={(value) => setPageSize(Number(value))}
            value={String(pageSize)}
          >
            <SelectTrigger className="w-18" size="sm">
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

      {/* Right side: Pagination controls */}
      <div className="flex flex-col items-center justify-between space-y-2 px-2 py-2 sm:flex-row sm:space-y-0">
        {/* Row info */}
        {showRowInfo && (
          <div className="mr-4 flex-1 text-muted-foreground text-sm">
            Showing {total} {pluralizeRow(total)}
          </div>
        )}

        {/* Pagination - only show when there are multiple pages */}
        {totalPages > 1 && (
          <nav aria-label="Pagination" className="flex items-center space-x-1">
            {/* Previous */}
            <Button
              aria-label="Go to previous page"
              disabled={!canPreviousPage}
              onClick={() => setPage(page - 1)}
              size="icon"
              variant="ghost"
            >
              <ChevronLeft />
            </Button>

            {/* Desktop numbers */}
            {showPageNumbers && (
              <div className="hidden items-center space-x-1 lg:flex">
                {generateDesktopPages().map((item) =>
                  item.type === "ellipsis" ? (
                    <span
                      aria-hidden="true"
                      className="select-none px-2"
                      key={`desktop-ellipsis-${item.afterPage}`}
                    >
                      …
                    </span>
                  ) : (
                    <Button
                      aria-current={item.value === page ? "page" : undefined}
                      aria-label={`Go to page ${item.value}`}
                      key={`desktop-page-${item.value}`}
                      onClick={() => setPage(item.value)}
                      size="sm"
                      variant={item.value === page ? "default" : "ghost"}
                    >
                      {item.value}
                    </Button>
                  )
                )}
              </div>
            )}

            {/* Tablet numbers */}
            {showPageNumbers && (
              <div className="hidden items-center space-x-1 sm:flex lg:hidden">
                {generateTabletPages().map((item) =>
                  item.type === "ellipsis" ? (
                    <span
                      aria-hidden="true"
                      className="select-none px-2"
                      key={`tablet-ellipsis-${item.afterPage}`}
                    >
                      …
                    </span>
                  ) : (
                    <Button
                      aria-current={item.value === page ? "page" : undefined}
                      aria-label={`Go to page ${item.value}`}
                      key={`tablet-page-${item.value}`}
                      onClick={() => setPage(item.value)}
                      size="sm"
                      variant={item.value === page ? "default" : "ghost"}
                    >
                      {item.value}
                    </Button>
                  )
                )}
              </div>
            )}

            {/* Next */}
            <Button
              aria-label="Go to next page"
              disabled={!canNextPage}
              onClick={() => setPage(page + 1)}
              size="icon"
              variant="ghost"
            >
              <ChevronRight />
            </Button>
          </nav>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// SimplePagination (mobile-friendly)
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
  const canPreviousPage = page > 1;
  const canNextPage = page < totalPages;

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <nav
        aria-label="Pagination"
        className="flex items-center justify-between space-y-2 px-2 py-2 sm:flex-row sm:space-y-0"
      >
        {/* Previous */}
        <Button
          aria-label="Go to previous page"
          disabled={!canPreviousPage}
          onClick={() => setPage(page - 1)}
          size="icon"
          variant="ghost"
        >
          <ChevronLeft />
        </Button>

        {/* Mobile - page indicator */}
        <div className="flex items-center space-x-2">
          <span className="text-sm">
            Page {page} of {totalPages}
          </span>
        </div>

        {/* Next */}
        <Button
          aria-label="Go to next page"
          disabled={!canNextPage}
          onClick={() => setPage(page + 1)}
          size="icon"
          variant="ghost"
        >
          <ChevronRight />
        </Button>
      </nav>
    </div>
  );
}
