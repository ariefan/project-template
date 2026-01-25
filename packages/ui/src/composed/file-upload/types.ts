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
    onProgress: (progress: number, speed?: number, eta?: number) => void
  ) => Promise<string | undefined>; // Returns uploaded URL optionally
  onDelete?: (file: UploadFile) => void;
  autoUpload?: boolean;
  disabled?: boolean;
  maxFiles?: number;
}

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

export type CombinedItem =
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
  /**
   * Layout mode for displaying images
   * @default "grid"
   */
  layout?: "grid" | "carousel";

  /**
   * Maximum size per file (in bytes)
   */
  maxSize?: number;

  /**
   * Maximum number of files allowed
   */
  maxFiles?: number;

  /**
   * Accepted file types (default: "image/*")
   */
  accept?: Record<string, string[]>;

  /**
   * Enforced aspect ratio for cropping
   */
  aspectRatio?: number;

  /**
   * Lock the aspect ratio in crop dialog
   */
  lockAspectRatio?: boolean;

  /**
   * Use circular crop mask (implies locked aspect ratio 1:1)
   */
  circularCrop?: boolean;

  /**
   * Component size variant
   * @default "default"
   */
  size?: "default" | "sm";
}

export interface ImageUploaderRef {
  addFiles: (files: File[]) => void;
  clearFiles: () => void;
}
