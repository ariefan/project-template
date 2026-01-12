"use client";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { ButtonGroup } from "@workspace/ui/components/button-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Input } from "@workspace/ui/components/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@workspace/ui/components/input-group";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { cn } from "@workspace/ui/lib/utils";
import {
  ArrowUpDown,
  Check,
  ChevronDown,
  Filter,
  LayoutGrid,
  LayoutList,
  Search,
  Table2,
  X,
} from "lucide-react";
import * as React from "react";
import { useDataView } from "./context";
import type { ColumnDef, FilterValue, ViewMode } from "./types";
import { useFilterPresets } from "./use-filter-presets";

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
    <>
      {/* Desktop: ButtonGroup */}
      <ButtonGroup className={cn(className, "hidden sm:flex")}>
        {views.map((v) => (
          <TooltipProvider key={v}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  aria-label={`Switch to ${viewLabels[v]} view`}
                  aria-pressed={view === v}
                  onClick={() => setView(v)}
                  size="sm"
                  variant={view === v ? "secondary" : "outline"}
                >
                  {viewIcons[v]}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{viewLabels[v]} view</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </ButtonGroup>

      {/* Mobile: Dropdown with current view icon */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label="Change view"
            className={cn(className, "sm:hidden")}
            size="sm"
            variant="outline"
          >
            {viewIcons[view]}
            <ChevronDown className="ml-1 size-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>View</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup
            onValueChange={(v) => setView(v as ViewMode)}
            value={view}
          >
            {views.map((v) => (
              <DropdownMenuRadioItem key={v} value={v}>
                <span className="flex items-center gap-2">
                  {viewIcons[v]}
                  {viewLabels[v]}
                </span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

// ============================================================================
// Search Input
// ============================================================================

interface SearchInputProps {
  className?: string;
  placeholder?: string;
  /** Show field selector dropdown to search specific fields */
  showFieldSelector?: boolean;
}

export function SearchInput({
  className,
  placeholder,
  showFieldSelector,
}: SearchInputProps) {
  const {
    search,
    setSearch,
    searchField,
    setSearchField,
    searchableFields,
    config,
  } = useDataView();
  const [localSearch, setLocalSearch] = React.useState(search);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalSearch(value);

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

  const handleFieldChange = (fieldId: string) => {
    setSearchField(fieldId === "__all__" ? null : fieldId);
  };

  if (config.searchable === false) {
    return null;
  }

  // Render with field selector
  if (showFieldSelector) {
    const selectedLabel = searchField
      ? (searchableFields.find((f) => f.id === searchField)?.label ??
        "All fields")
      : "All fields";

    return (
      <InputGroup className={cn("w-full sm:w-auto", className)}>
        <InputGroupInput
          className="w-full sm:w-64"
          onChange={handleChange}
          placeholder={placeholder ?? config.searchPlaceholder ?? "Search..."}
          type="search"
          value={localSearch}
        />
        <InputGroupAddon align="inline-start">
          <Search className="size-4" />
        </InputGroupAddon>
        <InputGroupAddon align="inline-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <InputGroupButton className="pr-1.5! text-xs" variant="ghost">
                <span className="max-w-32 truncate">{selectedLabel}</span>
                <ChevronDown className="size-3" />
              </InputGroupButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-[calc(100vw-2rem)] sm:w-40"
            >
              <DropdownMenuItem onClick={() => handleFieldChange("__all__")}>
                All fields
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {searchableFields.map((field) => (
                <DropdownMenuItem
                  key={field.id}
                  onClick={() => handleFieldChange(field.id)}
                >
                  {field.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </InputGroupAddon>
      </InputGroup>
    );
  }

  // Render without field selector (default)
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
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={handleClear}
                type="button"
              >
                <X className="size-4" />
                <span className="sr-only">Clear search</span>
              </button>
            </TooltipTrigger>
            <TooltipContent>Clear search</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}

// ============================================================================
// Filter Button (using Radix Popover)
// ============================================================================

interface FilterButtonProps {
  className?: string;
}

export function FilterButton({ className }: FilterButtonProps) {
  const { filters, config, setFilters } = useDataView();
  const { presets, savePreset, deletePreset } = useFilterPresets({
    dataViewId: config.id,
  });

  const [presetName, setPresetName] = React.useState("");
  const [showPresetInput, setShowPresetInput] = React.useState(false);

  const filterableColumns = config.columns.filter((col) => col.filterable);

  if (config.filterable === false || filterableColumns.length === 0) {
    return null;
  }

  const activeFilterCount = filters.length;

  const handleFilterChange = (columnId: string, value: string) => {
    if (value) {
      const column = filterableColumns.find((c) => c.id === columnId);
      const filterType = column?.filterType ?? "text";
      const newFilter: FilterValue = {
        field: columnId,
        operator: filterType === "select" ? "equals" : "contains",
        value,
      };
      setFilters([...filters.filter((f) => f.field !== columnId), newFilter]);
    } else {
      setFilters(filters.filter((f) => f.field !== columnId));
    }
  };

  const handleClearAll = () => {
    setFilters([]);
  };

  const handleSavePreset = () => {
    if (presetName.trim() && filters.length > 0) {
      savePreset(presetName.trim(), filters);
      setPresetName("");
      setShowPresetInput(false);
    }
  };

  const handleApplyPreset = (presetFilters: FilterValue[]) => {
    setFilters(presetFilters);
  };

  return (
    <Popover>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                className={className}
                size="icon"
                variant={activeFilterCount > 0 ? "secondary" : "ghost"}
              >
                <Filter className="size-4" />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                    {activeFilterCount}
                  </span>
                )}
                <span className="sr-only">Filters</span>
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>Filter data</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <PopoverContent align="end" className="w-[calc(100vw-2rem)] sm:w-80">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Filters</h4>
            {activeFilterCount > 0 && (
              <Button
                className="h-auto px-2 py-1 text-xs"
                onClick={handleClearAll}
                size="sm"
                variant="ghost"
              >
                Clear all
              </Button>
            )}
          </div>

          <div className="space-y-3">
            {filterableColumns.map((column) => {
              const currentFilter = filters.find((f) => f.field === column.id);
              const currentValue = currentFilter?.value
                ? String(currentFilter.value)
                : "";

              return (
                <FilterField
                  column={column}
                  key={column.id}
                  onChange={(value) => handleFilterChange(column.id, value)}
                  value={currentValue}
                />
              );
            })}
          </div>

          {/* Filter Presets */}
          {(presets.length > 0 || activeFilterCount > 0) && (
            <div className="border-t pt-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-medium text-muted-foreground text-xs">
                  Saved Presets
                </span>
                {activeFilterCount > 0 && !showPresetInput && (
                  <Button
                    className="h-auto px-2 py-1 text-xs"
                    onClick={() => setShowPresetInput(true)}
                    size="sm"
                    variant="ghost"
                  >
                    Save current
                  </Button>
                )}
              </div>

              {showPresetInput && (
                <div className="mb-2 flex gap-2">
                  <Input
                    className="h-8 text-xs"
                    onChange={(e) => setPresetName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleSavePreset();
                      } else if (e.key === "Escape") {
                        setShowPresetInput(false);
                        setPresetName("");
                      }
                    }}
                    placeholder="Preset name..."
                    value={presetName}
                  />
                  <Button
                    className="h-8 px-2 text-xs"
                    disabled={!presetName.trim()}
                    onClick={handleSavePreset}
                    size="sm"
                  >
                    Save
                  </Button>
                </div>
              )}

              {presets.length > 0 && (
                <div className="space-y-1">
                  {presets.map((preset) => (
                    <div
                      className="flex items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                      key={preset.id}
                    >
                      <button
                        className="flex-1 text-left"
                        onClick={() => handleApplyPreset(preset.filters)}
                        type="button"
                      >
                        <span className="font-medium">{preset.name}</span>
                        <span className="ml-2 text-muted-foreground text-xs">
                          ({preset.filters.length}{" "}
                          {preset.filters.length === 1 ? "filter" : "filters"})
                        </span>
                      </button>
                      <button
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => deletePreset(preset.id)}
                        type="button"
                      >
                        <X className="size-3" />
                        <span className="sr-only">Delete preset</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
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
  value: string;
  onChange: (value: string) => void;
}

function FilterField({ column, value, onChange }: FilterFieldProps) {
  const filterType = column.filterType ?? "text";
  const inputId = `filter-${column.id}`;

  if (filterType === "select" && column.filterOptions) {
    return (
      <div className="space-y-1.5">
        <label className="text-muted-foreground text-sm" htmlFor={inputId}>
          {column.header}
        </label>
        <Select
          onValueChange={(v) => onChange(v === "__all__" ? "" : v)}
          value={value || "__all__"}
        >
          <SelectTrigger className="w-full" size="sm">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All</SelectItem>
            {column.filterOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <label className="text-muted-foreground text-sm" htmlFor={inputId}>
        {column.header}
      </label>
      <Input
        className="h-8 text-sm"
        id={inputId}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`Filter ${column.header.toLowerCase()}...`}
        type={filterType === "number" ? "number" : "text"}
        value={value}
      />
    </div>
  );
}

// ============================================================================
// Sort Button (using Radix Popover)
// ============================================================================

interface SortButtonProps {
  className?: string;
}

// Helper function to determine column type
function getColumnType(column: ColumnDef): "date" | "number" | "text" {
  const columnType = String(column.accessorKey ?? "").toLowerCase();

  const isDate =
    columnType.includes("date") ||
    columnType.includes("time") ||
    columnType.includes("created") ||
    columnType.includes("updated");

  if (isDate) {
    return "date";
  }

  const isNumber =
    columnType.includes("id") ||
    columnType.includes("count") ||
    columnType.includes("amount") ||
    columnType.includes("price");

  if (isNumber) {
    return "number";
  }

  return "text";
}

// Helper function to get direction label
function getDirectionLabel(
  columnType: "date" | "number" | "text",
  direction: "asc" | "desc"
): string {
  if (columnType === "date") {
    return direction === "asc" ? "Oldest" : "Newest";
  }
  if (columnType === "number") {
    return direction === "asc" ? "Low→High" : "High→Low";
  }
  return direction === "asc" ? "A→Z" : "Z→A";
}

interface SortOption {
  value: string;
  label: string;
}

export function SortButton({ className }: SortButtonProps) {
  const { sort, setSort, config } = useDataView();

  const sortableColumns = config.columns.filter(
    (col) => col.sortable !== false && config.sortable !== false
  );

  if (sortableColumns.length === 0) {
    return null;
  }

  // Helper to get sort label
  const getSortLabel = (field: string, direction: "asc" | "desc") => {
    const column = sortableColumns.find((col) => col.id === field);
    if (!column) {
      return "";
    }

    const columnType = getColumnType(column);
    const directionLabel = getDirectionLabel(columnType, direction);
    return `${column.header}: ${directionLabel}`;
  };

  // Build sort options (field + direction combinations)
  const sortOptions: SortOption[] = [{ value: "__none__", label: "None" }];

  for (const col of sortableColumns) {
    sortOptions.push({
      value: `${col.id}:asc`,
      label: getSortLabel(col.id, "asc"),
    });
    sortOptions.push({
      value: `${col.id}:desc`,
      label: getSortLabel(col.id, "desc"),
    });
  }

  const handleSortChange = (value: string) => {
    if (value === "__none__") {
      setSort(null);
    } else {
      const [field, direction] = value.split(":");
      if (field && direction) {
        setSort({ field, direction: direction as "asc" | "desc" });
      }
    }
  };

  const currentSortValue = sort
    ? `${sort.field}:${sort.direction}`
    : "__none__";
  const _currentSortLabel = sort
    ? getSortLabel(sort.field, sort.direction)
    : null;

  return (
    <DropdownMenu>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                className={className}
                size="icon"
                variant={sort ? "secondary" : "ghost"}
              >
                <ArrowUpDown className="size-4" />
                <span className="sr-only">Sort</span>
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>Sort data</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DropdownMenuContent align="end" className="w-[calc(100vw-2rem)] sm:w-56">
        <DropdownMenuLabel>Sort by</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          onValueChange={handleSortChange}
          value={currentSortValue}
        >
          {sortOptions.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ============================================================================
// Data View View Options (Column Toggle)
// ============================================================================

interface DataViewViewOptionsProps {
  className?: string;
}

export function DataViewViewOptions({ className }: DataViewViewOptionsProps) {
  const { config, columnVisibility, setColumnVisibility } = useDataView();

  const toggleableColumns = config.columns.filter(
    (column) =>
      typeof column.accessorKey !== "undefined" && column.hidden !== true
  );

  if (toggleableColumns.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label="Toggle columns"
          className={cn("hidden lg:flex", className)}
          size="sm"
          variant="ghost"
        >
          <LayoutGrid className="mr-2 size-4" />
          <span className="hidden lg:inline">View</span>
          <ChevronDown className="ml-auto size-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[150px]">
        <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {toggleableColumns.map((column) => {
          const isVisible = columnVisibility[column.id] !== false;
          return (
            <DropdownMenuItem
              className="capitalize"
              key={column.id}
              onSelect={(e) => {
                e.preventDefault();
                setColumnVisibility({
                  ...columnVisibility,
                  [column.id]: !isVisible,
                });
              }}
            >
              <div
                className={cn(
                  "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                  isVisible
                    ? "bg-primary text-primary-foreground"
                    : "opacity-50 [&_svg]:invisible"
                )}
              >
                <Check className="h-4 w-4" />
              </div>
              <span>{column.header}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ============================================================================
// DataViewToolbar
// ============================================================================

interface DataViewToolbarProps {
  className?: string;
  children?: React.ReactNode;
  /** Left section - compose with SearchInput and other components */
  leftContent?: React.ReactNode;
  /** Primary action button (e.g., "Add User", "Create Item") */
  primaryAction?: React.ReactNode;
  /** Right section - compose with FilterButton, SortButton, ViewToggle, etc. */
  rightContent?: React.ReactNode;
}

export function DataViewToolbar({
  className,
  children,
  leftContent,
  primaryAction,
  rightContent,
}: DataViewToolbarProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      {/* Left section */}
      <div className="flex flex-1 items-center gap-2">{leftContent}</div>

      {/* Right section */}
      <div className="flex items-center gap-2 self-end sm:self-auto">
        {children}
        {rightContent}
        {primaryAction}
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
  const { filters, setFilters, config } = useDataView();

  if (filters.length === 0) {
    return null;
  }

  const getColumnLabel = (field: string) => {
    const column = config.columns.find((c) => c.id === field);
    return column?.header ?? field;
  };

  const removeFilter = (field: string) => {
    setFilters(filters.filter((f) => f.field !== field));
  };

  const clearFilters = () => {
    setFilters([]);
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
