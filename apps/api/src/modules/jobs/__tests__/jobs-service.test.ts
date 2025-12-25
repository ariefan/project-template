import type { JobRow, JobStatus } from "@workspace/db/schema";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Regex patterns for ID matching
const JOB_ID_PATTERN = /^job_/;

// Sample job data
const sampleJob: JobRow = {
  id: "job_abc123def456",
  orgId: "org1",
  type: "export",
  status: "pending" as JobStatus,
  progress: 0,
  message: null,
  result: null,
  errorCode: null,
  errorMessage: null,
  createdBy: "user1",
  createdAt: new Date("2024-01-15T10:00:00Z"),
  startedAt: null,
  completedAt: null,
  estimatedCompletion: null,
};

// Mock repository
vi.mock("../repositories/jobs.repository", () => ({
  createJob: vi.fn(),
  getJobById: vi.fn(),
  listJobs: vi.fn(),
  cancelJob: vi.fn(),
  updateJobStatus: vi.fn(),
  updateJobProgress: vi.fn(),
  completeJob: vi.fn(),
  failJob: vi.fn(),
}));

// Import after mocking
const {
  createJob,
  getJob,
  listJobs,
  cancelJob,
  startJob,
  updateProgress,
  completeJob,
  failJob,
  createJobHelpers,
} = await import("../services/jobs.service");
const jobsRepository = await import("../repositories/jobs.repository");

