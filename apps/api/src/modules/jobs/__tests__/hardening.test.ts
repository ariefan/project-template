import { JobType } from "@workspace/contracts/jobs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Events, eventBus } from "../../../lib/events";
import * as jobsService from "../services/jobs.service";

// Mock dependencies
vi.mock("../repositories/jobs.repository", () => ({
  createJob: vi.fn(async (data) => ({ ...data, createdAt: new Date() })),
  updateJobStatus: vi.fn(),
  getJobById: vi.fn(),
}));

describe("Job System Hardening", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should validate job input against registered Zod schemas", async () => {
    // Attempt to create a job with invalid input
    const invalidInput = {
      orgId: "org_123",
      type: JobType.POKEAPI_TEST,
      createdBy: "user_123",
      input: {
        pages: "not a number", // Should be a number
      },
    };

    await expect(jobsService.createJob(invalidInput as any)).rejects.toThrow(
      /Invalid job input for type "dev:pokeapi-test"/
    );
  });

  it("should allow creating a job with valid input", async () => {
    const validInput = {
      orgId: "org_123",
      type: JobType.POKEAPI_TEST,
      createdBy: "user_123",
      input: {
        pages: 5,
        pageSize: 10,
      },
    };

    const job = await jobsService.createJob(validInput);
    expect(job).toBeDefined();
    expect(job.type).toBe(JobType.POKEAPI_TEST);
  });
});

describe("Internal Event Bus", () => {
  it("should trigger subscribers when events are emitted", async () => {
    const callback = vi.fn();
    eventBus.onEvent(Events.ORG_CREATED, callback);

    const payload = { id: "org_123", name: "Acme Corp" };
    eventBus.emitEvent(Events.ORG_CREATED, payload);

    expect(callback).toHaveBeenCalledWith(payload);
  });
});
