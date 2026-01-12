"use client";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@workspace/ui/components/breadcrumb";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Separator } from "@workspace/ui/components/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@workspace/ui/components/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import {
  AlertCircle,
  Copy,
  Download,
  Filter,
  FolderPlus,
  Grid3x3,
  List,
  Move,
  RefreshCw,
  Search,
  Settings,
  Share2,
  SortAsc,
  SortDesc,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  FileManagerProvider,
  useFileManagerContext,
} from "../context/file-manager-context";
import { useFileManager } from "../hooks/use-file-manager";

type FileManagerState = ReturnType<typeof useFileManager>;

import { DragDropOverlay } from "./drag-drop-overlay";
import { FileContextMenuContent } from "./file-context-menu-content";
import { FileDetailsSidebar } from "./file-details-sidebar";
import { FileDialogs } from "./file-dialogs";
import { FileGridView } from "./file-grid-view";
import { FileListView } from "./file-list-view";
import { FileSidebar } from "./file-sidebar";
import { FilterPanel } from "./filter-panel";
import { Pagination } from "./pagination";

interface FileManagerProps {
  apiBaseUrl: string;
}

export function FileManager({ apiBaseUrl }: FileManagerProps) {
  return (
    <FileManagerProvider>
      <SidebarProvider>
        <FileManagerContent apiBaseUrl={apiBaseUrl} />
      </SidebarProvider>
    </FileManagerProvider>
  );
}

function FileManagerContent({ apiBaseUrl }: { apiBaseUrl: string }) {
  const { currentPath, setCurrentPath } = useFileManagerContext();
  const fm = useFileManager({ apiBaseUrl });

  return (
    <>
      <FileSidebar
        apiBaseUrl={apiBaseUrl}
        currentPath={currentPath}
        onCreateFolder={() => fm.setShowNewFolderDialog(true)}
        onNavigate={setCurrentPath}
        onUploadFiles={() => fm.setShowUploadDialog(true)}
      />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b px-4">
          <div className="flex flex-1 items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator
              className="mr-2 data-[orientation=vertical]:h-4"
              orientation="vertical"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setCurrentPath("");
                    }}
                  >
                    Files
                  </BreadcrumbLink>
                </BreadcrumbItem>
                {currentPath?.split("/").map((part, index, parts) => {
                  if (!part) {
                    return null;
                  }
                  const subPath = parts.slice(0, index + 1).join("/");
                  const isLast = index === parts.length - 1;
                  return (
                    <div className="flex items-center" key={subPath}>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        {isLast ? (
                          <BreadcrumbPage>{part}</BreadcrumbPage>
                        ) : (
                          <BreadcrumbLink
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              setCurrentPath(subPath);
                            }}
                          >
                            {part}
                          </BreadcrumbLink>
                        )}
                      </BreadcrumbItem>
                    </div>
                  );
                })}
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          {/* Search bar in header */}
          <div className="flex items-center gap-2">
            <div className="relative w-64 min-w-[200px]">
              <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pr-8 pl-8"
                onChange={(e) => fm.setSearchQuery(e.target.value)}
                placeholder="Search files... (Press /)"
                ref={fm.searchInputRef}
                type="search"
                value={fm.searchQuery}
              />
              {fm.searchQuery && (
                <button
                  className="absolute top-2.5 right-2.5 text-muted-foreground hover:text-foreground"
                  onClick={() => fm.setSearchQuery("")}
                  type="button"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </header>

        {/* biome-ignore lint/a11y/useKeyWithClickEvents: Drag and drop container */}
        {/* biome-ignore lint/a11y/noStaticElementInteractions: Drag and drop container */}
        {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: Drag and drop container */}
        <div
          className="flex flex-1 flex-col gap-2 overflow-hidden p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              fm.clearSelection();
            }
          }}
          onDragEnter={fm.showUploadDialog ? undefined : fm.handleDragEnter}
          onDragLeave={fm.showUploadDialog ? undefined : fm.handleDragLeave}
          onDragOver={fm.showUploadDialog ? undefined : fm.handleDragOver}
          onDrop={fm.showUploadDialog ? undefined : fm.handleDrop}
          ref={fm.containerRef}
        >
          <FileManagerToolbar fm={fm} />
          <FileManagerView fm={fm} />

          {!fm.loading && fm.paginatedFiles.length > 0 && (
            <Pagination
              currentPage={fm.currentPage}
              itemsPerPage={fm.itemsPerPage}
              onItemsPerPageChange={fm.setItemsPerPage}
              onPageChange={fm.setCurrentPage}
              sortedFilesLength={fm.displayCount}
              totalPages={fm.totalPages}
            />
          )}
        </div>
      </SidebarInset>

      <FileDetailsSidebar
        file={fm.infoFile}
        isOpen={!!fm.infoFile}
        onClose={() => fm.setInfoFile(null)}
        onDownload={fm.handleDownload}
        previewBaseUrl={apiBaseUrl}
      />

      {/* Drag Drop Overlay */}
      <DragDropOverlay isVisible={fm.isDragging && !fm.showUploadDialog} />

      <FileDialogs
        copyMoveItems={fm.copyMoveItems}
        copyMoveMode={fm.copyMoveMode}
        currentPath={currentPath}
        currentPathForCopyMove={currentPath}
        fileToDelete={fm.fileToDelete}
        isUploading={fm.isUploading}
        itemToRename={fm.itemToRename}
        keyboardShortcutsContent={null}
        newFolderName={fm.newFolderName}
        newName={fm.newName}
        onCopyMoveConfirm={fm.handleCopyMoveConfirm}
        onCreateFolder={fm.handleCreateFolder}
        onDeleteConfirm={fm.handleDeleteConfirm}
        onRenameConfirm={fm.handleRenameConfirm}
        onSingleUpload={fm.handleSingleFileUpload}
        onUpload={fm.handleUpload}
        setNewFolderName={fm.setNewFolderName}
        setNewName={fm.setNewName}
        setShowCopyMoveDialog={fm.setShowCopyMoveDialog}
        setShowDeleteDialog={fm.setShowDeleteDialog}
        setShowNewFolderDialog={fm.setShowNewFolderDialog}
        setShowRenameDialog={fm.setShowRenameDialog}
        setShowShortcuts={fm.setShowShortcuts}
        setShowUploadDialog={fm.setShowUploadDialog}
        showCopyMoveDialog={fm.showCopyMoveDialog}
        showDeleteDialog={fm.showDeleteDialog}
        showNewFolderDialog={fm.showNewFolderDialog}
        showRenameDialog={fm.showRenameDialog}
        showShortcuts={fm.showShortcuts}
        showUploadDialog={fm.showUploadDialog}
        uploadProgress={fm.uploadProgress}
      />
    </>
  );
}

