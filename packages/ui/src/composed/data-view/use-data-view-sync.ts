"use client";

import {
  parseAsInteger,
  parseAsJson,
  parseAsString,
  useQueryState,
} from "nuqs";
import * as React from "react";
import type {
  FilterValue,
  PaginationConfig,
  SortConfig,
  ViewMode,
} from "./types";

export interface UseDataViewSyncOptions {
  id?: string; // Optional prefix for keys
  defaultView?: ViewMode;
  defaultPageSize?: number;
  defaultSort?: SortConfig;
}

export function useDataViewSync(options: UseDataViewSyncOptions = {}) {
  const {
    id,
    defaultView = "table",
    defaultPageSize = 10,
    defaultSort = null,
  } = options;

  const prefix = id ? `${id}_` : "";

  // View - use a parser that validates the value is a valid ViewMode
  const parseAsViewMode = parseAsString.withOptions({
    history: "push",
  });
  const [view, setView] = useQueryState(`${prefix}view`, parseAsViewMode) as [
    ViewMode | null,
    (view: ViewMode | null) => void,
  ];
  const safeView: ViewMode = view ?? defaultView;

  // Search
  const [search, setSearch] = useQueryState(
    `${prefix}q`,
    parseAsString.withDefault("").withOptions({ throttleMs: 500 })
  );

  // Pagination
  const [page, setPageVal] = useQueryState(
    `${prefix}page`,
    parseAsInteger.withDefault(1)
  );

  const [pageSize, setPageSizeVal] = useQueryState(
    `${prefix}size`,
    parseAsInteger.withDefault(defaultPageSize)
  );

  // Sort - use nullish coalescing for default value
  const [sort, setSort] = useQueryState(
    `${prefix}sort`,
    parseAsJson(() => null)
  );
  const safeSort: SortConfig | null = (sort ??
    defaultSort) as SortConfig | null;

  // Filters - use nullish coalescing for default value
  const [filters, setFilters] = useQueryState(
    `${prefix}filters`,
    parseAsJson(() => null)
  );
  const safeFilters: FilterValue[] = (filters ?? []) as FilterValue[];

  // Helpers to match DataViewProps signature

  const onPaginationChange = React.useCallback(
    (newPagination: PaginationConfig) => {
      setPageVal(newPagination.page);
      setPageSizeVal(newPagination.pageSize);
    },
    [setPageVal, setPageSizeVal]
  );

  const pagination: PaginationConfig = React.useMemo(
    () => ({
      page: page ?? 1,
      pageSize: pageSize ?? defaultPageSize,
      total: 0, // This will be overwritten by DataViewProvider with actual total
    }),
    [page, pageSize, defaultPageSize]
  );

  // We need to return props compatible with DataView
  return {
    view: safeView,
    onViewChange: setView,
    search,
    onSearchChange: setSearch,
    sort: safeSort,
    onSortChange: setSort,
    filters: safeFilters,
    onFiltersChange: setFilters,
    pagination,
    onPaginationChange,
  };
}
