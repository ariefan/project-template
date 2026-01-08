"use client";

import { cn } from "@workspace/ui/lib/utils";
import { PictureInPicture } from "lucide-react";
import { FileContextMenu } from "./file-context-menu";
import type { FileInfo } from "./file-manager-context";
import { getFileIcon, getFileType } from "./lib/file-utils";

interface FileGridViewProps {
  files: FileInfo[];
  selectedItems: Set<string>;
  onToggleSelect: (path: string, checked: boolean) => void;
  onFileDoubleClick: (file: FileInfo) => void;
  focusedIndex: number;
}

export function FileGridView({
  files,
  selectedItems,
  onToggleSelect,
  onFileDoubleClick,
  focusedIndex,
}: FileGridViewProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {files.map((file, index) => {
        const fileType = getFileType(file.name, file.isDirectory);
        const id = file.path;
        const selected = selectedItems.has(id);
        const focused = focusedIndex === index;
        const isImage = fileType === "image";

        return (
          <FileContextMenu file={file} key={id}>
            {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: File grid item with double-click */}
            {/* biome-ignore lint/a11y/useKeyWithClickEvents: File grid item with double-click */}
            {/* biome-ignore lint/a11y/noStaticElementInteractions: File grid item with double-click */}
            <div
              className={cn(
                "group relative flex cursor-pointer flex-col gap-2 rounded-lg border bg-card p-3 transition-colors",
                !selected && "hover:bg-accent",
                selected && "bg-blue-500/20 hover:bg-blue-500/10",
                focused && "ring-2 ring-ring"
              )}
              onClick={(e) => {
                // Toggle selection on single click
                onToggleSelect(id, !selected);
                e.stopPropagation();
              }}
              onDoubleClick={() => onFileDoubleClick(file)}
            >
              <button
                className="flex shrink-0 items-center justify-center"
                onClick={(e) => {
                  // Also trigger selection when clicking the icon
                  onToggleSelect(id, !selected);
                  e.stopPropagation();
                }}
                type="button"
              >
                {isImage ? (
                  <div className="flex size-16 items-center justify-center rounded-md bg-muted">
                    <PictureInPicture className="size-8 text-muted-foreground" />
                  </div>
                ) : (
                  <div className="flex size-16 items-center justify-center rounded-md bg-muted">
                    {getFileIcon(fileType)}
                  </div>
                )}
              </button>
              <div className="flex min-w-0 flex-1 flex-col">
                <h3 className="truncate font-medium text-sm" title={file.name}>
                  {file.name}
                </h3>
                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                  <span>{file.size > 0 ? formatBytes(file.size) : ""}</span>
                </div>
              </div>
            </div>
          </FileContextMenu>
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
