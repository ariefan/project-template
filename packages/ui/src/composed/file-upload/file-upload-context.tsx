"use client";

import * as React from "react";
import { toast } from "sonner";
import type {
  FileUploadContextType,
  FileUploadOptions,
  FileWithPreview,
  UploadFile,
} from "./types";
import { formatBytes } from "./utils";

const FileUploadContext = React.createContext<
  FileUploadContextType | undefined
>(undefined);

export function useFileUpload() {
  const context = React.useContext(FileUploadContext);
  if (!context) {
    throw new Error("useFileUpload must be used within a FileUploadProvider");
  }
  return context;
}

interface FileUploadProviderProps extends FileUploadOptions {
  children: React.ReactNode;
  initialFiles?: UploadFile[];
}

function validateAndCreateUploadFile(
  file: File,
  options: FileUploadOptions
): { file?: UploadFile; error?: string } {
  // Check size
  if (options.maxSize && file.size > options.maxSize) {
    return {
      error: `${file.name} exceeds ${formatBytes(options.maxSize)} limit`,
    };
  }

  // Create preview

  const preview = file.type.startsWith("image/")
    ? URL.createObjectURL(file)
    : undefined;

  const fileWithPreview = Object.assign(file, {
    preview,
  }) as FileWithPreview;

  const id = `${file.name}-${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 9)}`;

  return {
    file: {
      id,
      file: fileWithPreview,
      progress: 0,
      status: "idle",
    },
  };
}

export function FileUploadProvider({
  children,
  initialFiles = [],
  ...options
}: FileUploadProviderProps) {
  const [files, setFiles] = React.useState<UploadFile[]>(
    // biome-ignore lint/suspicious/noExplicitAny: Fallback for initial files
    initialFiles?.map((f) => ({ ...f, file: f.file ?? ({} as any) })) ?? []
  );
  const [isDragging, setIsDragging] = React.useState(false);
  const uploadingIdsRef = React.useRef<Set<string>>(new Set());

  // Internal upload function that accepts the file object directly to avoid state race conditions
  const uploadFileInternal = React.useCallback(
    async (fileState: UploadFile) => {
      if (!options.onUpload) {
        console.warn("Upload attempted but no onUpload handler provided");
        // If no upload handler, just mark as completed (mock)
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileState.id
              ? { ...f, status: "completed", progress: 100 }
              : f
          )
        );
        return;
      }

      // Check if already uploading
      if (uploadingIdsRef.current.has(fileState.id)) {
        return;
      }

      uploadingIdsRef.current.add(fileState.id);

      // Update status to uploading immediately
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileState.id
            ? { ...f, status: "uploading", progress: 0, error: undefined }
            : f
        )
      );

      try {
        const result = await options.onUpload(fileState, (progress) => {
          setFiles((prev) =>
            prev.map((f) => (f.id === fileState.id ? { ...f, progress } : f))
          );
        });

        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileState.id
              ? {
                  ...f,
                  status: "completed",
                  progress: 100,
                  downloadUrl: typeof result === "string" ? result : undefined,
                }
              : f
          )
        );
      } catch (error) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileState.id
              ? {
                  ...f,
                  status: "error",
                  error:
                    error instanceof Error ? error.message : "Upload failed",
                }
              : f
          )
        );
      } finally {
        uploadingIdsRef.current.delete(fileState.id);
      }
    },
    [options.onUpload]
  );

  // Handle adding files
  const addFiles = React.useCallback(
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex logic
    function handleAddedFiles(newFiles: File[]) {
      if (options.disabled) {
        return;
      }

      // Check max files
      if (
        options.maxFiles &&
        files.length + newFiles.length > options.maxFiles
      ) {
        toast.error(`You can only upload up to ${options.maxFiles} files`);
        return;
      }

      const validFiles: UploadFile[] = [];
      const errors: string[] = [];

      for (const file of newFiles) {
        const { file: validFile, error } = validateAndCreateUploadFile(
          file,
          options
        );
        if (error) {
          errors.push(error);
        } else if (validFile) {
          validFiles.push(validFile);
        }
      }

      if (errors.length > 0) {
        for (const error of errors) {
          toast.error(error);
        }
      }

      if (validFiles.length > 0) {
        setFiles((prev) => {
          if (!options.multiple) {
            // If not multiple, replace existing files
            // Cleanup old previews
            for (const f of prev) {
              if (f.file.preview) {
                URL.revokeObjectURL(f.file.preview);
              }
            }
            return validFiles;
          }
          return [...prev, ...validFiles];
        });

        // Auto upload
        if (options.autoUpload) {
          for (const file of validFiles) {
            uploadFileInternal(file);
          }
        }
      }
    },
    [
      // biome-ignore lint/correctness/useExhaustiveDependencies: options is unstable
      options, // Dependency on options object for validation helper
      files.length,
      uploadFileInternal,
    ]
  );

  const removeFile = React.useCallback((id: string) => {
    setFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file?.file.preview) {
        URL.revokeObjectURL(file.file.preview);
      }
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  const updateFile = React.useCallback(
    (id: string, updates: Partial<UploadFile>) => {
      setFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
      );
    },
    []
  );

  const clearFiles = React.useCallback(() => {
    setFiles((prev) => {
      for (const f of prev) {
        if (f.file.preview) {
          URL.revokeObjectURL(f.file.preview);
        }
      }
      return [];
    });
  }, []);

  const uploadFile = React.useCallback(
    async (id: string) => {
      const file = files.find((f) => f.id === id);
      if (file) {
        await uploadFileInternal(file);
      }
    },
    [files, uploadFileInternal]
  );

  const uploadAll = React.useCallback(async () => {
    const idleFiles = files.filter((f) => f.status === "idle");
    await Promise.all(idleFiles.map((f) => uploadFileInternal(f)));
  }, [files, uploadFileInternal]);

  const retryFile = React.useCallback(
    (id: string) => {
      uploadFile(id);
    },
    [uploadFile]
  );

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      for (const f of files) {
        if (f.file.preview) {
          URL.revokeObjectURL(f.file.preview);
        }
      }
    };
  }, [files]);

  const value: FileUploadContextType = {
    files,
    addFiles,
    removeFile,
    updateFile,
    clearFiles,
    uploadFile,
    uploadAll,
    retryFile,
    isDragging,
    setIsDragging,
    options,
  };

  return (
    <FileUploadContext.Provider value={value}>
      {children}
    </FileUploadContext.Provider>
  );
}
