"use client";

import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
} from "@workspace/ui/components/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { cn } from "@workspace/ui/lib/utils";
import { MoreHorizontal } from "lucide-react";
import type { FileInfo } from "../context/file-manager-context";
import { getFileIcon, getFileType } from "../lib/file-utils";

interface FileListViewProps {
  files: FileInfo[];
  selectedItems: Set<string>;
  onFileSelect: (path: string, e: React.MouseEvent) => void;
  onToggleSelect: (path: string, checked: boolean) => void;
  onFileClick: (file: FileInfo, event: React.MouseEvent) => void;
  onFileDoubleClick: (file: FileInfo) => void;
  onSort: (by: "name" | "size" | "modified") => void;
  sortBy: string;
  sortDirection: "asc" | "desc";
  onDownload: (file: FileInfo) => void;
  showCheckboxes: boolean;
  renderContextMenuItems: (file: FileInfo) => React.ReactNode;
}

export function FileListView({
  files,
  selectedItems,
  onFileSelect,
  onToggleSelect,
  // biome-ignore lint/correctness/noUnusedFunctionParameters: Future use
  onFileClick,
  onFileDoubleClick,
  onSort,
  sortBy,
  sortDirection,
  onDownload,
  showCheckboxes,
  renderContextMenuItems,
}: FileListViewProps) {
  return (
    <div className="rounded-lg border bg-card">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            {showCheckboxes && <th className="w-12 px-4 py-3" />}
            <th
              className="cursor-pointer px-4 py-3 text-left font-medium text-sm hover:bg-muted/50"
              onClick={() => onSort("name")}
            >
              <div className="flex items-center gap-1">
                Name
                {sortBy === "name" && (
                  <span className="text-muted-foreground">
                    {sortDirection === "asc" ? "↑" : "↓"}
                  </span>
                )}
              </div>
            </th>
            <th
              className="cursor-pointer px-4 py-3 text-left font-medium text-sm hover:bg-muted/50"
              onClick={() => onSort("size")}
            >
              <div className="flex items-center gap-1">
                Size
                {sortBy === "size" && (
                  <span className="text-muted-foreground">
                    {sortDirection === "asc" ? "↑" : "↓"}
                  </span>
                )}
              </div>
            </th>
            <th
              className="cursor-pointer px-4 py-3 text-left font-medium text-sm hover:bg-muted/50"
              onClick={() => onSort("modified")}
            >
              <div className="flex items-center gap-1">
                Modified
                {sortBy === "modified" && (
                  <span className="text-muted-foreground">
                    {sortDirection === "asc" ? "↑" : "↓"}
                  </span>
                )}
              </div>
            </th>
            <th className="w-12 px-2 py-3" />
          </tr>
        </thead>
        <tbody>
          {files.map((file) => {
            const fileType = getFileType(file.name, file.isDirectory);
            const id = file.path;
            const selected = selectedItems.has(id);

            return (
              <ContextMenu key={id}>
                <ContextMenuTrigger asChild>
                  <tr
                    className={cn(
                      "cursor-pointer border-b transition-colors",
                      !selected && "hover:bg-muted/50",
                      selected && "bg-blue-500/20 hover:bg-blue-500/10"
                    )}
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest("button")) {
                        return;
                      }
                      // Use new selection handler that checks for Ctrl key
                      onFileSelect(id, e);
                      e.stopPropagation();
                    }}
                    onDoubleClick={() => onFileDoubleClick(file)}
                  >
                    {showCheckboxes && (
                      <td className="px-4 py-3">
                        <Checkbox
                          checked={selected}
                          onCheckedChange={(checked) => {
                            onToggleSelect(id, checked === true);
                          }}
                        />
                      </td>
                    )}
                    <td className="max-w-[200px] px-4 py-3">
                      <div className="flex items-center gap-3">
                        {getFileIcon(fileType)}
                        <span
                          className="truncate font-medium text-sm"
                          title={file.name}
                        >
                          {file.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-sm">
                        {file.size > 0 ? formatBytes(file.size) : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-muted-foreground text-sm">
                        {new Date(file.modified).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-2 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            className="h-7 w-7 p-0"
                            size="icon"
                            variant="ghost"
                          >
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onDownload(file)}>
                            Download
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>Rename</DropdownMenuItem>
                          <DropdownMenuItem>Copy</DropdownMenuItem>
                          <DropdownMenuItem>Move</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive">
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  {renderContextMenuItems(file)}
                </ContextMenuContent>
              </ContextMenu>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) {
    return "0 B";
  }
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
}
