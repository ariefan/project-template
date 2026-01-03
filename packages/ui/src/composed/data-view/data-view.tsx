"use client"

import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"
import { DataViewProvider } from "./context"
import { DataViewTable } from "./data-view-table"
import { DataViewList } from "./data-view-list"
import { DataViewGrid } from "./data-view-grid"
import { DataViewToolbar, ActiveFilters } from "./data-view-toolbar"
import { DataViewPagination, SimplePagination } from "./data-view-pagination"
import { InlineBulkActions } from "./data-view-bulk-actions"
import { useResponsiveView } from "./use-responsive-view"
import type { DataViewProps, ViewMode } from "./types"

// ============================================================================
// DataView Component
// ============================================================================

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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onRowClick,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
  })

  // Determine the current view
  const view = controlledView ?? responsive.view
  const setView = onViewChange ?? responsive.setView

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
  )

  return (
    <DataViewProvider
      config={config}
      data={data}
      loading={loading}
      totalCount={totalCount}
      view={view}
      onViewChange={setView}
      search={controlledSearch}
      onSearchChange={onSearchChange}
      filters={controlledFilters}
      onFiltersChange={onFiltersChange}
      sort={controlledSort}
      onSortChange={onSortChange}
      selectedIds={controlledSelectedIds}
      onSelectionChange={onSelectionChange}
      pagination={controlledPagination}
      onPaginationChange={onPaginationChange}
      onFetchData={onFetchData}
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
        <div
          className={cn(
            bordered && "rounded-lg border",
            contentClassName
          )}
        >
          {loading && loadingState ? (
            loadingState
          ) : data.length === 0 && !loading && emptyState ? (
            emptyState
          ) : (
            <DataViewContent view={view} />
          )}
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
  )
}

// ============================================================================
// DataViewContent - Renders the appropriate view
// ============================================================================

interface DataViewContentProps {
  view: ViewMode
}

function DataViewContent({ view }: DataViewContentProps) {
  switch (view) {
    case "table":
      return <DataViewTable />
    case "list":
      return <DataViewList />
    case "grid":
      return <DataViewGrid />
    default:
      return <DataViewTable />
  }
}

// ============================================================================
// Composable DataView Components
// ============================================================================

// Re-export composable components for custom layouts
export { DataViewProvider, useDataView } from "./context"
export { DataViewTable } from "./data-view-table"
export { DataViewList } from "./data-view-list"
export { DataViewGrid } from "./data-view-grid"
export {
  DataViewToolbar,
  ViewToggle,
  SearchInput,
  FilterButton,
  SortButton,
  ActiveFilters,
} from "./data-view-toolbar"
export { DataViewPagination, SimplePagination } from "./data-view-pagination"
export { DataViewBulkActions, InlineBulkActions } from "./data-view-bulk-actions"
export { useResponsiveView } from "./use-responsive-view"
