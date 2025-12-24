import { mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createLocalProvider, createStorageProvider } from "../index";

describe("@workspace/storage", () => {
  describe("createStorageProvider factory", () => {
    it("should throw error for unknown provider type", () => {
      expect(() =>
        createStorageProvider({ type: "unknown" as "local" })
      ).toThrow("Unknown storage provider type");
    });

    it("should throw error for local provider without path", () => {
      expect(() => createStorageProvider({ type: "local" })).toThrow(
        "localPath is required for local storage provider"
      );
    });

    it("should throw error for S3 provider without credentials", () => {
      expect(() => createStorageProvider({ type: "s3" })).toThrow(
        "s3Region, s3Bucket, s3AccessKeyId, and s3SecretAccessKey are required"
      );
    });

    it("should create local provider with valid config", () => {
      const provider = createStorageProvider({
        type: "local",
        localPath: "/tmp/storage",
      });

      expect(provider.name).toBe("local");
    });
  });

  describe("local provider", () => {
    let testDir: string;

    beforeEach(async () => {
      testDir = join(tmpdir(), `storage-test-${Date.now()}`);
      await mkdir(testDir, { recursive: true });
    });

    afterEach(async () => {
      try {
        await rm(testDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    });

    it("should have correct provider name", () => {
      const provider = createLocalProvider(testDir);
      expect(provider.name).toBe("local");
    });

    it("should upload and download file", async () => {
      const provider = createLocalProvider(testDir);
      const testData = Buffer.from("Hello, World!");
      const path = "test/file.txt";

      await provider.upload(path, testData, "text/plain");
      const downloaded = await provider.download(path);

      expect(downloaded.toString()).toBe("Hello, World!");
    });

    it("should check if file exists", async () => {
      const provider = createLocalProvider(testDir);
      const testData = Buffer.from("Test content");
      const path = "exists/test.txt";

      expect(await provider.exists(path)).toBe(false);

      await provider.upload(path, testData, "text/plain");

      expect(await provider.exists(path)).toBe(true);
    });

    it("should delete file", async () => {
      const provider = createLocalProvider(testDir);
      const testData = Buffer.from("Delete me");
      const path = "delete/test.txt";

      await provider.upload(path, testData, "text/plain");
      expect(await provider.exists(path)).toBe(true);

      await provider.delete(path);
      expect(await provider.exists(path)).toBe(false);
    });

    it("should not throw when deleting non-existent file", async () => {
      const provider = createLocalProvider(testDir);

      await expect(
        provider.delete("non-existent/file.txt")
      ).resolves.toBeUndefined();
    });

    it("should get file metadata", async () => {
      const provider = createLocalProvider(testDir);
      const testData = Buffer.from("Metadata test content");
      const path = "metadata/test.txt";

      await provider.upload(path, testData, "text/plain");

      const metadata = await provider.getMetadata(path);

      expect(metadata).not.toBeNull();
      expect(metadata?.size).toBe(testData.length);
      expect(metadata?.lastModified).toBeInstanceOf(Date);
    });

    it("should return null for non-existent file metadata", async () => {
      const provider = createLocalProvider(testDir);

      const metadata = await provider.getMetadata("non-existent.txt");

      expect(metadata).toBeNull();
    });

    it("should generate presigned upload URL", async () => {
      const provider = createLocalProvider(testDir);
      const path = "upload/test.pdf";

      const presigned = await provider.getPresignedUploadUrl(
        path,
        "application/pdf"
      );

      expect(presigned.url).toContain(path);
      expect(presigned.method).toBe("PUT");
      expect(presigned.headers["Content-Type"]).toBe("application/pdf");
      expect(presigned.expiresAt).toBeInstanceOf(Date);
      expect(presigned.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it("should generate presigned download URL", async () => {
      const provider = createLocalProvider(testDir);
      const path = "download/test.pdf";

      const url = await provider.getPresignedDownloadUrl(path);

      expect(url).toContain(path);
      expect(url).toContain("token=");
    });

    it("should create nested directories during upload", async () => {
      const provider = createLocalProvider(testDir);
      const testData = Buffer.from("Nested content");
      const path = "deeply/nested/directory/structure/file.txt";

      await provider.upload(path, testData, "text/plain");

      expect(await provider.exists(path)).toBe(true);
    });

    it("should handle binary data", async () => {
      const provider = createLocalProvider(testDir);
      const binaryData = Buffer.from([0x00, 0x01, 0x02, 0xff, 0xfe, 0xfd]);
      const path = "binary/data.bin";

      await provider.upload(path, binaryData, "application/octet-stream");
      const downloaded = await provider.download(path);

      expect(downloaded).toEqual(binaryData);
    });

    it("should throw when downloading non-existent file", async () => {
      const provider = createLocalProvider(testDir);

      await expect(provider.download("non-existent.txt")).rejects.toThrow();
    });

    it("should use custom base URL for presigned URLs", async () => {
      const customUrl = "https://cdn.example.com/files";
      const provider = createLocalProvider(testDir, customUrl);
      const path = "custom/test.pdf";

      const presigned = await provider.getPresignedUploadUrl(
        path,
        "application/pdf"
      );

      expect(presigned.url).toContain(customUrl);
    });
  });
});
