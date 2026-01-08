"use client";

import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { FolderPlus, Plus, Upload } from "lucide-react";

interface NewButtonMenuProps {
  onCreateFolder: () => void;
  onUploadFiles: () => void;
}

export function NewButtonMenu({
  onCreateFolder,
  onUploadFiles,
}: NewButtonMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="w-full" variant="default">
          <Plus className="mr-2 size-6" />
          <span className="font-semibold">New</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuItem onClick={onCreateFolder}>
          <FolderPlus className="mr-2 size-4" />
          New Folder
          <DropdownMenuShortcut>Ctrl+N</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onUploadFiles}>
          <Upload className="mr-2 size-4" />
          Upload Files
          <DropdownMenuShortcut>Ctrl+U</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
