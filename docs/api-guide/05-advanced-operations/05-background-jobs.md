# Background Jobs and Scheduling

This project uses a robust background job system powered by [pg-boss](https://github.com/timgit/pg-boss). It supports both **User Jobs** (tracked in the database, organization-scoped) and **System Jobs** (maintenance tasks, cron-triggered).

## Concepts

### User Jobs
User jobs are tasks initiated by users or system events that are tracked in the `jobs` database table.
*   **Scoped**: Belong to an Organization (`orgId`) and a User (`createdBy`).
*   **Tracked**: Status (pending, processing, completed, failed) is persisted in DB.
*   **Visibility**: Can be queried via API (`/v1/orgs/:orgId/jobs`).
*   **Examples**: Report generation, bulk imports, large file processing.

### System Jobs
System jobs are maintenance tasks that run in the background, usually triggered by a schedule.
*   **Unscoped**: Do not belong to any specific organization.
*   **Ephemeral**: Do not create a record in the `jobs` table (logging is done via stdout/stderr).
*   **Examples**: Storage cleanup, subscription monitoring, database maintenance.

### Scheduling
There are two ways to schedule jobs:
1.  **System Schedules**: Defined in code (e.g., `app.ts`), recurring via cron expressions.
2.  **User Schedules**: Defined in the `scheduled_jobs` table by users, managed by the `Scheduler` service.

---

## Creating a New Job Type

### 1. Define the Handler
Create a new handler in `apps/api/src/modules/jobs/handlers/`.

```typescript
import { jobHandlerRegistry } from "./registry";
import type { JobContext, JobResult } from "./types";

const JOB_TYPE = "my-feature:process";

async function myHandler(context: JobContext): Promise<JobResult> {
  const { jobId, input, helpers } = context;

  await helpers.updateProgress(0, "Starting processing...");

  // Do work...
  const result = await doHeavyWork(input);

  await helpers.updateProgress(100, "Done!");

  return {
    output: { result }
  };
}

export function registerMyHandler() {
  jobHandlerRegistry.register({
    type: JOB_TYPE,
    handler: myHandler,
    concurrency: 5, // Optional
  });
}
```

### 2. Register the Handler
Import and call the register function in `apps/api/src/modules/jobs/index.ts` (or wherever you initialize modules).

```typescript
// apps/api/src/modules/jobs/index.ts
export { registerMyHandler } from "./handlers/my-handler";
```

And call it in `apps/api/src/app.ts`:

```typescript
// apps/api/src/app.ts
import { registerMyHandler } from "./modules/jobs";

// ...
registerMyHandler();
// ...
```

---

## Triggering Jobs

### Enqueue a User Job
Use the `jobsService` to create and enqueue a job.

```typescript
import { jobsService } from "../modules/jobs";

await jobsService.createAndEnqueueJob({
  orgId: "org_123",
  type: "my-feature:process",
  createdBy: "user_456",
  input: { fileId: "file_789" }
});
```

### Schedule a System Job
System jobs are scheduled during application startup in `apps/api/src/app.ts`.

```typescript
// apps/api/src/app.ts

// ...
// Schedule storage cleanup every hour
await jobQueue.schedule("storage:cleanup", "0 * * * *");
// ...
```

**Note on System Jobs**: Since they are not backed by a database record, the `jobId` in the context will be prefixed with `system_` and `orgId` will be `"system"`. The `helpers.updateProgress` functions will log to console instead of updating the database.

---

## Managing Schedules

### User-Defined Schedules
The `Scheduler` service (`apps/api/src/modules/schedules/services/scheduler.ts`) polls the `scheduled_jobs` table every minute.
*   Users can create schedules via the API.
*   When a schedule is due, the Scheduler creates a **User Job** and enqueues it.
*   Supported frequencies: Daily, Weekly, Monthly.

### Storage Cleanup Example
The `storage:cleanup` job is a prime example of a System Job.
1.  **Handler**: `apps/api/src/modules/jobs/handlers/storage-cleanup.handler.ts`
2.  **Logic**: Cleans up expired uploads and temporary files.
3.  **Schedule**: Scheduled in `app.ts` to run hourly.
4.  **Execution**: `pg-boss` triggers the job -> `job-queue.ts` detects missing `jobId` -> calls `processSystemJob` -> executes handler with mock context.

---

## Architecture & Support

### Storage Providers
The job system (specifically file-related jobs like `storage:cleanup`) is designed to be **provider-agnostic**.
*   **Local Storage**: Fully supported (uses `unlink`).
*   **S3 / R2 / MinIO**: Fully supported (uses `DeleteObject`).
The `filesService` abstracts the underlying storage provider, ensuring jobs work consistently across all environments (local dev vs production).

### API & Contracts
The Jobs API follows the project's contract-first design:
*   **Definition**: API is defined in `packages/contracts/spec/routes/jobs.tsp`.
*   **Server**: `apps/api` implements these endpoints using generated types (`CreateJobRequest`, `JobResponse`) to ensure type safety.
*   **Client**: `apps/web` consumes the API using the generated type-safe SDK (`packages/contracts/client`).

### Job Definitions
*   **Handlers**: Logic is always **defined in code** (`apps/api/src/modules/jobs/handlers/`).
*   **System Schedules**: Recurring maintenance tasks are **defined in code** (`apps/api/src/app.ts`).
*   **User Schedules**: Dynamic user-created schedules are **defined in the database** (`scheduled_jobs` table).
