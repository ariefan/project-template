"use client";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@workspace/ui/components/carousel";
import { cn } from "@workspace/ui/lib/utils";

import {
  ChevronDown,
  ChevronRight,
  Crop,
  Download,
  Eye,
  FileImage,
  Loader2,
  MoreVertical,
  Plus,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { Badge } from "../../components/badge";
import { Button } from "../../components/button";
import { Checkbox } from "../../components/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/dropdown-menu";
import { Label } from "../../components/label";
import { Slider } from "../../components/slider";
import { ConfirmDialog } from "../confirm-dialog"; // Import ConfirmDialog
import { FilePreviewDialog } from "../file-preview/file-preview-dialog";
import { DropzonePrimitive } from "./dropzone-primitive";
import { type CropResult, ImageCropDialog } from "./image-crop-dialog";

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

/**
 * Pre-loaded image URL for edit mode display
 */
export interface InitialUrl {
  id: string;
  url: string;
  name?: string;
}

type CombinedItem =
  | { type: "url"; id: string | number; data: InitialUrl }
  | { type: "file"; id: string | number; data: CompressedFileWithPreview };

export interface ImageUploaderProps {
  /**
   * Callback when files are compressed
   */
  onCompressed?: (files: CompressedFileWithPreview[]) => void;

  /**
   * Callback when upload is requested/confirmed
   */
  onConfirm?: (files: CompressedFileWithPreview[]) => void;

  /**
   * Default compression options
   */
  defaultOptions?: Partial<CompressionOptions>;

  /**
   * Show upload/confirm button after compression
   */
  showConfirmButton?: boolean;
  /**
   * Show compression options UI
   * @default false
   */
  showCompressionOptions?: boolean;

  /**
   * Enable cropping by default
   * @default false
   */
  enableCropping?: boolean;

  /**
   * Automatically upload after compression (if cropping is disabled)
   * @default false
   */
  autoUpload?: boolean;

  /**
   * Is currently uploading
   */
  isUploading?: boolean;

  className?: string;
  showCompressionDetails?: boolean;
  /**
   * Pre-loaded image URLs for edit mode (display-only with remove)
   */
  initialUrls?: InitialUrl[];

  /**
   * Callback when a pre-loaded URL is removed
   */
  onRemoveUrl?: (id: string) => void;

  /**
   * Layout mode for displaying images
   * @default "grid"
   */
  layout?: "grid" | "carousel";
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

export interface ImageUploaderRef {
  addFiles: (files: File[]) => void;
  clearFiles: () => void;
}

interface CompressionOptionsPanelProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  enableCropping: boolean;
  onEnableCroppingChange: (enabled: boolean) => void;
  options: CompressionOptions;
  onOptionsChange: (options: CompressionOptions) => void;
}

function CompressionOptionsPanel({
  isOpen,
  onOpenChange,
  enableCropping,
  onEnableCroppingChange,
  options,
  onOptionsChange,
}: CompressionOptionsPanelProps) {
  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <button
        className="flex w-full items-center justify-between font-medium text-sm"
        onClick={() => onOpenChange(!isOpen)}
        type="button"
      >
        <span>Compression Options</span>
        {isOpen ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </button>

      {isOpen && (
        <div className="mt-4 space-y-4">
          {/* Enable cropping toggle */}
          <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
            <Sparkles className="h-5 w-5 text-primary" />
            <div className="flex flex-1 flex-col gap-1">
              <Label className="cursor-pointer" htmlFor="enable-cropping">
                Enable image cropping
              </Label>
              <p className="text-muted-foreground text-xs">
                Crop, rotate, and flip images before compression
              </p>
            </div>
            <Checkbox
              checked={enableCropping}
              id="enable-cropping"
              onCheckedChange={(checked: boolean) =>
                onEnableCroppingChange(checked)
              }
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="maxSizeMB">Max file size (MB)</Label>
              <span className="text-muted-foreground text-sm">
                {options.maxSizeMB} MB
              </span>
            </div>
            <Slider
              id="maxSizeMB"
              max={10}
              min={0.1}
              onValueChange={([value]: number[]) => {
                if (value !== undefined) {
                  onOptionsChange({
                    ...options,
                    maxSizeMB: value,
                  });
                }
              }}
              step={0.1}
              value={[options.maxSizeMB]}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="maxDimension">Max width/height (px)</Label>
              <span className="text-muted-foreground text-sm">
                {options.maxWidthOrHeight} px
              </span>
            </div>
            <Slider
              id="maxDimension"
              max={4096}
              min={480}
              onValueChange={([value]: number[]) => {
                if (value !== undefined) {
                  onOptionsChange({
                    ...options,
                    maxWidthOrHeight: value,
                  });
                }
              }}
              step={32}
              value={[options.maxWidthOrHeight]}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={options.useWebWorker}
                onCheckedChange={(checked: boolean) =>
                  onOptionsChange({
                    ...options,
                    useWebWorker: checked,
                  })
                }
              />
              <Label className="cursor-pointer">Use Web Worker</Label>
            </div>

            <div className="flex items-center gap-3">
              <Checkbox
                checked={options.alwaysKeepResolution}
                onCheckedChange={(checked: boolean) =>
                  onOptionsChange({
                    ...options,
                    alwaysKeepResolution: checked,
                  })
                }
              />
              <Label className="cursor-pointer">Keep resolution</Label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface ImageGridListProps {
  items: CombinedItem[];
  layout: "grid" | "carousel";
  onRemove: (item: CombinedItem) => void;
  onDownload: (file: CompressedFileWithPreview) => void;
  onView: (url: string, name: string, type: string) => void;
  showCompressionDetails: boolean;
}

function ImageGridList({
  items,
  layout,
  onRemove,
  onDownload,
  onView,
  showCompressionDetails,
}: ImageGridListProps) {
  const renderItem = (item: CombinedItem) => (
    <ImageUploaderItem
      item={item}
      key={item.id}
      layout={layout}
      onDownload={onDownload}
      onRemove={() => onRemove(item)}
      onView={onView}
      showCompressionDetails={showCompressionDetails}
    />
  );

  if (layout === "grid") {
    return (
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
        {items.map((item) => renderItem(item))}
      </div>
    );
  }

  return (
    <Carousel
      className="mx-auto min-h-[120px] w-full"
      opts={{ align: "start" }}
    >
      <CarouselContent className="-ml-2 md:-ml-4">
        {items.map((item) => (
          <CarouselItem className="basis-full pl-2 md:pl-4" key={item.id}>
            {renderItem(item)}
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="left-2 bg-background/80 hover:bg-background" />
      <CarouselNext className="right-2 bg-background/80 hover:bg-background" />
    </Carousel>
  );
}

function useDragDrop(
  onFilesSelected: (files: FileList | File[] | null) => void
) {
  const [isDragging, setIsDragging] = React.useState(false);

  const handleDragOver = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = React.useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = React.useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      onFilesSelected(e.dataTransfer.files);
    },
    [onFilesSelected]
  );

  return { isDragging, handleDragOver, handleDragLeave, handleDrop };
}

function useImageUploaderController(
  props: ImageUploaderProps,
  ref: React.ForwardedRef<ImageUploaderRef>
) {
  const {
    onCompressed,
    onConfirm,
    defaultOptions,
    enableCropping: defaultEnableCropping = false,
    autoUpload = true,
    initialUrls,
  } = props;

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<{
    type: "file" | "url";
    id: string | number;
  } | null>(null);

  // ... rest of hook state ...
  // Re-adding this missing part isn't right via replace, I should just target the specific lines for component definition.
  // Actually, I am extracting components. I should define them before ImageUploader.

  // Let's scroll up to find where to insert.
  // I will insert them before useImageUploaderController or before ImageUploader.
  // The tool call requires contiguous blocks for replace_file_content but this is multi_replace.

  const [_sourceFiles, setSourceFiles] = React.useState<File[]>([]);
  const [compressedFiles, setCompressedFiles] = React.useState<
    CompressedFileWithPreview[]
  >([]);
  const [isCompressing, setIsCompressing] = React.useState(false);

  const [isCompressionOptionsOpen, setIsCompressionOptionsOpen] =
    React.useState(false);
  const [compressionOptions, setCompressionOptions] =
    React.useState<CompressionOptions>({
      maxSizeMB: defaultOptions?.maxSizeMB ?? 1,
      maxWidthOrHeight: defaultOptions?.maxWidthOrHeight ?? 1920,
      useWebWorker: defaultOptions?.useWebWorker ?? true,
      alwaysKeepResolution: defaultOptions?.alwaysKeepResolution ?? false,
    });

  // Cropping state
  const [enableCropping, setEnableCropping] = React.useState(
    defaultEnableCropping
  );
  const [cropDialogOpen, setCropDialogOpen] = React.useState(false);
  const [fileToCrop, setFileToCrop] = React.useState<File | null>(null);
  const [cropQueue, setCropQueue] = React.useState<File[]>([]);
  const [processedCrops, setProcessedCrops] = React.useState<CropResult[]>([]);

  // Preview state
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [previewUrl, setPreviewUrl] = React.useState("");
  const [previewName, setPreviewName] = React.useState("");
  const [previewType, setPreviewType] = React.useState("");

  // Dynamically import browser-image-compression to avoid SSR issues
  const [browserImageCompression, setBrowserImageCompression] = React.useState<
    typeof import("browser-image-compression").default | null
  >(null);

  React.useEffect(() => {
    setEnableCropping(defaultEnableCropping);
  }, [defaultEnableCropping]);

  React.useEffect(() => {
    import("browser-image-compression").then((module) => {
      setBrowserImageCompression(() => module.default);
    });
  }, []);

  // Compress a single file
  const compressSingleFile = React.useCallback(
    (file: File) => {
      return compressImageHelper(
        file,
        compressionOptions,
        browserImageCompression
      );
    },
    [browserImageCompression, compressionOptions]
  );

  // Handle file selection
  const handleFileSelect = React.useCallback(
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: File selection validation logic is inherently complex
    (files: FileList | File[] | null, skipCrop = false) => {
      if (!files) {
        return;
      }

      const newFiles = Array.from(files).filter((f) =>
        f.type.startsWith("image/")
      );

      if (newFiles.length === 0) {
        toast.error("Please select image files only");
        return;
      }

      if (enableCropping && !skipCrop) {
        // Add to queue for cropping
        setCropQueue((prev) => {
          const existing = prev.map((f) => f.name);
          const filtered = newFiles.filter((f) => !existing.includes(f.name));
          return [...prev, ...filtered];
        });

        // Start cropping if dialog is closed
        if (!cropDialogOpen && newFiles.length > 0) {
          setFileToCrop(newFiles[0] ?? null);
          setCropDialogOpen(true);
        }
      } else {
        // Auto-compress immediately
        setSourceFiles((prev) => {
          const existing = prev.map((f) => f.name);
          const filtered = newFiles.filter((f) => !existing.includes(f.name));
          return [...prev, ...filtered];
        });

        if (newFiles.length > 0) {
          setIsCompressing(true);
          Promise.all(newFiles.map((file) => compressSingleFile(file)))
            .then((compressed) => {
              setCompressedFiles((prev) => {
                const existingNames = prev.map((f) => f.name);
                const newCompressed = compressed.filter(
                  (f) => !existingNames.includes(f.name)
                );

                const nextFiles = [...prev, ...newCompressed];
                return nextFiles;
              });

              if (autoUpload && (!enableCropping || skipCrop)) {
                setTimeout(() => {
                  setCompressedFiles((current) => {
                    onConfirm?.(current);
                    return current;
                  });
                }, 0);
              }

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
            })
            .catch(() => {
              toast.error("Compression failed");
            })
            .finally(() => {
              setIsCompressing(false);
            });
        }
      }
    },
    [
      compressSingleFile,
      cropDialogOpen,
      enableCropping,
      onCompressed,
      autoUpload,
      onConfirm,
    ]
  );

  const compressAndUploadCrops = React.useCallback(
    (allCrops: CropResult[]) => {
      setIsCompressing(true);

      Promise.all(
        allCrops.map((cropResult) => {
          const cropFile = new File([cropResult.blob], cropResult.file.name, {
            type: cropResult.file.type,
          });
          return compressSingleFile(cropFile);
        })
      )
        .then((compressed) => {
          setCompressedFiles((prev) => {
            const existingNames = prev.map((f) => f.name);
            const newCompressed = compressed.filter(
              (f) => !existingNames.includes(f.name)
            );
            return [...prev, ...newCompressed];
          });

          if (autoUpload) {
            setTimeout(() => {
              setCompressedFiles((current) => {
                onConfirm?.(current);
                return current;
              });
            }, 0);
          }

          setProcessedCrops([]);

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
            `Processed ${compressed.length} image${compressed.length > 1 ? "s" : ""} - Saved ${saving.toFixed(1)}%`
          );

          onCompressed?.(compressed);
        })
        .catch(() => {
          toast.error("Compression failed");
        })
        .finally(() => {
          setIsCompressing(false);
        });
    },
    [compressSingleFile, autoUpload, onConfirm, onCompressed]
  );

  const finalizeCrop = React.useCallback(
    (result: CropResult) => {
      setFileToCrop(null);
      setCropDialogOpen(false);
      const allCrops = [...processedCrops, result];
      compressAndUploadCrops(allCrops);
    },
    [processedCrops, compressAndUploadCrops]
  );

  // Handle crop complete
  const handleCropComplete = React.useCallback(
    (result: CropResult) => {
      setProcessedCrops((prev) => [...prev, result]);
      setCropQueue((prev) => prev.filter((f) => f.name !== result.file.name));

      // Process next in queue
      const remaining = cropQueue.filter((f) => f.name !== result.file.name);
      if (remaining.length > 0) {
        setFileToCrop(remaining[0] ?? null);
        return;
      }

      finalizeCrop(result);
    },
    [cropQueue, finalizeCrop]
  );

  // Handle skip crop
  const handleSkipCrop = React.useCallback(() => {
    if (!fileToCrop) {
      return;
    }

    // Skip this file and move to next
    setCropQueue((prev) => prev.filter((f) => f.name !== fileToCrop.name));

    const remaining = cropQueue.filter((f) => f.name !== fileToCrop.name);
    if (remaining.length > 0) {
      setFileToCrop(remaining[0] ?? null);
    } else {
      setFileToCrop(null);
      setCropDialogOpen(false);
    }
  }, [cropQueue, fileToCrop]);

  // Remove compressed file
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
    for (const f of compressedFiles) {
      if (f.preview) {
        URL.revokeObjectURL(f.preview);
      }
    }
    for (const f of processedCrops) {
      URL.revokeObjectURL(f.url);
    }
    setSourceFiles([]);
    setCompressedFiles([]);
    setCropQueue([]);
    setProcessedCrops([]);
  }, [compressedFiles, processedCrops]);

  React.useImperativeHandle(ref, () => ({
    addFiles: (files: File[]) => handleFileSelect(files, true),
    clearFiles: clearAll,
  }));

  const { isDragging, handleDragOver, handleDragLeave, handleDrop } =
    useDragDrop(handleFileSelect);

  // Cleanup previews on unmount
  React.useEffect(() => {
    return () => {
      for (const f of compressedFiles) {
        if (f.preview) {
          URL.revokeObjectURL(f.preview);
        }
      }
      for (const f of processedCrops) {
        URL.revokeObjectURL(f.url);
      }
    };
  }, [compressedFiles, processedCrops]);

  const hasFilesInQueue = cropQueue.length > 0 || processedCrops.length > 0;
  const totalInQueue = cropQueue.length + processedCrops.length;
  const hasInitialUrls = initialUrls && initialUrls.length > 0;
  const hasAnyFiles =
    compressedFiles.length > 0 || hasFilesInQueue || hasInitialUrls;

  const combinedItems = React.useMemo<CombinedItem[]>(
    () => [
      ...(initialUrls || []).map((url) => ({
        type: "url" as const,
        id: url.id,
        data: url,
      })),
      ...compressedFiles.map((file, index) => ({
        type: "file" as const,
        id: file.name || index,
        data: file,
      })),
    ],
    [initialUrls, compressedFiles]
  );

  return {
    fileInputRef,
    deleteTarget,
    setDeleteTarget,
    compressedFiles,
    isCompressing,
    isDragging,
    isCompressionOptionsOpen,
    setIsCompressionOptionsOpen,
    compressionOptions,
    setCompressionOptions,
    enableCropping,
    setEnableCropping,
    cropDialogOpen,
    setCropDialogOpen,
    fileToCrop,
    setFileToCrop,
    cropQueue,
    processedCrops,
    previewOpen,
    setPreviewOpen,
    previewUrl,
    setPreviewUrl,
    previewName,
    setPreviewName,
    previewType,
    setPreviewType,
    handleFileSelect,
    handleCropComplete,
    handleSkipCrop,
    removeCompressedFile,
    downloadFile,
    clearAll,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    hasFilesInQueue,
    totalInQueue,
    hasInitialUrls,
    hasAnyFiles,
    combinedItems,
  };
}

function EmptyDropzone({
  isDragging,
  onFileSelect,
  onDragOver,
  onDragLeave,
  onDrop,
  fileInputRef,
}: {
  isDragging: boolean;
  onFileSelect: (files: FileList | null) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <DropzonePrimitive
      className={cn(
        "gap-4",
        isDragging
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
      )}
      compact={false}
      onClick={() => {
        fileInputRef.current?.click();
      }}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          fileInputRef.current?.click();
        }
      }}
    >
      <FileImage className="h-10 w-10 text-muted-foreground" />
      <div className="space-y-1 text-center sm:text-left">
        <p className="font-medium text-lg">Drop images here</p>
        <p className="text-muted-foreground text-sm">or click to browse</p>
      </div>
      <input
        accept="image/*"
        className="hidden"
        multiple
        onChange={(e) => onFileSelect(e.target.files)}
        ref={fileInputRef}
        type="file"
      />
    </DropzonePrimitive>
  );
}

