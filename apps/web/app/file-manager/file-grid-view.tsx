"use client";

import { Checkbox } from "@workspace/ui/components/checkbox";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
} from "@workspace/ui/components/context-menu";
import { cn } from "@workspace/ui/lib/utils";
import type { FileInfo } from "./file-manager-context";
import { getFileIcon, getFileType } from "./lib/file-utils";

interface FileGridViewProps {
  files: FileInfo[];
  selectedItems: Set<string>;
  onFileSelect: (path: string, e: React.MouseEvent) => void;
  onToggleSelect: (path: string, checked: boolean) => void;
  onFileDoubleClick: (file: FileInfo) => void;
  focusedIndex: number;
  showCheckboxes: boolean;
  renderContextMenuItems: (file: FileInfo) => React.ReactNode;
}

export function FileGridView({
  files,
  selectedItems,
  onFileSelect,
  onToggleSelect,
  onFileDoubleClick,
  focusedIndex,
  showCheckboxes,
  renderContextMenuItems,
}: FileGridViewProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
      {files.map((file, index) => {
        const fileType = getFileType(file.name, file.isDirectory);
        const id = file.path;
        const selected = selectedItems.has(id);
        const focused = focusedIndex === index;

        return (
          <ContextMenu key={id}>
            <ContextMenuTrigger asChild>
              {/* biome-ignore lint/a11y/useSemanticElements: Cannot use button here because of nested interactive elements */}
              {/* biome-ignore lint/a11y/useKeyWithClickEvents: Keyboard navigation is handled globally by parent component */}
              <div
                className={cn(
                  "group relative flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border bg-card p-3 transition-colors",
                  !selected && "hover:bg-accent",
                  selected && "bg-blue-500/20 hover:bg-blue-500/10",
                  focused && "ring-2 ring-ring"
                )}
                onClick={(e) => {
                  // Use new selection handler that checks for Ctrl key
                  onFileSelect(id, e);
                  e.stopPropagation();
                }}
                onDoubleClick={() => onFileDoubleClick(file)}
                role="button"
                tabIndex={0}
              >
                <div className="relative flex size-28 shrink-0 items-center justify-center">
                  {getFileIcon(fileType)}
                  {/* Checkbox overlay - only show when items are selected */}
                  {showCheckboxes && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                      <Checkbox
                        checked={selected}
                        className="border-white bg-white"
                        onCheckedChange={(checked) => {
                          onToggleSelect(id, checked === true);
                        }}
                      />
                    </div>
                  )}
                </div>
                <div className="flex w-full flex-col items-center text-center">
                  <h3
                    className="w-full truncate px-1 font-medium text-xs"
                    title={file.name}
                  >
                    {file.name}
                  </h3>
                  <span className="text-[10px] text-muted-foreground">
                    {file.size > 0 ? formatBytes(file.size) : ""}
                  </span>
                </div>
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent>
              {renderContextMenuItems(file)}
            </ContextMenuContent>
          </ContextMenu>
        );
      })}
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
