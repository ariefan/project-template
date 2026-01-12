"use client";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
} from "@workspace/ui/components/context-menu";
import type { FileInfo } from "../context/file-manager-context";
import { renderContextMenuItems } from "../lib/context-menu-items";

interface FileContextMenuProps {
  file: FileInfo;
  children: React.ReactNode;
}

export function FileContextMenu({ file, children }: FileContextMenuProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <span className="contents">{children}</span>
      </ContextMenuTrigger>
      <ContextMenuContent>{renderContextMenuItems(file)}</ContextMenuContent>
    </ContextMenu>
  );
}
