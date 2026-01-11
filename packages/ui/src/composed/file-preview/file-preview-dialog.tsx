"use client";

import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { cn } from "@workspace/ui/lib/utils";
import { RotateCcw, X, ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useState } from "react";

export interface FilePreviewDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Called when dialog should close */
  onOpenChange: (open: boolean) => void;
  /** URL of the file to preview */
  fileUrl: string;
  /** Optional file name to display in header */
  fileName?: string;
  /** Optional MIME type for determining preview renderer */
  fileType?: string;
}

/**
 * Fullscreen file preview dialog component.
 *
 * Supports image and PDF previews.
 *
 * @example
 * <FilePreviewDialog
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   fileUrl="/storage/preview/document.pdf"
 *   fileName="document.pdf"
 *   fileType="application/pdf"
 * />
 */
export function FilePreviewDialog({
  open,
  onOpenChange,
  fileUrl,
  fileName,
  fileType,
}: FilePreviewDialogProps) {
  const [zoom, setZoom] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Reset state when file URL changes
  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
    setZoom(1);
  }, [fileUrl]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key) {
        case "Escape":
          onOpenChange(false);
          break;
        case "+":
        case "=":
          setZoom((z) => Math.min(z + 0.25, 3));
          break;
        case "-":
        case "_":
          setZoom((z) => Math.max(z - 0.25, 0.5));
          break;
        case "0":
          setZoom(1);
          break;
        default:
          // No action for other keys
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  const isImage =
    (fileType === "image" || fileType?.startsWith("image/")) ?? true;

  const isPdf = fileType === "pdf" || fileType === "application/pdf";

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className={cn(
          "fixed inset-0 top-0 left-0 translate-x-0 translate-y-0",
          "h-screen w-screen gap-0 rounded-none bg-background/95 p-0",
          "flex flex-col overflow-hidden border-0 shadow-none"
        )}
        showCloseButton={false}
      >
        {/* Visually hidden title for screen readers */}
        <DialogTitle className="sr-only">
          {fileName ?? "File Preview"}
        </DialogTitle>

        {/* Header with title and controls */}
        <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
          <h2 className="truncate font-medium text-sm">
            {fileName ?? "Preview"}
          </h2>
          <div className="flex items-center gap-2">
            {isImage && (
              <>
                <Button
                  disabled={zoom <= 0.5}
                  onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))}
                  size="icon-sm"
                  title="Zoom out (-)"
                  variant="ghost"
                >
                  <ZoomOut className="size-4" />
                </Button>
                <span className="w-12 text-center text-muted-foreground text-xs">
                  {Math.round(zoom * 100)}%
                </span>
                <Button
                  disabled={zoom >= 3}
                  onClick={() => setZoom((z) => Math.min(z + 0.25, 3))}
                  size="icon-sm"
                  title="Zoom in (+)"
                  variant="ghost"
                >
                  <ZoomIn className="size-4" />
                </Button>
                <Button
                  onClick={() => setZoom(1)}
                  size="icon-sm"
                  title="Reset zoom (0)"
                  variant="ghost"
                >
                  <RotateCcw className="size-4" />
                </Button>
              </>
            )}
            <Button
              onClick={() => onOpenChange(false)}
              size="icon-sm"
              title="Close (Escape)"
              variant="ghost"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* Content area */}
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-4">
          {isImage ? (
            <div className="relative flex size-full items-center justify-center">
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              )}
              {hasError ? (
                <div className="flex flex-col items-center gap-2 text-center">
                  <p className="text-muted-foreground text-sm">
                    Failed to load preview
                  </p>
                  <Button
                    onClick={() => {
                      setIsLoading(true);
                      setHasError(false);
                    }}
                    size="sm"
                    variant="outline"
                  >
                    Retry
                  </Button>
                </div>
              ) : (
                // biome-ignore lint/correctness/useImageSize: Dynamic content
                // biome-ignore lint/performance/noImgElement: Framework-agnostic
                // biome-ignore lint/a11y/noNoninteractiveElementInteractions: Image click handled for zoom
                <img
                  alt={fileName ?? "Preview"}
                  className={cn(
                    "max-h-full max-w-full object-contain transition-transform duration-200",
                    isLoading && "opacity-0"
                  )}
                  onError={() => {
                    setIsLoading(false);
                    setHasError(true);
                  }}
                  onLoad={() => setIsLoading(false)}
                  src={fileUrl}
                  style={{ transform: `scale(${zoom})` }}
                />
              )}
            </div>
          ) : isPdf ? (
            <div className="size-full">
               <object
                className="size-full rounded-md border"
                data={fileUrl}
                type="application/pdf"
              >
                <div className="flex flex-col items-center justify-center gap-2 p-8 text-center">
                  <p className="text-muted-foreground">
                    Unable to display PDF directly.
                  </p>
                  <Button asChild variant="outline">
                    <a href={fileUrl} rel="noreferrer" target="_blank">
                      Download PDF
                    </a>
                  </Button>
                </div>
              </object>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 text-center">
              <p className="text-muted-foreground text-sm">
                Preview not available for this file type
              </p>
              {fileType && (
                <p className="text-muted-foreground text-xs">{fileType}</p>
              )}
               <Button asChild variant="outline">
                <a href={fileUrl} rel="noreferrer" target="_blank">
                  Download File
                </a>
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
