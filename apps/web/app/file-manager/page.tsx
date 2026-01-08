"use client";

import { Badge } from "@workspace/ui/components/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@workspace/ui/components/breadcrumb";
import { Button } from "@workspace/ui/components/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible";
import {
  ContextMenuItem,
  ContextMenuSeparator,
} from "@workspace/ui/components/context-menu";
import { Input } from "@workspace/ui/components/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import { Progress } from "@workspace/ui/components/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Separator } from "@workspace/ui/components/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@workspace/ui/components/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { FilePreviewDialog } from "@workspace/ui/composed/file-preview-dialog";
import {
  AlertCircle,
  ChevronRight,
  Copy,
  Download,
  FileText,
  Filter,
  Folder,
  FolderOpen,
  FolderPlus,
  Grid3x3,
  HardDrive,
  Info,
  Keyboard,
  List,
  Loader2,
  Move,
  Pencil,
  RefreshCw,
  Search,
  Share2,
  SortAsc,
  SortDesc,
  Star,
  StarOff,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { env } from "@/lib/env";
import { DragDropOverlay } from "./drag-drop-overlay";
import { EmptyState } from "./empty-state";
import { FileDialogs } from "./file-dialogs";
import { FileGridView } from "./file-grid-view";
import { FileListView } from "./file-list-view";
import type { FileInfo } from "./file-manager-context";
import { FileManagerProvider, useFileManager } from "./file-manager-context";
import { FilterPanel } from "./filter-panel";
import { KeyboardShortcuts } from "./keyboard-shortcuts";
import { getFileType } from "./lib/file-utils";
import { NewButtonMenu } from "./new-button-menu";
import { Pagination } from "./pagination";

interface LocalFilesResponse {
  files: FileInfo[];
  path?: string;
}

type SortBy = "name" | "date" | "size" | "type";

type FilterType =
  | "all"
  | "folder"
  | "image"
  | "document"
  | "spreadsheet"
  | "archive"
  | "code"
  | "other";

async function fetchLocalFiles(path?: string): Promise<LocalFilesResponse> {
  const url = path
    ? `${env.NEXT_PUBLIC_API_URL}/storage/${path}`
    : `${env.NEXT_PUBLIC_API_URL}/storage`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch files: ${response.statusText}`);
  }
  return response.json();
}

async function searchFiles(query: string): Promise<LocalFilesResponse> {
  const url = `${env.NEXT_PUBLIC_API_URL}/storage/search?q=${encodeURIComponent(query)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to search files: ${response.statusText}`);
  }
  return response.json();
}

interface TreeItem {
  name: string;
  path: string;
  children: TreeItem[];
}

interface FileApiResponse {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
}

async function fetchAllFiles(): Promise<FileApiResponse[]> {
  const url = `${env.NEXT_PUBLIC_API_URL}/storage/all`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch files: ${response.statusText}`);
  }
  const data: LocalFilesResponse = await response.json();
  return data.files;
}

function buildDirectoryTree(files: FileApiResponse[]): TreeItem[] {
  const directories = files.filter((f) => f.isDirectory);
  const dirMap = new Map<string, TreeItem>();

  for (const dir of directories) {
    dirMap.set(dir.path, { name: dir.name, path: dir.path, children: [] });
  }

  const roots: TreeItem[] = [];

  for (const dir of directories) {
    const node = dirMap.get(dir.path);
    if (!node) {
      continue;
    }

    const pathParts = dir.path.split("/");
    if (pathParts.length === 1) {
      roots.push(node);
    } else {
      const parentPath = pathParts.slice(0, -1).join("/");
      const parent = dirMap.get(parentPath);
      if (parent) {
        parent.children.push(node);
      }
    }
  }

  const sortDirs = (dirs: TreeItem[]) => {
    dirs.sort((a, b) => a.name.localeCompare(b.name));
    for (const dir of dirs) {
      sortDirs(dir.children);
    }
  };
  sortDirs(roots);

  return roots;
}

interface TreeProps {
  currentPath: string;
  item: TreeItem;
  onNavigate: (path: string) => void;
}