function ProcessingIndicator({
  totalInQueue,
  processedCount,
}: {
  totalInQueue: number;
  processedCount: number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
      <Crop className="h-5 w-5 animate-pulse text-primary" />
      <div className="flex flex-1 flex-col">
        <p className="font-medium text-sm">
          Processing {totalInQueue} image
          {totalInQueue > 1 ? "s" : ""}
        </p>
        <p className="text-muted-foreground text-xs">
          {processedCount} of {totalInQueue} cropped
        </p>
      </div>
      <Loader2 className="h-5 w-5 animate-spin text-primary" />
    </div>
  );
}

export const ImageUploader = React.forwardRef<
  ImageUploaderRef,
  ImageUploaderProps
>((props, ref) => {
  const {
    className,
    showCompressionOptions = false,
    showCompressionDetails = false,
    showConfirmButton = true,
    onConfirm,
    isUploading = false,
    initialUrls,
    onRemoveUrl,
    layout = "grid",
  } = props;

  const controller = useImageUploaderController(props, ref);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Options */}
      {showCompressionOptions && (
        <CompressionOptionsPanel
          enableCropping={controller.enableCropping}
          isOpen={controller.isCompressionOptionsOpen}
          onEnableCroppingChange={controller.setEnableCropping}
          onOpenChange={controller.setIsCompressionOptionsOpen}
          onOptionsChange={controller.setCompressionOptions}
          options={controller.compressionOptions}
        />
      )}

      {/* File Preview Dialog */}
      <FilePreviewDialog
        fileName={controller.previewName}
        fileType={controller.previewType}
        fileUrl={controller.previewUrl}
        onOpenChange={controller.setPreviewOpen}
        open={controller.previewOpen}
      />

      {/* Upload Area */}
      {controller.hasAnyFiles ? (
        <div className="space-y-3">
          {/* Crop queue indicator */}
          {controller.hasFilesInQueue && (
            <ProcessingIndicator
              processedCount={controller.processedCrops.length}
              totalInQueue={controller.totalInQueue}
            />
          )}

          {/* Add more files button */}
          <DropzonePrimitive
            className="py-2"
            compact={true}
            onClick={() => {
              controller.fileInputRef.current?.click();
            }}
            onDragLeave={controller.handleDragLeave}
            onDragOver={controller.handleDragOver}
            onDrop={controller.handleDrop}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                controller.fileInputRef.current?.click();
              }
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add more images
            <input
              accept="image/*"
              className="hidden"
              multiple
              onChange={(e) => controller.handleFileSelect(e.target.files)}
              ref={controller.fileInputRef}
              type="file"
            />
          </DropzonePrimitive>

          {/* Images list (Unified) */}
          {controller.hasAnyFiles &&
            (controller.compressedFiles.length > 0 ||
              controller.hasInitialUrls) && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-sm">
                    Images (
                    {(initialUrls?.length || 0) +
                      controller.compressedFiles.length}
                    )
                  </h3>
                  {controller.compressedFiles.length > 0 && (
                    <Button
                      className="text-muted-foreground text-xs"
                      disabled={controller.isCompressing}
                      onClick={controller.clearAll}
                      size="sm"
                      variant="ghost"
                    >
                      Clear new
                    </Button>
                  )}
                </div>
                <ImageGridList
                  items={controller.combinedItems}
                  layout={layout}
                  onDownload={controller.downloadFile}
                  onRemove={(item) => {
                    if (item.type === "url") {
                      controller.setDeleteTarget({
                        type: "url",
                        id: item.id,
                      });
                    } else {
                      // Find index in compressedFiles
                      const index = controller.compressedFiles.indexOf(
                        item.data as CompressedFileWithPreview
                      );
                      controller.setDeleteTarget({
                        type: "file",
                        id: index,
                      });
                    }
                  }}
                  onView={(url, name, type) => {
                    controller.setPreviewUrl(url);
                    controller.setPreviewName(name);
                    controller.setPreviewType(type);
                    controller.setPreviewOpen(true);
                  }}
                  showCompressionDetails={showCompressionDetails}
                />
              </div>
            )}

          {/* Loading state */}
          {controller.isCompressing && (
            <div className="flex items-center justify-center gap-2 rounded-lg border bg-muted/30 py-4 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing images...
            </div>
          )}

          {/* Confirm Button */}
          {showConfirmButton &&
            onConfirm &&
            controller.compressedFiles.length > 0 && (
              <Button
                className="w-full"
                disabled={isUploading || controller.isCompressing}
                onClick={() => onConfirm(controller.compressedFiles)}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Confirm Upload ({controller.compressedFiles.length})
                  </>
                )}
              </Button>
            )}
        </div>
      ) : (
        <EmptyDropzone
          fileInputRef={controller.fileInputRef}
          isDragging={controller.isDragging}
          onDragLeave={controller.handleDragLeave}
          onDragOver={controller.handleDragOver}
          onDrop={controller.handleDrop}
          onFileSelect={(files) => controller.handleFileSelect(files)}
        />
      )}

      {/* Crop Dialog */}
      <ImageCropDialog
        imageFile={controller.fileToCrop}
        onCropComplete={controller.handleCropComplete}
        onOpenChange={(open: boolean) => {
          if (open) {
            controller.setCropDialogOpen(open);
          } else {
            controller.handleSkipCrop();
          }
        }}
        onSelectFile={controller.setFileToCrop}
        open={controller.cropDialogOpen}
        queue={controller.cropQueue}
      />

      <ConfirmDialog
        description="This action cannot be undone."
        onCancel={() => controller.setDeleteTarget(null)}
        onConfirm={() => {
          if (controller.deleteTarget?.type === "file") {
            controller.removeCompressedFile(
              controller.deleteTarget.id as number
            );
          } else if (controller.deleteTarget?.type === "url") {
            onRemoveUrl?.(controller.deleteTarget.id as string);
          }
          controller.setDeleteTarget(null);
        }}
        onOpenChange={(open) => !open && controller.setDeleteTarget(null)}
        open={!!controller.deleteTarget}
        title="Are you sure?"
        variant="destructive"
      />
    </div>
  );
});
interface ImagePreviewCardProps {
  src: string;
  alt: string;
  onView?: () => void;
  onDownload?: () => void;
  onRemove?: () => void;
  children?: React.ReactNode;
  className?: string;
}

