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
import { Upload } from "lucide-react";
import type { FileInfo } from "./file-manager-context";

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
  isUploading,
  uploadProgress,
  onUpload,
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
          {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: Drag and drop zone */}
          {/* biome-ignore lint/a11y/noStaticElementInteractions: Drag and drop zone */}
          <section
            className="rounded-lg border-2 border-dashed p-8 text-center"
            onDragOver={(e) => {
              e.preventDefault();
            }}
            onDrop={(e) => {
              e.preventDefault();
              const droppedFiles = Array.from(e.dataTransfer.files);
              if (droppedFiles.length > 0) {
                onUpload(droppedFiles);
              }
            }}
          >
            <Upload className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="mb-2 font-medium">Drag and drop files here</p>
            <p className="mb-4 text-muted-foreground text-sm">or</p>
            <label className="cursor-pointer" htmlFor="file-upload">
              <input
                className="hidden"
                id="file-upload"
                multiple
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    onUpload(e.target.files);
                  }
                }}
                type="file"
              />
              <Button type="button">Browse files</Button>
            </label>
            {isUploading && (
              <div className="mt-4 space-y-2">
                <p className="font-medium text-sm">Uploading...</p>
                {Object.entries(uploadProgress).map(([file, percent]) => (
                  <div className="space-y-1" key={file}>
                    <div className="flex justify-between text-xs">
                      <span>{file}</span>
                      <span>{Math.round(percent)}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
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
