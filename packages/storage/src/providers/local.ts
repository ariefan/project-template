import { mkdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type {
  FileMetadata,
  PresignedUploadUrl,
  StorageProvider,
} from "../types";

/**
 * Local filesystem storage provider
 * For development and testing only - not for production use
 *
 * Note: Presigned URLs are simulated by generating direct file paths.
 * In a real deployment, you would use a web server to serve these files.
 */
export class LocalStorageProvider implements StorageProvider {
  readonly name = "local";
  private readonly basePath: string;
  private readonly baseUrl: string;

  constructor(basePath: string, baseUrl = "http://localhost:3001/uploads") {
    this.basePath = basePath;
    this.baseUrl = baseUrl;
  }

  getPresignedUploadUrl(
    path: string,
    contentType: string,
    expiresIn = 1800
  ): Promise<PresignedUploadUrl> {
    // For local development, return a URL that points to the API server
    // In practice, the API handles uploads directly for local storage
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    return Promise.resolve({
      url: `${this.baseUrl}/${path}`,
      method: "PUT",
      headers: {
        "Content-Type": contentType,
      },
      expiresAt,
    });
  }

  getPresignedDownloadUrl(path: string, expiresIn = 300): Promise<string> {
    // For local development, return direct URL
    // Token-based expiration would need to be implemented separately
    const token = Buffer.from(
      JSON.stringify({
        path,
        expires: Date.now() + expiresIn * 1000,
      })
    ).toString("base64url");

    return Promise.resolve(`${this.baseUrl}/${path}?token=${token}`);
  }

  async upload(
    path: string,
    data: Buffer,
    _contentType: string
  ): Promise<void> {
    const fullPath = join(this.basePath, path);
    const dir = dirname(fullPath);

    // Ensure directory exists
    await mkdir(dir, { recursive: true });

    // Write file
    await writeFile(fullPath, data);
  }

  download(path: string): Promise<Buffer> {
    const fullPath = join(this.basePath, path);
    return readFile(fullPath);
  }

  async delete(path: string): Promise<void> {
    const fullPath = join(this.basePath, path);
    try {
      await unlink(fullPath);
    } catch (error) {
      // Ignore if file doesn't exist
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  }

  async exists(path: string): Promise<boolean> {
    const fullPath = join(this.basePath, path);
    try {
      await stat(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  async getMetadata(path: string): Promise<FileMetadata | null> {
    const fullPath = join(this.basePath, path);
    try {
      const stats = await stat(fullPath);
      return {
        size: stats.size,
        contentType: "application/octet-stream", // Local doesn't store content type
        lastModified: stats.mtime,
      };
    } catch {
      return null;
    }
  }
}

/**
 * Create a local storage provider
 */
export function createLocalProvider(
  basePath: string,
  baseUrl?: string
): StorageProvider {
  return new LocalStorageProvider(basePath, baseUrl);
}