function ImagePreviewCard({
  src,
  alt,
  onView,
  onDownload,
  onRemove,
  children,
  className,
}: ImagePreviewCardProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [width, setWidth] = React.useState(0);

  React.useEffect(() => {
    if (!containerRef.current) {
      return;
    }
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const isSmall = width < 100;

  return (
    <div
      className={cn(
        "group relative aspect-square overflow-hidden rounded-lg border bg-card",
        className
      )}
      ref={containerRef}
    >
      {/* Thumbnail */}
      {src ? (
        // biome-ignore lint/correctness/useImageSize: Dynamic content
        // biome-ignore lint/performance/noImgElement: Framework-agnostic
        <img alt={alt} className="size-full object-cover" src={src} />
      ) : (
        <div className="flex size-full items-center justify-center bg-muted">
          <FileImage className="h-8 w-8 text-muted-foreground" />
        </div>
      )}

      {/* Overlay on hover */}
      <div className="absolute inset-0 flex flex-col justify-between bg-black/60 p-2 opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100">
        {/* Actions at top */}
        <div className="flex justify-end">
          {isSmall ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  className="size-6 p-0 text-white hover:bg-white/20 hover:text-white"
                  size="icon"
                  variant="ghost"
                >
                  <MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onView && (
                  <DropdownMenuItem onClick={onView}>
                    <Eye className="mr-2 size-4" /> View
                  </DropdownMenuItem>
                )}
                {onDownload && (
                  <DropdownMenuItem onClick={onDownload}>
                    <Download className="mr-2 size-4" /> Download
                  </DropdownMenuItem>
                )}
                {onRemove && (
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={onRemove}
                  >
                    <X className="mr-2 size-4" /> Remove
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex justify-end gap-0.5">
              {onView && (
                <Button
                  className="size-6.5 p-0"
                  onClick={onView}
                  size="icon"
                  title="View"
                  variant="secondary"
                >
                  <Eye className="size-3.5" />
                </Button>
              )}
              {onDownload && (
                <Button
                  className="size-6.5 p-0"
                  onClick={onDownload}
                  size="icon"
                  title="Download"
                  variant="secondary"
                >
                  <Download className="size-3.5" />
                </Button>
              )}
              {onRemove && (
                <Button
                  className="size-6.5 p-0"
                  onClick={onRemove}
                  size="icon"
                  title="Remove"
                  variant="destructive"
                >
                  <X className="size-3.5" />
                </Button>
              )}
            </div>
          )}
        </div>

        {/* File info at bottom */}
        {children}
      </div>

      {/* Filename visible at bottom when not hovering/open */}
      <div className="absolute right-0 bottom-0 left-0 rounded-b-lg bg-gradient-to-t from-black/70 to-transparent p-2 opacity-100 transition-opacity group-hover:opacity-0">
        <p className="truncate font-medium text-white text-xs" title={alt}>
          {alt}
        </p>
      </div>
    </div>
  );
}

function ImageUploaderItem({
  item,
  layout,
  onDownload,
  onRemove,
  onView,
  showCompressionDetails,
}: {
  item: CombinedItem;
  layout: "grid" | "carousel";
  onDownload: (file: CompressedFileWithPreview) => void;
  onRemove: () => void;
  onView: (url: string, name: string, type: string) => void;
  showCompressionDetails: boolean;
}) {
  if (item.type === "url") {
    const urlData = item.data as InitialUrl;
    return (
      <ImagePreviewCard
        alt={urlData.name || ""}
        className={layout === "carousel" ? "aspect-video w-full" : undefined}
        onDownload={() => window.open(urlData.url, "_blank")}
        onRemove={onRemove}
        onView={() => onView(urlData.url, urlData.name || "Preview", "image/*")}
        src={urlData.url}
      />
    );
  }

  const fileData = item.data as CompressedFileWithPreview;
  const savings = (
    ((fileData.originalSize - fileData.compressedSize) /
      fileData.originalSize) *
    100
  ).toFixed(1);

  return (
    <ImagePreviewCard
      alt={fileData.name}
      className={layout === "carousel" ? "aspect-video w-full" : undefined}
      onDownload={() => onDownload(fileData)}
      onRemove={onRemove}
      onView={
        fileData.preview
          ? () => onView(fileData.preview ?? "", fileData.name, fileData.type)
          : undefined
      }
      src={fileData.preview || ""}
    >
      <div className="space-y-0.5">
        <p className="truncate font-medium text-[10px] text-white">
          {fileData.name}
        </p>
        <div className="flex justify-between text-[10px] text-white/80">
          <span>{formatBytes(fileData.compressedSize)}</span>
          {showCompressionDetails && (
            <Badge
              className="text-xs"
              variant={Number.parseFloat(savings) > 0 ? "default" : "secondary"}
            >
              {Number.parseFloat(savings) > 0 ? `-${savings}%` : "0%"}
            </Badge>
          )}
        </div>
      </div>
    </ImagePreviewCard>
  );
}

async function compressImageHelper(
  file: File,
  options: CompressionOptions,
  // biome-ignore lint/suspicious/noExplicitAny: Dynamic import type is complex
  browserImageCompression: any
): Promise<CompressedFileWithPreview> {
  if (!browserImageCompression) {
    return Object.assign(file, {
      originalSize: file.size,
      compressedSize: file.size,
      preview: URL.createObjectURL(file),
    }) as CompressedFileWithPreview;
  }

  if (!file.type.startsWith("image/")) {
    return Object.assign(file, {
      originalSize: file.size,
      compressedSize: file.size,
      preview: URL.createObjectURL(file),
    }) as CompressedFileWithPreview;
  }

  try {
    const opts = {
      maxSizeMB: options.maxSizeMB,
      maxWidthOrHeight: options.maxWidthOrHeight,
      useWebWorker: options.useWebWorker,
      alwaysKeepResolution: options.alwaysKeepResolution,
    };
    const blob = await browserImageCompression(file, opts);
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
      preview: URL.createObjectURL(file), // Fallback preview
    }) as CompressedFileWithPreview;
  }
}
