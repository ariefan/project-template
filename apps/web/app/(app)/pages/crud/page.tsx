"use client";

import { useQuery } from "@tanstack/react-query";
import type { ExamplePost } from "@workspace/contracts";
import { examplePostsListOptions } from "@workspace/contracts/query";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  type BulkAction,
  type ColumnDef,
  ColumnsButton,
  DataView as DataViewComponent,
  ExportButton,
  FilterButton,
  type RowAction,
  SearchInput,
  SortButton,
  type ViewMode,
  ViewToggle,
} from "@workspace/ui/composed/data-view";
import { Edit, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layouts/page-header";
import { apiClient } from "@/lib/api-client";
import { useActiveOrganization } from "@/lib/auth";
import { PostFormDialog } from "./components/post-form-dialog";
import { StatsCards } from "./components/stats-cards";
import { usePostMutations, usePostsData } from "./hooks/use-posts-data";

const MODE_THRESHOLD = 1000; // Switch to server mode above this count

export default function CrudPage() {
  const { data: orgData, isPending: orgLoading } = useActiveOrganization();
  const orgId = orgData?.id ?? "";
  const { deletePost, restorePost } = usePostMutations();
  const { fetchPosts } = usePostsData();

  // Step 1: Get total count to determine which mode to use
  const { data: countData } = useQuery({
    ...examplePostsListOptions({
      client: apiClient,
      path: { orgId },
      query: { page: 1, pageSize: 1 }, // Just get the count
    }),
    enabled: Boolean(orgId),
  });

  const totalCount =
    (countData as { pagination?: { totalCount: number } })?.pagination
      ?.totalCount ?? 0;

  // Step 2: Determine mode based on count
  const useServerMode = totalCount > MODE_THRESHOLD;

  // Step 3: Fetch data for client mode (only if needed)
  const { data: clientData, isLoading: clientLoading } = useQuery({
    ...examplePostsListOptions({
      client: apiClient,
      path: { orgId },
      query: { page: 1, pageSize: Math.max(totalCount, 100) }, // Fetch all records
    }),
    enabled: Boolean(orgId) && !useServerMode,
  });

  const posts = (clientData as { data?: ExamplePost[] })?.data ?? [];

  const [mounted, setMounted] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  const [editingPost, setEditingPost] = useState<ExamplePost | undefined>();

  // Column definitions
  const columns: ColumnDef<ExamplePost>[] = [
    {
      id: "id",
      header: "ID",
      accessorKey: "id",
      width: 100,
    },
    {
      id: "title",
      header: "Title",
      accessorKey: "title",
      sortable: true,
      filterable: true,
      filterType: "text",
      minWidth: 200,
    },
    {
      id: "status",
      header: "Status",
      accessorKey: "status",
      sortable: true,
      filterable: true,
      filterType: "select",
      filterOptions: [
        { value: "draft", label: "Draft" },
        { value: "published", label: "Published" },
        { value: "archived", label: "Archived" },
      ],
      width: 150,
      cell: ({ row, value }) => {
        const statusVariants: Record<
          string,
          "default" | "secondary" | "destructive" | "outline"
        > = {
          draft: "secondary",
          published: "default",
          archived: "outline",
        };
        return (
          <div className="flex items-center gap-2">
            <Badge variant={statusVariants[String(value)] ?? "outline"}>
              {String(value)}
            </Badge>
            {row.isDeleted && <Badge variant="destructive">Deleted</Badge>}
          </div>
        );
      },
    },
    {
      id: "authorId",
      header: "Author",
      accessorKey: "authorId",
      filterable: true,
      filterType: "text",
      width: 120,
    },
    {
      id: "createdAt",
      header: "Created",
      accessorKey: "createdAt",
      sortable: true,
      width: 110,
      cell: ({ value }) => new Date(String(value)).toLocaleDateString(),
    },
    {
      id: "updatedAt",
      header: "Updated",
      accessorKey: "updatedAt",
      sortable: true,
      width: 110,
      cell: ({ value }) => new Date(String(value)).toLocaleDateString(),
    },
  ];

  // Row actions
  const rowActions: RowAction<ExamplePost>[] = [
    {
      id: "edit",
      label: "Edit",
      icon: Edit,
      onAction: (row) => {
        setEditingPost(row);
        setDialogOpen(true);
      },
      hidden: (row) => row.isDeleted,
    },
    {
      id: "delete",
      label: "Delete",
      icon: Trash2,
      variant: "destructive",
      onAction: async (row) => {
        await deletePost(row.id);
      },
      hidden: (row) => row.isDeleted,
    },
    {
      id: "restore",
      label: "Restore",
      icon: RotateCcw,
      onAction: async (row) => {
        await restorePost(row.id);
      },
      hidden: (row) => !row.isDeleted,
    },
  ];

  // Bulk actions
  const bulkActions: BulkAction<ExamplePost>[] = [
    {
      id: "delete",
      label: "Delete Selected",
      icon: Trash2,
      variant: "destructive",
      confirmMessage: "Are you sure you want to delete the selected posts?",
      onAction: async (rows) => {
        await Promise.all(
          rows.filter((r) => !r.isDeleted).map((row) => deletePost(row.id))
        );
      },
      disabled: (rows) => rows.every((r) => r.isDeleted),
    },
    {
      id: "restore",
      label: "Restore Selected",
      icon: RotateCcw,
      onAction: async (rows) => {
        await Promise.all(
          rows.filter((r) => r.isDeleted).map((row) => restorePost(row.id))
        );
      },
      disabled: (rows) => rows.every((r) => !r.isDeleted),
    },
  ];

  function handleCreateNew() {
    setEditingPost(undefined);
    setDialogOpen(true);
  }

  function renderContent() {
    if (!(orgData?.id || orgLoading)) {
      return (
        <div className="py-8 text-center text-muted-foreground">
          Please select an organization
        </div>
      );
    }

    // Show mode indicator
    const modeIndicator = (
      <div className="mb-2 text-muted-foreground text-xs">
        {useServerMode
          ? `🚀 Server mode (${totalCount.toLocaleString()} posts)`
          : `💻 Client mode (${totalCount.toLocaleString()} posts)`}
      </div>
    );

    const commonProps = {
      availableViews: ["table", "list", "grid"] as ViewMode[],
      bulkActions,
      columns,
      defaultPageSize: 10,
      defaultView: "table" as ViewMode,
      emptyMessage: "No posts found",
      filterable: true,
      getRowId: (row: ExamplePost) => row.id,
      hoverable: true,
      loading: orgLoading || clientLoading,
      loadingMessage: "Loading posts...",
      multiSelect: true,
      pageSizeOptions: [10, 25, 50, 100],
      paginated: true,
      responsiveBreakpoints: {
        list: 1024,
        grid: 640,
      },
      rowActions,
      searchable: true,
      selectable: true,
      sortable: true,
      toolbarLeft: <SearchInput showFieldSelector />,
      toolbarRight: (
        <>
          <ViewToggle />
          <ColumnsButton />
          <FilterButton />
          <SortButton />
          <ExportButton />
        </>
      ),
    };

    return (
      <>
        {modeIndicator}
        {useServerMode ? (
          <DataViewComponent<ExamplePost>
            {...commonProps}
            data={[]}
            mode="server"
            onFetchData={fetchPosts}
          />
        ) : (
          <DataViewComponent<ExamplePost> {...commonProps} data={posts} />
        )}
      </>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl p-4">
      <PageHeader
        actions={
          mounted && orgId ? (
            <Button onClick={handleCreateNew}>
              <Plus className="size-4" />
              <span className="hidden sm:inline">New Post</span>
            </Button>
          ) : null
        }
        description="Manage your blog posts with real API integration. Create, edit, delete, and restore posts."
        stats={<StatsCards />}
        title="Posts Management"
      />

      {/* DataView - only render when orgId is available */}
      {renderContent()}

      {/* Form Dialog */}
      <PostFormDialog
        mode={editingPost ? "edit" : "create"}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingPost(undefined);
          }
        }}
        open={dialogOpen}
        post={editingPost}
      />
    </div>
  );
}
