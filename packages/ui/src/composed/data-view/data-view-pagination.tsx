"use client"

import * as React from "react"
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import { Select } from "@workspace/ui/components/select"
import { useDataView } from "./context"

// ============================================================================
// DataViewPagination
// ============================================================================

interface DataViewPaginationProps {
  className?: string
  showPageSizeSelector?: boolean
  showPageInfo?: boolean
  showFirstLast?: boolean
  showTotal?: boolean
  pageSizeOptions?: number[]
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
    useDataView()

  if (!config.paginated) return null

  const pageSizeOptions =
    overrideSizeOptions ??
    pagination.pageSizeOptions ??
    config.pageSizeOptions ??
    [10, 25, 50, 100]

  const { page, pageSize, total } = pagination

  const startItem = (page - 1) * pageSize + 1
  const endItem = Math.min(page * pageSize, total)

  const canGoPrevious = page > 1
  const canGoNext = page < totalPages

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
            <span className="text-muted-foreground hidden sm:inline">
              Rows per page:
            </span>
            <Select
              options={pageSizeOptions.map((size) => ({
                value: String(size),
                label: String(size),
              }))}
              value={String(pageSize)}
              onValueChange={(value) => setPageSize(Number(value))}
              size="sm"
              className="w-16"
            />
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
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => setPage(1)}
            disabled={!canGoPrevious}
            aria-label="Go to first page"
          >
            <ChevronsLeft className="size-4" />
          </Button>
        )}

        <Button
          variant="outline"
          size="icon"
          className="size-8"
          onClick={() => setPage(page - 1)}
          disabled={!canGoPrevious}
          aria-label="Go to previous page"
        >
          <ChevronLeft className="size-4" />
        </Button>

        <PageNumbers
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />

        <Button
          variant="outline"
          size="icon"
          className="size-8"
          onClick={() => setPage(page + 1)}
          disabled={!canGoNext}
          aria-label="Go to next page"
        >
          <ChevronRight className="size-4" />
        </Button>

        {showFirstLast && (
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => setPage(totalPages)}
            disabled={!canGoNext}
            aria-label="Go to last page"
          >
            <ChevronsRight className="size-4" />
          </Button>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Page Numbers
// ============================================================================

interface PageNumbersProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  maxVisible?: number
}

function PageNumbers({
  currentPage,
  totalPages,
  onPageChange,
  maxVisible = 5,
}: PageNumbersProps) {
  const pages = React.useMemo(() => {
    if (totalPages <= maxVisible) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }

    const half = Math.floor(maxVisible / 2)
    let start = currentPage - half
    let end = currentPage + half

    if (start < 1) {
      start = 1
      end = maxVisible
    }

    if (end > totalPages) {
      end = totalPages
      start = totalPages - maxVisible + 1
    }

    const result: (number | "ellipsis-start" | "ellipsis-end")[] = []

    if (start > 1) {
      result.push(1)
      if (start > 2) {
        result.push("ellipsis-start")
      }
    }

    for (let i = start; i <= end; i++) {
      result.push(i)
    }

    if (end < totalPages) {
      if (end < totalPages - 1) {
        result.push("ellipsis-end")
      }
      result.push(totalPages)
    }

    return result
  }, [currentPage, totalPages, maxVisible])

  if (totalPages <= 1) return null

  return (
    <div className="flex items-center gap-1">
      {pages.map((page) => {
        if (page === "ellipsis-start" || page === "ellipsis-end") {
          return (
            <span
              key={page}
              className="flex size-8 items-center justify-center text-muted-foreground"
            >
              ...
            </span>
          )
        }

        return (
          <Button
            key={page}
            variant={page === currentPage ? "secondary" : "ghost"}
            size="icon"
            className="size-8"
            onClick={() => onPageChange(page)}
            aria-label={`Go to page ${page}`}
            aria-current={page === currentPage ? "page" : undefined}
          >
            {page}
          </Button>
        )
      })}
    </div>
  )
}

// ============================================================================
// Simple Pagination (mobile-friendly)
// ============================================================================

interface SimplePaginationProps {
  className?: string
}

export function SimplePagination({ className }: SimplePaginationProps) {
  const { pagination, setPage, totalPages, config } = useDataView()

  if (!config.paginated || totalPages <= 1) return null

  const { page } = pagination

  return (
    <div className={cn("flex items-center justify-center gap-2", className)}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setPage(page - 1)}
        disabled={page <= 1}
      >
        <ChevronLeft className="size-4 mr-1" />
        Previous
      </Button>

      <span className="text-sm text-muted-foreground px-2">
        Page {page} of {totalPages}
      </span>

      <Button
        variant="outline"
        size="sm"
        onClick={() => setPage(page + 1)}
        disabled={page >= totalPages}
      >
        Next
        <ChevronRight className="size-4 ml-1" />
      </Button>
    </div>
  )
}
