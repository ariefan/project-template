"use client"

import * as React from "react"
import {
  Search,
  X,
  Filter,
  LayoutGrid,
  LayoutList,
  Table2,
  SlidersHorizontal,
  ChevronDown,
} from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import { Input } from "@workspace/ui/components/input"
import { Button } from "@workspace/ui/components/button"
import { ButtonGroup } from "@workspace/ui/components/button-group"
import { Badge } from "@workspace/ui/components/badge"
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@workspace/ui/components/popover"
import { Select } from "@workspace/ui/components/select"
import { useDataView } from "./context"
import type { ViewMode, ColumnDef, FilterValue } from "./types"

// ============================================================================
// View Toggle
// ============================================================================

interface ViewToggleProps {
  className?: string
  availableViews?: ViewMode[]
}

export function ViewToggle({ className, availableViews }: ViewToggleProps) {
  const { view, setView, config } = useDataView()
  const views = availableViews ?? config.availableViews ?? ["table", "list", "grid"]

  const viewIcons: Record<ViewMode, React.ReactNode> = {
    table: <Table2 className="size-4" />,
    list: <LayoutList className="size-4" />,
    grid: <LayoutGrid className="size-4" />,
  }

  const viewLabels: Record<ViewMode, string> = {
    table: "Table",
    list: "List",
    grid: "Grid",
  }

  if (views.length <= 1) return null

  return (
    <ButtonGroup className={className}>
      {views.map((v) => (
        <Button
          key={v}
          variant={view === v ? "secondary" : "outline"}
          size="sm"
          onClick={() => setView(v)}
          aria-label={`Switch to ${viewLabels[v]} view`}
          aria-pressed={view === v}
        >
          {viewIcons[v]}
          <span className="sr-only sm:not-sr-only sm:ml-1">
            {viewLabels[v]}
          </span>
        </Button>
      ))}
    </ButtonGroup>
  )
}

// ============================================================================
// Search Input
// ============================================================================

interface SearchInputProps {
  className?: string
  placeholder?: string
}

export function SearchInput({ className, placeholder }: SearchInputProps) {
  const { search, setSearch, config, setPage } = useDataView()
  const [localSearch, setLocalSearch] = React.useState(search)
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    setLocalSearch(search)
  }, [search])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setLocalSearch(value)

    // Debounce the actual search
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    debounceRef.current = setTimeout(() => {
      setSearch(value)
    }, 300)
  }

  const handleClear = () => {
    setLocalSearch("")
    setSearch("")
  }

  if (config.searchable === false) return null

  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        placeholder={placeholder ?? config.searchPlaceholder ?? "Search..."}
        value={localSearch}
        onChange={handleChange}
        className="pl-8 pr-8 w-full sm:w-64"
        size="sm"
      />
      {localSearch && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
          <span className="sr-only">Clear search</span>
        </button>
      )}
    </div>
  )
}

// ============================================================================
// Filter Button
// ============================================================================

interface FilterButtonProps {
  className?: string
}

