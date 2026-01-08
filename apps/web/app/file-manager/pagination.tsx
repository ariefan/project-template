import { Button } from "@workspace/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  sortedFilesLength: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (items: number) => void;
}

export function Pagination({
  currentPage,
  totalPages,
  sortedFilesLength,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
}: PaginationProps) {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, sortedFilesLength);

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
      <div className="text-muted-foreground text-sm">
        Showing {sortedFilesLength > 0 ? startItem : 0} to {endItem} of{" "}
        {sortedFilesLength} items
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <span className="mr-2 text-muted-foreground text-sm">Rows:</span>
          <Select
            onValueChange={(value) => {
              onItemsPerPageChange(Number.parseInt(value, 10));
            }}
            value={itemsPerPage.toString()}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1">
          <Button
            className="h-8 w-8 p-0"
            disabled={currentPage === 1}
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            size="icon"
            variant="outline"
          >
            ←
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }

              return (
                <Button
                  className={`h-8 w-8 p-0 ${
                    currentPage === pageNum
                      ? "bg-primary text-primary-foreground"
                      : ""
                  }`}
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  size="icon"
                  variant={currentPage === pageNum ? "default" : "outline"}
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>
          <Button
            className="h-8 w-8 p-0"
            disabled={currentPage === totalPages}
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            size="icon"
            variant="outline"
          >
            →
          </Button>
        </div>
      </div>
    </div>
  );
}
