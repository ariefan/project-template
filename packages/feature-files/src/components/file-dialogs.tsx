"use client";

import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { FileUploader } from "@workspace/ui/composed/file-upload";
import { useState } from "react";
import type { FileInfo } from "../context/file-manager-context";

interface FileDialogsProps {
  // Delete dialog
  showDeleteDialog: boolean;
  setShowDeleteDialog: (show: boolean) => void;
  fileToDelete: FileInfo | null;
  onDeleteConfirm: () => void;

  // Keyboard shortcuts dialog
  showShortcuts: boolean;
  setShowShortcuts: (show: boolean) => void;
  keyboardShortcutsContent: React.ReactNode;

  // Upload dialog
  showUploadDialog: boolean;
  setShowUploadDialog: (show: boolean) => void;
  currentPath: string;
  isUploading: boolean;
  uploadProgress: Record<string, number>;
  onUpload: (files: FileList | File[]) => void;
  onSingleUpload: (
    fileState: { file: File; id: string },
    onProgress: (progress: number) => void
  ) => Promise<string | undefined>;

  // New folder dialog
  showNewFolderDialog: boolean;
  setShowNewFolderDialog: (show: boolean) => void;
  newFolderName: string;
  setNewFolderName: (name: string) => void;
  onCreateFolder: () => void;

  // Copy/Move dialog
  showCopyMoveDialog: boolean;
  setShowCopyMoveDialog: (show: boolean) => void;
  copyMoveMode: "copy" | "move";
  copyMoveItems: string[];
  currentPathForCopyMove: string;
  onCopyMoveConfirm: () => void;

  // Rename dialog
  showRenameDialog: boolean;
  setShowRenameDialog: (show: boolean) => void;
  itemToRename: FileInfo | null;
  newName: string;
  setNewName: (name: string) => void;
  onRenameConfirm: () => void;
}

export function FileDialogs({
  showDeleteDialog,
  setShowDeleteDialog,
  fileToDelete,
  onDeleteConfirm,
  showShortcuts,
  setShowShortcuts,
  keyboardShortcutsContent,
  showUploadDialog,
  setShowUploadDialog,
  currentPath,
  isUploading: _isUploading,
  uploadProgress: _uploadProgress,
  onUpload,
  onSingleUpload,
  showNewFolderDialog,
  setShowNewFolderDialog,
  newFolderName,
  setNewFolderName,
  onCreateFolder,
  showCopyMoveDialog,
  setShowCopyMoveDialog,
  copyMoveMode,
  copyMoveItems,
  currentPathForCopyMove,
  onCopyMoveConfirm,
  showRenameDialog,
  setShowRenameDialog,
  itemToRename,
  newName,
  setNewName,
  onRenameConfirm,
}: FileDialogsProps) {
  // Drag state for upload dialog
  const [_isDragOver, setIsDragOver] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);

  const _handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter((prev) => prev + 1);
    setIsDragOver(true);
  };

  const _handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter((prev) => prev - 1);
    if (dragCounter - 1 === 0) {
      setIsDragOver(false);
    }
  };

  const _handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const _handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(0);
    setIsDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      onUpload(droppedFiles);
    }
  };

  return (
    <>
      {/* Delete Dialog */}
      <Dialog onOpenChange={setShowDeleteDialog} open={showDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {fileToDelete?.name}</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{fileToDelete?.name}"? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => {
                setShowDeleteDialog(false);
              }}
              variant="outline"
            >
              Cancel
            </Button>
            <Button onClick={onDeleteConfirm} variant="destructive">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Keyboard Shortcuts Dialog */}
      <Dialog onOpenChange={setShowShortcuts} open={showShortcuts}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Keyboard Shortcuts</DialogTitle>
            <DialogDescription>
              Navigate and manage files faster with keyboard shortcuts
            </DialogDescription>
          </DialogHeader>
          {keyboardShortcutsContent}
        </DialogContent>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog onOpenChange={setShowUploadDialog} open={showUploadDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Files</DialogTitle>
            <DialogDescription>
              Upload files to {currentPath || "/"}
            </DialogDescription>
          </DialogHeader>

          <FileUploader
            maxSize={50 * 1024 * 1024}
            multiple={true}
            onUpload={onSingleUpload} // 50MB
          />
        </DialogContent>
      </Dialog>

      {/* New Folder Dialog */}
      <Dialog onOpenChange={setShowNewFolderDialog} open={showNewFolderDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Folder</DialogTitle>
            <DialogDescription>
              Create a new folder in {currentPath || "/"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              onChange={(e) => {
                setNewFolderName(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onCreateFolder();
                }
              }}
              placeholder="Folder name"
              value={newFolderName}
            />
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setShowNewFolderDialog(false);
                setNewFolderName("");
              }}
              variant="outline"
            >
              Cancel
            </Button>
            <Button onClick={onCreateFolder}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Copy/Move Dialog */}
      <Dialog onOpenChange={setShowCopyMoveDialog} open={showCopyMoveDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {copyMoveMode === "copy" ? "Copy" : "Move"} Items
            </DialogTitle>
            <DialogDescription>
              {copyMoveItems.length} item
              {copyMoveItems.length > 1 ? "s" : ""} will be{" "}
              {copyMoveMode === "copy" ? "copied" : "moved"} to{" "}
              {currentPathForCopyMove || "/"}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="max-h-40 space-y-1 overflow-auto rounded-md bg-muted p-2">
              {copyMoveItems.map((item) => (
                <div className="text-sm" key={item}>
                  {item.split("/").pop()}
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setShowCopyMoveDialog(false);
              }}
              variant="outline"
            >
              Cancel
            </Button>
            <Button onClick={onCopyMoveConfirm}>
              {copyMoveMode === "copy" ? "Copy" : "Move"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog onOpenChange={setShowRenameDialog} open={showRenameDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename</DialogTitle>
            <DialogDescription>Rename "{itemToRename?.name}"</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              onChange={(e) => {
                setNewName(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onRenameConfirm();
                }
              }}
              placeholder="New name"
              value={newName}
            />
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setShowRenameDialog(false);
                setNewName("");
              }}
              variant="outline"
            >
              Cancel
            </Button>
            <Button onClick={onRenameConfirm}>Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
