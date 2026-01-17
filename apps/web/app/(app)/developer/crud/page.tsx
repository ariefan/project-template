"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ExamplePost } from "@workspace/contracts";
import { examplePostsListOptions } from "@workspace/contracts/query";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@workspace/ui/components/item";
import {
  type BulkAction,
  type ColumnDef,
  ColumnsButton,
  DataViewActionMenu,
  DataView as DataViewComponent,
  ExportButton,
  FilterButton,
  filterVisibleActions,
  RefreshButton,
  type RowAction,
  SearchInput,
  SortButton,
  type ViewMode,
  ViewToggle,
} from "@workspace/ui/composed/data-view";
import { cn } from "@workspace/ui/lib/utils";
import {
  Database,
  Edit,
  Plus,
  RotateCcw,
  Star,
  Tag,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layouts/page-header";
import { apiClient, filesGet } from "@/lib/api-client";
import { useActiveOrganization } from "@/lib/auth";
import { PostFormDialog } from "./components/post-form-dialog";
import { StatsCards } from "./components/stats-cards";
import { usePostMutations, usePostsData } from "./hooks/use-posts-data";

const CLIENT_MODE_LIMIT = 500; // Max rows for client-side mode

/*
 * Helper to get file URL.
 */
function PostImage({
  fileId,
  orgId,
  className,
}: {
  fileId?: string;
  orgId: string;
  className?: string;
}) {
  const { data: fileUrl } = useQuery({
    queryKey: ["file-url", fileId, orgId],
    queryFn: async () => {
      if (!fileId) {
        return null;
      }
      // Check if it's a specific seed ID that implies a picsum URL (hack for demo)
      if (fileId.startsWith("file_picsum_")) {
        const id = fileId.replace("file_picsum_", "");
        return `https://picsum.photos/id/${id}/800/600`;
      }

      // Otherwise try to fetch from API
      try {
        const { data, error } = await filesGet({
          client: apiClient,
          path: { orgId, fileId },
        });

        if (!error && data && "data" in data && data.data.url) {
          return data.data.url;
        }
        return null;
      } catch {
        return null;
      }
    },
    enabled: !!fileId,
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  if (!(fileId && fileUrl)) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted text-muted-foreground",
          className
        )}
      >
        <Database className="size-4 opacity-50" />
      </div>
    );
  }

  return (
    <div className={cn("relative h-full w-full", className)}>
      <Image
        alt="Cover"
        className="object-cover"
        fill
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        src={fileUrl}
      />
    </div>
  );
}