function Tree({ currentPath, item, onNavigate }: TreeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const hasChildren = item.children.length > 0;
  const isActive = currentPath === item.path;

  useEffect(() => {
    if (currentPath.startsWith(item.path)) {
      setIsOpen(true);
    }
  }, [currentPath, item.path]);

  const handleClick = useCallback(() => {
    if (hasChildren) {
      setIsOpen((prev) => !prev);
    }
    onNavigate(item.path);
  }, [hasChildren, item.path, onNavigate]);

  if (!hasChildren) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          className="data-[active=true]:bg-transparent"
          isActive={isActive}
          onClick={handleClick}
        >
          <div className="size-4" />
          <Folder className="size-4 text-blue-500" />
          {item.name}
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem>
      <Collapsible
        className="group/collapsible [&[data-state=open]>button>svg:first-child]:rotate-90"
        onOpenChange={setIsOpen}
        open={isOpen}
      >
        <CollapsibleTrigger asChild>
          <SidebarMenuButton isActive={isActive} onClick={handleClick}>
            <ChevronRight className="transition-transform" />
            {isOpen ? (
              <FolderOpen className="size-4 text-blue-500" />
            ) : (
              <Folder className="size-4 text-blue-500" />
            )}
            {item.name}
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {item.children.map((child) => (
              <Tree
                currentPath={currentPath}
                item={child}
                key={child.path}
                onNavigate={onNavigate}
              />
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  );
}

interface FileSidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  onCreateFolder: () => void;
  onUploadFiles: () => void;
}

function FileSidebar({
  currentPath,
  onNavigate,
  onCreateFolder,
  onUploadFiles,
}: FileSidebarProps) {
  const [directories, setDirectories] = useState<TreeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<FileApiResponse[]>([]);

  useEffect(() => {
    async function loadDirectories() {
      setLoading(true);
      try {
        const fetchedFiles = await fetchAllFiles();
        setFiles(fetchedFiles);
        const dirTree = buildDirectoryTree(fetchedFiles);
        setDirectories(dirTree);
      } catch {
        // Ignore error
      } finally {
        setLoading(false);
      }
    }
    loadDirectories();
  }, []);

  // Calculate storage (only files, not directories)
  const totalSize = files
    .filter((f) => !f.isDirectory)
    .reduce((acc, f) => acc + f.size, 0);
  const maxStorage = 15 * 1024 * 1024 * 1024;
  const usagePercent = Math.min((totalSize / maxStorage) * 100, 100);
  const maxStorageGB = maxStorage / (1024 * 1024 * 1024);

  // Format usage dynamically, always show unit
  function formatUsage(bytes: number): string {
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 0.5) {
      return `${gb.toFixed(2)} GB`;
    }
    const mb = bytes / (1024 * 1024);
    if (mb >= 0.5) {
      return `${mb.toFixed(1)} MB`;
    }
    const kb = bytes / 1024;
    if (kb >= 0.5) {
      return `${kb.toFixed(0)} KB`;
    }
    return `${bytes} B`;
  }

  const usageDisplay = formatUsage(totalSize);

  return (
    <Sidebar variant="inset">
      <SidebarHeader className="border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <HardDrive className="size-8 text-muted-foreground" />
          <div className="flex flex-col">
            <span className="font-medium text-xl">Storage</span>
            <span className="text-muted-foreground text-xs">
              {usageDisplay} / {maxStorageGB} GB
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* New Button Section */}
        <SidebarGroup className="px-3">
          <NewButtonMenu
            onCreateFolder={onCreateFolder}
            onUploadFiles={onUploadFiles}
          />
        </SidebarGroup>

        {/* Folders Section */}
        <SidebarGroup>
          <SidebarGroupLabel>Folders</SidebarGroupLabel>
          <SidebarGroupContent>
            {loading ? (
              <div className="flex items-center justify-center px-2 py-4">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            ) : directories.length === 0 ? (
              <div className="px-2 py-1 text-muted-foreground text-sm">
                No folders found
              </div>
            ) : (
              <SidebarMenu>
                {directories.map((item) => (
                  <Tree
                    currentPath={currentPath}
                    item={item}
                    key={item.path}
                    onNavigate={onNavigate}
                  />
                ))}
              </SidebarMenu>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t px-4 py-3">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Usage</span>
            <span className="font-medium">
              {usageDisplay} / {maxStorageGB} GB
            </span>
          </div>
          <Progress value={usagePercent} />
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

interface InfoSidebarProps {
  file: FileInfo;
  onClose: () => void;
  onPreview?: () => void;
}

function InfoSidebar({ file, onClose, onPreview }: InfoSidebarProps) {
  const fileType = getFileType(file.name, file.isDirectory);
  const isImage = fileType === "image";

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <Sidebar collapsible="none" side="right" variant="inset">
      <SidebarHeader className="border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="size-8 text-muted-foreground" />
            <span className="font-medium text-lg">Information</span>
          </div>
          <Button onClick={onClose} size="icon" variant="ghost">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent className="space-y-4">
            {/* File name and icon */}
            <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
              <div className="flex size-12 items-center justify-center rounded-md bg-background">
                {getFileType(file.name, file.isDirectory) === "folder" ? (
                  <Folder className="size-6 text-blue-500" />
                ) : (
                  <FileText className="size-6 text-muted-foreground" />
                )}
              </div>
              <div className="flex flex-1 flex-col">
                <span className="truncate font-medium">{file.name}</span>
                <Badge className="w-fit" variant="secondary">
                  {file.isDirectory ? "Folder" : fileType}
                </Badge>
              </div>
            </div>

            {/* File details */}
            <div className="space-y-3">
              <div>
                <span className="text-muted-foreground text-xs">Path</span>
                <span className="block truncate font-medium text-sm">
                  {file.path || "/"}
                </span>
              </div>

              {!file.isDirectory && (
                <div>
                  <span className="text-muted-foreground text-xs">Size</span>
                  <span className="block font-medium text-sm">
                    {formatFileSize(file.size)}
                  </span>
                </div>
              )}

              <div>
                <span className="text-muted-foreground text-xs">Modified</span>
                <span className="block font-medium text-sm">
                  {formatDate(file.modified)}
                </span>
              </div>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t px-4 py-3">
        <div className="flex gap-2">
          {isImage && onPreview && (
            <Button
              className="flex-1"
              onClick={onPreview}
              size="sm"
              variant="outline"
            >
              Preview
            </Button>
          )}
          <Button
            className="flex-1"
            onClick={onClose}
            size="sm"
            variant="outline"
          >
            Close
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

interface UploadProgress {
  file: string;
  loaded: number;
  total: number;
}

async function uploadFile(
  file: File,
  path: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<FileInfo> {
  const formData = new FormData();
  formData.append("file", file);

  const url = path
    ? `${env.NEXT_PUBLIC_API_URL}/storage/upload/${path}`
    : `${env.NEXT_PUBLIC_API_URL}/storage/upload/`;

  const xhr = new XMLHttpRequest();

  return new Promise((resolve, reject) => {
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress({ file: file.name, loaded: e.loaded, total: e.total });
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const response = JSON.parse(xhr.responseText);
        if (response.files?.[0]) {
          resolve(response.files[0]);
        } else {
          reject(new Error("Upload failed: no file returned"));
        }
      } else {
        reject(new Error(`Upload failed: ${xhr.statusText}`));
      }
    });

    xhr.addEventListener("error", () => {
      reject(new Error("Upload failed: network error"));
    });

    xhr.open("POST", url);
    xhr.send(formData);
  });
}

async function uploadFiles(
  files: File[],
  path: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<FileInfo[]> {
  const results: FileInfo[] = [];

  for (const file of files) {
    try {
      const uploaded = await uploadFile(file, path, onProgress);
      results.push(uploaded);
    } catch {
      // Ignore error
    }
  }

  return results;
}

async function downloadFile(file: FileInfo): Promise<void> {
  const url = `${env.NEXT_PUBLIC_API_URL}/storage/download/${file.path}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.statusText}`);
  }

  const blob = await response.blob();
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(downloadUrl);
}

async function deleteFiles(paths: string[]): Promise<void> {
  const url = `${env.NEXT_PUBLIC_API_URL}/storage`;
  const response = await fetch(url, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items: paths }),
  });
  if (!response.ok) {
    throw new Error(`Failed to delete files: ${response.statusText}`);
  }
}

