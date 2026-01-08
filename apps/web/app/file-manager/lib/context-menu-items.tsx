"use client";

import { ContextMenuItem } from "@workspace/ui/components/context-menu";
import {
  Copy,
  Download,
  FileText,
  FolderOpen,
  Pencil,
  Share2,
  Trash2,
} from "lucide-react";

// This will be called with file from the parent
export function renderContextMenuItems(_file: { path: string; name: string }) {
  // For now, return a simple placeholder
  // The full implementation needs to be in the parent component
  // because it needs access to all the handlers
  return (
    <>
      <ContextMenuItem>
        <FolderOpen className="mr-2 h-3.5 w-3.5" />
        Open
      </ContextMenuItem>
      <ContextMenuItem>
        <Download className="mr-2 h-3.5 w-3.5" />
        Download
      </ContextMenuItem>
      <ContextMenuItem>
        <Share2 className="mr-2 h-3.5 w-3.5" />
        Share
      </ContextMenuItem>
      <ContextMenuItem>
        <Pencil className="mr-2 h-3.5 w-3.5" />
        Rename
      </ContextMenuItem>
      <ContextMenuItem>
        <Copy className="mr-2 h-3.5 w-3.5" />
        Copy
      </ContextMenuItem>
      <ContextMenuItem>
        <FileText className="mr-2 h-3.5 w-3.5" />
        Move
      </ContextMenuItem>
      <ContextMenuItem className="text-destructive">
        <Trash2 className="mr-2 h-3.5 w-3.5" />
        Delete
      </ContextMenuItem>
    </>
  );
}
