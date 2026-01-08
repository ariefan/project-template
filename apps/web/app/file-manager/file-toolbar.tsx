"use client";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
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
  Grid3x3,
  List,
  Plus,
  RefreshCw,
  Search,
  Settings,
  SortAsc,
  Upload,
} from "lucide-react";
import type { SortBy, SortDirection, ViewMode } from "./file-manager-context";

interface FileToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortBy: SortBy;
  onSortChange: (by: SortBy) => void;
  sortDirection: SortDirection;
  onSortDirectionChange: (dir: SortDirection) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  isRefreshing: boolean;
  onRefresh: () => void;
  onUploadClick: () => void;
  onNewFolderClick: () => void;
  onSettingsClick: () => void;
}

export function FileToolbar({
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  sortDirection,
  onSortDirectionChange,
  viewMode,
  onViewModeChange,
  isRefreshing,
  onRefresh,
  onUploadClick,
  onNewFolderClick,
  onSettingsClick,
}: FileToolbarProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      {/* Search and View Controls */}
      <div className="flex flex-1 items-center gap-2">
        <div className="relative max-w-md flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search files..."
            value={searchQuery}
          />
        </div>

        {/* Sort */}
        <Select
          onValueChange={(value) => onSortChange(value as SortBy)}
          value={sortBy}
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="type">Type</SelectItem>
            <SelectItem value="size">Size</SelectItem>
            <SelectItem value="modified">Modified</SelectItem>
          </SelectContent>
        </Select>

        <Button
          className="h-9 w-9"
          onClick={() =>
            onSortDirectionChange(sortDirection === "asc" ? "desc" : "asc")
          }
          size="icon"
          variant="outline"
        >
          <SortAsc
            className={cn("size-4", sortDirection === "desc" && "rotate-180")}
          />
        </Button>

        {/* View Mode Toggle */}
        <div className="flex rounded-lg border p-1">
          <Button
            className={cn(
              "h-7 w-7 rounded-md p-0",
              viewMode === "grid" ? "bg-muted" : "hover:bg-transparent"
            )}
            onClick={() => onViewModeChange("grid")}
            size="icon"
            variant="ghost"
          >
            <Grid3x3 className="size-4" />
          </Button>
          <Button
            className={cn(
              "h-7 w-7 rounded-md p-0",
              viewMode === "list" ? "bg-muted" : "hover:bg-transparent"
            )}
            onClick={() => onViewModeChange("list")}
            size="icon"
            variant="ghost"
          >
            <List className="size-4" />
          </Button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className="h-9 w-9"
                disabled={isRefreshing}
                onClick={onRefresh}
                size="icon"
                variant="outline"
              >
                <RefreshCw
                  className={cn("size-4", isRefreshing && "animate-spin")}
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Refresh</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className="h-9 w-9"
                onClick={onSettingsClick}
                size="icon"
                variant="outline"
              >
                <Settings className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Settings</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <Button className="h-9 gap-2" onClick={onNewFolderClick} size="sm">
          <Plus className="size-4" />
          <span className="hidden sm:inline">New Folder</span>
        </Button>

        <Button
          className="h-9 gap-2"
          onClick={onUploadClick}
          size="sm"
          variant="default"
        >
          <Upload className="size-4" />
          Upload
        </Button>
      </div>
    </div>
  );
}
