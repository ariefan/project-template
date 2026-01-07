"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Job, JobStatus } from "@workspace/contracts";
import { jobsList, reportTemplatesTest } from "@workspace/contracts";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { formatDistanceToNow } from "date-fns";
import type { LucideIcon } from "lucide-react";
import {
  CheckCircle,
  Clock,
  Code2,
  FileSpreadsheet,
  Loader2,
  Play,
  RefreshCw,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { apiClient } from "@/lib/api-client";
import { useActiveOrganization } from "@/lib/auth";

const STATUS_COLORS: Record<JobStatus, string> = {
  pending: "bg-gray-100 text-gray-800",
  processing: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  cancelled: "bg-orange-100 text-orange-800",
};

const STATUS_ICONS: Record<JobStatus, LucideIcon> = {
  pending: Clock,
  processing: Loader2,
  completed: CheckCircle,
  failed: XCircle,
  cancelled: XCircle,
};

export function JobsTester() {
  const queryClient = useQueryClient();
  const { data: orgData } = useActiveOrganization();
  const orgId = orgData?.id ?? "";
  const [templateId, setTemplateId] = useState("template-1");

  // Fetch recent jobs (unified endpoint)
  const { data: jobsData } = useQuery({
    queryKey: ["jobsList", orgId, "recent"],
    queryFn: async () => {
      const response = await jobsList({
        client: apiClient,
        path: { orgId },
        query: { page: 1, pageSize: 10 },
      });
      return response.data as { data?: Job[] };
    },
    enabled: Boolean(orgId),
    refetchInterval: 3000,
  });

  const testReportMutation = useMutation({
    mutationFn: async () => {
      return await reportTemplatesTest({
        client: apiClient,
        path: { orgId, templateId },
        body: {
          parameters: { demo: true, timestamp: new Date().toISOString() },
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["jobsList", orgId],
      });
    },
  });

  const jobs = jobsData?.data ?? [];

  const codeExample = `import { reportTemplatesTest } from "@workspace/contracts";
import { apiClient } from "@/lib/api-client";

// Trigger a test report generation
await reportTemplatesTest({
  client: apiClient,
  path: {
    orgId: "${orgId}",
    templateId: "${templateId}"
  },
  body: {
    parameters: { demo: true },
  },
});`;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="size-5 text-primary" />
              Trigger Test Report Job
            </CardTitle>
            <CardDescription>
              Demonstrate how to generate reports via the API
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template">Template ID</Label>
              <Select onValueChange={setTemplateId} value={templateId}>
                <SelectTrigger id="template">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="template-1">Template 1</SelectItem>
                  <SelectItem value="template-2">Template 2</SelectItem>
                  <SelectItem value="template-3">Template 3</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              className="w-full"
              disabled={testReportMutation.isPending || !orgId}
              onClick={() => testReportMutation.mutate()}
            >
              <FileSpreadsheet className="mr-2 size-4" />
              Generate Test Report
            </Button>

            {testReportMutation.isSuccess && (
              <div className="rounded-lg bg-green-50 p-3 text-center text-green-800 text-sm dark:bg-green-950 dark:text-green-200">
                Report job created successfully! Check the recent jobs below.
              </div>
            )}

            {testReportMutation.isError && (
              <div className="rounded-lg bg-red-50 p-3 text-center text-red-800 text-sm dark:bg-red-950 dark:text-red-200">
                Failed to create report job. Check console for details.
              </div>
            )}

            <div className="rounded-lg border bg-muted/50 p-3 text-muted-foreground text-xs">
              <p className="mb-1 font-medium">Note:</p>
              <p>
                Test reports are processed asynchronously using the template's
                configured format. The job will appear in the list below and you
                can monitor its progress in real-time.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code2 className="size-5 text-primary" />
              Code Example
            </CardTitle>
            <CardDescription>
              TypeScript code to trigger report generation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-xs">
              <code>{codeExample}</code>
            </pre>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="size-5 text-primary" />
            Recent Jobs
          </CardTitle>
          <CardDescription>
            Latest jobs (auto-refreshes every 3s). View all in the{" "}
            <Link className="font-medium underline" href="/jobs">
              Jobs
            </Link>{" "}
            page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {jobs.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No recent jobs found. Generate a test report to see it appear
                here.
              </div>
            ) : (
              <div className="space-y-2">
                {jobs.map((job) => {
                  const StatusIcon = STATUS_ICONS[job.status];
                  return (
                    <div
                      className="flex items-start gap-3 rounded-lg border p-3"
                      key={job.jobId}
                    >
                      <StatusIcon
                        className={`size-5 shrink-0 ${
                          job.status === "processing" ? "animate-spin" : ""
                        }`}
                      />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge
                            className={STATUS_COLORS[job.status]}
                            variant="secondary"
                          >
                            {job.status}
                          </Badge>
                          <span className="font-medium text-sm">
                            {job.type}
                          </span>
                          {job.metadata?.format && (
                            <Badge variant="outline">
                              {job.metadata.format}
                            </Badge>
                          )}
                        </div>
                        <p className="text-muted-foreground text-xs">
                          {formatDistanceToNow(new Date(job.createdAt), {
                            addSuffix: true,
                          })}
                        </p>
                        {job.progress !== undefined && (
                          <div className="space-y-1">
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full bg-primary transition-all"
                                style={{ width: `${job.progress}%` }}
                              />
                            </div>
                            <p className="text-muted-foreground text-xs">
                              {job.progress}%
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
