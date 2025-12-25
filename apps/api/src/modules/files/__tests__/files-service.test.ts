import type { FileRow, FileUploadRow } from "@workspace/db/schema";
import type { StorageProvider } from "@workspace/storage";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Regex patterns for ID matching
const UPLOAD_ID_PATTERN = /^upload_/;

// Sample file data
const sampleFile: FileRow = {
  id: "file_abc123",
  orgId: "org1",
  filename: "test-document.pdf",
  size: 1024,
  mimeType: "application/pdf",
  storagePath: "org1/file_abc123/test-document.pdf",
  metadata: null,
  uploadedBy: "user1",
  uploadedAt: new Date("2024-01-15T10:00:00Z"),
  virusScanStatus: "clean",
  virusScanCompletedAt: new Date("2024-01-15T10:00:01Z"),
  access: "private",
  isDeleted: false,
  deletedAt: null,
  deletedBy: null,
};

const sampleUpload: FileUploadRow = {
  id: "upload_xyz789",
  orgId: "org1",
  filename: "test-document.pdf",
  contentType: "application/pdf",
  size: 1024,
  storagePath: "org1/file_abc123/test-document.pdf",
  metadata: null,
  createdBy: "user1",
  createdAt: new Date("2024-01-15T10:00:00Z"),
  expiresAt: new Date(Date.now() + 1_800_000), // 30 min from now
  confirmedAt: null,
};

// Mock storage provider
const mockStorageProvider: StorageProvider = {
  name: "mock",
  upload: vi.fn(),
  download: vi.fn(),
  delete: vi.fn(),
  exists: vi.fn(),
  getMetadata: vi.fn(),
  getPresignedUploadUrl: vi.fn(),
  getPresignedDownloadUrl: vi.fn(),
};

// Mock repository
vi.mock("../repositories/files.repository", () => ({
  createFile: vi.fn(),
  getFileById: vi.fn(),
  listFiles: vi.fn(),
  softDeleteFile: vi.fn(),
  hardDeleteFile: vi.fn(),
  updateFileAccess: vi.fn(),
  createFileUpload: vi.fn(),
  getFileUploadById: vi.fn(),
  confirmFileUpload: vi.fn(),
  deleteFileUpload: vi.fn(),
  deleteExpiredUploads: vi.fn(),
}));

// Import after mocking
const {
  initFilesService,
  initiateUpload,
  confirmUpload,
  directUpload,
  getFile,
  listFiles,
  getDownloadUrl,
  softDeleteFile,
  hardDeleteFile,
  updateFileAccess,
} = await import("../services/files.service");
const filesRepository = await import("../repositories/files.repository");

