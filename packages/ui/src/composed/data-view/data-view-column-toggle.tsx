"use client";

import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { Settings2 } from "lucide-react";
import * as React from "react";
import { useDataView } from "./context";

export interface ColumnsButtonProps {
  className?: string;
}

export function ColumnsButton({ className }: ColumnsButtonProps) {
  const { config, columnVisibility, setColumnVisibility } = useDataView();

  const toggleColumn = React.useCallback(
    (columnId: string, checked: boolean) => {
      setColumnVisibility({
        ...columnVisibility,
        [columnId]: checked,
      });
    },
    [columnVisibility, setColumnVisibility]
  );

  // Filter out columns that shouldn't be toggleable (e.g., if they have no header or are forced hidden in specific way)
  // For now, allow toggling all defined columns except those that explicitly shouldn't be?
  // Usually we show all columns that have a header.
  const columns = React.useMemo(() => {
    return config.columns.filter(
      (col) => col.header && typeof col.header === "string"
    );
  }, [config.columns]);

  if (columns.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                aria-label="Toggle columns"
                className={className}
                size="icon"
                variant="ghost"
              >
                <Settings2 className="size-4" />
                <span className="sr-only">Columns</span>
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>Customize columns</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DropdownMenuContent align="end" className="w-[150px]">
        <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {columns.map((column) => {
          // Default to visible if not in visibility map
          // Note: The visibility map stores "isVisible" as true/false/undefined.
          // If undefined, we fall back to !column.hidden
          // BUT, we want to allow user to toggle ON a hidden column.
          // So the logic is:
          // isVisible = columnVisibility[id] !== undefined ? columnVisibility[id] : !column.hidden

          const isVisible =
            columnVisibility[column.id] !== undefined
              ? columnVisibility[column.id]
              : !column.hidden;

          return (
            <DropdownMenuCheckboxItem
              checked={isVisible}
              className="capitalize"
              key={column.id}
              onCheckedChange={(checked) => toggleColumn(column.id, checked)}
            >
              {column.header}
            </DropdownMenuCheckboxItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
