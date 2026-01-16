"use client";

import { Button } from "@workspace/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";
import { Database, SearchX } from "lucide-react";
import * as React from "react";
import { Card, CardContent } from "../../components/card";
import { DataViewProvider, useDataView } from "./context";
import { InlineBulkActions } from "./data-view-bulk-actions";
import { DataViewGrid } from "./data-view-grid";
import { DataViewList } from "./data-view-list";
import { DataViewPagination, SimplePagination } from "./data-view-pagination";
import { DataViewTable } from "./data-view-table";
import { ActiveFilters, DataViewToolbar } from "./data-view-toolbar";
import type { DataViewProps, ViewMode } from "./types";
import { useResponsiveView } from "./use-responsive-view";

// ============================================================================
// DataView Component
// ============================================================================

// biome-ignore lint/suspicious/noShadowRestrictedNames: DataView is the primary export name for this data visualization component
export function DataView<T>({
  // Data
  data,
  loading = false,
  totalCount,
  // Config
  columns,
  fields,
  getRowId,
  availableViews = ["table", "list", "grid"],
  defaultView = "table",
  selectable = false,
  multiSelect = true,
  bulkActions,
  rowActions,
  sortable = true,
  defaultSort,
  searchable = true,
  searchPlaceholder,
  filterable = true,
  paginated = true,
  defaultPageSize = 10,
  pageSizeOptions = [10, 25, 50, 100],
  emptyMessage,
  loadingMessage,
  dense = false,
  striped = false,
  hoverable = true,
  bordered = false,
  gridCardClassName,
  listItemRenderer,
  gridCardRenderer,
  responsiveBreakpoints,
  // Mode configuration
  mode,
  clientSideThreshold,
  // Controlled state
  view: controlledView,
  onViewChange,
  search: controlledSearch,
  onSearchChange,
  filters: controlledFilters,
  onFiltersChange,
  sort: controlledSort,
  onSortChange,
  selectedIds: controlledSelectedIds,
  onSelectionChange,
  pagination: controlledPagination,
  onPaginationChange,
  // Event handlers (reserved for future use in child components)
  // biome-ignore lint/correctness/noUnusedFunctionParameters: reserved for future child component use
  onRowClick,
  // biome-ignore lint/correctness/noUnusedFunctionParameters: reserved for future child component use
  onRowDoubleClick,
  // Server-side handler
  onFetchData,
  // Styling
  className,
  toolbarClassName,
  contentClassName,
  // Custom content
  // Custom content
  toolbarTop,
  toolbarLeft,
  primaryAction,
  toolbarRight,
  emptyState,
  loadingState,
  withCard = true,
}: DataViewProps<T>) {
  // Responsive view handling
  const responsive = useResponsiveView({
    defaultView,
    tabletBreakpoint: responsiveBreakpoints?.list ?? 1024,
    mobileBreakpoint: responsiveBreakpoints?.grid ?? 640,
    tabletView: "list",
    mobileView: "list",
    disabled: controlledView !== undefined,
  });

  // Determine the current view
  const view = controlledView ?? responsive.view;
  const setView = onViewChange ?? responsive.setView;

  // Build config object
  const config = React.useMemo(
    () => ({
      availableViews,
      defaultView,
      columns,
      fields,
      getRowId,
      selectable,
      multiSelect,
      bulkActions,
      rowActions,
      sortable,
      defaultSort,
      searchable,
      searchPlaceholder,
      filterable,
      paginated,
      defaultPageSize,
      pageSizeOptions,
      emptyMessage,
      loadingMessage,
      dense,
      striped,
      hoverable,
      bordered,
      withCard,
      gridCardClassName,
      listItemRenderer,
      gridCardRenderer,
      responsiveBreakpoints,
      mode,
      clientSideThreshold,
    }),
    [
      availableViews,
      defaultView,
      columns,
      fields,
      getRowId,
      selectable,
      multiSelect,
      bulkActions,
      rowActions,
      sortable,
      defaultSort,
      searchable,
      searchPlaceholder,
      filterable,
      paginated,
      defaultPageSize,
      pageSizeOptions,
      emptyMessage,
      loadingMessage,
      dense,
      striped,
      hoverable,
      bordered,
      withCard,
      gridCardClassName,
      listItemRenderer,
      gridCardRenderer,
      responsiveBreakpoints,
      mode,
      clientSideThreshold,
    ]
  );

  const { withCard: _withCard, ..._otherConfig } = config;

  // Custom layout logic for Grid View:
  // If view is "grid" and withCard is true, we split the layout:
  // 1. Toolbar & Filters -> Inside a Card (Panel)
  // 2. Content (Grid) -> Outside Card (Directly on background)
  // 3. Pagination -> outside
  const isSplitLayout = view === "grid" && config.withCard;

  const useCardRoot = !isSplitLayout && config.withCard;
  const RootComp = useCardRoot ? Card : "div";
  const rootProps = {
    className: cn("space-y-4", useCardRoot && "py-4", className),
  };

  const renderContent = () => {
    if (isSplitLayout) {
      return (
        <>
          {/* Toolbar Panel (Card) */}
          <Card className="py-4">
            <CardContent className="px-4">
              <div className="space-y-4">
                {toolbarTop}
                <DataViewToolbar
                  className={toolbarClassName}
                  leftContent={toolbarLeft}
                  primaryAction={primaryAction}
                  rightContent={toolbarRight}
                >
                  {selectable && <InlineBulkActions />}
                </DataViewToolbar>
                <ActiveFilters />
              </div>
            </CardContent>
          </Card>

          {/* Content (Grid) - Outside Card */}
          <div className={contentClassName}>
            <DataViewContentRenderer
              data={data}
              emptyState={emptyState}
              loading={loading}
              loadingState={loadingState}
              view={view}
            />
          </div>

          {/* Pagination */}
          {paginated && (
            <>
              <div className="my-0 hidden sm:block">
                <DataViewPagination />
              </div>
              <div className="my-0 sm:hidden">
                <SimplePagination />
              </div>
            </>
          )}
        </>
      );
    }

    if (config.withCard) {
      return (
        <CardContent className="px-4">
          <div className="space-y-4">
            {/* Toolbar Top */}
            {toolbarTop}

            {/* Toolbar */}
            <DataViewToolbar
              className={toolbarClassName}
              leftContent={toolbarLeft}
              primaryAction={primaryAction}
              rightContent={toolbarRight}
            >
              {selectable && <InlineBulkActions />}
            </DataViewToolbar>

            {/* Active Filters */}
            <ActiveFilters />

            {/* Content */}
            <div
              className={cn(
                bordered && "rounded-lg border",
                // If withCard is true, we force full-bleed unless contentClassName overrides it
                config.withCard && "-mx-4",
                contentClassName
              )}
            >
              <DataViewContentRenderer
                data={data}
                emptyState={emptyState}
                loading={loading}
                loadingState={loadingState}
                view={view}
              />
            </div>

            {/* Pagination */}
            {paginated && (
              <>
                {/* Desktop pagination */}
                <div className="my-0 hidden sm:block">
                  <DataViewPagination />
                </div>
                {/* Mobile pagination */}
                <div className="my-0 sm:hidden">
                  <SimplePagination />
                </div>
              </>
            )}
          </div>
        </CardContent>
      );
    }

    return (
      <div className="space-y-4">
        {/* Toolbar Top */}
        {toolbarTop}

        {/* Toolbar */}
        <DataViewToolbar
          className={toolbarClassName}
          leftContent={toolbarLeft}
          primaryAction={primaryAction}
          rightContent={toolbarRight}
        >
          {selectable && <InlineBulkActions />}
        </DataViewToolbar>

        {/* Active Filters */}
        <ActiveFilters />

        {/* Content */}
        <div className={cn(bordered && "rounded-lg border", contentClassName)}>
          <DataViewContentRenderer
            data={data}
            emptyState={emptyState}
            loading={loading}
            loadingState={loadingState}
            view={view}
          />
        </div>

        {/* Pagination */}
        {paginated && (
          <>
            {/* Desktop pagination */}
            <div className="my-0 hidden sm:block">
              <DataViewPagination />
            </div>
            {/* Mobile pagination */}
            <div className="my-0 sm:hidden">
              <SimplePagination />
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <DataViewProvider
      config={config}
      data={data}
      filters={controlledFilters}
      loading={loading}
      onFetchData={onFetchData}
      onFiltersChange={onFiltersChange}
      onPaginationChange={onPaginationChange}
      onSearchChange={onSearchChange}
      onSelectionChange={onSelectionChange}
      onSortChange={onSortChange}
      onViewChange={setView}
      pagination={controlledPagination}
      search={controlledSearch}
      selectedIds={controlledSelectedIds}
      sort={controlledSort}
      totalCount={totalCount}
      view={view}
    >
      <RootComp {...rootProps}>{renderContent()}</RootComp>
    </DataViewProvider>
  );
}

// ============================================================================
// DefaultLoadingState - Default loading skeleton component
// ============================================================================

function DefaultLoadingState({ view }: { view: ViewMode }) {
  const { config, columnVisibility } = useDataView();
  const skeletonRows = 5;

  // Derive visible columns for Table Skeleton
  const visibleColumns = React.useMemo(() => {
    return (config.columns || []).filter((col) => {
      if (columnVisibility[col.id] !== undefined) {
        return columnVisibility[col.id];
      }
      return !col.hidden;
    });
  }, [config.columns, columnVisibility]);

  // Table view loading state
  if (view === "table") {
    return (
      <div className="w-full overflow-auto">
        <div className="w-full caption-bottom text-sm">
          <div className="border-b">
            <div className="flex h-10 items-center px-4 text-left font-medium text-muted-foreground">
              {visibleColumns.map((col, i) => (
                <div
                  className="px-2 first:pl-0"
                  key={col.id || i}
                  style={{
                    width: col.width,
                    minWidth: col.minWidth,
                    maxWidth: col.maxWidth,
                    flex: col.width ? "none" : 1,
                  }}
                >
                  <Skeleton className="h-4 w-2/3" />
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-0">
            {Array.from({ length: skeletonRows }).map((_, i) => (
              <div
                className="flex items-center border-b px-4 py-3 last:border-0"
                // biome-ignore lint/suspicious/noArrayIndexKey: Skeleton rows are static
                key={i}
              >
                {visibleColumns.map((col, j) => (
                  <div
                    className="px-2 first:pl-0"
                    key={col.id || j}
                    style={{
                      width: col.width,
                      minWidth: col.minWidth,
                      maxWidth: col.maxWidth,
                      flex: col.width ? "none" : 1,
                    }}
                  >
                    <Skeleton className="h-4 w-full" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // List view loading state
  if (view === "list") {
    return (
      <div className="w-full">
        {Array.from({ length: skeletonRows }).map((_, i) => (
          <div
            className={cn(
              "flex items-center gap-4 border-b p-4 last:border-0",
              config.dense && "py-2"
            )}
            // biome-ignore lint/suspicious/noArrayIndexKey: Skeleton rows are static
            key={i}
          >
            {config.selectable && <Skeleton className="size-4 rounded" />}
            <div className="flex-1 space-y-1">
              <Skeleton className="h-5 w-1/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <Skeleton className="size-8 rounded-md" />
          </div>
        ))}
      </div>
    );
  }

  // Grid view loading state
  // Match grid-cols from DataViewGrid: grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
  return (
    <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: Skeleton rows are static
        <div className="flex flex-col space-y-3 rounded-lg border p-4" key={i}>
          <div className="flex items-start justify-between">
            <div className="w-full space-y-2">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <Skeleton className="size-8 rounded-md" />
          </div>
          <div className="space-y-1 py-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// DefaultEmptyState - Default empty state component
// ============================================================================

function DefaultEmptyState() {
  const { filters, search, setFilters, setSearch } = useDataView();

  const hasActiveFilters = filters.length > 0 || search.length > 0;

  const handleClearFilters = () => {
    setFilters([]);
    setSearch("");
  };

  if (hasActiveFilters) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <SearchX />
          </EmptyMedia>
          <EmptyTitle>No results found</EmptyTitle>
          <EmptyDescription>
            Try adjusting your search or filters to find what you're looking
            for.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button onClick={handleClearFilters} variant="outline">
            Clear filters
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Database />
        </EmptyMedia>
        <EmptyTitle>No data available</EmptyTitle>
        <EmptyDescription>
          There are no items to display at the moment.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

// ============================================================================
// DataViewContentRenderer - Handles loading/empty states and renders the view
// ============================================================================

interface DataViewContentRendererProps<T> {
  loading: boolean;
  loadingState?: React.ReactNode;
  data: T[];
  emptyState?: React.ReactNode;
  view: ViewMode;
}

function DataViewContentRenderer<T>({
  loading,
  loadingState,
  data,
  emptyState,
  view,
}: DataViewContentRendererProps<T>) {
  // Get the actual display data from context (handles server mode correctly)
  const {
    paginatedData,
    isServerSide,
    loading: contextLoading,
  } = useDataView<T>();

  // Use context loading for server mode, prop loading for client mode
  const isLoading = isServerSide ? contextLoading : loading;

  if (isLoading) {
    return <>{loadingState ?? <DefaultLoadingState view={view} />}</>;
  }

  // In server mode, check paginatedData from context; in client mode, check prop data
  const displayData = isServerSide ? paginatedData : data;

  if (displayData.length === 0 && !isLoading) {
    return <>{emptyState ?? <DefaultEmptyState />}</>;
  }

  switch (view) {
    case "table":
      return <DataViewTable />;
    case "list":
      return <DataViewList />;
    case "grid":
      return <DataViewGrid />;
    default:
      return <DataViewTable />;
  }
}

// ============================================================================
// Composable DataView Components
// ============================================================================

// Re-export composable components for custom layouts
export { DataViewProvider, useDataView } from "./context";
export {
  DataViewBulkActions,
  InlineBulkActions,
} from "./data-view-bulk-actions";
export { DataViewGrid } from "./data-view-grid";
export { DataViewList } from "./data-view-list";
export { DataViewPagination, SimplePagination } from "./data-view-pagination";
export { DataViewTable } from "./data-view-table";
export {
  ActiveFilters,
  DataViewToolbar,
  FilterButton,
  SearchInput,
  SortButton,
  ViewToggle,
} from "./data-view-toolbar";
export { useResponsiveView } from "./use-responsive-view";
