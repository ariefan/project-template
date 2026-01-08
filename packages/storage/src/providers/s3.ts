import {
  CopyObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type {
  FileInfo,
  FileMetadata,
  PresignedUploadUrl,
  StorageProvider,
} from "../types";

interface S3ProviderConfig {
  endpoint?: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
}

/**
 * S3-compatible storage provider
 * Works with AWS S3, Cloudflare R2, MinIO, and other S3-compatible services
 */
export class S3StorageProvider implements StorageProvider {
  readonly name = "s3";
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(config: S3ProviderConfig) {
    this.bucket = config.bucket;

    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      // For R2 and MinIO, force path-style addressing
      forcePathStyle: !!config.endpoint,
    });
  }

  async getPresignedUploadUrl(
    path: string,
    contentType: string,
    expiresIn = 1800
  ): Promise<PresignedUploadUrl> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: path,
      ContentType: contentType,
    });

    const url = await getSignedUrl(this.client, command, { expiresIn });
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    return {
      url,
      method: "PUT",
      headers: {
        "Content-Type": contentType,
      },
      expiresAt,
    };
  }

  getPresignedDownloadUrl(path: string, expiresIn = 300): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: path,
    });

    return getSignedUrl(this.client, command, { expiresIn });
  }

  async upload(path: string, data: Buffer, contentType: string): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: path,
      Body: data,
      ContentType: contentType,
    });

    await this.client.send(command);
  }

  async download(path: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: path,
    });

    const response = await this.client.send(command);

    if (!response.Body) {
      throw new Error(`File not found: ${path}`);
    }

    // Convert readable stream to buffer
    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }

  async delete(path: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: path,
    });

    await this.client.send(command);
  }

  async exists(path: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: path,
      });
      await this.client.send(command);
      return true;
    } catch (error) {
      if ((error as { name?: string }).name === "NotFound") {
        return false;
      }
      throw error;
    }
  }

  async getMetadata(path: string): Promise<FileMetadata | null> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: path,
      });
      const response = await this.client.send(command);

      return {
        size: response.ContentLength ?? 0,
        contentType: response.ContentType ?? "application/octet-stream",
        lastModified: response.LastModified ?? new Date(),
        etag: response.ETag,
      };
    } catch (error) {
      if ((error as { name?: string }).name === "NotFound") {
        return null;
      }
      throw error;
    }
  }

  async listFiles(path: string, recursive = false): Promise<FileInfo[]> {
    // Normalize path: ensure it ends with / for proper prefix matching
    const prefix = path ? `${path}/` : "";
    const files: FileInfo[] = [];
    let continuationToken: string | undefined;

    do {
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
        Delimiter: recursive ? undefined : "/",
        ContinuationToken: continuationToken,
      });

      const response = await this.client.send(command);

      // Process files (objects in the current "folder")
      for (const object of response.Contents ?? []) {
        const key = object.Key;
        if (!key) continue;

        // Skip the folder marker itself (ends with /)
        if (key.endsWith("/") && key === prefix) continue;

        // Get the name (last part of the key)
        const name = key.split("/").filter(Boolean).pop() ?? key;

        files.push({
          name,
          path: key,
          size: object.Size ?? 0,
          modified: object.LastModified ?? new Date(),
          isDirectory: key.endsWith("/"),
          contentType: undefined, // Would need HEAD request for each object
        });
      }

      // Process subdirectories (only when not recursive)
      if (!recursive) {
        for (const prefixInfo of response.CommonPrefixes ?? []) {
          const prefixValue = prefixInfo.Prefix;
          if (!prefixValue) continue;

          // Remove trailing slash for display
          const folderName =
            prefixValue.slice(0, -1).split("/").filter(Boolean).pop() ??
            prefixValue;

          files.push({
            name: folderName,
            path: prefixValue.slice(0, -1), // Remove trailing slash
            size: 0,
            modified: new Date(),
            isDirectory: true,
          });
        }
      }

      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    return files;
  }

  async createFolder(path: string): Promise<void> {
    // S3 doesn't have real folders - we create an empty object with trailing slash
    const folderKey = path.endsWith("/") ? path : `${path}/`;
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: folderKey,
      Body: Buffer.from(""),
    });

    await this.client.send(command);
  }

  async moveFile(from: string, to: string): Promise<void> {
    // S3 doesn't have native move - we copy then delete
    await this.copyFile(from, to);
    await this.delete(from);
  }

  async copyFile(from: string, to: string): Promise<void> {
    const command = new CopyObjectCommand({
      Bucket: this.bucket,
      CopySource: `${this.bucket}/${from}`,
      Key: to,
    });

    await this.client.send(command);
  }

  async deleteFolder(path: string): Promise<void> {
    // S3 doesn't have folders - we delete all objects with the prefix
    const prefix = path.endsWith("/") ? path : `${path}/`;
    const keysToDelete: string[] = [];
    let continuationToken: string | undefined;

    do {
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      });

      const response = await this.client.send(command);

      // Collect all object keys
      for (const object of response.Contents ?? []) {
        if (object.Key) {
          keysToDelete.push(object.Key);
        }
      }

      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    // Delete all objects (batch delete supports up to 1000 at a time)
    for (let i = 0; i < keysToDelete.length; i += 1000) {
      const batch = keysToDelete.slice(i, i + 1000);
      const deleteCommand = new DeleteObjectsCommand({
        Bucket: this.bucket,
        Delete: {
          Objects: batch.map((key) => ({ Key: key })),
          Quiet: true,
        },
      });

      await this.client.send(deleteCommand);
    }
  }
}

/**
 * Create an S3-compatible storage provider
 */
export function createS3Provider(config: S3ProviderConfig): StorageProvider {
  return new S3StorageProvider(config);
}
