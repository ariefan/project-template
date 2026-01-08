"use client";

import { Badge } from "@workspace/ui/components/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/layouts/page-header";
import { JobsTester } from "./jobs-tester";

export default function DeveloperJobsPage() {
  const [guideOpen, setGuideOpen] = useState(true);

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <PageHeader
        description="Demonstrate the job queue system with real async jobs - create report jobs from templates or run configurable test jobs with live progress tracking."
        title="Jobs Demo"
      />

      {/* How to Create Jobs Guide */}
      <Collapsible onOpenChange={setGuideOpen} open={guideOpen}>
        <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors hover:bg-muted/50">
          <div className="flex items-center gap-2">
            {guideOpen ? (
              <ChevronDown className="size-4" />
            ) : (
              <ChevronRight className="size-4" />
            )}
            <span className="font-semibold">How to Create Your Own Jobs</span>
            <Badge className="text-xs" variant="secondary">
              Backend
            </Badge>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Step 1: Create a Job Handler
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground text-sm">
                Create a file in{" "}
                <code>apps/api/src/modules/jobs/handlers/</code>:
              </p>
              <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-xs">
                {`// my-job.handler.ts
import { jobHandlerRegistry } from "./registry";
import type { JobContext, JobResult } from "./types";

async function handleMyJob(context: JobContext): Promise<JobResult> {
  const { jobId, input, helpers } = context;
  const { someParam } = input;

  // Update progress
  await helpers.updateProgress(0, "Starting...");

  // Do your work here...
  await helpers.updateProgress(50, "Processing...");

  // Return result
  return {
    output: {
      result: "Job completed!",
      data: someParam,
    },
  };
}

// Register the handler
jobHandlerRegistry.register({
  type: "my-job",           // Job type name
  handler: handleMyJob,     // Handler function
  concurrency: 3,           // Max concurrent jobs
  retryLimit: 2,            // Retry on failure
  expireInSeconds: 600,     // Job expires after 10 min
});`}
              </pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Step 2: Register on App Startup
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground text-sm">
                In <code>apps/api/src/app.ts</code>, import and call your
                register function:
              </p>
              <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-xs">
                {`import { registerMyJobHandler } from "./modules/jobs/handlers/my-job.handler";

// In your job initialization section
registerMyJobHandler();`}
              </pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Step 3: Trigger Jobs from Frontend
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground text-sm">
                Create a job using the jobs service:
              </p>
              <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-xs">
                {`import { apiClient } from "@/lib/api-client";

const response = await apiClient.request({
  method: "POST",
  url: \`/v1/orgs/\${orgId}/jobs/test\`,
  body: {
    pages: 20,
    pageSize: 40,
    source: "pokemon",
  },
});

// Returns: { jobId, status, statusUrl }
const { jobId, status } = response.data;`}
              </pre>
              <div className="rounded-lg bg-blue-50 p-3 text-blue-800 text-sm dark:bg-blue-950 dark:text-blue-200">
                <strong>Tip:</strong> Job types are free-form text. You can
                create any type like <code>import</code>, <code>export</code>,{" "}
                <code>email</code>, <code>cleanup</code>, etc.
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      <JobsTester />
    </div>
  );
}
