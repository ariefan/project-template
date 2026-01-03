"use client";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { ButtonGroup } from "@workspace/ui/components/button-group";
import { Input } from "@workspace/ui/components/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { cn } from "@workspace/ui/lib/utils";
import {
  Filter,
  LayoutGrid,
  LayoutList,
  Search,
  SlidersHorizontal,
  Table2,
  X,
} from "lucide-react";
import * as React from "react";
import { useDataView } from "./context";
import type { ColumnDef, FilterValue, ViewMode } from "./types";

// ============================================================================
// View Toggle
// ============================================================================

interface ViewToggleProps {
  className?: string;
  availableViews?: ViewMode[];
}

export function ViewToggle({ className, availableViews }: ViewToggleProps) {
  const { view, setView, config } = useDataView();
  const views = availableViews ??
    config.availableViews ?? ["table", "list", "grid"];

  const viewIcons: Record<ViewMode, React.ReactNode> = {
    table: <Table2 className="size-4" />,
    list: <LayoutList className="size-4" />,
    grid: <LayoutGrid className="size-4" />,
  };

  const viewLabels: Record<ViewMode, string> = {
    table: "Table",
    list: "List",
    grid: "Grid",
  };

  if (views.length <= 1) {
    return null;
  }

  return (
    <ButtonGroup className={className}>
      {views.map((v) => (
        <Button
          aria-label={`Switch to ${viewLabels[v]} view`}
          aria-pressed={view === v}
          key={v}
          onClick={() => setView(v)}
          size="sm"
          variant={view === v ? "secondary" : "outline"}
        >
          {viewIcons[v]}
          <span className="sr-only sm:not-sr-only sm:ml-1">
            {viewLabels[v]}
          </span>
        </Button>
      ))}
    </ButtonGroup>
  );
}

// ============================================================================
// Search Input
// ============================================================================

interface SearchInputProps {
  className?: string;
  placeholder?: string;
}

export function SearchInput({ className, placeholder }: SearchInputProps) {
  const { search, setSearch, config } = useDataView();
  const [localSearch, setLocalSearch] = React.useState(search);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalSearch(value);

    // Debounce the actual search
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      setSearch(value);
    }, 300);
  };

  const handleClear = () => {
    setLocalSearch("");
    setSearch("");
  };

  if (config.searchable === false) {
    return null;
  }

  return (
    <div className={cn("relative", className)}>
      <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        className="h-8 w-full pr-8 pl-8 text-sm sm:w-64"
        onChange={handleChange}
        placeholder={placeholder ?? config.searchPlaceholder ?? "Search..."}
        type="search"
        value={localSearch}
      />
      {localSearch && (
        <button
          className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          onClick={handleClear}
          type="button"
        >
          <X className="size-4" />
          <span className="sr-only">Clear search</span>
        </button>
      )}
    </div>
  );
}

// ============================================================================
// Filter Button
// ============================================================================

interface FilterButtonProps {
  className?: string;
}

