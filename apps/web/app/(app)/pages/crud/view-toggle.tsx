"use client";

import type { ColumnDef } from "@tanstack/react-table";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group";
import { LayoutList, Table } from "lucide-react";
import * as React from "react";
import type { Payment } from "./columns";
import { DataTable } from "./data-table";
import { ListItemView } from "./list-item";

interface ViewToggleProps {
  columns: ColumnDef<Payment>[];
  data: Payment[];
}

export function ViewToggle({ columns, data }: ViewToggleProps) {
  const [view, setView] = React.useState<"table" | "list">("table");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-bold text-2xl">Payments</h1>
        <ToggleGroup
          onValueChange={(value) => {
            if (value === "table" || value === "list") {
              setView(value);
            }
          }}
          type="single"
          value={view}
          variant="outline"
        >
          <ToggleGroupItem aria-label="Table view" value="table">
            <Table className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem aria-label="List view" value="list">
            <LayoutList className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      {view === "table" ? (
        <DataTable columns={columns} data={data} />
      ) : (
        <ListItemView data={data} />
      )}
    </div>
  );
}
