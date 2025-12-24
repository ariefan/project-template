import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type {
  FileMetadata,
  PresignedUploadUrl,
  StorageProvider,
} from "../types";

type S3ProviderConfig = {
  endpoint?: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
};

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
}

/**
 * Create an S3-compatible storage provider
 */
export function createS3Provider(config: S3ProviderConfig): StorageProvider {
  return new S3StorageProvider(config);
}
