"use client";

import * as React from "react";
import type {
  DataMode,
  DataViewConfig,
  DataViewState,
  FilterValue,
  PaginationConfig,
  ServerSideRequest,
  ServerSideResponse,
  SortConfig,
  ViewMode,
} from "./types";
import { CLIENT_SIDE_THRESHOLD } from "./types";

// ============================================================================
// Context Types
// ============================================================================

interface SearchableField {
  id: string;
  label: string;
}

interface DataViewContextValue<T = unknown> extends DataViewState {
  // Config
  config: DataViewConfig<T>;
  data: T[];
  loading: boolean;
  /** Whether the data view is operating in server-side mode */
  isServerSide: boolean;
  /** The current data mode */
  mode: DataMode;

  // Actions
  setView: (view: ViewMode) => void;
  setSearch: (search: string) => void;
  setSearchField: (field: string | null) => void;
  setFilters: (filters: FilterValue[]) => void;
  addFilter: (filter: FilterValue) => void;
  removeFilter: (field: string) => void;
  clearFilters: () => void;
  setSort: (sort: SortConfig | null) => void;
  toggleSort: (field: string) => void;
  setSelectedIds: (ids: Set<string | number>) => void;
  selectRow: (id: string | number) => void;
  deselectRow: (id: string | number) => void;
  toggleRowSelection: (id: string | number) => void;
  selectAll: () => void;
  deselectAll: () => void;
  toggleSelectAll: () => void;
  setPagination: (pagination: PaginationConfig) => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  toggleExpanded: (id: string | number) => void;

