"use client";

import { Check, FileIcon, FileImage, RefreshCw, Trash2, X } from "lucide-react";
import { Button } from "../../components/button";
import { cn } from "../../lib/utils";
import type { UploadFile } from "./types";
import { formatBytes, formatDuration } from "./utils";

interface FileUploadItemProps {
  file: UploadFile;
  onRemove?: (id: string) => void;
  onRetry?: (id: string) => void;
  onUpload?: (id: string) => void;
  showUploadAction?: boolean;
}

export function FileUploadItem({
  file,
  onRemove,
  onRetry,
  onUpload,
  showUploadAction,
}: FileUploadItemProps) {
  const isImage = file.file.type.startsWith("image/");

  return (
    <div className="group relative overflow-hidden rounded-lg border bg-card p-3">
      <div className="flex items-center gap-3">
        {/* Thumbnail / Icon */}
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-muted">
          {isImage && file.file.preview ? (
             // biome-ignore lint/correctness/useImageSize: Dynamic thumbnails
             // biome-ignore lint/performance/noImgElement: Framework-agnostic
            <img
              alt={file.file.name}
              className="h-full w-full object-cover"
              src={file.file.preview}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <FileIcon className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate font-medium text-sm" title={file.file.name}>
              {file.file.name}
            </p>
            <span className="shrink-0 text-muted-foreground text-xs">
              {formatBytes(file.file.size)}
            </span>
          </div>

          {/* Status Bar */}
          <div className="flex items-center gap-2 text-xs">
            {file.status === "uploading" && (
              <span className="text-muted-foreground">
                {file.progress}%
                {file.speed ? ` • ${formatBytes(file.speed)}/s` : ""}
                {file.eta ? ` • ${formatDuration(file.eta)} left` : ""}
              </span>
            )}
            {file.status === "error" && (
              <span className="text-destructive font-medium truncate max-w-[200px]" title={file.error}>
                {file.error || "Upload failed"}
              </span>
            )}
            {file.status === "completed" && (
              <span className="flex items-center gap-1 text-green-600">
                <Check className="h-3 w-3" />
                Completed
              </span>
            )}
            {file.status === "idle" && (
                <span className="text-muted-foreground">Ready to upload</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
           {showUploadAction && file.status === "idle" && onUpload && (
             <Button
                className="h-8 w-8"
                onClick={() => onUpload(file.id)}
                size="icon"
                title="Upload"
                variant="ghost"
             >
                <UploadIcon className="h-4 w-4" />
             </Button>
           )}

           {file.status === "error" && onRetry && (
             <Button
                className="h-8 w-8"
                onClick={() => onRetry(file.id)}
                size="icon"
                title="Retry"
                variant="ghost"
             >
                <RefreshCw className="h-4 w-4" />
             </Button>
           )}

           {onRemove && (
             <Button
                className="h-8 w-8"
                disabled={file.status === "uploading"}
                onClick={() => onRemove(file.id)}
                size="icon"
                title="Remove"
                variant="ghost"
             >
                <X className="h-4 w-4" />
             </Button>
           )}
        </div>
      </div>

      {/* Progress Bar */}
      {(file.status === "uploading" || file.status === "completed") && (
        <div className="absolute right-0 bottom-0 left-0 h-1 bg-secondary/20">
          <div
            className={cn(
              "h-full transition-all duration-300",
              file.status === "completed" ? "bg-green-500" : "bg-primary"
            )}
            style={{ width: `${file.progress}%` }}
          />
        </div>
      )}
    </div>
  );
}

function UploadIcon({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" x2="12" y1="3" y2="15" />
        </svg>
    )
}
