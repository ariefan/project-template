"use client";

import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from "@workspace/ui/components/item";
import { DataListPagination } from "@workspace/ui/composed/data-list-pagination";
import { Copy, DollarSign, Mail, MoreHorizontal, User } from "lucide-react";
import * as React from "react";
import type { Payment } from "./columns";

interface ListItemViewProps {
  data: Payment[];
}

const STATUS_COLORS = {
  pending: "bg-yellow-500/10 text-yellow-500",
  processing: "bg-blue-500/10 text-blue-500",
  success: "bg-green-500/10 text-green-500",
  failed: "bg-red-500/10 text-red-500",
} as const;

function getStatusBadge(status: Payment["status"]) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-medium text-xs ${STATUS_COLORS[status]}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function ListItemView({ data }: ListItemViewProps) {
  const [currentPage, setCurrentPage] = React.useState(1);
  const pageSize = 10;
  const totalPages = Math.ceil(data.length / pageSize);

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = data.slice(startIndex, endIndex);

  return (
    <div className="flex flex-col gap-4">
      <ItemGroup>
        {paginatedData.map((payment, index) => (
          <React.Fragment key={payment.id}>
            <Item className="group transition-colors hover:bg-muted/50">
              <ItemMedia>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
              </ItemMedia>
              <ItemContent className="gap-2">
                <div className="flex items-center gap-2">
                  <ItemTitle className="text-base">{payment.id}</ItemTitle>
                  {getStatusBadge(payment.status)}
                </div>
                <ItemDescription className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" />
                    {payment.email}
                  </span>
                  <span className="flex items-center gap-1.5 font-medium">
                    <DollarSign className="h-3.5 w-3.5" />
                    {formatAmount(payment.amount)}
                  </span>
                </ItemDescription>
              </ItemContent>
              <ItemActions>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      aria-label="Open menu"
                      className="h-8 w-8 p-0"
                      variant="ghost"
                    >
                      <span className="sr-only">Open menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem
                      onClick={() => navigator.clipboard.writeText(payment.id)}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copy payment ID
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <User className="mr-2 h-4 w-4" />
                      View customer
                    </DropdownMenuItem>
                    <DropdownMenuItem>View payment details</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </ItemActions>
            </Item>
            {index !== paginatedData.length - 1 && <ItemSeparator />}
          </React.Fragment>
        ))}
      </ItemGroup>
      <DataListPagination
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        rowInfo={{
          showing: paginatedData.length,
          total: data.length,
        }}
        showRowInfo
        totalPages={totalPages}
      />
    </div>
  );
}