async function createFolder(name: string, path: string): Promise<FileInfo> {
  const url = path
    ? `${env.NEXT_PUBLIC_API_URL}/storage/folder/${path}`
    : `${env.NEXT_PUBLIC_API_URL}/storage/folder`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.message || `Failed to create folder: ${response.statusText}`
    );
  }
  const data = await response.json();
  return data.folder;
}

async function copyFile(
  sourcePath: string,
  destinationPath: string
): Promise<FileInfo> {
  const url = `${env.NEXT_PUBLIC_API_URL}/storage/copy/${sourcePath}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ destination: destinationPath }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Failed to copy: ${response.statusText}`);
  }
  const data = await response.json();
  return data.file;
}

async function moveFile(
  sourcePath: string,
  destinationPath: string
): Promise<FileInfo> {
  const url = `${env.NEXT_PUBLIC_API_URL}/storage/move/${sourcePath}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ destination: destinationPath }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Failed to move: ${response.statusText}`);
  }
  const data = await response.json();
  return data.file;
}

async function renameFile(path: string, newName: string): Promise<FileInfo> {
  const url = `${env.NEXT_PUBLIC_API_URL}/storage/rename/${path}`;
  const response = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: newName }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.message || `Failed to rename: ${response.statusText}`
    );
  }
  const data = await response.json();
  return data.file;
}