describe("Jobs Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createJob", () => {
    it("should create a new job with generated ID", async () => {
      vi.mocked(jobsRepository.createJob).mockResolvedValue(sampleJob);

      const result = await createJob({
        orgId: "org1",
        type: "export",
        createdBy: "user1",
      });

      expect(result.id).toBe("job_abc123def456");
      expect(result.status).toBe("pending");
      expect(jobsRepository.createJob).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.stringMatching(JOB_ID_PATTERN),
          orgId: "org1",
          type: "export",
          status: "pending",
          createdBy: "user1",
        })
      );
    });

    it("should create job with estimated completion time", async () => {
      const estimatedCompletion = new Date("2024-01-15T11:00:00Z");
      vi.mocked(jobsRepository.createJob).mockResolvedValue({
        ...sampleJob,
        estimatedCompletion,
      });

      const result = await createJob({
        orgId: "org1",
        type: "export",
        createdBy: "user1",
        estimatedCompletion,
      });

      expect(result.estimatedCompletion).toEqual(estimatedCompletion);
    });
  });

  describe("getJob", () => {
    it("should return job when found", async () => {
      vi.mocked(jobsRepository.getJobById).mockResolvedValue(sampleJob);

      const result = await getJob("org1", "job_abc123def456");

      expect(result).toEqual(sampleJob);
      expect(jobsRepository.getJobById).toHaveBeenCalledWith(
        "org1",
        "job_abc123def456"
      );
    });

    it("should return null when not found", async () => {
      vi.mocked(jobsRepository.getJobById).mockResolvedValue(null);

      const result = await getJob("org1", "job_nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("listJobs", () => {
    it("should list jobs with pagination", async () => {
      const mockResult = {
        data: [sampleJob],
        pagination: {
          page: 1,
          pageSize: 50,
          totalCount: 1,
          totalPages: 1,
          hasNext: false,
          hasPrevious: false,
        },
      };
      vi.mocked(jobsRepository.listJobs).mockResolvedValue(mockResult);

      const result = await listJobs("org1", { page: 1, pageSize: 50 });

      expect(result.data).toHaveLength(1);
      expect(result.pagination.totalCount).toBe(1);
    });

    it("should cap page size at 100", async () => {
      const mockResult = {
        data: [],
        pagination: {
          page: 1,
          pageSize: 100,
          totalCount: 0,
          totalPages: 0,
          hasNext: false,
          hasPrevious: false,
        },
      };
      vi.mocked(jobsRepository.listJobs).mockResolvedValue(mockResult);

      await listJobs("org1", { pageSize: 500 });

      expect(jobsRepository.listJobs).toHaveBeenCalledWith("org1", {
        pageSize: 100,
      });
    });

    it("should pass filters to repository", async () => {
      const mockResult = {
        data: [],
        pagination: {
          page: 1,
          pageSize: 50,
          totalCount: 0,
          totalPages: 0,
          hasNext: false,
          hasPrevious: false,
        },
      };
      vi.mocked(jobsRepository.listJobs).mockResolvedValue(mockResult);

      const createdAfter = new Date("2024-01-01T00:00:00Z");
      await listJobs("org1", {
        status: "completed",
        type: "export",
        createdAfter,
      });

      expect(jobsRepository.listJobs).toHaveBeenCalledWith("org1", {
        status: "completed",
        type: "export",
        createdAfter,
        pageSize: 50,
      });
    });
  });

  describe("cancelJob", () => {
    it("should cancel pending job", async () => {
      vi.mocked(jobsRepository.getJobById).mockResolvedValue(sampleJob);
      vi.mocked(jobsRepository.cancelJob).mockResolvedValue({
        ...sampleJob,
        status: "cancelled" as JobStatus,
      });

      const result = await cancelJob("org1", "job_abc123def456");

      expect(result.success).toBe(true);
      expect(result.job?.status).toBe("cancelled");
    });

    it("should cancel processing job", async () => {
      const processingJob = {
        ...sampleJob,
        status: "processing" as JobStatus,
      };
      vi.mocked(jobsRepository.getJobById).mockResolvedValue(processingJob);
      vi.mocked(jobsRepository.cancelJob).mockResolvedValue({
        ...processingJob,
        status: "cancelled" as JobStatus,
      });

      const result = await cancelJob("org1", "job_abc123def456");

      expect(result.success).toBe(true);
    });

    it("should fail when job not found", async () => {
      vi.mocked(jobsRepository.getJobById).mockResolvedValue(null);

      const result = await cancelJob("org1", "job_nonexistent");

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    it("should fail when job already completed", async () => {
      const completedJob = {
        ...sampleJob,
        status: "completed" as JobStatus,
      };
      vi.mocked(jobsRepository.getJobById).mockResolvedValue(completedJob);

      const result = await cancelJob("org1", "job_abc123def456");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Cannot cancel");
    });

    it("should fail when job already failed", async () => {
      const failedJob = {
        ...sampleJob,
        status: "failed" as JobStatus,
      };
      vi.mocked(jobsRepository.getJobById).mockResolvedValue(failedJob);

      const result = await cancelJob("org1", "job_abc123def456");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Cannot cancel");
    });
  });

  describe("startJob", () => {
    it("should start job and set processing status", async () => {
      const startedJob = {
        ...sampleJob,
        status: "processing" as JobStatus,
        startedAt: new Date(),
        progress: 0,
      };
      vi.mocked(jobsRepository.updateJobStatus).mockResolvedValue(startedJob);

      const result = await startJob("job_abc123def456");

      expect(result?.status).toBe("processing");
      expect(jobsRepository.updateJobStatus).toHaveBeenCalledWith(
        "job_abc123def456",
        "processing",
        expect.objectContaining({
          startedAt: expect.any(Date),
          progress: 0,
        })
      );
    });

    it("should return null when job not found", async () => {
      vi.mocked(jobsRepository.updateJobStatus).mockResolvedValue(null);

      const result = await startJob("job_nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("updateProgress", () => {
    it("should update job progress", async () => {
      const updatedJob = {
        ...sampleJob,
        progress: 50,
        message: "Processing items...",
      };
      vi.mocked(jobsRepository.updateJobProgress).mockResolvedValue(updatedJob);

      const result = await updateProgress(
        "job_abc123def456",
        50,
        "Processing items..."
      );

      expect(result?.progress).toBe(50);
      expect(result?.message).toBe("Processing items...");
    });
  });

  describe("completeJob", () => {
    it("should complete job with result", async () => {
      const completedJob = {
        ...sampleJob,
        status: "completed" as JobStatus,
        progress: 100,
        result: { downloadUrl: "https://example.com/file.zip" },
        completedAt: new Date(),
      };
      vi.mocked(jobsRepository.completeJob).mockResolvedValue(completedJob);

      const result = await completeJob("job_abc123def456", {
        downloadUrl: "https://example.com/file.zip",
      });

      expect(result?.status).toBe("completed");
      expect(result?.result).toEqual({
        downloadUrl: "https://example.com/file.zip",
      });
    });
  });

  describe("failJob", () => {
    it("should fail job with error details", async () => {
      const failedJob = {
        ...sampleJob,
        status: "failed" as JobStatus,
        errorCode: "PROCESSING_ERROR",
        errorMessage: "Failed to process file",
        completedAt: new Date(),
      };
      vi.mocked(jobsRepository.failJob).mockResolvedValue(failedJob);

      const result = await failJob(
        "job_abc123def456",
        "PROCESSING_ERROR",
        "Failed to process file"
      );

      expect(result?.status).toBe("failed");
      expect(result?.errorCode).toBe("PROCESSING_ERROR");
      expect(result?.errorMessage).toBe("Failed to process file");
    });
  });

  describe("createJobHelpers", () => {
    it("should create helper functions for updating progress", async () => {
      vi.mocked(jobsRepository.updateJobProgress).mockResolvedValue(sampleJob);

      const helpers = createJobHelpers("job_abc123def456");
      await helpers.updateProgress(75, "Almost done");

      expect(jobsRepository.updateJobProgress).toHaveBeenCalledWith(
        "job_abc123def456",
        75,
        "Almost done"
      );
    });

    it("should create helper functions for logging", async () => {
      vi.mocked(jobsRepository.updateJobProgress).mockResolvedValue(sampleJob);

      const helpers = createJobHelpers("job_abc123def456");
      await helpers.log("Step 3 complete");

      expect(jobsRepository.updateJobProgress).toHaveBeenCalledWith(
        "job_abc123def456",
        -1,
        "Step 3 complete"
      );
    });
  });
});
