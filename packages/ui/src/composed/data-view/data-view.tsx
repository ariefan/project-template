"use client";

import { cn } from "@workspace/ui/lib/utils";
import * as React from "react";
import { DataViewProvider } from "./context";
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
  toolbarLeft,
  toolbarRight,
  emptyState,
  loadingState,
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
      gridCardClassName,
      listItemRenderer,
      gridCardRenderer,
      responsiveBreakpoints,
      mode,
      clientSideThreshold,
    ]
  );

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
      <div className={cn("space-y-4", className)}>
        {/* Toolbar */}
        <DataViewToolbar className={toolbarClassName}>
          {toolbarLeft}
          {selectable && <InlineBulkActions />}
          {toolbarRight}
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
            <div className="hidden sm:block">
              <DataViewPagination />
            </div>
            {/* Mobile pagination */}
            <div className="sm:hidden">
              <SimplePagination />
            </div>
          </>
        )}

        {/* Floating bulk actions (alternative to inline) */}
        {/* <DataViewBulkActions position="floating" /> */}
      </div>
    </DataViewProvider>
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
  if (loading && loadingState) {
    return <>{loadingState}</>;
  }

  if (data.length === 0 && !loading && emptyState) {
    return <>{emptyState}</>;
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
