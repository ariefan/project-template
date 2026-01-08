import {
  FileArchiveIcon,
  FileCodeIcon,
  FileIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  FolderIcon,
  ImageIcon,
} from "lucide-react";

type FilterType =
  | "all"
  | "folder"
  | "image"
  | "document"
  | "spreadsheet"
  | "archive"
  | "code"
  | "other";

interface FilterPanelProps {
  filterType: FilterType;
  setFilterType: (type: FilterType) => void;
  onClear: () => void;
}

export function FilterPanel({
  filterType,
  setFilterType,
  onClear,
}: FilterPanelProps) {
  const filters = [
    { value: "all" as const, label: "All Files", icon: FileIcon },
    { value: "folder" as const, label: "Folders", icon: FolderIcon },
    { value: "image" as const, label: "Images", icon: ImageIcon },
    { value: "document" as const, label: "Documents", icon: FileTextIcon },
    {
      value: "spreadsheet" as const,
      label: "Spreadsheets",
      icon: FileSpreadsheetIcon,
    },
    { value: "archive" as const, label: "Archives", icon: FileArchiveIcon },
    { value: "code" as const, label: "Code", icon: FileCodeIcon },
    { value: "other" as const, label: "Other", icon: FileIcon },
  ];

  return (
    <div className="flex w-48 flex-col gap-2 p-2">
      <div className="flex items-center justify-between px-2">
        <span className="font-medium text-sm">Filter</span>
        {filterType !== "all" && (
          <button
            className="text-muted-foreground text-xs hover:text-foreground"
            onClick={onClear}
            type="button"
          >
            Clear
          </button>
        )}
      </div>
      <div className="flex flex-col gap-1">
        {filters.map((filter) => {
          const Icon = filter.icon;
          return (
            <button
              className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                filterType === filter.value
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-muted"
              }`}
              key={filter.value}
              onClick={() => setFilterType(filter.value)}
              type="button"
            >
              <Icon className="size-4" />
              {filter.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export type { FilterType };
