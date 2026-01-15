export interface FileWithPreview extends File {
  preview?: string;
}

export type UploadStatus = "idle" | "uploading" | "completed" | "error";

export interface UploadFile {
  id: string;
  file: FileWithPreview;
  progress: number;
  status: UploadStatus;
  error?: string;
  speed?: number; // bytes/s
  eta?: number; // seconds
  uploadedUrl?: string; // Optional URL after upload
}

export type UploadMode = "quick" | "bulk";

export interface FileUploadContextType {
  files: UploadFile[];
  addFiles: (files: File[]) => void;
  removeFile: (id: string) => void;
  updateFile: (id: string, updates: Partial<UploadFile>) => void;
  clearFiles: () => void;
  uploadFile: (id: string) => Promise<void>;
  uploadAll: () => Promise<void>;
  retryFile: (id: string) => void;
  isDragging: boolean;
  setIsDragging: (isDragging: boolean) => void;
  options: FileUploadOptions;
}

export interface FileUploadOptions {
  multiple?: boolean;
  maxSize?: number; // in bytes
  accept?: Record<string, string[]>;
  onUpload?: (
    file: UploadFile,
    onProgress: (progress: number) => void
  ) => Promise<string | void>; // Returns uploaded URL optionally
  onDelete?: (file: UploadFile) => void;
  autoUpload?: boolean;
  disabled?: boolean;
  maxFiles?: number;
}