  // Computed
  selectedRows: T[];
  isAllSelected: boolean;
  isSomeSelected: boolean;
  totalPages: number;
  processedData: T[];
  paginatedData: T[];
  /** Fields that can be searched (derived from columns) */
  searchableFields: SearchableField[];
  /** Currently selected search field (null = all fields) */
  searchField: string | null;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract a value from a row using a column definition.
 * Uses accessorFn if available, otherwise falls back to accessorKey.
 */
function getColumnValue<T>(
  row: T,
  column: { accessorFn?: (row: T) => unknown; accessorKey?: keyof T }
): unknown {
  if (column.accessorFn) {
    return column.accessorFn(row);
  }
  if (column.accessorKey) {
    return (row as Record<string, unknown>)[column.accessorKey as string];
  }
  return null;
}

// ============================================================================
// Context
// ============================================================================

const DataViewContext = React.createContext<DataViewContextValue | null>(null);

// ============================================================================
// Hook
// ============================================================================

export function useDataView<T = unknown>() {
  const context = React.useContext(
    DataViewContext
  ) as DataViewContextValue<T> | null;
  if (!context) {
    throw new Error("useDataView must be used within a DataViewProvider");
  }
  return context;
}

// ============================================================================
// Provider Props
// ============================================================================

interface DataViewProviderProps<T> {
  children: React.ReactNode;
  config: DataViewConfig<T>;
  data: T[];
  loading?: boolean;
  totalCount?: number;
  // Controlled state props
  view?: ViewMode;
  onViewChange?: (view: ViewMode) => void;
  search?: string;
  onSearchChange?: (search: string) => void;
  filters?: FilterValue[];
  onFiltersChange?: (filters: FilterValue[]) => void;
  sort?: SortConfig | null;
  onSortChange?: (sort: SortConfig | null) => void;
  selectedIds?: Set<string | number>;
  onSelectionChange?: (selectedIds: Set<string | number>) => void;
  pagination?: PaginationConfig;
  onPaginationChange?: (pagination: PaginationConfig) => void;
  /** Server-side data fetch handler */
  onFetchData?: (
    request: ServerSideRequest
  ) => Promise<ServerSideResponse<T>> | ServerSideResponse<T>;
}

// ============================================================================
// Provider
// ============================================================================

export function DataViewProvider<T>({
  children,
  config,
  data,
  loading: externalLoading = false,
  totalCount,
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
  onFetchData,
}: DataViewProviderProps<T>) {
  // Determine data mode (client or server)
  const threshold = config.clientSideThreshold ?? CLIENT_SIDE_THRESHOLD;
  const mode: DataMode = React.useMemo(() => {
    if (config.mode) {
      return config.mode;
    }
    // If totalCount is provided and > threshold, use server mode
    if (totalCount !== undefined && totalCount > threshold) {
      return "server";
    }
    // If data length > threshold, use server mode
    if (data.length > threshold) {
      return "server";
    }
    return "client";
  }, [config.mode, totalCount, data.length, threshold]);

  const isServerSide = mode === "server";

  // Internal state (used when not controlled)
  const [internalView, setInternalView] = React.useState<ViewMode>(
    config.defaultView ?? "table"
  );
  const [internalSearch, setInternalSearch] = React.useState("");
  const [internalFilters, setInternalFilters] = React.useState<FilterValue[]>(
    []
  );
  const [internalSort, setInternalSort] = React.useState<SortConfig | null>(
    config.defaultSort ?? null
  );
  const [internalSelectedIds, setInternalSelectedIds] = React.useState<
    Set<string | number>
  >(new Set());
  const [internalPagination, setInternalPagination] =
    React.useState<PaginationConfig>({
      page: 1,
      pageSize: config.defaultPageSize ?? 10,
      total: totalCount ?? data.length,
      pageSizeOptions: config.pageSizeOptions ?? [10, 25, 50, 100],
    });
  const [expandedIds, setExpandedIds] = React.useState<Set<string | number>>(
    new Set()
  );
  const [internalSearchField, setInternalSearchField] = React.useState<
    string | null
  >(null);

  // Server-side state
  const [serverData, setServerData] = React.useState<T[]>([]);
  const [serverLoading, setServerLoading] = React.useState(false);

  // Determine if controlled or uncontrolled
  const view = controlledView ?? internalView;
  const search = controlledSearch ?? internalSearch;
  const searchField = internalSearchField;
  const filters = controlledFilters ?? internalFilters;
  const sort = controlledSort ?? internalSort;
  const selectedIds = controlledSelectedIds ?? internalSelectedIds;
  const pagination = controlledPagination ?? internalPagination;

  // Combined loading state
  const loading = externalLoading || serverLoading;

  // Use ref to access pagination without causing dependency loops
  const paginationRef = React.useRef(pagination);
  paginationRef.current = pagination;

  // Update total when data/totalCount changes (client mode only)
  React.useEffect(() => {
    if (!isServerSide) {
      const newTotal = totalCount ?? data.length;
      const currentPagination = paginationRef.current;
      if (currentPagination.total !== newTotal) {
        const newPagination = { ...currentPagination, total: newTotal };
        if (onPaginationChange) {
          onPaginationChange(newPagination);
        } else {
          setInternalPagination(newPagination);
        }
      }
    }
  }, [data.length, totalCount, isServerSide, onPaginationChange]);

  // Server-side data fetching
  const serverPage = pagination.page;
  const serverPageSize = pagination.pageSize;
  React.useEffect(() => {
    if (!(isServerSide && onFetchData)) {
      return;
    }

    const fetchData = async () => {
      setServerLoading(true);
      try {
        const request: ServerSideRequest = {
          page: serverPage,
          pageSize: serverPageSize,
          search,
          filters,
          sort,
        };
        const response = await onFetchData(request);
        setServerData(response.data);

        // Update total from server response (use ref to get current pagination)
        const currentPagination = paginationRef.current;
        if (response.total !== currentPagination.total) {
          const newPagination = { ...currentPagination, total: response.total };
          if (onPaginationChange) {
            onPaginationChange(newPagination);
          } else {
            setInternalPagination(newPagination);
          }
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
        setServerData([]);
      } finally {
        setServerLoading(false);
      }
    };

    fetchData();
  }, [
    isServerSide,
    onFetchData,
    serverPage,
    serverPageSize,
    search,
    filters,
    sort,
    onPaginationChange,
  ]);

  // Actions
  const setView = React.useCallback(
    (newView: ViewMode) => {
      if (onViewChange) {
        onViewChange(newView);
      } else {
        setInternalView(newView);
      }
    },
    [onViewChange]
  );

  const resetToFirstPage = React.useCallback(() => {
    // Only update if not already on page 1 to avoid unnecessary re-renders
    const currentPagination = paginationRef.current;
    if (currentPagination.page === 1) {
      return;
    }
    const newPagination = { ...currentPagination, page: 1 };
    if (onPaginationChange) {
      onPaginationChange(newPagination);
    } else {
      setInternalPagination(newPagination);
    }
  }, [onPaginationChange]);

  const setSearch = React.useCallback(
    (newSearch: string) => {
      if (onSearchChange) {
        onSearchChange(newSearch);
      } else {
        setInternalSearch(newSearch);
      }
      // Reset to first page when searching
      resetToFirstPage();
    },
    [onSearchChange, resetToFirstPage]
  );

  const setSearchField = React.useCallback(
    (field: string | null) => {
      setInternalSearchField(field);
      // Reset to first page when changing search field
      resetToFirstPage();
    },
    [resetToFirstPage]
  );

  const setFilters = React.useCallback(
    (newFilters: FilterValue[]) => {
      if (onFiltersChange) {
        onFiltersChange(newFilters);
      } else {
        setInternalFilters(newFilters);
      }
      resetToFirstPage();
    },
    [onFiltersChange, resetToFirstPage]
  );

  // Use a ref to access current filters without adding to dependency array
  const filtersRef = React.useRef(filters);
  filtersRef.current = filters;

  const addFilter = React.useCallback(
    (filter: FilterValue) => {
      const currentFilters = filtersRef.current;
      const newFilters = [
        ...currentFilters.filter((f) => f.field !== filter.field),
        filter,
      ];
      setFilters(newFilters);
    },
    [setFilters]
  );

  const removeFilter = React.useCallback(
    (field: string) => {
      const currentFilters = filtersRef.current;
      const newFilters = currentFilters.filter((f) => f.field !== field);
      setFilters(newFilters);
    },
    [setFilters]
  );

  const clearFilters = React.useCallback(() => {
    setFilters([]);
  }, [setFilters]);

  const setSort = React.useCallback(
    (newSort: SortConfig | null) => {
      if (onSortChange) {
        onSortChange(newSort);
      } else {
        setInternalSort(newSort);
      }
    },
    [onSortChange]
  );

  const toggleSort = React.useCallback(
    (field: string) => {
      if (sort?.field === field) {
        if (sort.direction === "asc") {
          setSort({ field, direction: "desc" });
        } else {
          setSort(null);
        }
      } else {
        setSort({ field, direction: "asc" });
      }
    },
    [sort, setSort]
  );

  const setSelectedIds = React.useCallback(
    (ids: Set<string | number>) => {
      if (onSelectionChange) {
        onSelectionChange(ids);
      } else {
        setInternalSelectedIds(ids);
      }
    },
    [onSelectionChange]
  );

  const selectRow = React.useCallback(
    (id: string | number) => {
      const newIds = new Set(selectedIds);
      newIds.add(id);
      setSelectedIds(newIds);
    },
    [selectedIds, setSelectedIds]
  );

  const deselectRow = React.useCallback(
    (id: string | number) => {
      const newIds = new Set(selectedIds);
      newIds.delete(id);
      setSelectedIds(newIds);
    },
    [selectedIds, setSelectedIds]
  );

  const toggleRowSelection = React.useCallback(
    (id: string | number) => {
      if (selectedIds.has(id)) {
        deselectRow(id);
      } else if (config.multiSelect !== false) {
        selectRow(id);
      } else {
        setSelectedIds(new Set([id]));
      }
    },
    [selectedIds, selectRow, deselectRow, setSelectedIds, config.multiSelect]
  );

  // Use the appropriate data source based on mode
  const displayData = isServerSide ? serverData : data;

  const getRowId = config.getRowId;
  const selectAll = React.useCallback(() => {
    const allIds = displayData.map((row) => getRowId(row));
    setSelectedIds(new Set(allIds));
  }, [displayData, getRowId, setSelectedIds]);

  const deselectAll = React.useCallback(() => {
    setSelectedIds(new Set());
  }, [setSelectedIds]);

  const toggleSelectAll = React.useCallback(() => {
    if (selectedIds.size === displayData.length) {
      deselectAll();
    } else {
      selectAll();
    }
  }, [selectedIds.size, displayData.length, selectAll, deselectAll]);

  const setPagination = React.useCallback(
    (newPagination: PaginationConfig) => {
      if (onPaginationChange) {
        onPaginationChange(newPagination);
      } else {
        setInternalPagination(newPagination);
      }
    },
    [onPaginationChange]
  );

  const setPage = React.useCallback(
    (page: number) => {
      const currentPagination = paginationRef.current;
      setPagination({ ...currentPagination, page });
    },
    [setPagination]
  );

  const setPageSize = React.useCallback(
    (pageSize: number) => {
      const currentPagination = paginationRef.current;
      setPagination({ ...currentPagination, pageSize, page: 1 });
    },
    [setPagination]
  );

  const toggleExpanded = React.useCallback((id: string | number) => {
    setExpandedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  // Computed values
  const selectedRows = React.useMemo(
    () => displayData.filter((row) => selectedIds.has(getRowId(row))),
    [displayData, selectedIds, getRowId]
  );

  const isAllSelected = React.useMemo(
    () => displayData.length > 0 && selectedIds.size === displayData.length,
    [displayData.length, selectedIds.size]
  );

  const isSomeSelected = React.useMemo(
    () => selectedIds.size > 0 && selectedIds.size < displayData.length,
    [selectedIds.size, displayData.length]
  );

  const totalPages = React.useMemo(
    () => Math.ceil(pagination.total / pagination.pageSize),
    [pagination.total, pagination.pageSize]
  );

  // Compute searchable fields from columns
  const searchableFields = React.useMemo(() => {
    return config.columns
      .filter((col) => !col.hidden)
      .map((col) => ({
        id: col.id,
        label: col.header,
      }));
  }, [config.columns]);

  // Process data: filter and sort (for CLIENT-SIDE operations only)
  const processedData = React.useMemo(() => {
    // In server mode, data is already processed by the server
    if (isServerSide) {
      return serverData;
    }

    let result = [...data];

    // Apply search (client-side only)
    if (search && config.searchable !== false) {
      const searchLower = search.toLowerCase();
      result = result.filter((row) => {
        // If a specific field is selected, only search that field
        if (searchField) {
          const column = config.columns.find((c) => c.id === searchField);
          if (column) {
            const value = getColumnValue(row, column);
            return String(value ?? "")
              .toLowerCase()
              .includes(searchLower);
          }
          return false;
        }
        // Otherwise search all columns
        return config.columns.some((col) => {
          const value = getColumnValue(row, col);
          return String(value ?? "")
            .toLowerCase()
            .includes(searchLower);
        });
      });
    }

    // Apply filters (client-side only)
    if (filters.length > 0) {
      result = result.filter((row) => {
        return filters.every((filter) => {
          const column = config.columns.find((c) => c.id === filter.field);
          if (!column) {
            return true;
          }

          const value = getColumnValue(row, column);

          switch (filter.operator) {
            case "equals":
              return value === filter.value;
            case "contains":
              return String(value ?? "")
                .toLowerCase()
                .includes(String(filter.value).toLowerCase());
            case "startsWith":
              return String(value ?? "")
                .toLowerCase()
                .startsWith(String(filter.value).toLowerCase());
            case "endsWith":
              return String(value ?? "")
                .toLowerCase()
                .endsWith(String(filter.value).toLowerCase());
            case "gt":
              return Number(value) > Number(filter.value);
            case "lt":
              return Number(value) < Number(filter.value);
            case "gte":
              return Number(value) >= Number(filter.value);
            case "lte":
              return Number(value) <= Number(filter.value);
            case "in":
              return (
                Array.isArray(filter.value) && filter.value.includes(value)
              );
            default:
              return true;
          }
        });
      });
    }

    // Apply sort (client-side only)
    if (sort) {
      const column = config.columns.find((c) => c.id === sort.field);
      if (column) {
        // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: sorting logic requires null handling and direction comparison
        result.sort((a, b) => {
          const aValue = getColumnValue(a, column);
          const bValue = getColumnValue(b, column);

          if (aValue === bValue) {
            return 0;
          }
          if (aValue == null) {
            return 1;
          }
          if (bValue == null) {
            return -1;
          }

          const comparison = aValue < bValue ? -1 : 1;
          return sort.direction === "asc" ? comparison : -comparison;
        });
      }
    }

    return result;
  }, [
    data,
    serverData,
    isServerSide,
    search,
    searchField,
    filters,
    sort,
    config.columns,
    config.searchable,
  ]);

  // Paginated data
  const paginatedData = React.useMemo(() => {
    // In server mode, data is already paginated
    if (isServerSide) {
      return serverData;
    }

    if (!config.paginated) {
      return processedData;
    }

    const start = (pagination.page - 1) * pagination.pageSize;
    const end = start + pagination.pageSize;
    return processedData.slice(start, end);
  }, [
    processedData,
    serverData,
    isServerSide,
    pagination.page,
    pagination.pageSize,
    config.paginated,
  ]);

  // Update pagination total when processedData changes (client mode only)
  React.useEffect(() => {
    if (!isServerSide && config.paginated && !totalCount) {
      const newTotal = processedData.length;
      const currentPagination = paginationRef.current;
      if (currentPagination.total !== newTotal) {
        setPagination({ ...currentPagination, total: newTotal });
      }
    }
  }, [
    processedData.length,
    config.paginated,
    totalCount,
    isServerSide,
    setPagination,
  ]);

  const value: DataViewContextValue<T> = {
    // State
    view,
    search,
    searchField,
    filters,
    sort,
    selectedIds,
    pagination,
    expandedIds,

    // Config & Data
    config,
    data: displayData,
    loading,
    isServerSide,
    mode,

    // Actions
    setView,
    setSearch,
    setSearchField,
    setFilters,
    addFilter,
    removeFilter,
    clearFilters,
    setSort,
    toggleSort,
    setSelectedIds,
    selectRow,
    deselectRow,
    toggleRowSelection,
    selectAll,
    deselectAll,
    toggleSelectAll,
    setPagination,
    setPage,
    setPageSize,
    toggleExpanded,

    // Computed
    selectedRows,
    isAllSelected,
    isSomeSelected,
    totalPages,
    processedData,
    paginatedData,
    searchableFields,
  };

  return (
    <DataViewContext.Provider value={value as DataViewContextValue}>
      {children}
    </DataViewContext.Provider>
  );
}

export { DataViewContext };
