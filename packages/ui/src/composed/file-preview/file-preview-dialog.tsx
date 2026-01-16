import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { cn } from "@workspace/ui/lib/utils";
import { Download, RotateCcw, X, ZoomIn, ZoomOut } from "lucide-react";
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
import {
  AudioPreview,
  ImagePreview,
  PdfPreview,
  VideoPreview,
} from "./file-preview-renderers";

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

  // Reset state when dialog opens or URL changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: Reset on fileUrl change
  useEffect(() => {
    if (open) {
      // Reset zoom and error state when dialog opens or file changes
      setZoom(1);
      setIsLoading(true);
      setHasError(false);
    }
  }, [open, fileUrl]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
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
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  const isImage =
    (fileType === "image" || fileType?.startsWith("image/")) ?? true;
  const isPdf = fileType === "pdf" || fileType === "application/pdf";
  const isVideo = fileType?.startsWith("video/");
  const isAudio = fileType?.startsWith("audio/");

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogPortal>
        <DialogOverlay className="bg-transparent backdrop-blur-none" />
        <DialogPrimitive.Content
          className={cn(
            "fixed inset-0 z-50 flex flex-col overflow-hidden p-0",
            "h-screen w-screen bg-black/5 text-foreground backdrop-blur-sm dark:bg-black/40",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 duration-200 data-[state=closed]:animate-out data-[state=open]:animate-in"
          )}
          onClick={(e) => {
            const target = e.target as HTMLElement;
            if (
              target === e.currentTarget ||
              target.dataset.filePreviewBackdrop
            ) {
              onOpenChange(false);
            }
          }}
        >
          <DialogTitle className="sr-only">
            {fileName ?? "File Preview"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Preview of {fileName ?? "the selected file"}
          </DialogDescription>

          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
            <h2 className="truncate font-medium text-sm">
              {fileName ?? "Preview"}
            </h2>
            <div className="flex items-center gap-2">
              <Button asChild size="icon-sm" title="Download" variant="ghost">
                <a download href={fileUrl} rel="noreferrer" target="_blank">
                  <Download className="size-4" />
                </a>
              </Button>
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

          {/* Content */}
          <div
            className="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-4"
            data-file-preview-backdrop
          >
            {(() => {
              if (isImage) {
                return (
                  <ImagePreview
                    fileName={fileName}
                    fileUrl={fileUrl}
                    hasError={hasError}
                    isLoading={isLoading}
                    setHasError={setHasError}
                    setIsLoading={setIsLoading}
                    setZoom={setZoom}
                    zoom={zoom}
                  />
                );
              }
              if (isVideo) {
                return <VideoPreview fileUrl={fileUrl} />;
              }
              if (isAudio) {
                return <AudioPreview fileUrl={fileUrl} />;
              }
              if (isPdf) {
                return <PdfPreview fileUrl={fileUrl} />;
              }
              return (
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
              );
            })()}
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
