// Regex patterns for filename sanitization (defined at top-level for performance)
const PATH_COMPONENT_REGEX = /^.*[\\/]/;
const NULL_BYTE_REGEX = /\0/g;
const DANGEROUS_CHARS_REGEX = /[<>:"|?*]/g;
const LEADING_TRAILING_DOTS_SPACES_REGEX = /^[\s.]+|[\s.]+$/g;
const MULTIPLE_DOTS_REGEX = /\.{2,}/g;
const MULTIPLE_UNDERSCORES_SPACES_REGEX = /[\s_]+/g;

/**
 * Sanitize filename to prevent path traversal and other attacks
 */
export function sanitizeFilename(filename: string): string {
  // Remove path components (prevent path traversal)
  let sanitized = filename.replace(PATH_COMPONENT_REGEX, "");

  // Remove null bytes
  sanitized = sanitized.replace(NULL_BYTE_REGEX, "");

  // Replace dangerous characters
  sanitized = sanitized.replace(DANGEROUS_CHARS_REGEX, "_");

  // Remove leading/trailing dots and spaces
  sanitized = sanitized.replace(LEADING_TRAILING_DOTS_SPACES_REGEX, "");

  // Replace multiple consecutive dots with single dot
  sanitized = sanitized.replace(MULTIPLE_DOTS_REGEX, ".");

  // Replace multiple consecutive underscores/spaces with single underscore
  sanitized = sanitized.replace(MULTIPLE_UNDERSCORES_SPACES_REGEX, "_");

  // Ensure filename is not empty
  if (!sanitized || sanitized === ".") {
    sanitized = "unnamed_file";
  }

  // Limit filename length (preserve extension)
  const maxLength = 255;
  if (sanitized.length > maxLength) {
    const ext = getExtension(sanitized);
    const nameWithoutExt = sanitized.slice(0, sanitized.length - ext.length);
    const maxNameLength = maxLength - ext.length;
    sanitized = nameWithoutExt.slice(0, maxNameLength) + ext;
  }

  return sanitized;
}

/**
 * Get file extension including the dot
 */
function getExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1 || lastDot === 0) {
    return "";
  }
  return filename.slice(lastDot);
}

/**
 * Generate a unique storage path for a file
 */
export function generateStoragePath(
  orgId: string,
  fileId: string,
  filename: string
): string {
  const sanitized = sanitizeFilename(filename);
  const ext = getExtension(sanitized);

  // Use date-based partitioning for better organization
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");

  // Format: orgs/{orgId}/files/{year}/{month}/{fileId}{ext}
  return `orgs/${orgId}/files/${year}/${month}/${fileId}${ext}`;
}

/**
 * Validate filename doesn't contain dangerous patterns
 */
export function isValidFilename(filename: string): boolean {
  // Check for path traversal attempts
  if (
    filename.includes("..") ||
    filename.includes("/") ||
    filename.includes("\\")
  ) {
    return false;
  }

  // Check for null bytes
  if (filename.includes("\0")) {
    return false;
  }

  // Check for reserved Windows filenames
  const reserved = [
    "CON",
    "PRN",
    "AUX",
    "NUL",
    "COM1",
    "COM2",
    "COM3",
    "COM4",
    "COM5",
    "COM6",
    "COM7",
    "COM8",
    "COM9",
    "LPT1",
    "LPT2",
    "LPT3",
    "LPT4",
    "LPT5",
    "LPT6",
    "LPT7",
    "LPT8",
    "LPT9",
  ];
  const nameWithoutExt = (filename.split(".")[0] ?? "").toUpperCase();
  if (reserved.includes(nameWithoutExt)) {
    return false;
  }

  // Check minimum length
  if (filename.length === 0 || filename.length > 255) {
    return false;
  }

  return true;
}
