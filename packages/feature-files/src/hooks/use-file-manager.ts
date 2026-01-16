"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FilterType } from "../components/filter-panel";
import type {
  FileInfo,
  SortBy,
  SortDirection,
  ViewMode,
} from "../context/file-manager-context";
import { useFileManagerContext } from "../context/file-manager-context";
import { createFileManagerApi } from "../lib/api";
import { compareFiles, getFileType } from "../lib/file-utils";

export interface UseFileManagerProps {
  apiBaseUrl: string;
}

export function useFileManager({ apiBaseUrl }: UseFileManagerProps) {
  const { currentPath, setCurrentPath, files, setFiles } =
    useFileManagerContext();
  const api = useMemo(() => createFileManagerApi(apiBaseUrl), [apiBaseUrl]);

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [sortBy, setSortBy] = useState<SortBy>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [starredItems, setStarredItems] = useState<Set<string>>(new Set());
  const [_lastSelected, setLastSelected] = useState<string | null>(null);
  const [_focusedIndex, setFocusedIndex] = useState<number>(-1);
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
      const data = await api.fetchLocalFiles(currentPath);
      setFiles(data.files);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load files");
    } finally {
      setLoading(false);
    }
  }, [currentPath, api, setFiles]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  // Search files with debounce
  const prevSearchQuery = useRef(searchQuery);
  useEffect(() => {
    // Skip if search query hasn't changed
    if (prevSearchQuery.current === searchQuery) {
      return;
    }
    prevSearchQuery.current = searchQuery;

    if (!searchQuery) {
      // When search is cleared, reload current directory
      loadFiles();
      return;
    }

    const timeoutId = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.searchFiles(searchQuery);
        setFiles(data.files);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to search files");
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, api, setFiles, loadFiles]);

  // Filter logic extracted to reduce complexity
  const filteredFiles = useMemo(() => {
    return files.filter((file) => shouldFilterFile(file, filterType));
  }, [files, filterType]);

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
        toggleSelect(id, !isSelected);
      } else if (isSelected) {
        toggleSelect(id, false);
      } else {
        setSelectedItems(new Set([id]));
        setLastSelected(id);
      }
    },
    [selectedItems, toggleSelect]
  );

  const _selectAll = useCallback(() => {
    setSelectedItems(new Set(sortedFiles.map((f) => f.path)));
  }, [sortedFiles]);

  const clearSelection = useCallback(() => {
    setSelectedItems(new Set());
    setLastSelected(null);
    setFocusedIndex(-1);
  }, []);

  const _isAllSelected =
    sortedFiles.length > 0 && selectedItems.size === sortedFiles.length;

  const showCheckboxes = selectedItems.size > 0;

  const handleDeleteClick = useCallback((file: FileInfo) => {
    setFileToDelete(file);
    setShowDeleteDialog(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (fileToDelete) {
      try {
        await api.deleteFiles([fileToDelete.path]);
        await loadFiles();
        setShowDeleteDialog(false);
        setFileToDelete(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete file");
      }
    }
  }, [fileToDelete, loadFiles, api]);

  const handleBatchDelete = useCallback(async () => {
    if (selectedItems.size === 0) {
      return;
    }
    const count = selectedItems.size;
    // biome-ignore lint/suspicious/noAlert: Simple confirmation for now
    const confirmed = confirm(
      `Are you sure you want to delete ${count} selected item${
        count > 1 ? "s" : ""
      }?`
    );

    if (!confirmed) {
      return;
    }
    try {
      await api.deleteFiles(Array.from(selectedItems));
      clearSelection();
      await loadFiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete files");
    }
  }, [selectedItems, clearSelection, loadFiles, api]);

  const handleDownload = useCallback(
    async (file: FileInfo) => {
      if (file.isDirectory) {
        setCurrentPath(file.path);
      } else {
        try {
          await api.downloadFile(file);
        } catch (err) {
          setError(
            err instanceof Error ? err.message : "Failed to download file"
          );
        }
      }
    },
    [setCurrentPath, api]
  );

  const handleFileClick = useCallback(
    (file: FileInfo, e?: React.MouseEvent) => {
      e?.stopPropagation?.();
      if (file.isDirectory) {
        setCurrentPath(file.path);
      } else {
        const fileUrl = api.getPreviewUrl(file.path);
        window.open(fileUrl, "_blank", "noopener,noreferrer");
      }
    },
    [setCurrentPath, api]
  );

  const handleFileDoubleClick = useCallback(
    (file: FileInfo) => {
      if (file.isDirectory) {
        setCurrentPath(file.path);
      } else {
        const fileType = getFileType(file.name, false);
        if (fileType === "image") {
          setPreviewFile(file);
          setPreviewOpen(true);
        } else {
          const fileUrl = api.getPreviewUrl(file.path);
          window.open(fileUrl, "_blank", "noopener,noreferrer");
        }
      }
    },
    [setCurrentPath, api]
  );

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
        await api.uploadFiles(filesList, currentPath || "", (progress) => {
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
    [currentPath, loadFiles, api]
  );

  const handleCreateFolder = useCallback(async () => {
    const name = newFolderName.trim();
    if (!name) {
      return;
    }

    try {
      await api.createFolder(name, currentPath || "");
      setNewFolderName("");
      setShowNewFolderDialog(false);
      await loadFiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create folder");
    }
  }, [newFolderName, currentPath, loadFiles, api]);

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
    const operation = copyMoveMode === "copy" ? api.copyFile : api.moveFile;

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
  }, [
    copyMoveItems,
    copyMoveMode,
    currentPath,
    clearSelection,
    loadFiles,
    api,
  ]);

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
      await api.renameFile(itemToRename.path, newName.trim());
      setShowRenameDialog(false);
      setItemToRename(null);
      setNewName("");
      await loadFiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to rename");
    }
  }, [itemToRename, newName, loadFiles, api]);

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

  const handleSingleFileUpload = useCallback(
    async (
      fileState: { file: File; id: string },
      onProgress?: (progress: number, speed: number, eta: number) => void
    ) => {
      await api.uploadFile(fileState.file, currentPath || "", (progress) => {
        if (onProgress) {
          // Calculate speed and ETA if needed, for now just pass progress percentage
          const percentage = (progress.loaded / progress.total) * 100;
          onProgress(percentage, 0, 0);
        }
      });
      await loadFiles();
      return undefined;
    },
    [currentPath, loadFiles, api]
  );

  return {
    // State
    viewMode,
    setViewMode,
    sortBy,
    setSortBy,
    sortDirection,
    setSortDirection,
    selectedItems,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    starredItems,
    filterType,
    setFilterType,
    showFilter,
    setShowFilter,
    showShortcuts,
    setShowShortcuts,
    showDeleteDialog,
    setShowDeleteDialog,
    fileToDelete,
    showUploadDialog,
    setShowUploadDialog,
    uploadProgress,
    isUploading,
    isDragging,
    showNewFolderDialog,
    setShowNewFolderDialog,
    newFolderName,
    setNewFolderName,
    showCopyMoveDialog,
    setShowCopyMoveDialog,
    copyMoveMode,
    copyMoveItems,
    showRenameDialog,
    setShowRenameDialog,
    itemToRename,
    newName,
    setNewName,
    infoFile,
    setInfoFile,
    previewOpen,
    setPreviewOpen,
    previewFile,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,

    // Derived
    files: sortedFiles,
    paginatedFiles,
    totalPages,
    showCheckboxes,
    displayCount: sortedFiles.length,

    // Actions
    loadFiles,
    handleSort,
    handleSortDirectionChange: setSortDirection,
    toggleStar,
    toggleSelect,
    clearSelection,
    handleFileSelect,
    handleFileClick,
    handleFileDoubleClick,
    handleDeleteClick,
    handleBatchDelete,
    handleDeleteConfirm,
    handleDownload,
    handleUpload,
    handleSingleFileUpload,
    handleCreateFolder,
    handleCopy,
    handleMove,
    handleCopyMoveConfirm,
    handleRenameClick,
    handleRenameConfirm,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,

    // Refs
    searchInputRef,
    containerRef,

    // API
    api,
  };
}

function shouldFilterFile(file: FileInfo, filterType: FilterType): boolean {
  if (filterType === "all") {
    return true;
  }
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
  return true;
}
