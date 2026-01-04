"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { cn } from "@workspace/ui/lib/utils";
import { useDataView } from "./context";

// ============================================================================
// SearchFieldSelector
// ============================================================================

interface SearchFieldSelectorProps {
  className?: string;
  /** Label for the "All fields" option */
  allFieldsLabel?: string;
  /** Placeholder text when no field is selected */
  placeholder?: string;
  /** Override the list of searchable fields */
  fields?: { id: string; label: string }[];
  /** Whether to show the "All fields" option */
  showAllOption?: boolean;
}

/**
 * A dropdown selector for choosing which field to search.
 * Place this component in the `beforeSearch` slot of DataViewToolbar.
 *
 * @example
 * ```tsx
 * <DataViewToolbar
 *   beforeSearch={<SearchFieldSelector />}
 * />
 * ```
 */
export function SearchFieldSelector({
  className,
  allFieldsLabel = "All fields",
  placeholder = "Search in...",
  fields: overrideFields,
  showAllOption = true,
}: SearchFieldSelectorProps) {
  const { searchField, setSearchField, searchableFields } = useDataView();

  const fields = overrideFields ?? searchableFields;

  // Don't render if there's only one field to search
  if (fields.length <= 1 && !showAllOption) {
    return null;
  }

  const handleValueChange = (value: string) => {
    setSearchField(value === "__all__" ? null : value);
  };

  return (
    <Select onValueChange={handleValueChange} value={searchField ?? "__all__"}>
      <SelectTrigger
        className={cn("h-8 w-32 text-sm sm:w-40", className)}
        size="sm"
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {showAllOption && (
          <SelectItem value="__all__">{allFieldsLabel}</SelectItem>
        )}
        {fields.map((field) => (
          <SelectItem key={field.id} value={field.id}>
            {field.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ============================================================================
// SearchWithFieldSelector (Combined component)
// ============================================================================

interface SearchWithFieldSelectorProps {
  className?: string;
  /** Search input placeholder */
  searchPlaceholder?: string;
  /** Label for the "All fields" option */
  allFieldsLabel?: string;
  /** Override the list of searchable fields */
  fields?: { id: string; label: string }[];
  /** Whether to show the "All fields" option */
  showAllOption?: boolean;
  /** Whether to show the field selector */
  showFieldSelector?: boolean;
}

/**
 * A combined search input with field selector.
 * Use this in the `searchSlot` to replace the default search.
 *
 * @example
 * ```tsx
 * <DataViewToolbar
 *   searchSlot={<SearchWithFieldSelector />}
 * />
 * ```
 */
export function SearchWithFieldSelector({
  className,
  searchPlaceholder,
  allFieldsLabel = "All fields",
  fields: overrideFields,
  showAllOption = true,
  showFieldSelector = true,
}: SearchWithFieldSelectorProps) {
  const { searchableFields } = useDataView();
  const fields = overrideFields ?? searchableFields;

  // Import SearchInput dynamically to avoid circular dependency
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { SearchInput } = require("./data-view-toolbar");

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {showFieldSelector && fields.length > 1 && (
        <SearchFieldSelector
          allFieldsLabel={allFieldsLabel}
          fields={fields}
          showAllOption={showAllOption}
        />
      )}
      <SearchInput placeholder={searchPlaceholder} />
    </div>
  );
}