export function FilterButton({ className }: FilterButtonProps) {
  const { filters, config, addFilter, removeFilter, clearFilters } =
    useDataView();

  const filterableColumns = config.columns.filter((col) => col.filterable);

  if (config.filterable === false || filterableColumns.length === 0) {
    return null;
  }

  const activeFilterCount = filters.length;

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          "inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-input bg-background px-3 font-medium text-sm shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
          className
        )}
      >
        <Filter className="size-4" />
        <span className="hidden sm:inline">Filters</span>
        {activeFilterCount > 0 && (
          <Badge className="ml-1 px-1.5 py-0 text-xs" variant="secondary">
            {activeFilterCount}
          </Badge>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Filters</h4>
            {activeFilterCount > 0 && (
              <Button
                className="h-auto px-2 py-1 text-xs"
                onClick={clearFilters}
                size="sm"
                variant="ghost"
              >
                Clear all
              </Button>
            )}
          </div>

          <div className="space-y-3">
            {filterableColumns.map((column) => (
              <FilterField
                column={column}
                key={column.id}
                onValueChange={(value) => {
                  if (value) {
                    addFilter(value);
                  } else {
                    removeFilter(column.id);
                  }
                }}
                value={filters.find((f) => f.field === column.id)}
              />
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ============================================================================
// Filter Field
// ============================================================================

interface FilterFieldProps {
  column: ColumnDef;
  value?: FilterValue;
  onValueChange: (value: FilterValue | null) => void;
}

function FilterField({ column, value, onValueChange }: FilterFieldProps) {
  const filterType = column.filterType ?? "text";
  const inputId = `filter-${column.id}`;

  const handleChange = (inputValue: string) => {
    if (!inputValue) {
      onValueChange(null);
      return;
    }

    onValueChange({
      field: column.id,
      operator: filterType === "select" ? "equals" : "contains",
      value: inputValue,
    });
  };

  return (
    <div className="space-y-1.5">
      <label className="text-muted-foreground text-sm" htmlFor={inputId}>
        {column.header}
      </label>
      {filterType === "select" && column.filterOptions ? (
        <Select onValueChange={handleChange} value={String(value?.value ?? "")}>
          <SelectTrigger id={inputId} size="sm">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All</SelectItem>
            {column.filterOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Input
          className="h-8 text-sm"
          id={inputId}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={`Filter ${column.header.toLowerCase()}...`}
          type={filterType === "number" ? "number" : "text"}
          value={String(value?.value ?? "")}
        />
      )}
    </div>
  );
}

// ============================================================================
// Sort Button
// ============================================================================

interface SortButtonProps {
  className?: string;
}

export function SortButton({ className }: SortButtonProps) {
  const { sort, toggleSort, config } = useDataView();

  const sortableColumns = config.columns.filter(
    (col) => col.sortable !== false && config.sortable !== false
  );

  if (sortableColumns.length === 0) {
    return null;
  }

  const sortOptions = sortableColumns.map((col) => ({
    value: col.id,
    label: col.header,
  }));

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          "inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-input bg-background px-3 font-medium text-sm shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
          className
        )}
      >
        <SlidersHorizontal className="size-4" />
        <span className="hidden sm:inline">Sort</span>
        {sort && (
          <Badge className="ml-1 px-1.5 py-0 text-xs" variant="secondary">
            {sort.direction === "asc" ? "↑" : "↓"}
          </Badge>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56">
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Sort by</h4>
          <Select
            onValueChange={(value) => {
              if (value) {
                toggleSort(value);
              } else {
                toggleSort("");
              }
            }}
            value={sort?.field ?? ""}
          >
            <SelectTrigger size="sm">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">None</SelectItem>
              {sortOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {sort && (
            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={() => toggleSort(sort.field)}
                size="sm"
                variant={sort.direction === "asc" ? "secondary" : "outline"}
              >
                Ascending
              </Button>
              <Button
                className="flex-1"
                onClick={() => toggleSort(sort.field)}
                size="sm"
                variant={sort.direction === "desc" ? "secondary" : "outline"}
              >
                Descending
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ============================================================================
// DataViewToolbar
// ============================================================================

interface DataViewToolbarProps {
  className?: string;
  children?: React.ReactNode;
  showSearch?: boolean;
  showFilters?: boolean;
  showSort?: boolean;
  showViewToggle?: boolean;
  leftContent?: React.ReactNode;
  rightContent?: React.ReactNode;
}

export function DataViewToolbar({
  className,
  children,
  showSearch = true,
  showFilters = true,
  showSort = true,
  showViewToggle = true,
  leftContent,
  rightContent,
}: DataViewToolbarProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div className="flex flex-1 items-center gap-2">
        {showSearch && <SearchInput />}
        {leftContent}
      </div>

      <div className="flex items-center gap-2">
        {children}
        {showFilters && <FilterButton />}
        {showSort && <SortButton />}
        {showViewToggle && <ViewToggle />}
        {rightContent}
      </div>
    </div>
  );
}

// ============================================================================
// Active Filters Display
// ============================================================================

interface ActiveFiltersProps {
  className?: string;
}

export function ActiveFilters({ className }: ActiveFiltersProps) {
  const { filters, removeFilter, clearFilters, config } = useDataView();

  if (filters.length === 0) {
    return null;
  }

  const getColumnLabel = (field: string) => {
    const column = config.columns.find((c) => c.id === field);
    return column?.header ?? field;
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span className="text-muted-foreground text-sm">Filters:</span>
      {filters.map((filter) => (
        <Badge className="gap-1 pr-1" key={filter.field} variant="secondary">
          <span className="text-muted-foreground">
            {getColumnLabel(filter.field)}:
          </span>
          <span>{String(filter.value)}</span>
          <button
            className="ml-1 rounded-full p-0.5 hover:bg-muted"
            onClick={() => removeFilter(filter.field)}
            type="button"
          >
            <X className="size-3" />
            <span className="sr-only">Remove filter</span>
          </button>
        </Badge>
      ))}
      <Button
        className="h-6 px-2 text-xs"
        onClick={clearFilters}
        size="sm"
        variant="ghost"
      >
        Clear all
      </Button>
    </div>
  );
}
