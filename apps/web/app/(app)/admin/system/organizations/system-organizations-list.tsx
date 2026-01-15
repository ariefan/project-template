"use client";

import { useQuery } from "@tanstack/react-query";
import type { SystemOrganization } from "@workspace/contracts";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
  type ColumnDef,
  DataView as DataTable,
  SearchInput,
} from "@workspace/ui/composed/data-view";
import { format } from "date-fns";
import { Edit, MoreHorizontal, Trash } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { listSystemOrganizations } from "@/actions/system-organizations";
import { DeleteOrganizationDialog } from "./delete-organization-dialog";
import { EditOrganizationDialog } from "./edit-organization-dialog";

export function SystemOrganizationsList() {
  const [isMounted, setIsMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [targetOrg, setTargetOrg] = useState<SystemOrganization | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const limit = 20;

  useEffect(() => setIsMounted(true), []);

  const { data: result, isLoading } = useQuery({
    queryKey: ["system-organizations", page, searchQuery],
    queryFn: () =>
      listSystemOrganizations({ page, limit, search: searchQuery }),
  });

  const organizations = result?.data?.organizations ?? [];
  const _total = result?.data?.total ?? 0;

  const columns = useMemo<ColumnDef<SystemOrganization>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <Avatar className="size-8 rounded">
              <AvatarImage alt={row.name} src={row.logo ?? undefined} />
              <AvatarFallback className="rounded">
                {row.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">{row.name}</div>
              <div className="text-muted-foreground text-xs">{row.slug}</div>
            </div>
          </div>
        ),
      },
      {
        id: "createdAt",
        accessorKey: "createdAt",
        header: "Created",
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {format(new Date(row.createdAt), "MMM d, yyyy")}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          return (
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="size-8" size="icon" variant="ghost">
                    <MoreHorizontal className="size-4" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => {
                      setTargetOrg(row);
                      setEditDialogOpen(true);
                    }}
                  >
                    <Edit className="mr-2 size-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => {
                      setTargetOrg(row);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash className="mr-2 size-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    []
  );

  return (
    <>
      <DataTable
        columns={columns}
        data={organizations}
        emptyMessage={
          searchQuery
            ? "No organizations match your search."
            : "No organizations found."
        }
        getRowId={(row) => row.id}
        loading={!isMounted || isLoading}
        onSearchChange={(value) => {
          setSearchQuery(value);
          setPage(1); // Reset to first page on search
        }}
        search={searchQuery}
        toolbarLeft={<SearchInput placeholder="Search organizations..." />}
      />

      <EditOrganizationDialog
        onOpenChange={setEditDialogOpen}
        open={editDialogOpen}
        organization={targetOrg}
      />

      <DeleteOrganizationDialog
        onOpenChange={setDeleteDialogOpen}
        open={deleteDialogOpen}
        organization={targetOrg}
      />
    </>
  );
}
