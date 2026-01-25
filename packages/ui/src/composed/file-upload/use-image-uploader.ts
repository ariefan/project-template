"use client";

import * as React from "react";
import { toast } from "sonner";
import type { CropResult } from "./image-crop-dialog";
import type {
  CombinedItem,
  CompressedFileWithPreview,
  CompressionOptions,
  ImageUploaderProps,
  ImageUploaderRef,
} from "./types";

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

export function useImageUploaderController(
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
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: File selection logic
    (files: FileList | File[] | null, skipCrop = false) => {
      if (!files) {
        return;
      }

      let newFiles = Array.from(files).filter((f) =>
        f.type.startsWith("image/")
      );

      if (newFiles.length === 0) {
        toast.error("Please select image files only");
        return;
      }

      // Max size validation
      if (props.maxSize) {
        const validFiles: File[] = [];
        for (const file of newFiles) {
          if (file.size > props.maxSize) {
            toast.error(
              `File ${file.name} is too large. Max size is ${(
                props.maxSize / (1024 * 1024)
              ).toFixed(1)}MB`
            );
          } else {
            validFiles.push(file);
          }
        }
        newFiles = validFiles;
      }

      if (newFiles.length === 0) {
        return;
      }

      // Max files validation / replacement behavior
      const isSingleMode = props.maxFiles === 1;

      if (isSingleMode) {
        // In single mode, we replace everything
        // Clear previous state first if needed, but easier to just set state to new file
        // However, we need to handle this carefully with queueing.

        // If cropping is enabled, we clear queue and set this new file
        if (enableCropping && !skipCrop) {
          setCropQueue(newFiles.slice(0, 1)); // Take only first
          setProcessedCrops([]); // Clear previous processed
          setCompressedFiles([]); // Clear previous compressed
          // We'll effectively reset everything below
        }

        newFiles = newFiles.slice(0, 1);
      } else if (props.maxFiles) {
        const currentCount =
          compressedFiles.length +
          cropQueue.length +
          processedCrops.length +
          (initialUrls?.length || 0);
        const availableSlots = props.maxFiles - currentCount;

        if (availableSlots <= 0) {
          toast.error(`Maximum allowed files is ${props.maxFiles}`);
          return;
        }

        if (newFiles.length > availableSlots) {
          toast.error(`You can only add ${availableSlots} more file(s)`);
          newFiles = newFiles.slice(0, availableSlots);
        }
      }

      if (enableCropping && !skipCrop) {
        // Add to queue for cropping
        setCropQueue((prev) => {
          if (isSingleMode) {
            return newFiles; // Replace
          }

          const existing = prev.map((f) => f.name);
          const filtered = newFiles.filter((f) => !existing.includes(f.name));
          return [...prev, ...filtered];
        });

        // In single mode, clear previous results
        if (isSingleMode) {
          setProcessedCrops([]);
          setCompressedFiles([]);
          // initialUrls should also be seemingly cleared or ignored?
          // We can't clear props, but we can "hide" them if we only render combinedItems based on logic.
          // But simpler to just rely on user callback to clear initialUrls if they want.
          // For local state:
          setSourceFiles(newFiles);
        }

        // Start cropping if dialog is closed
        if (!cropDialogOpen && newFiles.length > 0) {
          setFileToCrop(newFiles[0] ?? null);
          setCropDialogOpen(true);
        }
      } else {
        // Auto-compress immediately
        setSourceFiles((prev) => {
          if (isSingleMode) {
            return newFiles;
          }
          const existing = prev.map((f) => f.name);
          const filtered = newFiles.filter((f) => !existing.includes(f.name));
          return [...prev, ...filtered];
        });

        if (isSingleMode) {
          setCompressedFiles([]); // Clear previous
        }

        if (newFiles.length > 0) {
          setIsCompressing(true);
          Promise.all(newFiles.map((file) => compressSingleFile(file)))
            .then((compressed) => {
              setCompressedFiles((prev) => {
                const existingNames = prev.map((f) => f.name);
                const newCompressed = compressed.filter(
                  (f) => !existingNames.includes(f.name)
                );

                if (isSingleMode) {
                  return newCompressed;
                }

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
      props.maxSize,
      props.maxFiles,
      compressedFiles,
      cropQueue,
      processedCrops,
      initialUrls,
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
