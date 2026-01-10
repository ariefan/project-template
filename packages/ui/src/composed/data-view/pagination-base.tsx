import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@workspace/ui/components/button";

export type PageItem =
  | { type: "page"; value: number }
  | { type: "ellipsis"; afterPage: number };

export interface PaginationState {
  currentPage: number;
  totalPages: number;
  canPreviousPage: boolean;
  canNextPage: boolean;
  onPreviousPage: () => void;
  onNextPage: () => void;
  onPageChange: (page: number) => void;
  onFirstPage?: () => void;
  onLastPage?: () => void;
}

export interface PaginationBaseProps {
  pagination: PaginationState;
  showRowInfo?: boolean;
  rowInfo?: {
    selected?: number;
    total: number;
  };
  showPageNumbers?: boolean;
  variant?: "desktop" | "tablet" | "mobile";
}

export function PaginationBase({
  pagination,
  showRowInfo = false,
  rowInfo,
  showPageNumbers = true,
  variant = "desktop",
}: PaginationBaseProps) {
  const {
    currentPage,
    totalPages,
    canPreviousPage,
    canNextPage,
    onPreviousPage,
    onNextPage,
    onPageChange,
  } = pagination;

  const addGapContent = (
    result: PageItem[],
    prev: number,
    current: number,
    threshold: number
  ): void => {
    const diff = current - prev;
    if (diff === 2) {
      result.push({ type: "page", value: prev + 1 });
    } else if (diff > threshold) {
      result.push({ type: "ellipsis", afterPage: prev });
    }
  };

  const buildPagesWithEllipsis = (
    pages: number[],
    ellipsisThreshold = 2
  ): PageItem[] => {
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
  };

  const buildDesktopPageList = (): number[] => {
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
  };

  const buildTabletPageList = (): number[] => {
    if (totalPages <= 1) {
      return [];
    }

    const pages = new Set<number>();
    pages.add(1);
    pages.add(currentPage);
    pages.add(totalPages);

    return Array.from(pages).sort((a, b) => a - b);
  };

  const generateDesktopPages = (): PageItem[] => {
    const pages = buildDesktopPageList();
    return buildPagesWithEllipsis(pages, 2);
  };

  const generateTabletPages = (): PageItem[] => {
    const pages = buildTabletPageList();
    return buildPagesWithEllipsis(pages, 5);
  };

  // Pluralization helper
  const pluralizeRow = (count: number) => (count === 1 ? "row" : "rows");

  return (
    <div className="flex flex-col items-center justify-between space-y-2 px-2 py-2 sm:flex-row sm:space-y-0">
      {/* Row info */}
      {showRowInfo && rowInfo && (
        <div className="mr-4 flex-1 text-muted-foreground text-sm">
          {rowInfo.selected !== undefined && (
            <>
              {rowInfo.selected} of {rowInfo.total}{" "}
              {pluralizeRow(rowInfo.selected)} selected.
            </>
          )}
          {rowInfo.selected === undefined && (
            <>
              Showing {rowInfo.total} {pluralizeRow(rowInfo.total)}
            </>
          )}
        </div>
      )}

      {/* Pagination */}
      <nav aria-label="Pagination" className="flex items-center space-x-1">
        {/* Previous */}
        <Button
          aria-label="Go to previous page"
          disabled={!canPreviousPage}
          onClick={onPreviousPage}
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
                  aria-current={item.value === currentPage ? "page" : undefined}
                  aria-label={`Go to page ${item.value}`}
                  key={`desktop-page-${item.value}`}
                  onClick={() => onPageChange(item.value)}
                  size="sm"
                  variant={item.value === currentPage ? "default" : "ghost"}
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
                  aria-current={item.value === currentPage ? "page" : undefined}
                  aria-label={`Go to page ${item.value}`}
                  key={`tablet-page-${item.value}`}
                  onClick={() => onPageChange(item.value)}
                  size="sm"
                  variant={item.value === currentPage ? "default" : "ghost"}
                >
                  {item.value}
                </Button>
              )
            )}
          </div>
        )}

        {/* Mobile - just page indicator */}
        {variant === "mobile" && (
          <div className="flex items-center space-x-2">
            <span className="text-sm">
              Page {currentPage} of {totalPages}
            </span>
          </div>
        )}

        {/* Next */}
        <Button
          aria-label="Go to next page"
          disabled={!canNextPage}
          onClick={onNextPage}
          size="icon"
          variant="ghost"
        >
          <ChevronRight />
        </Button>
      </nav>
    </div>
  );
}