function FileManagerToolbar({ fm }: { fm: FileManagerState }) {
  if (fm.selectedItems.size > 0) {
    return (
      <div className="flex items-center justify-between rounded-md bg-primary/5 px-3 py-2">
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={fm.clearSelection} size="icon" variant="ghost">
                  <X className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Clear selection</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <span className="font-medium text-sm">
            {fm.selectedItems.size} item
            {fm.selectedItems.size > 1 ? "s" : ""} selected
          </span>
        </div>
        <div className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => {
                    const file = fm.files.find((f) =>
                      fm.selectedItems.has(f.path)
                    );
                    if (file && !file.isDirectory) {
                      fm.handleDownload(file);
                    }
                  }}
                  size="icon"
                  variant="ghost"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Download</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => fm.handleCopy(Array.from(fm.selectedItems))}
                  size="icon"
                  variant="ghost"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copy</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => fm.handleMove(Array.from(fm.selectedItems))}
                  size="icon"
                  variant="ghost"
                >
                  <Move className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Move</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost">
                  <Share2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Share</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={fm.handleBatchDelete}
                  size="icon"
                  variant="ghost"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-md bg-primary/5 px-3 py-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-4 text-muted-foreground text-sm">
          {fm.displayCount} {fm.displayCount === 1 ? "item" : "items"}
        </span>

        {/* Sort */}
        <div className="flex items-center gap-1">
          <Select
            onValueChange={(value) =>
              fm.setSortBy(value as "name" | "type" | "size" | "modified")
            }
            value={fm.sortBy}
          >
            <SelectTrigger className="w-[120px]">
              {fm.sortDirection === "asc" ? (
                <SortAsc className="mr-2 h-4 w-4" />
              ) : (
                <SortDesc className="mr-2 h-4 w-4" />
              )}
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="modified">Date</SelectItem>
              <SelectItem value="size">Size</SelectItem>
              <SelectItem value="type">Type</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Filter */}
        <Popover onOpenChange={fm.setShowFilter} open={fm.showFilter}>
          <PopoverTrigger asChild>
            <Button
              size="icon"
              variant={fm.filterType !== "all" ? "secondary" : "ghost"}
            >
              <Filter className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="p-0">
            <FilterPanel
              filterType={fm.filterType}
              onClear={() => fm.setFilterType("all")}
              setFilterType={fm.setFilterType}
            />
          </PopoverContent>
        </Popover>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => fm.setShowNewFolderDialog(true)}
                size="icon"
                variant="ghost"
              >
                <FolderPlus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>New folder (Ctrl+N)</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => fm.setShowUploadDialog(true)}
                size="icon"
                variant="ghost"
              >
                <Upload className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Upload files (Ctrl+U)</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="flex-1" />

        {/* Actions */}
        <div className="flex gap-2">
          <TooltipProvider>
            {/* View Toggle - List left, Grid right */}
            <div className="flex rounded-md border">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className="rounded-r-none"
                    onClick={() => fm.setViewMode("list")}
                    size="icon"
                    variant={fm.viewMode === "list" ? "secondary" : "ghost"}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>List view</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className="rounded-l-none"
                    onClick={() => fm.setViewMode("grid")}
                    size="icon"
                    variant={fm.viewMode === "grid" ? "secondary" : "ghost"}
                  >
                    <Grid3x3 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Grid view</TooltipContent>
              </Tooltip>
            </div>

            {/* Refresh */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  disabled={fm.loading}
                  onClick={fm.loadFiles}
                  size="icon"
                  variant="ghost"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${fm.loading ? "animate-spin" : ""}`}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh</TooltipContent>
            </Tooltip>

            {/* Settings placeholder */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost">
                  <Settings className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Settings</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Error State */}
      {fm.error && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-4 py-3 text-destructive">
          <AlertCircle className="size-4" />
          {fm.error}
          <button
            className="ml-auto text-destructive text-xs underline"
            onClick={fm.loadFiles}
            type="button"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}

function FileManagerView({ fm }: { fm: FileManagerState }) {
  if (fm.loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (fm.paginatedFiles.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-muted-foreground">
        <FolderPlus className="h-16 w-16" />
        <p>No files found</p>
        <div className="flex gap-2">
          <Button
            onClick={() => fm.setShowNewFolderDialog(true)}
            variant="outline"
          >
            <FolderPlus className="mr-2 h-4 w-4" />
            New Folder
          </Button>
          <Button onClick={() => fm.setShowUploadDialog(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Upload Files
          </Button>
        </div>
      </div>
    );
  }

  if (fm.viewMode === "grid") {
    return (
      <div className="flex-1 overflow-auto rounded-md border bg-card/50 p-4">
        <FileGridView
          files={fm.paginatedFiles}
          focusedIndex={-1}
          onFileDoubleClick={fm.handleFileDoubleClick}
          onFileSelect={fm.handleFileSelect}
          onToggleSelect={fm.toggleSelect}
          renderContextMenuItems={(file) => (
            <FileContextMenuContent
              file={file}
              isMultiSelected={fm.selectedItems.size > 1}
              isStarred={fm.starredItems.has(file.path)}
              onCopy={fm.handleCopy}
              onDelete={fm.handleDeleteClick}
              onDownload={fm.handleDownload}
              onInfo={fm.setInfoFile}
              onMove={fm.handleMove}
              onRename={fm.handleRenameClick}
              onStar={fm.toggleStar}
            />
          )}
          selectedItems={fm.selectedItems}
          showCheckboxes={fm.showCheckboxes}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto rounded-md border bg-card/50">
      <FileListView
        files={fm.paginatedFiles}
        onDownload={fm.handleDownload}
        onFileClick={fm.handleFileClick}
        onFileDoubleClick={fm.handleFileDoubleClick}
        onFileSelect={fm.handleFileSelect}
        onSort={fm.handleSort}
        onToggleSelect={fm.toggleSelect}
        renderContextMenuItems={(file) => (
          <FileContextMenuContent
            file={file}
            isMultiSelected={fm.selectedItems.size > 1}
            isStarred={fm.starredItems.has(file.path)}
            onCopy={fm.handleCopy}
            onDelete={fm.handleDeleteClick}
            onDownload={fm.handleDownload}
            onInfo={fm.setInfoFile}
            onMove={fm.handleMove}
            onRename={fm.handleRenameClick}
            onStar={fm.toggleStar}
          />
        )}
        selectedItems={fm.selectedItems}
        showCheckboxes={fm.showCheckboxes}
        sortBy={fm.sortBy}
        sortDirection={fm.sortDirection}
      />
    </div>
  );
}
