"use client";

import {
  ChevronDown,
  ChevronRight,
  Download,
  Eye,
  FileImage,
  Loader2,
  Plus,
  Upload,
  X,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Badge } from "../components/badge";
import { Button } from "../components/button";
import { Checkbox } from "../components/checkbox";
import { Label } from "../components/label";
import { Slider } from "../components/slider";
import { cn } from "../lib/utils";

export interface CompressionOptions {
  maxSizeMB: number;
  maxWidthOrHeight: number;
  useWebWorker: boolean;
  alwaysKeepResolution: boolean;
}

export interface CompressedFileWithPreview extends File {
  originalSize: number;
  compressedSize: number;
  preview?: string;
}

export interface ImageCompressorProps {
  /**
   * Callback when files are compressed
   */
  onCompressed?: (files: CompressedFileWithPreview[]) => void;

  /**
   * Callback when upload is requested
   */
  onUpload?: (files: CompressedFileWithPreview[]) => void;

  /**
   * Default compression options
   */
  defaultOptions?: Partial<CompressionOptions>;

  /**
   * Show upload button after compression
   */
  showUploadButton?: boolean;

  /**
   * Is currently uploading
   */
  isUploading?: boolean;

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

export function ImageCompressor({
  onCompressed,
  onUpload,
  defaultOptions,
  showUploadButton = true,
  isUploading = false,
  className,
}: ImageCompressorProps) {
  const [sourceFiles, setSourceFiles] = React.useState<File[]>([]);
  const [compressedFiles, setCompressedFiles] = React.useState<
    CompressedFileWithPreview[]
  >([]);
  const [isCompressing, setIsCompressing] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);
  const [showCompressionOptions, setShowCompressionOptions] =
    React.useState(true);
  const [compressionOptions, setCompressionOptions] =
    React.useState<CompressionOptions>({
      maxSizeMB: defaultOptions?.maxSizeMB ?? 1,
      maxWidthOrHeight: defaultOptions?.maxWidthOrHeight ?? 1920,
      useWebWorker: defaultOptions?.useWebWorker ?? true,
      alwaysKeepResolution: defaultOptions?.alwaysKeepResolution ?? false,
    });

  // Dynamically import browser-image-compression to avoid SSR issues
  const [browserImageCompression, setBrowserImageCompression] = React.useState<
    typeof import("browser-image-compression").default | null
  >(null);

  React.useEffect(() => {
    import("browser-image-compression").then((module) => {
      setBrowserImageCompression(() => module.default);
    });
  }, []);

  // Compress a single file
  const compressSingleFile = React.useCallback(
    async (file: File): Promise<CompressedFileWithPreview> => {
      if (!browserImageCompression) {
        return Object.assign(file, {
          originalSize: file.size,
          compressedSize: file.size,
        }) as CompressedFileWithPreview;
      }

      if (!file.type.startsWith("image/")) {
        return Object.assign(file, {
          originalSize: file.size,
          compressedSize: file.size,
        }) as CompressedFileWithPreview;
      }

      try {
        const options = {
          maxSizeMB: compressionOptions.maxSizeMB,
          maxWidthOrHeight: compressionOptions.maxWidthOrHeight,
          useWebWorker: compressionOptions.useWebWorker,
          alwaysKeepResolution: compressionOptions.alwaysKeepResolution,
        };
        const blob = await browserImageCompression(file, options);
        const preview = URL.createObjectURL(blob);
        const compressedFile = new window.File([blob], file.name, {
          type: file.type,
        }) as CompressedFileWithPreview;
        compressedFile.originalSize = file.size;
        compressedFile.compressedSize = compressedFile.size;
        compressedFile.preview = preview;
        return compressedFile;
      } catch (e) {
        console.error("Compression failed for", file.name, e);
        return Object.assign(file, {
          originalSize: file.size,
          compressedSize: file.size,
        }) as CompressedFileWithPreview;
      }
    },
    [browserImageCompression, compressionOptions]
  );

