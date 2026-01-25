import type * as React from "react";

// ============================================================================
// Core Types
// ============================================================================

export type ViewMode = "table" | "list" | "grid";

export type SortDirection = "asc" | "desc";

export interface SortConfig {
  field: string;
  direction: SortDirection;
}

export interface FilterValue {
  field: string;
  operator:
    | "equals"
    | "contains"
    | "startsWith"
    | "endsWith"
    | "gt"
    | "lt"
    | "gte"
    | "lte"
    | "between"
    | "in";
  value: unknown;
}

export interface PaginationConfig {
  page: number;
  pageSize: number;
  total: number;
  pageSizeOptions?: number[];
}

// ============================================================================
// Server-Side Request Types
// ============================================================================

export interface ServerSideRequest {
  /** Current page number */
  page: number;
  /** Number of items per page */
  pageSize: number;
  /** Search query */
  search: string;
  /** Active filters */
  filters: FilterValue[];
  /** Current sort configuration */
  sort: SortConfig | null;
}

export interface ServerSideResponse<T> {
  /** Data items for the current page */
  data: T[];
  /** Total number of items (for pagination) */
  total: number;
}

/** Threshold for switching to server-side mode (default: 500) */
export const CLIENT_SIDE_THRESHOLD = 500;

export type DataMode = "client" | "server";

// ============================================================================
// Column Definition
// ============================================================================

export interface ColumnDef<T = unknown> {
  /** Unique identifier for the column */
  id: string;
  /** Header label */
  header: string;
  /** Optional tooltip to show next to the header */
  headerTooltip?: string;
  /** Accessor key or function to get the value */
  accessorKey?: keyof T;
  accessorFn?: (row: T) => unknown;
  /** Custom cell renderer */
  cell?: (props: { row: T; value: unknown }) => React.ReactNode;
  /** Enable sorting for this column */
  sortable?: boolean;
  /** Enable filtering for this column */
  filterable?: boolean;
  /** Filter type */
  filterType?: "text" | "select" | "number" | "date" | "boolean";
  /** Filter options for select type */
  filterOptions?: { value: string; label: string }[];
  /** Column width */
  width?: string | number;
  /** Min width */
  minWidth?: string | number;
  /** Max width */
  maxWidth?: string | number;
  /** Text alignment */
  align?: "left" | "center" | "right";
  /** Enable ellipsis (default: true) */
  ellipsis?: boolean;
  /** Hide column */
  hidden?: boolean;
  /** Sticky column position */
  sticky?: "left" | "right";
  /** Custom class name */
  className?: string;
  /** Header class name */
  headerClassName?: string;
}

// ============================================================================
// Field Definition (for List and Grid views)
// ============================================================================

export interface FieldDef<T = unknown> {
  /** Unique identifier for the field */
  id: string;
  /** Display label */
  label: string;
  /** Accessor key or function to get the value */
  accessorKey?: keyof T;
  accessorFn?: (row: T) => unknown;
  /** Custom renderer */
  render?: (props: { row: T; value: unknown }) => React.ReactNode;
  /** Enable ellipsis (default: true) */
  ellipsis?: boolean;
  /** Field type for formatting */
  type?: "text" | "number" | "date" | "badge" | "image" | "custom";
  /** Badge variant mapping */
  badgeVariants?: Record<
    string,
    "default" | "secondary" | "destructive" | "outline" | "success" | "warning"
  >;
  /** Primary field (used as title in list/grid) */
  primary?: boolean;
  /** Secondary field (used as subtitle) */
  secondary?: boolean;
  /** Hide in specific views */
  hideInTable?: boolean;
  hideInList?: boolean;
  hideInGrid?: boolean;
}

// ============================================================================
// Bulk Action Definition
// ============================================================================

export interface BulkAction<T = unknown> {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Icon component */
  icon?: React.ComponentType<{ className?: string }>;
  /** Action handler */
  onAction: (selectedRows: T[]) => void | Promise<void>;
  /** Variant for styling */
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost";
  /** Disabled state or function */
  disabled?: boolean | ((selectedRows: T[]) => boolean);
  /** Confirmation message */
  confirmMessage?: string;
}

// ============================================================================
// Row Action Definition
// ============================================================================

export interface RowAction<T = unknown> {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Icon component */
  icon?: React.ComponentType<{ className?: string }>;
  /** Action handler */
  onAction: (row: T) => void | Promise<void>;
  /** Variant for styling */
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost";
  /** Disabled state or function */
  disabled?: boolean | ((row: T) => boolean);
  /** Hide action or function */
  hidden?: boolean | ((row: T) => boolean);
  /** Show as inline button instead of in dropdown menu */
  inline?: boolean;
}

// ============================================================================
// Data View Configuration
// ============================================================================

