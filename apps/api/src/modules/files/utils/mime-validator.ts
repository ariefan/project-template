/**
 * Allowed MIME types whitelist
 * Only these file types can be uploaded
 */
export const ALLOWED_MIME_TYPES: Record<
  string,
  { maxSize: number; extensions: string[] }
> = {
  // Images
  "image/jpeg": { maxSize: 5 * 1024 * 1024, extensions: [".jpg", ".jpeg"] },
  "image/png": { maxSize: 5 * 1024 * 1024, extensions: [".png"] },
  "image/gif": { maxSize: 5 * 1024 * 1024, extensions: [".gif"] },
  "image/webp": { maxSize: 5 * 1024 * 1024, extensions: [".webp"] },

  // Documents
  "application/pdf": { maxSize: 20 * 1024 * 1024, extensions: [".pdf"] },
  "application/msword": { maxSize: 20 * 1024 * 1024, extensions: [".doc"] },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
    maxSize: 20 * 1024 * 1024,
    extensions: [".docx"],
  },
  "application/vnd.ms-excel": {
    maxSize: 20 * 1024 * 1024,
    extensions: [".xls"],
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
    maxSize: 20 * 1024 * 1024,
    extensions: [".xlsx"],
  },
  "text/plain": { maxSize: 1 * 1024 * 1024, extensions: [".txt"] },
  "text/csv": { maxSize: 10 * 1024 * 1024, extensions: [".csv"] },

  // Archives
  "application/zip": { maxSize: 50 * 1024 * 1024, extensions: [".zip"] },

  // JSON/Data
  "application/json": { maxSize: 10 * 1024 * 1024, extensions: [".json"] },
};

/**
 * Default maximum file size (50 MB)
 */
export const DEFAULT_MAX_FILE_SIZE = 50 * 1024 * 1024;

export interface MimeValidationResult {
  valid: boolean;
  error?: string;
  maxSize?: number;
}

/**
 * Validate a MIME type against the whitelist
 */
export function validateMimeType(
  mimeType: string,
  filename: string
): MimeValidationResult {
  const config = ALLOWED_MIME_TYPES[mimeType];

  if (!config) {
    return {
      valid: false,
      error: `File type '${mimeType}' is not allowed`,
    };
  }

  // Check extension matches MIME type
  const ext = getFileExtension(filename).toLowerCase();
  if (ext && !config.extensions.includes(ext)) {
    return {
      valid: false,
      error: `File extension '${ext}' does not match MIME type '${mimeType}'`,
    };
  }

  return {
    valid: true,
    maxSize: config.maxSize,
  };
}

/**
 * Validate file size against MIME-specific or default limit
 */
export function validateFileSize(
  mimeType: string,
  size: number,
  customMaxSize?: number
): MimeValidationResult {
  const config = ALLOWED_MIME_TYPES[mimeType];
  const maxSize = customMaxSize ?? config?.maxSize ?? DEFAULT_MAX_FILE_SIZE;

  if (size > maxSize) {
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${maxSizeMB} MB`,
      maxSize,
    };
  }

  return {
    valid: true,
    maxSize,
  };
}

/**
 * Get file extension from filename
 */
function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1) {
    return "";
  }
  return filename.slice(lastDot);
}

/**
 * Get list of allowed MIME types
 */
export function getAllowedMimeTypes(): string[] {
  return Object.keys(ALLOWED_MIME_TYPES);
}