function compareFiles(
  a: FileInfo,
  b: FileInfo,
  sortBy: SortBy,
  sortDirection: "asc" | "desc"
): number {
  if (a.isDirectory && !b.isDirectory) {
    return -1;
  }
  if (!a.isDirectory && b.isDirectory) {
    return 1;
  }

  let comparison = 0;
  switch (sortBy) {
    case "name":
      comparison = a.name.localeCompare(b.name);
      break;
    case "date":
      comparison =
        new Date(a.modified).getTime() - new Date(b.modified).getTime();
      break;
    case "size":
      comparison = a.size - b.size;
      break;
    case "type":
      comparison = getFileType(a.name, a.isDirectory).localeCompare(
        getFileType(b.name, b.isDirectory)
      );
      break;
    default:
      comparison = 0;
  }

  return sortDirection === "desc" ? -comparison : comparison;
}

function FileManagerPageContent() {
  const { currentPath, setCurrentPath } = useFileManager();
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [sortBy, setSortBy] = useState<SortBy>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [starredItems, setStarredItems] = useState<Set<string>>(new Set());
  const [_lastSelected, setLastSelected] = useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [showFilter, setShowFilter] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<FileInfo | null>(null);

  // Upload state
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>(
    {}
  );
  const [isUploading, setIsUploading] = useState(false);

  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);
  const [_dragCounter, setDragCounter] = useState(0);

  // New folder state
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  // Copy/Move state
  const [showCopyMoveDialog, setShowCopyMoveDialog] = useState(false);
  const [copyMoveMode, setCopyMoveMode] = useState<"copy" | "move">("copy");
  const [copyMoveItems, setCopyMoveItems] = useState<string[]>([]);

  // Rename state
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [itemToRename, setItemToRename] = useState<FileInfo | null>(null);
  const [newName, setNewName] = useState("");

  // Right sidebar state
  const [infoFile, setInfoFile] = useState<FileInfo | null>(null);

  // Preview dialog state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileInfo | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLocalFiles(currentPath || undefined);
      setFiles(data.files);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load files");
    } finally {
      setLoading(false);
    }
  }, [currentPath]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  // Search files with debounce
  useEffect(() => {
    if (!searchQuery) {
      // When search is cleared, reload current directory
      loadFiles();
      return;
    }

    const timeoutId = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await searchFiles(searchQuery);
        setFiles(data.files);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to search files");
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Filter and sort files
  const filteredFiles = useMemo(() => {
    return files.filter((file) => {
      if (filterType !== "all") {
        const fileType = getFileType(file.name, file.isDirectory);
        if (filterType === "folder" && !file.isDirectory) {
          return false;
        }
        if (filterType === "other") {
          if (
            [
              "image",
              "document",
              "spreadsheet",
              "archive",
              "code",
              "folder",
            ].includes(fileType)
          ) {
            return false;
          }
        } else if (fileType !== filterType && !file.isDirectory) {
          return false;
        }
      }
      return true;
    });
  }, [files, searchQuery, filterType]);

  const sortedFiles = useMemo(() => {
    return [...filteredFiles].sort((a, b) =>
      compareFiles(a, b, sortBy, sortDirection)
    );
  }, [filteredFiles, sortBy, sortDirection]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, []);

  // Paginated files
  const paginatedFiles = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedFiles.slice(startIndex, endIndex);
  }, [sortedFiles, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(sortedFiles.length / itemsPerPage);

  // Toggle sort direction
  const handleSort = useCallback(
    (column: SortBy) => {
      if (sortBy === column) {
        setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortBy(column);
        setSortDirection("asc");
      }
    },
    [sortBy]
  );

  const toggleStar = useCallback((id: string) => {
    setStarredItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleSelect = useCallback((id: string, checked: boolean) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
    setLastSelected(id);
  }, []);

  // Handle file click with Ctrl key for multi-selection
  const handleFileSelect = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const isCtrlPressed = e.ctrlKey || e.metaKey;
      const isSelected = selectedItems.has(id);

      if (isCtrlPressed) {
        // Ctrl+click: toggle selection (multi-select mode)
        toggleSelect(id, !isSelected);
      } else if (isSelected) {
        // Click on selected item: unselect it
        toggleSelect(id, false);
      } else {
        // Normal click on unselected item: select only this item (clear others)
        setSelectedItems(new Set([id]));
        setLastSelected(id);
      }
    },
    [selectedItems, toggleSelect]
  );

  const selectAll = useCallback(() => {
    setSelectedItems(new Set(sortedFiles.map((f) => f.path)));
  }, [sortedFiles]);

  const clearSelection = useCallback(() => {
    setSelectedItems(new Set());
    setLastSelected(null);
    setFocusedIndex(-1);
  }, []);

  const isAllSelected =
    sortedFiles.length > 0 && selectedItems.size === sortedFiles.length;

  // Show checkboxes when at least one item is selected
  const showCheckboxes = selectedItems.size > 0;

  const _handleSelectAll = useCallback(() => {
    if (isAllSelected) {
      clearSelection();
    } else {
      selectAll();
    }
  }, [isAllSelected, clearSelection, selectAll]);

  const handleDeleteClick = useCallback((file: FileInfo) => {
    setFileToDelete(file);
    setShowDeleteDialog(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (fileToDelete) {
      try {
        await deleteFiles([fileToDelete.path]);
        await loadFiles();
        setShowDeleteDialog(false);
        setFileToDelete(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete file");
      }
    }
  }, [fileToDelete, loadFiles]);

  const handleBatchDelete = useCallback(async () => {
    if (selectedItems.size === 0) {
      return;
    }
    const count = selectedItems.size;
    if (
      !confirm(
        `Are you sure you want to delete ${count} selected item${count > 1 ? "s" : ""}?`
      )
    ) {
      return;
    }
    try {
      await deleteFiles(Array.from(selectedItems));
      clearSelection();
      await loadFiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete files");
    }
  }, [selectedItems, clearSelection, loadFiles]);

  const handleDownload = useCallback(
    async (file: FileInfo) => {
      if (file.isDirectory) {
        setCurrentPath(file.path);
      } else {
        try {
          await downloadFile(file);
        } catch (err) {
          setError(
            err instanceof Error ? err.message : "Failed to download file"
          );
        }
      }
    },
    [setCurrentPath]
  );

  const handleFileClick = useCallback(
    (file: FileInfo, e?: React.MouseEvent) => {
      e?.stopPropagation?.();
      if (file.isDirectory) {
        setCurrentPath(file.path);
      } else {
        // Open file in new tab
        const fileUrl = `${env.NEXT_PUBLIC_API_URL}/storage/preview/${file.path}`;
        window.open(fileUrl, "_blank", "noopener,noreferrer");
      }
    },
    [setCurrentPath]
  );

  const handleFileDoubleClick = useCallback(
    (file: FileInfo) => {
      if (file.isDirectory) {
        setCurrentPath(file.path);
      } else {
        const fileType = getFileType(file.name, false);
        // For images, open preview dialog
        if (fileType === "image") {
          setPreviewFile(file);
          setPreviewOpen(true);
        } else {
          // For other files, open in new tab
          const fileUrl = `${env.NEXT_PUBLIC_API_URL}/storage/preview/${file.path}`;
          window.open(fileUrl, "_blank", "noopener,noreferrer");
        }
      }
    },
    [setCurrentPath]
  );

  // Upload handlers
  const handleUpload = useCallback(
    async (fileList: FileList | File[]) => {
      const filesList = Array.from(fileList);
      if (filesList.length === 0) {
        return;
      }

      setIsUploading(true);
      setUploadProgress({});
      setShowUploadDialog(false);

      try {
        await uploadFiles(filesList, currentPath || "", (progress) => {
          setUploadProgress((prev) => ({
            ...prev,
            [progress.file]: (progress.loaded / progress.total) * 100,
          }));
        });
        await loadFiles();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to upload files");
      } finally {
        setIsUploading(false);
        setUploadProgress({});
      }
    },
    [currentPath, loadFiles]
  );

  // New folder handlers
  const handleCreateFolder = useCallback(async () => {
    const name = newFolderName.trim();
    if (!name) {
      return;
    }

    try {
      await createFolder(name, currentPath || "");
      setNewFolderName("");
      setShowNewFolderDialog(false);
      await loadFiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create folder");
    }
  }, [newFolderName, currentPath, loadFiles]);

  // Copy/Move handlers
  const handleCopy = useCallback((items: string[]) => {
    setCopyMoveItems(items);
    setCopyMoveMode("copy");
    setShowCopyMoveDialog(true);
  }, []);

  const handleMove = useCallback((items: string[]) => {
    setCopyMoveItems(items);
    setCopyMoveMode("move");
    setShowCopyMoveDialog(true);
  }, []);

  const handleCopyMoveConfirm = useCallback(async () => {
    const destinationPath = currentPath || "";
    const operation = copyMoveMode === "copy" ? copyFile : moveFile;

    try {
      for (const itemPath of copyMoveItems) {
        await operation(itemPath, destinationPath);
      }
      setShowCopyMoveDialog(false);
      setCopyMoveItems([]);
      clearSelection();
      await loadFiles();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : `Failed to ${copyMoveMode}`
      );
    }
  }, [copyMoveItems, copyMoveMode, currentPath, clearSelection, loadFiles]);

  // Rename handlers
  const handleRenameClick = useCallback((file: FileInfo) => {
    setItemToRename(file);
    setNewName(file.name);
    setShowRenameDialog(true);
  }, []);

  const handleRenameConfirm = useCallback(async () => {
    if (!(itemToRename && newName.trim())) {
      return;
    }

    try {
      await renameFile(itemToRename.path, newName.trim());
      setShowRenameDialog(false);
      setItemToRename(null);
      setNewName("");
      await loadFiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to rename");
    }
  }, [itemToRename, newName, loadFiles]);

  // Drag and drop handlers
  const handleDragEnter = useCallback(() => {
    setDragCounter((prev) => prev + 1);
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragCounter((prev) => {
      if (prev - 1 === 0) {
        setIsDragging(false);
      }
      return prev - 1;
    });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      setDragCounter(0);

      if (e.dataTransfer.files?.length > 0) {
        handleUpload(e.dataTransfer.files);
      }
    },
    [handleUpload]
  );

  function _renderContextMenuItems(file: FileInfo) {
    const isMultiSelected = selectedItems.size > 1;
    const isThisSelected = selectedItems.has(file.path);

    return (
      <>
        <ContextMenuItem onClick={() => handleDownload(file)}>
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
        <ContextMenuItem
          disabled={isMultiSelected}
          onClick={() => setInfoFile(file)}
        >
          <Info className="mr-2 h-4 w-4" />
          Information
        </ContextMenuItem>
        <ContextMenuItem onClick={() => toggleStar(file.path)}>
          {starredItems.has(file.path) ? (
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
        <ContextMenuItem onClick={() => handleRenameClick(file)}>
          <Pencil className="mr-2 h-4 w-4" />
          Rename
        </ContextMenuItem>
        <ContextMenuItem onClick={() => handleCopy([file.path])}>
          <Copy className="mr-2 h-4 w-4" />
          Copy
        </ContextMenuItem>
        <ContextMenuItem onClick={() => handleMove([file.path])}>
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
          onClick={() => handleDeleteClick(file)}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </ContextMenuItem>
      </>
    );
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "a") {
        e.preventDefault();
        if (isAllSelected) {
          clearSelection();
        } else {
          selectAll();
        }
        return;
      }

      if (e.key === "Escape") {
        clearSelection();
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedItems.size > 0) {
          e.preventDefault();
          handleBatchDelete();
        }
        return;
      }

      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const direction = e.key === "ArrowDown" ? 1 : -1;
        const newIndex = Math.max(
          -1,
          Math.min(sortedFiles.length - 1, focusedIndex + direction)
        );
        setFocusedIndex(newIndex);
        return;
      }

      if (e.key === "Enter" && focusedIndex >= 0 && sortedFiles[focusedIndex]) {
        e.preventDefault();
        handleFileClick(sortedFiles[focusedIndex]);
        return;
      }

      if (e.key === " " && focusedIndex >= 0 && sortedFiles[focusedIndex]) {
        e.preventDefault();
        toggleSelect(sortedFiles[focusedIndex].path, true);
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    sortedFiles,
    focusedIndex,
    selectedItems,
    isAllSelected,
    clearSelection,
    selectAll,
    handleBatchDelete,
    toggleSelect,
    handleFileClick,
  ]);

  const displayCount = sortedFiles.length;
  const hasFiles = files.length > 0;
  const hasResults = sortedFiles.length > 0;

  return (
    <>
      <FileSidebar
        currentPath={currentPath}
        onCreateFolder={() => setShowNewFolderDialog(true)}
        onNavigate={setCurrentPath}
        onUploadFiles={() => setShowUploadDialog(true)}
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
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search files... (Press /)"
                ref={searchInputRef}
                type="search"
                value={searchQuery}
              />
              {searchQuery && (
                <button
                  className="absolute top-2.5 right-2.5 text-muted-foreground hover:text-foreground"
                  onClick={() => setSearchQuery("")}
                  type="button"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </header>
        <div
          className="flex flex-1 flex-col gap-2 overflow-hidden p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              clearSelection();
            }
          }}
          onDragEnter={showUploadDialog ? undefined : handleDragEnter}
          onDragLeave={showUploadDialog ? undefined : handleDragLeave}
          onDragOver={showUploadDialog ? undefined : handleDragOver}
          onDrop={showUploadDialog ? undefined : handleDrop}
          ref={containerRef}
        >
          {/* Actions row */}
          {selectedItems.size === 0 && (
            <div className="flex flex-col gap-4 rounded-md bg-primary/5 px-3 py-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-4 text-muted-foreground text-sm">
                  {displayCount} {displayCount === 1 ? "item" : "items"}
                </span>
                {/* Sort */}
                <div className="flex items-center gap-1">
                  <Select
                    onValueChange={(value) => setSortBy(value as SortBy)}
                    value={sortBy}
                  >
                    <SelectTrigger className="w-[120px]">
                      {sortDirection === "asc" ? (
                        <SortAsc className="mr-2 h-4 w-4" />
                      ) : (
                        <SortDesc className="mr-2 h-4 w-4" />
                      )}
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="size">Size</SelectItem>
                      <SelectItem value="type">Type</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Filter */}
                <Popover onOpenChange={setShowFilter} open={showFilter}>
                  <PopoverTrigger asChild>
                    <Button
                      size="icon"
                      variant={filterType !== "all" ? "secondary" : "ghost"}
                    >
                      <Filter className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="p-0">
                    <FilterPanel
                      filterType={filterType}
                      onClear={() => setFilterType("all")}
                      setFilterType={setFilterType}
                    />
                  </PopoverContent>
                </Popover>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => setShowNewFolderDialog(true)}
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
                        onClick={() => setShowUploadDialog(true)}
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
                    {/* Keyboard shortcuts help */}
                    {/* Intentionally hidden for future usage */}
                    <div className="hidden">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            onClick={() => setShowShortcuts(true)}
                            size="icon"
                            variant="outline"
                          >
                            <Keyboard className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Keyboard shortcuts</TooltipContent>
                      </Tooltip>
                    </div>
                    {/* View Toggle - List left, Grid right */}
                    <div className="flex rounded-md border">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            className="rounded-r-none"
                            onClick={() => setViewMode("list")}
                            size="icon"
                            variant={
                              viewMode === "list" ? "secondary" : "ghost"
                            }
                          >
                            <List className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>List View</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            className="rounded-l-none"
                            onClick={() => setViewMode("grid")}
                            size="icon"
                            variant={
                              viewMode === "grid" ? "secondary" : "ghost"
                            }
                          >
                            <Grid3x3 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Grid View</TooltipContent>
                      </Tooltip>
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          disabled={loading}
                          onClick={loadFiles}
                          size="icon"
                          variant="outline"
                        >
                          <RefreshCw
                            className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                          />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Refresh</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>

              {/* Error State */}
              {error && (
                <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-4 py-3 text-destructive">
                  <AlertCircle className="size-4" />
                  {error}
                  <button
                    className="ml-auto text-destructive text-xs underline"
                    onClick={loadFiles}
                    type="button"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Batch actions bar */}
          {selectedItems.size > 0 && (
            <div className="flex items-center justify-between rounded-md bg-primary/5 px-3 py-2">
              <div className="flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={clearSelection}
                        size="icon"
                        variant="ghost"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Clear selection</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <span className="font-medium text-sm">
                  {selectedItems.size} item{selectedItems.size > 1 ? "s" : ""}{" "}
                  selected
                </span>
              </div>
              <div className="flex items-center gap-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => {
                          const file = sortedFiles.find((f) =>
                            selectedItems.has(f.path)
                          );
                          if (file && !file.isDirectory) {
                            handleDownload(file);
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
                        onClick={() => handleCopy(Array.from(selectedItems))}
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
                        onClick={() => handleMove(Array.from(selectedItems))}
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
                        onClick={handleBatchDelete}
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
          )}

          {/* Files Section */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : hasFiles ? (
            hasResults ? (
              viewMode === "grid" ? (
                <FileGridView
                  files={paginatedFiles}
                  focusedIndex={focusedIndex}
                  onFileDoubleClick={handleFileDoubleClick}
                  onFileSelect={handleFileSelect}
                  onToggleSelect={toggleSelect}
                  renderContextMenuItems={_renderContextMenuItems}
                  selectedItems={selectedItems}
                  showCheckboxes={showCheckboxes}
                />
              ) : (
                <FileListView
                  files={paginatedFiles}
                  onDownload={handleDownload}
                  onFileClick={handleFileClick}
                  onFileDoubleClick={handleFileDoubleClick}
                  onFileSelect={handleFileSelect}
                  onSort={(by) => handleSort(by as SortBy)}
                  onToggleSelect={toggleSelect}
                  renderContextMenuItems={_renderContextMenuItems}
                  selectedItems={selectedItems}
                  showCheckboxes={showCheckboxes}
                  sortBy={sortBy === "date" ? "modified" : sortBy}
                  sortDirection={sortDirection}
                />
              )
            ) : (
              <EmptyState searchQuery={searchQuery} type="no-results" />
            )
          ) : (
            <EmptyState
              onCreateFolder={() => setShowNewFolderDialog(true)}
              onUpload={() => setShowUploadDialog(true)}
              type="no-files"
            />
          )}

          {/* Pagination Controls */}
          <Pagination
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
            onItemsPerPageChange={(items) => {
              setItemsPerPage(items);
              setCurrentPage(1);
            }}
            onPageChange={setCurrentPage}
            sortedFilesLength={sortedFiles.length}
            totalPages={totalPages}
          />
        </div>

        {/* Dialogs */}
        <FileDialogs
          copyMoveItems={copyMoveItems}
          copyMoveMode={copyMoveMode}
          currentPath={currentPath}
          currentPathForCopyMove={currentPath}
          fileToDelete={fileToDelete}
          isUploading={isUploading}
          itemToRename={itemToRename}
          keyboardShortcutsContent={<KeyboardShortcuts />}
          newFolderName={newFolderName}
          newName={newName}
          onCopyMoveConfirm={handleCopyMoveConfirm}
          onCreateFolder={handleCreateFolder}
          onDeleteConfirm={handleDeleteConfirm}
          onRenameConfirm={handleRenameConfirm}
          onUpload={handleUpload}
          setNewFolderName={setNewFolderName}
          setNewName={setNewName}
          setShowCopyMoveDialog={setShowCopyMoveDialog}
          setShowDeleteDialog={setShowDeleteDialog}
          setShowNewFolderDialog={setShowNewFolderDialog}
          setShowRenameDialog={setShowRenameDialog}
          setShowShortcuts={setShowShortcuts}
          setShowUploadDialog={setShowUploadDialog}
          showCopyMoveDialog={showCopyMoveDialog}
          showDeleteDialog={showDeleteDialog}
          showNewFolderDialog={showNewFolderDialog}
          showRenameDialog={showRenameDialog}
          showShortcuts={showShortcuts}
          showUploadDialog={showUploadDialog}
          uploadProgress={uploadProgress}
        />
      </SidebarInset>

      {infoFile && (
        <InfoSidebar
          file={infoFile}
          onClose={() => setInfoFile(null)}
          onPreview={() => {
            setPreviewFile(infoFile);
            setPreviewOpen(true);
          }}
        />
      )}

      <DragDropOverlay isVisible={isDragging && !showUploadDialog} />

      {/* Preview dialog */}
      {previewFile && (
        <FilePreviewDialog
          fileName={previewFile.name}
          fileType={
            getFileType(previewFile.name, false) === "image"
              ? "image"
              : undefined
          }
          fileUrl={`${env.NEXT_PUBLIC_API_URL}/storage/preview/${previewFile.path}`}
          onOpenChange={setPreviewOpen}
          open={previewOpen}
        />
      )}
    </>
  );
}

export default function FileManagerPage() {
  return (
    <SidebarProvider>
      <FileManagerProvider>
        <FileManagerPageContent />
      </FileManagerProvider>
    </SidebarProvider>
  );
}
