import type { Table } from "@tanstack/react-table";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../components/button";

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
}

export function DataTablePagination<TData>({
  table,
}: DataTablePaginationProps<TData>) {
  const { pageIndex } = table.getState().pagination;
  const totalPages = table.getPageCount();
  const currentPage = pageIndex + 1;

  const addEllipsisBetween = (
    pages: (number | "...")[],
    prevPage: number,
    currentPageNum: number
  ): void => {
    const diff = currentPageNum - prevPage;
    if (diff === 2) {
      pages.push(prevPage + 1);
    } else if (diff > 2) {
      pages.push("...");
    }
  };

  const buildPagesWithEllipsis = (pages: number[]): (number | "...")[] => {
    const pagesWithEllipsis: (number | "...")[] = [];
    for (let i = 0; i < pages.length; i++) {
      const currentPageNum = pages[i];
      if (currentPageNum === undefined) {
        continue;
      }

      if (i === 0) {
        pagesWithEllipsis.push(currentPageNum);
      } else {
        const prevPageNum = pages[i - 1];
        if (prevPageNum === undefined) {
          continue;
        }

        addEllipsisBetween(pagesWithEllipsis, prevPageNum, currentPageNum);
        pagesWithEllipsis.push(currentPageNum);
      }
    }

    return pagesWithEllipsis;
  };

  const addLeftPages = (pages: number[]): void => {
    const window = 2;
    for (let i = currentPage - window; i < currentPage; i++) {
      if (i > 1) {
        pages.push(i);
      }
    }
  };

  const addRightPages = (pages: number[]): void => {
    const window = 2;
    for (let i = currentPage + 1; i <= currentPage + window; i++) {
      if (i < totalPages) {
        pages.push(i);
      }
    }
  };

  const buildDesktopPageList = (): number[] => {
    const pages: number[] = [];

    if (totalPages <= 1) {
      return [];
    }

    pages.push(1);
    addLeftPages(pages);

    // Current
    if (currentPage !== 1 && currentPage !== totalPages) {
      pages.push(currentPage);
    }

    addRightPages(pages);

    // Last page
    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages;
  };

  const buildTabletPageList = (): number[] => {
    const arr: number[] = [];

    if (totalPages <= 1) {
      return [];
    }

    arr.push(1);

    if (currentPage !== 1 && currentPage !== totalPages) {
      arr.push(currentPage);
    }

    if (totalPages > 1) {
      arr.push(totalPages);
    }

    return arr;
  };

  const generateDesktopPages = (): (number | "...")[] => {
    const pages = buildDesktopPageList();
    return buildPagesWithEllipsis(pages);
  };

  const generateTabletPages = (): (number | "...")[] => {
    const arr = buildTabletPageList();
    return buildPagesWithEllipsis(arr);
  };

  return (
    <div className="flex flex-col items-center justify-between space-y-2 px-2 py-2 sm:flex-row sm:space-y-0">
      {/* Row info */}
      <div className="flex-1 text-muted-foreground text-sm">
        {table.getFilteredSelectedRowModel().rows.length} of{" "}
        {table.getFilteredRowModel().rows.length} row(s) selected.
      </div>

      {/* Pagination */}
      <nav aria-label="Pagination" className="flex items-center space-x-1">
        {/* Prev */}
        <Button
          aria-label="Go to previous page"
          disabled={!table.getCanPreviousPage()}
          onClick={() => table.previousPage()}
          size="icon"
          variant="outline"
        >
          <ChevronLeft />
        </Button>

        {/* Desktop numbers */}
        <div className="hidden items-center space-x-1 lg:flex">
          {generateDesktopPages().map((p) =>
            p === "..." ? (
              <span
                aria-hidden="true"
                className="select-none px-2"
                key="ellipsis-desktop"
              >
                …
              </span>
            ) : (
              <Button
                aria-current={p === currentPage ? "page" : undefined}
                aria-label={`Go to page ${p}`}
                key={`page-${p}`}
                onClick={() => table.setPageIndex(p - 1)}
                size="sm"
                variant={p === currentPage ? "default" : "ghost"}
              >
                {p}
              </Button>
            )
          )}
        </div>

        {/* Tablet numbers */}
        <div className="hidden items-center space-x-1 sm:flex lg:hidden">
          {generateTabletPages().map((p) =>
            p === "..." ? (
              <span
                aria-hidden="true"
                className="select-none px-2"
                key="ellipsis-tablet"
              >
                …
              </span>
            ) : (
              <Button
                aria-current={p === currentPage ? "page" : undefined}
                aria-label={`Go to page ${p}`}
                key={`page-${p}`}
                onClick={() => table.setPageIndex(p - 1)}
                size="sm"
                variant={p === currentPage ? "default" : "ghost"}
              >
                {p}
              </Button>
            )
          )}
        </div>

        {/* Next */}
        <Button
          aria-label="Go to next page"
          disabled={!table.getCanNextPage()}
          onClick={() => table.nextPage()}
          size="icon"
          variant="outline"
        >
          <ChevronRight />
        </Button>
      </nav>
    </div>
  );
}