export function FilterButton({ className }: FilterButtonProps) {
  const { filters, config, addFilter, removeFilter, clearFilters } = useDataView()

  const filterableColumns = config.columns.filter((col) => col.filterable)

  if (config.filterable === false || filterableColumns.length === 0) return null

  const activeFilterCount = filters.length

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn("gap-1.5", className)}>
          <Filter className="size-4" />
          <span className="hidden sm:inline">Filters</span>
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Filters</h4>
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-auto py-1 px-2 text-xs"
              >
                Clear all
              </Button>
            )}
          </div>

          <div className="space-y-3">
            {filterableColumns.map((column) => (
              <FilterField
                key={column.id}
                column={column}
                value={filters.find((f) => f.field === column.id)}
                onValueChange={(value) => {
                  if (value) {
                    addFilter(value)
                  } else {
                    removeFilter(column.id)
                  }
                }}
              />
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ============================================================================
// Filter Field
// ============================================================================

interface FilterFieldProps {
  column: ColumnDef
  value?: FilterValue
  onValueChange: (value: FilterValue | null) => void
}

function FilterField({ column, value, onValueChange }: FilterFieldProps) {
  const filterType = column.filterType ?? "text"

  const handleChange = (inputValue: string) => {
    if (!inputValue) {
      onValueChange(null)
      return
    }

    onValueChange({
      field: column.id,
      operator: filterType === "select" ? "equals" : "contains",
      value: inputValue,
    })
  }

  return (
    <div className="space-y-1.5">
      <label className="text-sm text-muted-foreground">{column.header}</label>
      {filterType === "select" && column.filterOptions ? (
        <Select
          options={[{ value: "", label: "All" }, ...column.filterOptions]}
          value={String(value?.value ?? "")}
          onValueChange={handleChange}
          size="sm"
        />
      ) : (
        <Input
          type={filterType === "number" ? "number" : "text"}
          placeholder={`Filter ${column.header.toLowerCase()}...`}
          value={String(value?.value ?? "")}
          onChange={(e) => handleChange(e.target.value)}
          size="sm"
        />
      )}
    </div>
  )
}

// ============================================================================
// Sort Button
// ============================================================================

interface SortButtonProps {
  className?: string
}

export function SortButton({ className }: SortButtonProps) {
  const { sort, toggleSort, config } = useDataView()

  const sortableColumns = config.columns.filter(
    (col) => col.sortable !== false && config.sortable !== false
  )

  if (sortableColumns.length === 0) return null

  const sortOptions = sortableColumns.map((col) => ({
    value: col.id,
    label: col.header,
  }))

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn("gap-1.5", className)}>
          <SlidersHorizontal className="size-4" />
          <span className="hidden sm:inline">Sort</span>
          {sort && (
            <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
              {sort.direction === "asc" ? "↑" : "↓"}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56">
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Sort by</h4>
          <Select
            options={[{ value: "", label: "None" }, ...sortOptions]}
            value={sort?.field ?? ""}
            onValueChange={(value) => {
              if (value) {
                toggleSort(value)
              } else {
                toggleSort("")
              }
            }}
            size="sm"
          />
          {sort && (
            <div className="flex gap-2">
              <Button
                variant={sort.direction === "asc" ? "secondary" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => toggleSort(sort.field)}
              >
                Ascending
              </Button>
              <Button
                variant={sort.direction === "desc" ? "secondary" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => toggleSort(sort.field)}
              >
                Descending
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ============================================================================
// DataViewToolbar
// ============================================================================

interface DataViewToolbarProps {
  className?: string
  children?: React.ReactNode
  showSearch?: boolean
  showFilters?: boolean
  showSort?: boolean
  showViewToggle?: boolean
  leftContent?: React.ReactNode
  rightContent?: React.ReactNode
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
  )
}

// ============================================================================
// Active Filters Display
// ============================================================================

interface ActiveFiltersProps {
  className?: string
}

export function ActiveFilters({ className }: ActiveFiltersProps) {
  const { filters, removeFilter, clearFilters, config } = useDataView()

  if (filters.length === 0) return null

  const getColumnLabel = (field: string) => {
    const column = config.columns.find((c) => c.id === field)
    return column?.header ?? field
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span className="text-sm text-muted-foreground">Filters:</span>
      {filters.map((filter) => (
        <Badge key={filter.field} variant="secondary" className="gap-1 pr-1">
          <span className="text-muted-foreground">
            {getColumnLabel(filter.field)}:
          </span>
          <span>{String(filter.value)}</span>
          <button
            type="button"
            onClick={() => removeFilter(filter.field)}
            className="ml-1 rounded-full p-0.5 hover:bg-muted"
          >
            <X className="size-3" />
            <span className="sr-only">Remove filter</span>
          </button>
        </Badge>
      ))}
      <Button
        variant="ghost"
        size="sm"
        onClick={clearFilters}
        className="h-6 px-2 text-xs"
      >
        Clear all
      </Button>
    </div>
  )
}
