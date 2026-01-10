"use client";

import { Check, FileImage, Plus, Trash2, Upload, X } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "../components/button";
import { cn } from "../lib/utils";

/**
 * FileWithPreview
 * Extends standard File object with a preview URL for images
 */
export interface FileWithPreview extends File {
  preview?: string;
}

export interface UploadFileState {
  id: string;
  file: FileWithPreview;
  progress: number;
  status: "idle" | "uploading" | "completed" | "error";
  error?: string;
  speed?: number;
  eta?: number;
}

export type UploadMode = "quick" | "bulk";

export interface FileUploadWithProgressProps {
  /**
   * Upload function - should handle actual upload logic
   * @param fileState - The file to upload with its state
   * @param onProgress - Callback for progress updates (progress%, speed bytes/s, eta seconds)
   */
  onUpload: (
    fileState: UploadFileState,
    onProgress?: (progress: number, speed: number, eta: number) => void
  ) => Promise<void>;

  /**
   * Delete function - called when user clicks delete on completed files
   */
  onDelete?: (fileState: UploadFileState) => void;

  /**
   * Current upload mode
   */
  uploadMode?: UploadMode;

  /**
   * Callback when upload mode changes
   */
  onUploadModeChange?: (mode: UploadMode) => void;

  /**
   * Max file size in bytes
   * @default 10 * 1024 * 1024 (10MB)
   */
  maxFileSize?: number;

  /**
   * Enable multiple file selection
   */
  multiple?: boolean;

  /**
   * Accepted file types (e.g., { 'image/*': ['.png', '.jpg'] })
   */
  accept?: Record<string, string[]>;

  className?: string;
}

// Format bytes to human readable
function formatBytes(bytes: number): string {
  if (bytes === 0) {
    return "0 B";
  }
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
}

// Format seconds to human readable
function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }
  if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  }
  return `${Math.floor(seconds / 3600)}h ${Math.round((seconds % 3600) / 60)}m`;
}