  // Handle file selection - auto compress
  const handleFileSelect = React.useCallback(
    async (files: FileList | null) => {
      if (!files) {
        return;
      }

      const newFiles = Array.from(files);
      setSourceFiles((prev) => {
        const existing = prev.map((f) => f.name);
        const filtered = newFiles.filter((f) => !existing.includes(f.name));
        return [...prev, ...filtered];
      });

      // Auto-compress new files
      if (browserImageCompression && newFiles.length > 0) {
        setIsCompressing(true);
        try {
          const compressed = await Promise.all(
            newFiles.map((file) => compressSingleFile(file))
          );

          setCompressedFiles((prev) => {
            const existingNames = prev.map((f) => f.name);
            const newCompressed = compressed.filter(
              (f) => !existingNames.includes(f.name)
            );
            return [...prev, ...newCompressed];
          });

          const totalOriginal = compressed.reduce(
            (acc, f) => acc + f.originalSize,
            0
          );
          const totalCompressed = compressed.reduce(
            (acc, f) => acc + f.compressedSize,
            0
          );
          const saving =
            ((totalOriginal - totalCompressed) / totalOriginal) * 100;

          toast.success(
            `Compressed ${compressed.length} image${compressed.length > 1 ? "s" : ""} - Saved ${saving.toFixed(1)}%`
          );

          onCompressed?.(compressed);
        } catch (_error) {
          toast.error("Compression failed");
        } finally {
          setIsCompressing(false);
        }
      }
    },
    [browserImageCompression, compressSingleFile, onCompressed]
  );

  // Handle upload
  const handleUpload = React.useCallback(() => {
    if (compressedFiles.length === 0) {
      return;
    }
    onUpload?.(compressedFiles);
  }, [compressedFiles, onUpload]);

  // Remove source file and its compressed version
  const _removeSourceFile = React.useCallback((fileName: string) => {
    setSourceFiles((prev) => prev.filter((f) => f.name !== fileName));
    setCompressedFiles((prev) => {
      const toRemove = prev.find((f) => f.name === fileName);
      if (toRemove?.preview) {
        URL.revokeObjectURL(toRemove.preview);
      }
      return prev.filter((f) => f.name !== fileName);
    });
  }, []);

  // Remove compressed file only
  const removeCompressedFile = React.useCallback((index: number) => {
    setCompressedFiles((prev) => {
      const file = prev[index];
      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter((_, idx) => idx !== index);
    });
  }, []);

  // Download compressed file
  const downloadFile = React.useCallback((file: CompressedFileWithPreview) => {
    if (file.preview) {
      const link = document.createElement("a");
      link.href = file.preview;
      link.download = file.name;
      link.click();
    }
  }, []);

