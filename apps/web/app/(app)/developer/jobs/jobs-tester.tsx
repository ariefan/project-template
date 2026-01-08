"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Job, JobStatus, ReportTemplate } from "@workspace/contracts";
import {
  jobsCancel,
  jobsList,
  jobsRetry,
  reportTemplatesList,
  reportTemplatesTest,
} from "@workspace/contracts";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import { formatDistanceToNow } from "date-fns";
import type { LucideIcon } from "lucide-react";
import {
  CheckCircle,
  Clock,
  Code2,
  FileSpreadsheet,
  FlaskConical,
  Loader2,
  Play,
  RefreshCw,
  StopCircle,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { apiClient } from "@/lib/api-client";
import { useActiveOrganization } from "@/lib/auth";
import { env } from "@/lib/env";

const STATUS_COLORS: Record<JobStatus, string> = {
  pending: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  processing: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  completed:
    "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
  failed: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
  cancelled:
    "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200",
};

const STATUS_ICONS: Record<JobStatus, LucideIcon> = {
  pending: Clock,
  processing: Loader2,
  completed: CheckCircle,
  failed: XCircle,
  cancelled: XCircle,
};

type JobTab = "report" | "test";

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Developer tool with complex UI logic
export function JobsTester() {
  const queryClient = useQueryClient();
  const { data: orgData } = useActiveOrganization();
  const orgId = orgData?.id ?? "";
  const [activeTab, setActiveTab] = useState<JobTab>("report");

  // Report job state
  const [selectedTemplateId, setTemplateId] = useState<string>("");

  // Test job state
  const [testPages, setTestPages] = useState(20);
  const [testPageSize, setTestPageSize] = useState(40);
  const [testSource, setTestSource] = useState<
    "pokemon" | "ability" | "move" | "type" | "berry"
  >("pokemon");
  const [failAtPage, setFailAtPage] = useState<number | undefined>(undefined);

  // Fetch templates
  const { data: templatesData } = useQuery<ReportTemplate[]>({
    queryKey: ["reportTemplates", orgId],
    queryFn: async () => {
      const response = await reportTemplatesList({
        client: apiClient,
        path: { orgId },
        query: { pageSize: 50 },
      });
      // Return data array directly, handling ErrorResponse case
      const responseData = response.data as unknown;
      if (
        responseData &&
        typeof responseData === "object" &&
        "data" in responseData
      ) {
        return (responseData as { data?: ReportTemplate[] }).data ?? [];
      }
      return [];
    },
    enabled: Boolean(orgId) && activeTab === "report",
  });

  const templates = templatesData ?? [];
  // Set first template as default
  if (templates.length > 0 && !selectedTemplateId) {
    setTemplateId(templates[0]?.id ?? "");
  }

  // Fetch recent jobs (limited to 5)
  const { data: jobsData, refetch: refetchJobs } = useQuery({
    queryKey: ["jobsList", orgId, "recent"],
    queryFn: async () => {
      const response = await jobsList({
        client: apiClient,
        path: { orgId },
        query: { page: 1, pageSize: 5 },
      });
      return response.data as { data?: Job[] };
    },
    enabled: Boolean(orgId),
    refetchInterval: 3000,
  });

  // Report job mutation
  const reportMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTemplateId) {
        throw new Error("No template selected");
      }
      return await reportTemplatesTest({
        client: apiClient,
        path: { orgId, templateId: selectedTemplateId },
        body: {
          parameters: {
            demo: true,
            timestamp: new Date().toISOString(),
          },
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobsList", orgId] });
    },
  });

  // Test job mutation (using raw request since SDK doesn't have this endpoint yet)
  const testMutation = useMutation<Job, Error>({
    mutationFn: async () => {
      const response = await apiClient.request({
        method: "POST",
        url: `/v1/orgs/${orgId}/jobs/test`,
        body: {
          pages: testPages,
          pageSize: testPageSize,
          source: testSource,
          failAtPage,
        },
      });
      // The response is { data: Job, meta: {...} } or { error, ... }
      const responseData = response as unknown;
      if (
        responseData &&
        typeof responseData === "object" &&
        "data" in responseData
      ) {
        return (responseData as { data: Job }).data;
      }
      throw new Error("Unexpected response format");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobsList", orgId] });
    },
  });

  // Cancel job mutation
  const cancelMutation = useMutation({
    mutationFn: async (jobId: string) => {
      return await jobsCancel({
        client: apiClient,
        path: { orgId, jobId },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobsList", orgId] });
    },
  });

  // Retry job mutation
  const retryMutation = useMutation({
    mutationFn: async (jobId: string) => {
      return await jobsRetry({
        client: apiClient,
        path: { orgId, jobId },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobsList", orgId] });
    },
  });

  const jobs = jobsData?.data ?? [];

  const reportCodeExample = `import { reportTemplatesTest } from "@workspace/contracts";
import { apiClient } from "@/lib/api-client";

// Trigger a test report generation
await reportTemplatesTest({
  client: apiClient,
  path: {
    orgId: "${orgId}",
    templateId: "${selectedTemplateId}"
  },
  body: {
    parameters: { demo: true },
  },
});`;

  const testCodeExample = `import { apiClient } from "@/lib/api-client";

// Create a test job that fetches real data from PokéAPI
const response = await apiClient.request({
  method: "POST",
  url: "/v1/orgs/${orgId}/jobs/test",
  body: {
    source: "${testSource}",     // pokemon | ability | move | berry | type
    pages: ${testPages},         // Number of pages to fetch
    pageSize: ${testPageSize},   // Items per page (max 100)
    failAtPage: ${failAtPage ?? "undefined"},  // Optional: fail at this page
  },
});

const job = response.data;`;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <Tabs
          defaultValue="report"
          onValueChange={(v) => setActiveTab(v as JobTab)}
          value={activeTab}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger className="gap-2" value="report">
              <FileSpreadsheet className="size-4" />
              Report Jobs
            </TabsTrigger>
            <TabsTrigger className="gap-2" value="test">
              <FlaskConical className="size-4" />
              Test Jobs
            </TabsTrigger>
          </TabsList>

          {/* Report Jobs Tab */}
          <TabsContent className="space-y-4" value="report">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="size-5 text-primary" />
                  Trigger Report Job
                </CardTitle>
                <CardDescription>
                  Generate reports using real templates
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {templates.length === 0 ? (
                  <div className="rounded-lg bg-yellow-50 p-3 text-center text-sm text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200">
                    No templates found. Create a report template first.
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="template">Template</Label>
                      <Select
                        defaultValue={selectedTemplateId}
                        onValueChange={setTemplateId}
                        value={selectedTemplateId}
                      >
                        <SelectTrigger className="w-full" id="template">
                          <SelectValue placeholder="Select a template" />
                        </SelectTrigger>
                        <SelectContent>
                          {templates.map((t: ReportTemplate) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name} ({t.format})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      className="w-full"
                      disabled={
                        reportMutation.isPending ||
                        !orgId ||
                        !selectedTemplateId
                      }
                      onClick={() => reportMutation.mutate()}
                    >
                      <FileSpreadsheet className="mr-2 size-4" />
                      Generate Report
                    </Button>
                  </>
                )}

                {reportMutation.isSuccess && (
                  <div className="rounded-lg bg-green-50 p-3 text-center text-green-800 text-sm dark:bg-green-950 dark:text-green-200">
                    Report job created successfully! Check recent jobs.
                  </div>
                )}

                {reportMutation.isError && (
                  <div className="rounded-lg bg-red-50 p-3 text-center text-red-800 text-sm dark:bg-red-950 dark:text-red-200">
                    Failed to create report job.{" "}
                    {(reportMutation.error as Error)?.message ??
                      "Check console for details."}
                  </div>
                )}
              </CardContent>
            </Card>

            {selectedTemplateId && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Code2 className="size-5 text-primary" />
                    Code Example
                  </CardTitle>
                  <CardDescription>
                    TypeScript code for this request
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-xs">
                    <code>{reportCodeExample}</code>
                  </pre>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Test Jobs Tab */}
          <TabsContent className="space-y-4" value="test">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FlaskConical className="size-5 text-primary" />
                  Create Test Job
                </CardTitle>
                <CardDescription>
                  Fetch real data from PokéAPI (1000+ entries) - network I/O
                  creates natural delay
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="source">Data Source</Label>
                    <Select
                      defaultValue={testSource}
                      onValueChange={(v) =>
                        setTestSource(
                          v as "pokemon" | "ability" | "move" | "type" | "berry"
                        )
                      }
                      value={testSource}
                    >
                      <SelectTrigger className="w-full" id="source">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pokemon">Pokémon (1302)</SelectItem>
                        <SelectItem value="ability">Abilities (361)</SelectItem>
                        <SelectItem value="move">Moves (1010)</SelectItem>
                        <SelectItem value="berry">Berries (1025)</SelectItem>
                        <SelectItem value="type">Types (21)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="failAtPage">Fail At Page (optional)</Label>
                    <Input
                      id="failAtPage"
                      min="1"
                      onChange={(e) =>
                        setFailAtPage(
                          e.target.value
                            ? Number.parseInt(e.target.value, 10)
                            : undefined
                        )
                      }
                      placeholder="e.g. 3 to fail at page 3"
                      type="number"
                      value={failAtPage ?? ""}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pages">Pages</Label>
                    <Input
                      id="pages"
                      max="50"
                      min="1"
                      onChange={(e) =>
                        setTestPages(Number.parseInt(e.target.value, 10) || 20)
                      }
                      type="number"
                      value={testPages}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pageSize">Page Size</Label>
                    <Input
                      id="pageSize"
                      max="100"
                      min="1"
                      onChange={(e) =>
                        setTestPageSize(
                          Number.parseInt(e.target.value, 10) || 40
                        )
                      }
                      type="number"
                      value={testPageSize}
                    />
                  </div>
                </div>

                <Button
                  className="w-full"
                  disabled={testMutation.isPending || !orgId}
                  onClick={() => testMutation.mutate()}
                >
                  <FlaskConical className="mr-2 size-4" />
                  Start Test Job
                </Button>

                {testMutation.isSuccess && (
                  <div className="rounded-lg bg-green-50 p-3 text-center text-green-800 text-sm dark:bg-green-950 dark:text-green-200">
                    Test job created successfully!
                  </div>
                )}

                {testMutation.isError && (
                  <div className="rounded-lg bg-red-50 p-3 text-center text-red-800 text-sm dark:bg-red-950 dark:text-red-200">
                    Failed to create test job.{" "}
                    {(testMutation.error as Error)?.message ??
                      "Check console for details."}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code2 className="size-5 text-primary" />
                  Code Example
                </CardTitle>
                <CardDescription>
                  TypeScript code for this request
                </CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-xs">
                  <code>{testCodeExample}</code>
                </pre>
              </CardContent>
            </Card>

            <div className="rounded-lg border bg-muted/50 p-3 text-muted-foreground text-xs">
              <p className="mb-1 font-medium">
                Test jobs fetch real data from PokéAPI:
              </p>
              <ul className="list-inside list-disc space-y-1">
                <li>
                  Pages: {testPages} × {testPageSize} items = ~
                  {testPages * testPageSize} records
                </li>
                <li>PokéAPI has 1000+ entries for realistic testing</li>
                <li>Real network I/O creates natural delay (no fake sleeps)</li>
                <li>Progress updates show actual fetch progress</li>
                <li>View fetched sample data in job output</li>
              </ul>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Recent Jobs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="size-5 text-primary" />
                Recent Jobs
              </CardTitle>
              <CardDescription>
                Latest {jobs.length} job{jobs.length !== 1 ? "s" : ""}{" "}
                (auto-refreshes every 3s). View all in the{" "}
                <Link className="font-medium underline" href="/jobs">
                  Jobs
                </Link>{" "}
                page.
              </CardDescription>
            </div>
            <Button
              disabled={jobsData === undefined}
              onClick={() => refetchJobs()}
              size="icon"
              variant="outline"
            >
              <RefreshCw
                className="size-4"
                style={{
                  animation:
                    jobsData === undefined ? "spin 1s linear infinite" : "",
                }}
              />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {jobs.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No recent jobs found. Create a job to see it appear here.
              </div>
            ) : (
              <div className="space-y-2">
                {/* biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex job item rendering */}
                {jobs.map((job) => {
                  const StatusIcon = STATUS_ICONS[job.status];
                  const isRunning =
                    job.status === "pending" || job.status === "processing";
                  const canRetry = job.status === "failed";
                  const canCancel = isRunning;

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
                        <div className="flex flex-wrap items-center gap-2">
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
                          {job.error && (
                            <Badge variant="destructive">
                              {job.error.code}
                            </Badge>
                          )}
                        </div>
                        <p className="text-muted-foreground text-xs">
                          {formatDistanceToNow(new Date(job.createdAt), {
                            addSuffix: true,
                          })}
                          {job.message && ` · ${job.message}`}
                        </p>
                        {job.progress !== undefined && (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">
                                Progress
                              </span>
                              <span className="text-muted-foreground">
                                {job.progress}%
                              </span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full bg-primary transition-all"
                                style={{ width: `${job.progress}%` }}
                              />
                            </div>
                          </div>
                        )}
                        {job.error && (
                          <p className="text-destructive text-xs">
                            {job.error.message}
                          </p>
                        )}
                        {job.completedAt && job.output && (
                          <>
                            <p className="text-muted-foreground text-xs">
                              Completed in{" "}
                              {formatDistanceToNow(
                                new Date(job.startedAt ?? job.createdAt),
                                { addSuffix: false }
                              )}
                            </p>
                            {/* Show output details for test jobs */}
                            {job.type === "test" &&
                              "result" in job.output &&
                              "sample" in job.output && (
                                <details className="group mt-2">
                                  <summary className="cursor-pointer font-medium text-muted-foreground text-xs hover:text-foreground">
                                    View fetched data{" "}
                                    <span className="text-muted-foreground">
                                      ({Number(job.output.recordsFetched ?? 0)}{" "}
                                      records)
                                    </span>
                                  </summary>
                                  <div className="mt-2 space-y-2 rounded-lg bg-muted/50 p-2">
                                    {"source" in job.output && (
                                      <div className="flex items-center gap-2 text-xs">
                                        <span className="text-muted-foreground">
                                          Source:
                                        </span>
                                        <Badge variant="secondary">
                                          {String(job.output.source)}
                                        </Badge>
                                      </div>
                                    )}
                                    {"duration" in job.output && (
                                      <div className="text-muted-foreground text-xs">
                                        Duration:{" "}
                                        {formatDistanceToNow(
                                          new Date(
                                            Date.now() -
                                              (Number(job.output.duration) ?? 0)
                                          ),
                                          { addSuffix: false }
                                        )}
                                      </div>
                                    )}
                                    {"sample" in job.output &&
                                      Array.isArray(job.output.sample) &&
                                      job.output.sample.length > 0 && (
                                        <div className="space-y-1">
                                          <p className="text-muted-foreground text-xs">
                                            Sample data (first{" "}
                                            {job.output.sample.length} items):
                                          </p>
                                          <pre className="overflow-x-auto rounded bg-background p-2 text-[10px]">
                                            {JSON.stringify(
                                              job.output.sample,
                                              null,
                                              2
                                            )}
                                          </pre>
                                        </div>
                                      )}
                                  </div>
                                </details>
                              )}
                            {/* Show output details for report jobs */}
                            {job.type === "report" &&
                              "filePath" in job.output &&
                              "fileSize" in job.output && (
                                <details
                                  className="group mt-2"
                                  onToggle={(e) => {
                                    if (
                                      !(e.currentTarget as HTMLDetailsElement)
                                        .open
                                    ) {
                                      e.preventDefault();
                                    }
                                  }}
                                  open
                                >
                                  <summary className="cursor-pointer font-medium text-muted-foreground text-xs hover:text-foreground">
                                    View file details
                                  </summary>
                                  <div className="mt-2 space-y-2 rounded-lg bg-muted/50 p-2">
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                      <div>
                                        <span className="text-muted-foreground">
                                          Rows:
                                        </span>{" "}
                                        {Number(
                                          job.output.rowCount ?? 0
                                        ).toLocaleString()}
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">
                                          Size:
                                        </span>{" "}
                                        {Number(
                                          job.output.fileSize ?? 0
                                        ).toLocaleString()}{" "}
                                        bytes
                                      </div>
                                    </div>
                                    <a
                                      className="inline-flex items-center gap-1 text-primary text-xs hover:underline"
                                      href={`${env.NEXT_PUBLIC_API_URL}/v1/orgs/${orgId}/jobs/${job.jobId}/download`}
                                      rel="noopener"
                                      target="_blank"
                                    >
                                      <FileSpreadsheet className="size-3" />
                                      Download {job.metadata?.format || "file"}
                                    </a>
                                  </div>
                                </details>
                              )}
                          </>
                        )}
                        {/* Action buttons */}
                        {(canCancel || canRetry) && (
                          <div className="flex gap-2 pt-1">
                            {canCancel && (
                              <Button
                                className="h-7 text-xs"
                                disabled={cancelMutation.isPending}
                                onClick={() => cancelMutation.mutate(job.jobId)}
                                size="sm"
                                variant="outline"
                              >
                                <StopCircle className="mr-1 size-3" />
                                Cancel
                              </Button>
                            )}
                            {canRetry && (
                              <Button
                                className="h-7 text-xs"
                                disabled={retryMutation.isPending}
                                onClick={() => retryMutation.mutate(job.jobId)}
                                size="sm"
                                variant="outline"
                              >
                                <RefreshCw className="mr-1 size-3" />
                                Retry
                              </Button>
                            )}
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
