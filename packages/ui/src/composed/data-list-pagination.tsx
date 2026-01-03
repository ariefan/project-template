import { PaginationBase, type PaginationState } from "./pagination-base";

interface DataListPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showRowInfo?: boolean;
  rowInfo?: {
    showing: number;
    total: number;
  };
}

export function DataListPagination({
  currentPage,
  totalPages,
  onPageChange,
  showRowInfo = false,
  rowInfo,
}: DataListPaginationProps) {
  const paginationState: PaginationState = {
    currentPage,
    totalPages,
    canPreviousPage: currentPage > 1,
    canNextPage: currentPage < totalPages,
    onPreviousPage: () => onPageChange(Math.max(1, currentPage - 1)),
    onNextPage: () => onPageChange(Math.min(totalPages, currentPage + 1)),
    onPageChange,
    onFirstPage: () => onPageChange(1),
    onLastPage: () => onPageChange(totalPages),
  };

  return (
    <PaginationBase
      pagination={paginationState}
      rowInfo={
        rowInfo
          ? {
              total: rowInfo.total,
            }
          : undefined
      }
      showPageNumbers
      showRowInfo={showRowInfo}
      variant="desktop"
    />
  );
}
