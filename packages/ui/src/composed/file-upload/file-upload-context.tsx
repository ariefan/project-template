"use client";

import * as React from "react";
import { toast } from "sonner";
import type { FileUploadContextType, FileUploadOptions, UploadFile, FileWithPreview } from "./types";
import { formatBytes } from "./utils";

const FileUploadContext = React.createContext<FileUploadContextType | undefined>(
  undefined
);

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

export function FileUploadProvider({
  children,
  initialFiles = [],
  ...options
}: FileUploadProviderProps) {
  const [files, setFiles] = React.useState<UploadFile[]>(initialFiles);
  const [isDragging, setIsDragging] = React.useState(false);
  const uploadingIdsRef = React.useRef<Set<string>>(new Set());

  // Handle adding files
  const addFiles = React.useCallback(
    (newFiles: File[]) => {
      if (options.disabled) return;

      const validFiles: UploadFile[] = [];
      const errors: string[] = [];

      // Check max files
      if (
        options.maxFiles &&
        files.length + newFiles.length > options.maxFiles
      ) {
        toast.error(`You can only upload up to ${options.maxFiles} files`);
        return;
      }

      for (const file of newFiles) {
        // Check size
        if (options.maxSize && file.size > options.maxSize) {
          errors.push(
            `${file.name} exceeds ${formatBytes(options.maxSize)} limit`
          );
          continue;
        }

        // Create preview
        const preview = file.type.startsWith("image/")
          ? URL.createObjectURL(file)
          : undefined;

        const fileWithPreview = Object.assign(file, {
            preview
        }) as FileWithPreview;

        const id = `${file.name}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

        validFiles.push({
          id,
          file: fileWithPreview,
          progress: 0,
          status: "idle",
        });
      }

      if (errors.length > 0) {
        for (const error of errors) toast.error(error);
      }

      if (validFiles.length > 0) {
        setFiles((prev) => {
            if (!options.multiple) {
                // If not multiple, replace existing files
                // Cleanup old previews
                for (const f of prev) {
                   if (f.file.preview) URL.revokeObjectURL(f.file.preview);
                }
                return validFiles;
            }
            return [...prev, ...validFiles];
        });

        // Auto upload
        if (options.autoUpload) {
          // We need to use a timeout to let state update or just call upload directly
          // Calling directly is safer for closure capture if we pass validFiles
          for (const file of validFiles) {
            uploadFileInternal(file);
          }
        }
      }
    },
    [options.disabled, options.maxFiles, options.maxSize, options.multiple, options.autoUpload, files.length]
  );

  const removeFile = React.useCallback(
    (id: string) => {
      setFiles((prev) => {
        const file = prev.find((f) => f.id === id);
        if (file?.file.preview) {
          URL.revokeObjectURL(file.file.preview);
        }
        return prev.filter((f) => f.id !== id);
      });
    },
    []
  );

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
            if (f.file.preview) URL.revokeObjectURL(f.file.preview);
        }
        return [];
    });
  }, []);

  // Internal upload function that accepts the file object directly to avoid state race conditions
  const uploadFileInternal = React.useCallback(
    async (fileState: UploadFile) => {
      if (!options.onUpload) {
         // If no upload handler, just mark as completed (mock)
         updateFile(fileState.id, { status: "completed", progress: 100 });
         return;
      }

      if (uploadingIdsRef.current.has(fileState.id)) return;

      uploadingIdsRef.current.add(fileState.id);
      updateFile(fileState.id, { status: "uploading", progress: 0, error: undefined });

      try {
        const result = await options.onUpload(fileState, (progress) => {
          updateFile(fileState.id, { progress });
        });
        updateFile(fileState.id, {
            status: "completed",
            progress: 100,
            uploadedUrl: typeof result === 'string' ? result : undefined
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Upload failed";
        updateFile(fileState.id, { status: "error", error: errorMsg });
      } finally {
        uploadingIdsRef.current.delete(fileState.id);
      }
    },
    [options.onUpload, updateFile]
  );

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
        if (f.file.preview) URL.revokeObjectURL(f.file.preview);
      }
    };
  }, []);

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
