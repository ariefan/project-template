import type { Table } from "@tanstack/react-table";
import { PaginationBase, type PaginationState } from "./pagination-base";

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
}

export function DataTablePagination<TData>({
  table,
}: DataTablePaginationProps<TData>) {
  const { pageIndex } = table.getState().pagination;
  const currentPage = pageIndex + 1;
  const totalPages = table.getPageCount();

  const paginationState: PaginationState = {
    currentPage,
    totalPages,
    canPreviousPage: table.getCanPreviousPage(),
    canNextPage: table.getCanNextPage(),
    onPreviousPage: () => table.previousPage(),
    onNextPage: () => table.nextPage(),
    onPageChange: (page) => table.setPageIndex(page - 1),
    onFirstPage: () => table.setPageIndex(0),
    onLastPage: () => table.setPageIndex(totalPages - 1),
  };

  return (
    <PaginationBase
      pagination={paginationState}
      rowInfo={{
        selected: table.getFilteredSelectedRowModel().rows.length,
        total: table.getFilteredRowModel().rows.length,
      }}
      showPageNumbers
      showRowInfo
      variant="desktop"
    />
  );
}