export default function CrudPage() {
  const { data: orgData, isPending: orgLoading } = useActiveOrganization();
  const orgId = orgData?.id ?? "";
  const { deletePost, restorePost } = usePostMutations();
  const { fetchPosts } = usePostsData();
  const queryClient = useQueryClient();

  // Refresh callback for DataView
  const handleRefresh = () => {
    queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey[0] as { _id?: string } | undefined;
        return key?._id === "examplePostsList";
      },
    });
  };

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
  const useServerMode = totalCount > CLIENT_MODE_LIMIT;

  // Step 3: Fetch data for client mode (only if needed)
  const { data: clientData, isFetching: clientFetching } = useQuery({
    ...examplePostsListOptions({
      client: apiClient,
      path: { orgId },
      query: { page: 1, pageSize: Math.min(totalCount, CLIENT_MODE_LIMIT) },
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
    {
      id: "category",
      header: "Category",
      accessorKey: "category",
      filterable: true,
      filterType: "text",
      width: 150,
      cell: ({ value }) => (
        <div className="flex items-center gap-2">
          {value ? (
            <Badge className="capitalize" variant="outline">
              {String(value)}
            </Badge>
          ) : (
            <span className="text-muted-foreground text-sm">-</span>
          )}
        </div>
      ),
    },
    {
      id: "isFeatured",
      header: "Featured",
      accessorKey: "isFeatured",
      filterable: true,
      filterType: "select",
      filterOptions: [
        { value: "true", label: "Featured" },
        { value: "false", label: "Standard" },
      ],
      width: 120,
      cell: ({ value }) =>
        value ? (
          <Badge
            className="bg-yellow-500/15 text-yellow-700 hover:bg-yellow-500/25 dark:text-yellow-400"
            variant="default"
          >
            <Star className="mr-1 size-3 fill-current" /> Featured
          </Badge>
        ) : null,
    },
    {
      id: "tags",
      header: "Tags",
      accessorKey: "tags",
      width: 200,
      cell: ({ value }) => {
        const tags = (value as string[]) || [];
        if (tags.length === 0) {
          return <span className="text-muted-foreground text-sm">-</span>;
        }
        return (
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 2).map((tag) => (
              <Badge className="text-[10px]" key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
            {tags.length > 2 && (
              <span className="text-[10px] text-muted-foreground">
                +{tags.length - 2}
              </span>
            )}
          </div>
        );
      },
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

  const renderListItem = ({
    row,
    selected,
    onSelect,
    fields,
  }: {
    row: ExamplePost;
    selected: boolean;
    onSelect: () => void;
    fields: { id: string }[];
  }) => {
    const statusVariants: Record<
      string,
      "default" | "secondary" | "destructive" | "outline"
    > = {
      draft: "secondary",
      published: "default",
      archived: "outline",
    };

    const isVisible = (id: string) => fields.some((f) => f.id === id);

    const visibleActions = filterVisibleActions(rowActions, row);
    const inlineActions = visibleActions.filter((a) => a.inline);
    const menuActions = visibleActions.filter((a) => !a.inline);

    return (
      <Item className={cn("hover:bg-primary/5", selected && "bg-primary/10")}>
        <ItemMedia>
          <div className="relative flex items-center justify-center">
            <Checkbox
              aria-label="Select row"
              checked={selected}
              className="absolute top-1/2 left-2 z-10 -translate-y-1/2 bg-background/50 backdrop-blur-[1px]"
              onCheckedChange={onSelect}
            />
            {/* We assume image is essentially the identity/preview of the item, usually kept visible or bundled with Title, 
                but technically it's not a column in definitions. 
                However, if we wanted to toggle it, we'd need a column ID for it. 
                For now keeping it always visible as it's part of the layout. */}
            <div className="ml-8 size-10 overflow-hidden rounded border bg-muted">
              <PostImage
                className="size-full"
                fileId={row.coverImageId}
                orgId={orgId}
              />
            </div>
          </div>
        </ItemMedia>
        <ItemContent>
          <ItemTitle className="flex items-center gap-2">
            {isVisible("title") && (
              <span className="font-semibold">{row.title}</span>
            )}
            {isVisible("status") && (
              <Badge
                className="capitalize"
                variant={statusVariants[row.status] ?? "outline"}
              >
                {row.status}
              </Badge>
            )}
          </ItemTitle>
          <ItemDescription className="flex flex-col gap-2">
            <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
              {isVisible("authorId") && (
                <span className="flex items-center gap-1">
                  <span className="text-muted-foreground">Author:</span>
                  <span className="font-medium text-foreground">
                    {row.authorId}
                  </span>
                </span>
              )}
              {isVisible("createdAt") && (
                <span className="flex items-center gap-1">
                  <span className="text-muted-foreground">Created:</span>
                  <span className="font-medium text-foreground">
                    {new Date(row.createdAt).toLocaleDateString()}
                  </span>
                </span>
              )}
              {isVisible("category") && row.category && (
                <span className="flex items-center gap-1">
                  <span className="text-muted-foreground">Category:</span>
                  <Badge className="h-5 px-1 text-[10px]" variant="outline">
                    {row.category}
                  </Badge>
                </span>
              )}
              {isVisible("isFeatured") && row.isFeatured && (
                <Badge
                  className="h-5 bg-yellow-500/15 px-1 text-[10px] text-yellow-700 hover:bg-yellow-500/25 dark:text-yellow-400"
                  variant="default"
                >
                  <Star className="mr-1 size-3 fill-current" /> Featured
                </Badge>
              )}
            </span>
            {isVisible("tags") && row.tags && row.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {row.tags.map((tag) => (
                  <Badge className="text-[10px]" key={tag} variant="secondary">
                    <Tag className="mr-1 size-3 opacity-50" />
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </ItemDescription>
        </ItemContent>
        <ItemActions>
          <div className="flex items-center gap-1">
            {inlineActions.map((action) => (
              <Button
                className="size-8"
                // @ts-expect-error
                disabled={action.disabled?.(row)}
                key={action.id}
                onClick={() => action.onAction(row)}
                size="icon"
                title={action.label}
                variant="ghost"
              >
                {action.icon && <action.icon className="size-4" />}
                <span className="sr-only">{action.label}</span>
              </Button>
            ))}
            {menuActions.length > 0 && (
              <DataViewActionMenu actions={menuActions} row={row} />
            )}
          </div>
        </ItemActions>
      </Item>
    );
  };

  /* Grid Item Renderer */
  const renderGridItem = ({
    row,
    selected,
    onSelect,
    fields,
  }: {
    row: ExamplePost;
    selected: boolean;
    onSelect: () => void;
    fields: { id: string }[];
  }) => {
    const statusVariants: Record<
      string,
      "default" | "secondary" | "destructive" | "outline"
    > = {
      draft: "secondary",
      published: "default",
      archived: "outline",
    };

    const isVisible = (id: string) => fields.some((f) => f.id === id);

    return (
      <div
        className={cn(
          "flex flex-col gap-3 overflow-hidden rounded-lg border bg-card p-0 transition-all hover:bg-accent/50",
          selected && "border-primary/50 bg-primary/5 hover:bg-primary/10"
        )}
      >
        <div className="relative h-32 w-full bg-muted">
          <PostImage
            className="h-full w-full object-cover"
            fileId={row.coverImageId}
            orgId={orgId}
          />
          <div className="absolute top-2 left-2">
            <Checkbox
              checked={selected}
              className="bg-background/80 backdrop-blur-sm"
              onCheckedChange={onSelect}
            />
          </div>
          {isVisible("isFeatured") && row.isFeatured && (
            <div className="absolute top-2 right-2">
              <Badge
                className="bg-yellow-500/90 text-yellow-950 shadow-sm hover:bg-yellow-500 dark:text-yellow-100"
                variant="default"
              >
                <Star className="mr-1 size-3 fill-current" /> Featured
              </Badge>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 p-4 pt-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex w-full flex-col gap-1">
              {isVisible("title") && (
                <span className="line-clamp-1 font-semibold text-sm">
                  {row.title}
                </span>
              )}
              <div className="flex items-center gap-2">
                {isVisible("status") && (
                  <Badge
                    className="h-5 px-1 text-[10px] capitalize"
                    variant={statusVariants[row.status] ?? "outline"}
                  >
                    {row.status}
                  </Badge>
                )}
              </div>
            </div>
            <DataViewActionMenu actions={rowActions} row={row} />
          </div>

          <div className="flex flex-col gap-2 text-muted-foreground text-xs">
            {/* Content isn't a column but let's keep it visible or optional? 
                It wasn't in list view. Let's assume it's part of the card layout.
                But if we want to be strict, we could check 'content' visibility if we had a column for it. 
                There is no 'content' column in columns def. So keeping it. */}
            <span className="line-clamp-2 min-h-[2.5em]">{row.content}</span>
            <div className="flex flex-wrap items-center gap-2">
              {isVisible("category") && row.category && (
                <Badge className="h-5 px-1 text-[10px]" variant="outline">
                  {row.category}
                </Badge>
              )}
              {isVisible("authorId") && (
                <span className="ml-auto flex items-center gap-1">
                  By {row.authorId}
                </span>
              )}
            </div>
            {isVisible("tags") && row.tags && row.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 border-t pt-2">
                {row.tags.slice(0, 3).map((tag) => (
                  <Badge
                    className="h-4 px-1 text-[9px]"
                    key={tag}
                    variant="secondary"
                  >
                    {tag}
                  </Badge>
                ))}
                {row.tags.length > 3 && (
                  <span className="text-[9px]">+{row.tags.length - 3}</span>
                )}
              </div>
            )}
            {/* Created At / Updated At are available columns but were not in the original grid layout.
                We can add them if visible. */}
            {(isVisible("createdAt") || isVisible("updatedAt")) && (
              <div className="flex flex-wrap gap-2 text-[10px]">
                {isVisible("createdAt") && (
                  <span>
                    Created: {new Date(row.createdAt).toLocaleDateString()}
                  </span>
                )}
                {isVisible("updatedAt") && (
                  <span>
                    Updated: {new Date(row.updatedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  function handleCreateNew() {
    setEditingPost(undefined);
    setDialogOpen(true);
  }

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
    listItemRenderer: renderListItem,
    gridCardRenderer: renderGridItem,
    loading: orgLoading || clientFetching,
    loadingMessage: "Loading posts...",
    multiSelect: true,
    pageSizeOptions: [10, 25, 50, 100],
    paginated: true,
    rowActions,
    searchable: true,
    selectable: true,
    sortable: true,
    toolbarLeft: <SearchInput showFieldSelector />,
    toolbarRight: (
      <>
        <RefreshButton onRefresh={handleRefresh} />
        <ViewToggle />
        <ColumnsButton />
        <FilterButton />
        <SortButton />
        <ExportButton />
      </>
    ),
  };

  const renderContent = () => {
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
  };

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