export interface DataViewConfig<T = unknown> {
  /** Unique identifier for the data view */
  id?: string;
  /** Available view modes */
  availableViews?: ViewMode[];
  /** Default view mode */
  defaultView?: ViewMode;
  /** Column definitions for table view */
  columns: ColumnDef<T>[];
  /** Field definitions for list/grid views (optional, derived from columns if not provided) */
  fields?: FieldDef<T>[];
  /** Row key accessor */
  getRowId: (row: T) => string | number;
  /** Enable row selection */
  selectable?: boolean;
  /** Enable multi-select */
  multiSelect?: boolean;
  /** Bulk actions */
  bulkActions?: BulkAction<T>[];
  /** Row actions */
  rowActions?: RowAction<T>[];
  /** Sortable columns */
  sortable?: boolean;
  /** Default sort config */
  defaultSort?: SortConfig;
  /** Searchable */
  searchable?: boolean;
  /** Search placeholder */
  searchPlaceholder?: string;
  /** Filterable */
  filterable?: boolean;
  /** Pagination */
  paginated?: boolean;
  /** Default page size */
  defaultPageSize?: number;
  /** Page size options */
  pageSizeOptions?: number[];
  /** Empty state message */
  emptyMessage?: string;
  /** Loading state message */
  loadingMessage?: string;
  /** Dense mode (compact rows) */
  dense?: boolean;
  /** Striped rows */
  striped?: boolean;
  /** Hover effect */
  hoverable?: boolean;
  /** Border style */
  bordered?: boolean;
  /** Wrap content in a Card */
  withCard?: boolean;
  /** Card style for grid view */
  gridCardClassName?: string;
  /** Custom list item renderer */
  listItemRenderer?: (props: {
    row: T;
    fields: FieldDef<T>[];
    selected: boolean;
    onSelect: () => void;
  }) => React.ReactNode;
  /** Custom grid card renderer */
  gridCardRenderer?: (props: {
    row: T;
    fields: FieldDef<T>[];
    selected: boolean;
    onSelect: () => void;
  }) => React.ReactNode;
  /** Responsive breakpoints for auto view switching */
  responsiveBreakpoints?: {
    /** Switch to list view below this width */
    list?: number;
    /** Switch to grid view below this width */
    grid?: number;
  };
  /**
   * Force a specific data mode. If not set, automatically determined:
   * - "client": data.length <= 500 (client-side search/sort/filter/pagination)
   * - "server": data.length > 500 (server-side operations required)
   */
  mode?: DataMode;
  /**
   * Threshold for auto-switching to server-side mode.
   * Default: 500
   */
  clientSideThreshold?: number;
}

// ============================================================================
// Data View State
// ============================================================================

export interface DataViewState {
  /** Current view mode */
  view: ViewMode;
  /** Search query */
  search: string;
  /** Active filters */
  filters: FilterValue[];
  /** Current sort config */
  sort: SortConfig | null;
  /** Selected row IDs */
  selectedIds: Set<string | number>;
  /** Pagination state */
  pagination: PaginationConfig;
  /** Expanded row IDs (for nested data) */
  expandedIds: Set<string | number>;
  /** Column visibility state */
  columnVisibility: Record<string, boolean>;
}

// ============================================================================
// Data View Props
// ============================================================================

export interface DataViewProps<T = unknown> extends DataViewConfig<T> {
  /** Data to display */
  data: T[];
  /** Loading state */
  loading?: boolean;
  /** Total count for server-side pagination */
  totalCount?: number;
  /** Controlled view mode */
  view?: ViewMode;
  /** View mode change handler */
  onViewChange?: (view: ViewMode) => void;
  /** Controlled search */
  search?: string;
  /** Search change handler */
  onSearchChange?: (search: string) => void;
  /** Controlled filters */
  filters?: FilterValue[];
  /** Filters change handler */
  onFiltersChange?: (filters: FilterValue[]) => void;
  /** Controlled sort */
  sort?: SortConfig | null;
  /** Sort change handler */
  onSortChange?: (sort: SortConfig | null) => void;
  /** Controlled selection */
  selectedIds?: Set<string | number>;
  /** Selection change handler */
  onSelectionChange?: (selectedIds: Set<string | number>) => void;
  /** Controlled pagination */
  pagination?: PaginationConfig;
  /** Pagination change handler */
  onPaginationChange?: (pagination: PaginationConfig) => void;
  /** Row click handler */
  onRowClick?: (row: T) => void;
  /** Row double click handler */
  onRowDoubleClick?: (row: T) => void;
  /** Custom class name */
  className?: string;
  /** Toolbar class name */
  toolbarClassName?: string;
  /** Content class name */
  contentClassName?: string;
  /** Controlled column visibility */
  columnVisibility?: Record<string, boolean>;
  /** Column visibility change handler */
  onColumnVisibilityChange?: (visibility: Record<string, boolean>) => void;
  /** Custom content above the toolbar (full width) */
  toolbarTop?: React.ReactNode;
  /** Custom toolbar content (left side) - compose with SearchInput, FilterButton, etc. */
  toolbarLeft?: React.ReactNode;
  /** Primary action button (e.g., "Add User", "Create Item") - renders at top-right */
  primaryAction?: React.ReactNode;
  /** Custom toolbar content (right side) - compose with FilterButton, SortButton, ViewToggle, etc. */
  toolbarRight?: React.ReactNode;
  /** Custom empty state */
  emptyState?: React.ReactNode;
  /** Custom loading state */
  loadingState?: React.ReactNode;
  /**
   * Server-side data fetch handler. Called when in server mode and
   * search/sort/filter/pagination changes.
   * Return the data for the current page and total count.
   */
  onFetchData?: (
    request: ServerSideRequest
  ) => Promise<ServerSideResponse<T>> | ServerSideResponse<T>;
}
