import {
  cp,
  mkdir,
  readdir,
  readFile,
  rm,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
import { dirname, join } from "node:path";
import type {
  FileInfo,
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

  async listFiles(path: string, recursive = false): Promise<FileInfo[]> {
    const fullPath = join(this.basePath, path);
    const entries = await readdir(fullPath, { withFileTypes: true });
    const files: FileInfo[] = [];

    for (const entry of entries) {
      const entryPath = join(fullPath, entry.name);
      const stats = await stat(entryPath);
      const relativePath = path ? `${path}/${entry.name}` : entry.name;

      files.push({
        name: entry.name,
        path: relativePath,
        size: stats.size,
        modified: stats.mtime,
        isDirectory: entry.isDirectory(),
      });

      if (entry.isDirectory() && recursive) {
        const subFiles = await this.listFiles(relativePath, true);
        files.push(...subFiles);
      }
    }

    return files;
  }

  async createFolder(path: string): Promise<void> {
    const fullPath = join(this.basePath, path);
    await mkdir(fullPath, { recursive: true });
  }

  async moveFile(from: string, to: string): Promise<void> {
    const fromPath = join(this.basePath, from);
    const toPath = join(this.basePath, to);
    const toDir = dirname(toPath);

    // Ensure destination directory exists
    await mkdir(toDir, { recursive: true });

    // Use rename to move (Node.js will move across filesystems if needed)
    await writeFile(toPath, await readFile(fromPath));
    await unlink(fromPath);
  }

  async copyFile(from: string, to: string): Promise<void> {
    const fromPath = join(this.basePath, from);
    const toPath = join(this.basePath, to);
    const toDir = dirname(toPath);

    // Ensure destination directory exists
    await mkdir(toDir, { recursive: true });

    // Use cp with recursive for directories
    await cp(fromPath, toPath, { recursive: true });
  }

  async deleteFolder(path: string): Promise<void> {
    const fullPath = join(this.basePath, path);
    // Use rm with recursive for directories
    await rm(fullPath, { recursive: true, force: true });
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