describe("Files Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Initialize service with mock storage
    initFilesService(mockStorageProvider);
  });

  describe("initiateUpload", () => {
    it("should create presigned upload URL", async () => {
      vi.mocked(mockStorageProvider.getPresignedUploadUrl).mockResolvedValue({
        url: "https://storage.example.com/presigned-upload",
        method: "PUT" as const,
        headers: { "Content-Type": "application/pdf" },
        expiresAt: new Date(Date.now() + 1_800_000),
      });
      vi.mocked(filesRepository.createFileUpload).mockResolvedValue(
        sampleUpload
      );

      const result = await initiateUpload({
        orgId: "org1",
        filename: "test-document.pdf",
        contentType: "application/pdf",
        size: 1024,
        createdBy: "user1",
      });

      expect(result.uploadId).toMatch(UPLOAD_ID_PATTERN);
      expect(result.url).toBe("https://storage.example.com/presigned-upload");
      expect(result.method).toBe("PUT");
      expect(filesRepository.createFileUpload).toHaveBeenCalled();
    });

    it("should reject invalid MIME types", async () => {
      await expect(
        initiateUpload({
          orgId: "org1",
          filename: "malware.exe",
          contentType: "application/x-msdownload",
          size: 1024,
          createdBy: "user1",
        })
      ).rejects.toThrow();
    });

    it("should reject files that are too large", async () => {
      const hugeSize = 100 * 1024 * 1024 * 1024; // 100 GB

      await expect(
        initiateUpload({
          orgId: "org1",
          filename: "huge-file.pdf",
          contentType: "application/pdf",
          size: hugeSize,
          createdBy: "user1",
        })
      ).rejects.toThrow();
    });
  });

  describe("confirmUpload", () => {
    it("should confirm upload when file exists in storage", async () => {
      vi.mocked(filesRepository.getFileUploadById).mockResolvedValue(
        sampleUpload
      );
      vi.mocked(mockStorageProvider.exists).mockResolvedValue(true);
      vi.mocked(mockStorageProvider.getMetadata).mockResolvedValue({
        size: 1024,
        contentType: "application/pdf",
        lastModified: new Date(),
      });
      vi.mocked(filesRepository.createFile).mockResolvedValue(sampleFile);
      vi.mocked(filesRepository.confirmFileUpload).mockResolvedValue({
        ...sampleUpload,
        confirmedAt: new Date(),
      });

      const result = await confirmUpload("org1", "upload_xyz789");

      expect(result.success).toBe(true);
      expect(result.file).toBeDefined();
      expect(filesRepository.confirmFileUpload).toHaveBeenCalledWith(
        "upload_xyz789"
      );
    });

    it("should fail when upload not found", async () => {
      vi.mocked(filesRepository.getFileUploadById).mockResolvedValue(null);

      const result = await confirmUpload("org1", "upload_nonexistent");

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    it("should fail when upload has expired", async () => {
      const expiredUpload = {
        ...sampleUpload,
        expiresAt: new Date(Date.now() - 1000), // Expired
      };
      vi.mocked(filesRepository.getFileUploadById).mockResolvedValue(
        expiredUpload
      );
      vi.mocked(filesRepository.deleteFileUpload).mockImplementation(() =>
        Promise.resolve()
      );

      const result = await confirmUpload("org1", "upload_xyz789");

      expect(result.success).toBe(false);
      expect(result.error).toContain("expired");
    });

    it("should fail when file not in storage", async () => {
      vi.mocked(filesRepository.getFileUploadById).mockResolvedValue(
        sampleUpload
      );
      vi.mocked(mockStorageProvider.exists).mockResolvedValue(false);

      const result = await confirmUpload("org1", "upload_xyz789");

      expect(result.success).toBe(false);
      expect(result.error).toContain("not uploaded");
    });
  });

  describe("directUpload", () => {
    it("should upload file directly", async () => {
      const fileData = Buffer.from("test file content");
      vi.mocked(mockStorageProvider.upload).mockResolvedValue(undefined);
      vi.mocked(filesRepository.createFile).mockResolvedValue(sampleFile);

      const result = await directUpload({
        orgId: "org1",
        filename: "test.txt",
        contentType: "text/plain",
        data: fileData,
        uploadedBy: "user1",
      });

      expect(result.id).toBe("file_abc123");
      expect(mockStorageProvider.upload).toHaveBeenCalled();
      expect(filesRepository.createFile).toHaveBeenCalled();
    });

    it("should reject files over 10MB for direct upload", async () => {
      const largeData = Buffer.alloc(11 * 1024 * 1024); // 11 MB

      await expect(
        directUpload({
          orgId: "org1",
          filename: "large.pdf",
          contentType: "application/pdf",
          data: largeData,
          uploadedBy: "user1",
        })
      ).rejects.toThrow("Direct upload limited to 10MB");
    });

    it("should reject invalid MIME types", async () => {
      const fileData = Buffer.from("fake exe content");

      await expect(
        directUpload({
          orgId: "org1",
          filename: "malware.exe",
          contentType: "application/x-msdownload",
          data: fileData,
          uploadedBy: "user1",
        })
      ).rejects.toThrow();
    });
  });

  describe("getFile", () => {
    it("should return file when found", async () => {
      vi.mocked(filesRepository.getFileById).mockResolvedValue(sampleFile);

      const result = await getFile("org1", "file_abc123");

      expect(result).toEqual(sampleFile);
    });

    it("should return null when not found", async () => {
      vi.mocked(filesRepository.getFileById).mockResolvedValue(null);

      const result = await getFile("org1", "file_nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("listFiles", () => {
    it("should list files with pagination", async () => {
      const mockResult = {
        data: [sampleFile],
        pagination: {
          page: 1,
          pageSize: 50,
          totalCount: 1,
          totalPages: 1,
          hasNext: false,
          hasPrevious: false,
        },
      };
      vi.mocked(filesRepository.listFiles).mockResolvedValue(mockResult);

      const result = await listFiles("org1", { page: 1, pageSize: 50 });

      expect(result.data).toHaveLength(1);
      expect(result.pagination.totalCount).toBe(1);
    });
  });

  describe("getDownloadUrl", () => {
    it("should return presigned download URL", async () => {
      vi.mocked(filesRepository.getFileById).mockResolvedValue(sampleFile);
      vi.mocked(mockStorageProvider.getPresignedDownloadUrl).mockResolvedValue(
        "https://storage.example.com/presigned-download"
      );

      const result = await getDownloadUrl("org1", "file_abc123");

      expect(result).not.toBeNull();
      expect(result?.url).toBe(
        "https://storage.example.com/presigned-download"
      );
    });

    it("should return null when file not found", async () => {
      vi.mocked(filesRepository.getFileById).mockResolvedValue(null);

      const result = await getDownloadUrl("org1", "file_nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("softDeleteFile", () => {
    it("should soft delete file", async () => {
      const deletedFile = {
        ...sampleFile,
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: "user1",
      };
      vi.mocked(filesRepository.softDeleteFile).mockResolvedValue(deletedFile);

      const result = await softDeleteFile("org1", "file_abc123", "user1");

      expect(result.success).toBe(true);
      expect(result.file?.isDeleted).toBe(true);
    });

    it("should return error when file not found", async () => {
      vi.mocked(filesRepository.softDeleteFile).mockResolvedValue(null);

      const result = await softDeleteFile("org1", "file_nonexistent", "user1");

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });
  });

  describe("hardDeleteFile", () => {
    it("should permanently delete file from storage and database", async () => {
      vi.mocked(filesRepository.getFileById).mockResolvedValue(sampleFile);
      vi.mocked(mockStorageProvider.delete).mockResolvedValue(undefined);
      vi.mocked(filesRepository.hardDeleteFile).mockResolvedValue(sampleFile);

      const result = await hardDeleteFile("org1", "file_abc123");

      expect(result.success).toBe(true);
      expect(mockStorageProvider.delete).toHaveBeenCalledWith(
        sampleFile.storagePath
      );
      expect(filesRepository.hardDeleteFile).toHaveBeenCalled();
    });

    it("should return error when file not found", async () => {
      vi.mocked(filesRepository.getFileById).mockResolvedValue(null);

      const result = await hardDeleteFile("org1", "file_nonexistent");

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });
  });

  describe("updateFileAccess", () => {
    it("should update file access level", async () => {
      const updatedFile = { ...sampleFile, access: "public" as const };
      vi.mocked(filesRepository.updateFileAccess).mockResolvedValue(
        updatedFile
      );

      const result = await updateFileAccess("org1", "file_abc123", "public");

      expect(result?.access).toBe("public");
    });

    it("should return null when file not found", async () => {
      vi.mocked(filesRepository.updateFileAccess).mockResolvedValue(null);

      const result = await updateFileAccess(
        "org1",
        "file_nonexistent",
        "public"
      );

      expect(result).toBeNull();
    });
  });
});
