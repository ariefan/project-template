"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { cn } from "@workspace/ui/lib/utils";
import { PaginationBase, type PaginationState } from "../pagination-base";
import { useDataView } from "./context";

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

  const paginationState: PaginationState = {
    currentPage: page,
    totalPages,
    canPreviousPage: page > 1,
    canNextPage: page < totalPages,
    onPreviousPage: () => setPage(page - 1),
    onNextPage: () => setPage(page + 1),
    onPageChange: setPage,
    onFirstPage: () => setPage(1),
    onLastPage: () => setPage(totalPages),
  };

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

      {/* Right side: Pagination using PaginationBase */}
      <PaginationBase
        pagination={paginationState}
        rowInfo={showRowInfo ? { total } : undefined}
        showPageNumbers={showPageNumbers}
        showRowInfo={showRowInfo}
      />
    </div>
  );
}

// ============================================================================
// SimplePagination (mobile-friendly) - uses PaginationBase with mobile variant
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

  const paginationState: PaginationState = {
    currentPage: page,
    totalPages,
    canPreviousPage: page > 1,
    canNextPage: page < totalPages,
    onPreviousPage: () => setPage(page - 1),
    onNextPage: () => setPage(page + 1),
    onPageChange: setPage,
  };

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <PaginationBase
        pagination={paginationState}
        showPageNumbers={false}
        variant="mobile"
      />
    </div>
  );
}
