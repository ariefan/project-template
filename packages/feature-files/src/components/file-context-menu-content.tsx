"use client";

import {
  ContextMenuItem,
  ContextMenuSeparator,
} from "@workspace/ui/components/context-menu";
import {
  Copy,
  Download,
  FolderOpen,
  Info,
  Move,
  Pencil,
  Share2,
  Star,
  StarOff,
  Trash2,
} from "lucide-react";
import type { FileInfo } from "../context/file-manager-context";

interface FileContextMenuContentProps {
  file: FileInfo;
  isMultiSelected: boolean;
  isStarred: boolean;
  onDownload: (file: FileInfo) => void;
  onInfo: (file: FileInfo) => void;
  onStar: (path: string) => void;
  onRename: (file: FileInfo) => void;
  onCopy: (paths: string[]) => void;
  onMove: (paths: string[]) => void;
  onDelete: (file: FileInfo) => void;
}

export function FileContextMenuContent({
  file,
  isMultiSelected,
  isStarred,
  onDownload,
  onInfo,
  onStar,
  onRename,
  onCopy,
  onMove,
  onDelete,
}: FileContextMenuContentProps) {
  return (
    <>
      <ContextMenuItem onClick={() => onDownload(file)}>
        {file.isDirectory ? (
          <>
            <FolderOpen className="mr-2 h-4 w-4" />
            Open
          </>
        ) : (
          <>
            <Download className="mr-2 h-4 w-4" />
            Download
          </>
        )}
      </ContextMenuItem>
      <ContextMenuItem disabled={isMultiSelected} onClick={() => onInfo(file)}>
        <Info className="mr-2 h-4 w-4" />
        Information
      </ContextMenuItem>
      <ContextMenuItem onClick={() => onStar(file.path)}>
        {isStarred ? (
          <>
            <StarOff className="mr-2 h-4 w-4" />
            Unstar
          </>
        ) : (
          <>
            <Star className="mr-2 h-4 w-4" />
            Star
          </>
        )}
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem onClick={() => onRename(file)}>
        <Pencil className="mr-2 h-4 w-4" />
        Rename
      </ContextMenuItem>
      <ContextMenuItem onClick={() => onCopy([file.path])}>
        <Copy className="mr-2 h-4 w-4" />
        Copy
      </ContextMenuItem>
      <ContextMenuItem onClick={() => onMove([file.path])}>
        <Move className="mr-2 h-4 w-4" />
        Move
      </ContextMenuItem>
      <ContextMenuItem>
        <Share2 className="mr-2 h-4 w-4" />
        Share
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem
        className="text-destructive"
        onClick={() => onDelete(file)}
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Delete
      </ContextMenuItem>
    </>
  );
}
