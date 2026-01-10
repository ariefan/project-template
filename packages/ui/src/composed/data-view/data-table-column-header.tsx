import type { Column } from "@tanstack/react-table";
import {
  ArrowDownWideNarrow,
  ArrowUpDown,
  ArrowUpNarrowWide,
  EyeOff,
} from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { cn } from "@workspace/ui/lib/utils";

interface DataTableColumnHeaderProps<TData, TValue>
  extends React.HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>;
  title: string;
  variant?: "toggle" | "dropdown";
}

function SortIcon<TData, TValue>({
  column,
}: {
  column: Column<TData, TValue>;
}) {
  const sorted = column.getIsSorted();
  if (sorted === "desc") {
    return <ArrowDownWideNarrow />;
  }
  if (sorted === "asc") {
    return <ArrowUpNarrowWide />;
  }
  return <ArrowUpDown />;
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
  variant = "toggle",
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <div className={cn(className)}>{title}</div>;
  }

  function handleToggleSort() {
    const current = column.getIsSorted();
    if (current === false) {
      column.toggleSorting(false); // asc
    } else if (current === "asc") {
      column.toggleSorting(true); // desc
    } else {
      column.clearSorting(); // clear
    }
  }

  if (variant === "toggle") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Button
          className="-ml-3 h-8"
          onClick={handleToggleSort}
          size="sm"
          variant="ghost"
        >
          <span>{title}</span>
          <SortIcon column={column} />
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            className="-ml-3 h-8 data-[state=open]:bg-accent"
            size="sm"
            variant="ghost"
          >
            <span>{title}</span>
            <SortIcon column={column} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => column.toggleSorting(false)}>
            <ArrowUpNarrowWide />
            Asc
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => column.toggleSorting(true)}>
            <ArrowDownWideNarrow />
            Desc
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => column.toggleVisibility(false)}>
            <EyeOff />
            Hide
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