  // Clear all
  const clearAll = React.useCallback(() => {
    compressedFiles.forEach((f) => {
      if (f.preview) {
        URL.revokeObjectURL(f.preview);
      }
    });
    setSourceFiles([]);
    setCompressedFiles([]);
  }, [compressedFiles]);

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  // Cleanup previews on unmount
  React.useEffect(() => {
    return () => {
      compressedFiles.forEach((f) => {
        if (f.preview) {
          URL.revokeObjectURL(f.preview);
        }
      });
    };
  }, [compressedFiles]);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Options */}
      <div className="rounded-lg border bg-muted/30 p-4">
        <button
          className="flex w-full items-center justify-between font-medium text-sm"
          onClick={() => setShowCompressionOptions(!showCompressionOptions)}
          type="button"
        >
          <span>Compression Options</span>
          {showCompressionOptions ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>

        {showCompressionOptions && (
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="maxSizeMB">Max file size (MB)</Label>
                <span className="text-muted-foreground text-sm">
                  {compressionOptions.maxSizeMB} MB
                </span>
              </div>
              <Slider
                id="maxSizeMB"
                max={10}
                min={0.1}
                onValueChange={([value]) => {
                  if (value !== undefined) {
                    setCompressionOptions((prev) => ({
                      ...prev,
                      maxSizeMB: value,
                    }));
                  }
                }}
                step={0.1}
                value={[compressionOptions.maxSizeMB]}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="maxDimension">Max width/height (px)</Label>
                <span className="text-muted-foreground text-sm">
                  {compressionOptions.maxWidthOrHeight} px
                </span>
              </div>
              <Slider
                id="maxDimension"
                max={4096}
                min={480}
                onValueChange={([value]) => {
                  if (value !== undefined) {
                    setCompressionOptions((prev) => ({
                      ...prev,
                      maxWidthOrHeight: value,
                    }));
                  }
                }}
                step={32}
                value={[compressionOptions.maxWidthOrHeight]}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={compressionOptions.useWebWorker}
                  onCheckedChange={(checked) =>
                    setCompressionOptions((prev) => ({
                      ...prev,
                      useWebWorker: checked as boolean,
                    }))
                  }
                />
                <Label className="cursor-pointer">Use Web Worker</Label>
              </div>

              <div className="flex items-center gap-3">
                <Checkbox
                  checked={compressionOptions.alwaysKeepResolution}
                  onCheckedChange={(checked) =>
                    setCompressionOptions((prev) => ({
                      ...prev,
                      alwaysKeepResolution: checked as boolean,
                    }))
                  }
                />
                <Label className="cursor-pointer">Keep resolution</Label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Upload Area - compact when files exist */}
      {compressedFiles.length === 0 && sourceFiles.length === 0 ? (
        <div
          className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
            isDragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
          }`}
          onClick={() => document.getElementById("compression-input")?.click()}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <FileImage className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="font-medium">Drop images here</p>
          <p className="text-muted-foreground text-sm">
            or click to browse • Images will be auto-compressed
          </p>
          <input
            accept="image/*"
            className="hidden"
            id="compression-input"
            multiple
            onChange={(e) => handleFileSelect(e.target.files)}
            type="file"
          />
        </div>
      ) : (
        <div className="space-y-3">
          {/* Compact add more files button */}
          <div
            className={`flex cursor-pointer items-center justify-center rounded-md border-2 border-dashed py-2 text-sm transition-colors ${
              isDragging
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50"
            }`}
            onClick={() =>
              document.getElementById("compression-input")?.click()
            }
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add more images
            <input
              accept="image/*"
              className="hidden"
              id="compression-input"
              multiple
              onChange={(e) => handleFileSelect(e.target.files)}
              type="file"
            />
          </div>

          {/* Compressed files list */}
          {compressedFiles.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-sm">
                  Compressed ({compressedFiles.length})
                </h3>
                <Button
                  className="text-muted-foreground text-xs"
                  disabled={isCompressing}
                  onClick={clearAll}
                  size="sm"
                  variant="ghost"
                >
                  Clear all
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                {compressedFiles.map((file, index) => {
                  const savings = (
                    ((file.originalSize - file.compressedSize) /
                      file.originalSize) *
                    100
                  ).toFixed(1);
                  const isImage = file.type.startsWith("image/");

                  return (
                    <div
                      className="group relative aspect-square overflow-hidden rounded-lg border bg-card"
                      key={file.name || index}
                    >
                      {/* Thumbnail */}
                      {isImage && file.preview ? (
                        <img
                          alt={file.name}
                          className="size-full object-cover"
                          src={file.preview}
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center bg-muted">
                          <FileImage className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}

                      {/* Overlay on hover */}
                      <div className="absolute inset-0 flex flex-col justify-between bg-black/60 p-2 opacity-0 transition-opacity group-hover:opacity-100">
                        {/* Actions at top */}
                        <div className="flex justify-end gap-1">
                          {isImage && file.preview && (
                            <>
                              <Button
                                className="h-7 w-7 p-0"
                                onClick={() =>
                                  window.open(file.preview, "_blank")
                                }
                                size="icon"
                                title="View"
                                variant="secondary"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                className="h-7 w-7 p-0"
                                onClick={() => downloadFile(file)}
                                size="icon"
                                title="Download"
                                variant="secondary"
                              >
                                <Download className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                          <Button
                            className="h-7 w-7 p-0"
                            onClick={() => removeCompressedFile(index)}
                            size="icon"
                            title="Remove"
                            variant="destructive"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        {/* File info at bottom */}
                        <div className="space-y-0.5">
                          <p
                            className="truncate font-medium text-white text-xs"
                            title={file.name}
                          >
                            {file.name}
                          </p>
                          <div className="flex items-center gap-1.5 text-white/80 text-xs">
                            <span>{formatBytes(file.compressedSize)}</span>
                            <Badge
                              className="text-xs"
                              variant={
                                Number.parseFloat(savings) > 0
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {Number.parseFloat(savings) > 0
                                ? `-${savings}%`
                                : "0%"}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Filename visible at bottom when not hovering */}
                      <div className="absolute right-0 bottom-0 left-0 rounded-b-lg bg-gradient-to-t from-black/70 to-transparent p-2 opacity-100 group-hover:opacity-0">
                        <p
                          className="truncate font-medium text-white text-xs"
                          title={file.name}
                        >
                          {file.name}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Loading state */}
          {isCompressing && (
            <div className="flex items-center justify-center gap-2 rounded-lg border bg-muted/30 py-4 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Compressing images...
            </div>
          )}

          {/* Upload button */}
          {showUploadButton && onUpload && compressedFiles.length > 0 && (
            <Button
              className="w-full"
              disabled={isUploading || isCompressing}
              onClick={handleUpload}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Compressed ({compressedFiles.length})
                </>
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