// Get file icon based on type
function getFileIcon(type: string, className = "h-5 w-5") {
  if (type.startsWith("image/")) {
    return <FileImage className={className} />;
  }
  return <FileImage className={className} />;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: File upload requires complex state management
export function FileUploadWithProgress({
  onUpload,
  onDelete,
  uploadMode: propUploadMode = "bulk",
  onUploadModeChange,
  maxFileSize = 10 * 1024 * 1024,
  multiple = true,
  accept,
  className,
}: FileUploadWithProgressProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const dropZoneRef = React.useRef<HTMLDivElement>(null);
  const uploadingIdsRef = React.useRef<Set<string>>(new Set());

  const [uploadFiles, setUploadFiles] = React.useState<UploadFileState[]>([]);
  const [isDragging, setIsDragging] = React.useState(false);
  const [internalUploadMode, setInternalUploadMode] =
    React.useState<UploadMode>(propUploadMode);

  const currentUploadMode = onUploadModeChange
    ? propUploadMode
    : internalUploadMode;
  const maxFileSizeMB = (maxFileSize / (1024 * 1024)).toFixed(0);

  // Upload a single file
  const uploadSingleFile = React.useCallback(
    async (fileState: UploadFileState) => {
      if (uploadingIdsRef.current.has(fileState.id)) {
        return;
      }

      uploadingIdsRef.current.add(fileState.id);
      setUploadFiles((prev) =>
        prev.map((f) =>
          f.id === fileState.id
            ? { ...f, status: "uploading" as const, progress: 0 }
            : f
        )
      );

      try {
        await onUpload(fileState, (progress, speed, eta) => {
          setUploadFiles((prev) =>
            prev.map((f) =>
              f.id === fileState.id ? { ...f, progress, speed, eta } : f
            )
          );
        });

        setUploadFiles((prev) =>
          prev.map((f) =>
            f.id === fileState.id
              ? { ...f, status: "completed" as const, progress: 100 }
              : f
          )
        );
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : "Upload failed";
        setUploadFiles((prev) =>
          prev.map((f) =>
            f.id === fileState.id
              ? { ...f, status: "error" as const, error: errorMsg }
              : f
          )
        );
      } finally {
        uploadingIdsRef.current.delete(fileState.id);
      }
    },
    [onUpload]
  );

  // Handle file selection
  const handleFileSelect = React.useCallback(
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex file validation logic
    (files: FileList | null) => {
      if (!files) {
        return;
      }

      const newFiles: UploadFileState[] = [];

      for (const file of Array.from(files)) {
        if (file.size > maxFileSize) {
          toast.error(`${file.name} exceeds ${maxFileSizeMB}MB limit`);
          continue;
        }

        const id = `${file.name}-${Date.now()}-${Math.random()}`;
        const preview = file.type.startsWith("image/")
          ? URL.createObjectURL(file)
          : undefined;

        const fileWithPreview = Object.assign(file, {
          preview,
        }) as FileWithPreview;

        const fileState: UploadFileState = {
          id,
          file: fileWithPreview,
          progress: 0,
          status: "idle",
        };

        newFiles.push(fileState);
      }

      setUploadFiles((prev) => {
        const existing = prev.map((f) => f.file.name);
        const filtered = newFiles.filter(
          (f) => !existing.includes(f.file.name)
        );
        return [...prev, ...filtered];
      });

      // Auto-upload in quick mode
      if (currentUploadMode === "quick" && newFiles.length > 0) {
        for (const fileState of newFiles) {
          uploadSingleFile(fileState);
        }
      }
    },
    [maxFileSize, maxFileSizeMB, currentUploadMode, uploadSingleFile]
  );

  // Retry failed upload
  const retryUpload = React.useCallback(
    (id: string) => {
      const file = uploadFiles.find((f) => f.id === id);
      if (!file) {
        return;
      }
      uploadSingleFile(file);
    },
    [uploadFiles, uploadSingleFile]
  );

  // Remove file
  const removeFile = React.useCallback((id: string) => {
    setUploadFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file?.file.preview) {
        URL.revokeObjectURL(file.file.preview);
      }
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  // Clear all
  const clearAll = React.useCallback(() => {
    for (const f of uploadFiles) {
      if (f.file.preview) {
        URL.revokeObjectURL(f.file.preview);
      }
    }
    setUploadFiles([]);
  }, [uploadFiles]);

  // Upload all idle files
  const uploadAllIdle = React.useCallback(() => {
    const idleFiles = uploadFiles.filter((f) => f.status === "idle");
    for (const file of idleFiles) {
      uploadSingleFile(file);
    }
  }, [uploadFiles, uploadSingleFile]);

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (
      dropZoneRef.current &&
      !dropZoneRef.current.contains(e.relatedTarget as Node)
    ) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  // Cleanup previews on unmount
  React.useEffect(() => {
    return () => {
      for (const f of uploadFiles) {
        if (f.file.preview) {
          URL.revokeObjectURL(f.file.preview);
        }
      }
    };
  }, [uploadFiles]);

  const isAnyUploading = uploadFiles.some((f) => f.status === "uploading");
  const hasErrors = uploadFiles.some((f) => f.status === "error");
  const hasIdleFiles = uploadFiles.some((f) => f.status === "idle");

  // Toggle upload mode
  const toggleMode = (mode: UploadMode) => {
    if (onUploadModeChange) {
      onUploadModeChange(mode);
    } else {
      setInternalUploadMode(mode);
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Mode toggle header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          Max {maxFileSizeMB}MB per file •{" "}
          {currentUploadMode === "quick"
            ? "Auto-uploads on selection"
            : "Manual upload"}
        </div>
        <div className="flex rounded-lg border p-1">
          <Button
            className="h-8 rounded-md px-3 text-xs"
            onClick={() => toggleMode("quick")}
            size="sm"
            variant={currentUploadMode === "quick" ? "default" : "ghost"}
          >
            Quick
          </Button>
          <Button
            className="h-8 rounded-md px-3 text-xs"
            onClick={() => toggleMode("bulk")}
            size="sm"
            variant={currentUploadMode === "bulk" ? "default" : "ghost"}
          >
            Bulk
          </Button>
        </div>
      </div>

      {/* Upload Area - replaces when files are present */}
      {uploadFiles.length === 0 ? (
        // biome-ignore lint/a11y/useSemanticElements: Drop zone requires div for drag events
        <div
          className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
            isDragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
          }`}
          onClick={() => fileInputRef.current?.click()}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          ref={dropZoneRef}
          role="button"
          tabIndex={0}
        >
          <Upload className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="font-medium">
            {currentUploadMode === "quick"
              ? "Click to upload"
              : "Drop files here"}
          </p>
          <p className="text-muted-foreground text-sm">
            or click to browse • Max {maxFileSizeMB}MB each
          </p>
          <input
            accept={accept ? Object.keys(accept).join(",") : undefined}
            className="hidden"
            multiple={multiple}
            onChange={(e) => handleFileSelect(e.target.files)}
            ref={fileInputRef}
            type="file"
          />
        </div>
      ) : (
        <div className="space-y-3">
          {/* Drop zone for adding more files */}
          {/* biome-ignore lint/a11y/useSemanticElements: Drop zone requires div for drag events */}
          <div
            className={`flex cursor-pointer items-center justify-center rounded-md border-2 border-dashed py-2 text-sm transition-colors ${
              isDragging
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50"
            }`}
            onClick={() => fileInputRef.current?.click()}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            role="button"
            tabIndex={0}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add more files
            <input
              accept={accept ? Object.keys(accept).join(",") : undefined}
              className="hidden"
              multiple
              onChange={(e) => handleFileSelect(e.target.files)}
              ref={fileInputRef}
              type="file"
            />
          </div>

          {/* File list */}
          <div className="space-y-2">
            {uploadFiles.map((fileState) => (
              <div
                className="overflow-hidden rounded-lg border bg-card"
                key={fileState.id}
              >
                <div className="flex items-center gap-3 p-3">
                  {/* Thumbnail or icon */}
                  {fileState.file.preview ? (
                    // biome-ignore lint/correctness/useImageSize: Dynamic thumbnails
                    // biome-ignore lint/performance/noImgElement: Framework-agnostic library
                    <img
                      alt={fileState.file.name}
                      className="h-10 w-10 shrink-0 rounded object-cover"
                      src={fileState.file.preview}
                    />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                      {getFileIcon(fileState.file.type)}
                    </div>
                  )}

                  {/* File info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="truncate font-medium text-sm"
                        title={fileState.file.name}
                      >
                        {fileState.file.name}
                      </span>
                      <span className="shrink-0 text-muted-foreground text-xs">
                        {formatBytes(fileState.file.size)}
                      </span>
                    </div>

                    {/* Status / Progress */}
                    {fileState.status === "error" && (
                      <div className="flex items-center gap-2">
                        <span className="text-destructive text-xs">
                          {fileState.error}
                        </span>
                        <Button
                          className="h-6 px-2 text-xs"
                          onClick={() => retryUpload(fileState.id)}
                          size="sm"
                          variant="outline"
                        >
                          Retry
                        </Button>
                      </div>
                    )}

                    {fileState.status === "uploading" && (
                      <div className="mt-1 flex items-center gap-2 text-muted-foreground text-xs">
                        <span>{fileState.progress}%</span>
                        {fileState.speed && (
                          <>
                            <span>•</span>
                            <span>{formatBytes(fileState.speed)}/s</span>
                          </>
                        )}
                        {fileState.eta && fileState.eta > 1 && (
                          <>
                            <span>•</span>
                            <span>{formatDuration(fileState.eta)} left</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    {fileState.status === "completed" && (
                      <span className="text-green-500">
                        <Check className="h-5 w-5" />
                      </span>
                    )}
                    {fileState.status === "idle" &&
                      currentUploadMode === "bulk" && (
                        <Button
                          className="h-8 px-3 text-xs"
                          onClick={() => uploadSingleFile(fileState)}
                          size="sm"
                        >
                          Upload
                        </Button>
                      )}
                    {fileState.status === "completed" && onDelete && (
                      <Button
                        className="h-8 w-8"
                        onClick={() => onDelete(fileState)}
                        size="icon"
                        variant="ghost"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      className="h-8 w-8"
                      disabled={fileState.status === "uploading"}
                      onClick={() => removeFile(fileState.id)}
                      size="icon"
                      variant="ghost"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Progress bar */}
                {(fileState.status === "uploading" ||
                  fileState.status === "completed") && (
                  <div className="h-2 bg-secondary">
                    <div
                      className={`h-full transition-all duration-200 ${
                        fileState.status === "completed"
                          ? "bg-green-500"
                          : "bg-primary"
                      }`}
                      style={{ width: `${fileState.progress}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Bulk actions */}
          {currentUploadMode === "bulk" && (
            <div className="flex items-center justify-between pt-2">
              <Button
                className="text-muted-foreground text-sm"
                disabled={isAnyUploading}
                onClick={clearAll}
                size="sm"
                variant="ghost"
              >
                Clear all
              </Button>
              <div className="flex gap-2">
                {hasErrors && (
                  <Button
                    disabled={isAnyUploading}
                    onClick={() => {
                      const errorFiles = uploadFiles.filter(
                        (f) => f.status === "error"
                      );
                      for (const file of errorFiles) {
                        uploadSingleFile(file);
                      }
                    }}
                    size="sm"
                    variant="outline"
                  >
                    Retry Failed
                  </Button>
                )}
                <Button
                  disabled={isAnyUploading || !hasIdleFiles}
                  onClick={uploadAllIdle}
                >
                  {isAnyUploading ? (
                    <>
                      <Upload className="mr-2 h-4 w-4 animate-pulse" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload All
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
