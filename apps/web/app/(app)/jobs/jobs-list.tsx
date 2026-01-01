"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Job, JobStatus } from "@workspace/contracts";
import {
  jobsCancelMutation,
  jobsListOptions,
} from "@workspace/contracts/query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Progress } from "@workspace/ui/components/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { formatDistanceToNow } from "date-fns";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Cog,
  Loader2,
  MoreHorizontal,
  PlayCircle,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { apiClient } from "@/lib/api-client";
import { useActiveOrganization } from "@/lib/auth";

const STATUS_COLORS: Record<JobStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  processing: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-800",
};

function getStatusIcon(status: JobStatus) {
  switch (status) {
    case "pending":
      return <Clock className="h-4 w-4 text-yellow-500" />;
    case "processing":
      return <PlayCircle className="h-4 w-4 text-blue-500" />;
    case "completed":
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case "failed":
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    case "cancelled":
      return <XCircle className="h-4 w-4 text-gray-500" />;
    default:
      return null;
  }
}

export function JobsList() {
  const queryClient = useQueryClient();
  const { data: orgData } = useActiveOrganization();
  const orgId = orgData?.id ?? "";

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<JobStatus | "all">("all");
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    ...jobsListOptions({
      client: apiClient,
      path: { orgId },
      query: {
        page,
        pageSize: 20,
        status: statusFilter === "all" ? undefined : statusFilter,
      },
    }),
    enabled: Boolean(orgId),
    refetchInterval: 5000, // Auto-refresh every 5 seconds for active jobs
  });

  const cancelMutation = useMutation({
    ...jobsCancelMutation({ client: apiClient }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobsList"] });
      setCancelTarget(null);
    },
  });

  function handleCancelConfirm() {
    if (cancelTarget) {
      cancelMutation.mutate({ path: { orgId, jobId: cancelTarget } });
    }
  }

  function canCancel(status: JobStatus): boolean {
    return status === "pending" || status === "processing";
  }

  const jobs = (data as { data?: Job[] })?.data ?? [];
  const pagination = (
    data as {
      pagination?: {
        totalPages: number;
        hasNext: boolean;
        hasPrevious: boolean;
        totalCount: number;
      };
    }
  )?.pagination;

  function renderContent() {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (error) {
      console.error("Jobs loading error:", error);
      return (
        <div className="py-12 text-center text-destructive">
          Failed to load jobs:{" "}
          {error instanceof Error ? error.message : "Unknown error"}
        </div>
      );
    }

    if (jobs.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Cog className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">No background jobs found</p>
          <p className="mt-1 text-muted-foreground text-sm">
            Jobs will appear here when asynchronous operations are triggered
          </p>
        </div>
      );
    }

    return (
      <>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.map((job) => (
              <TableRow key={job.jobId}>
                <TableCell className="font-medium">{job.type}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(job.status)}
                    <Badge
                      className={STATUS_COLORS[job.status]}
                      variant="secondary"
                    >
                      {job.status}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  {job.progress !== undefined ? (
                    <div className="flex items-center gap-2">
                      <Progress className="w-[60px]" value={job.progress} />
                      <span className="text-muted-foreground text-sm">
                        {job.progress}%
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="max-w-[200px] truncate text-muted-foreground">
                  {job.message ?? job.error?.message ?? "-"}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {formatDistanceToNow(new Date(job.createdAt), {
                    addSuffix: true,
                  })}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {canCancel(job.status) && (
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setCancelTarget(job.jobId)}
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Cancel Job
                        </DropdownMenuItem>
                      )}
                      {!canCancel(job.status) && (
                        <DropdownMenuItem disabled>
                          <span className="text-muted-foreground">
                            No actions available
                          </span>
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {pagination && (
          <div className="mt-4 flex items-center justify-between">
            <div className="text-muted-foreground text-sm">
              Page {page} of {pagination.totalPages} ({pagination.totalCount}{" "}
              jobs)
            </div>
            <div className="flex gap-2">
              <Button
                disabled={!pagination.hasPrevious}
                onClick={() => setPage((p) => p - 1)}
                size="sm"
                variant="outline"
              >
                Previous
              </Button>
              <Button
                disabled={!pagination.hasNext}
                onClick={() => setPage((p) => p + 1)}
                size="sm"
                variant="outline"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Cog className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>Background Jobs</CardTitle>
                <CardDescription>
                  Monitor and manage asynchronous operations
                </CardDescription>
              </div>
            </div>
            <Button onClick={() => refetch()} size="sm" variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-4">
            <Select
              onValueChange={(value) => {
                setStatusFilter(value as JobStatus | "all");
                setPage(1);
              }}
              value={statusFilter}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {renderContent()}
        </CardContent>
      </Card>

      <AlertDialog
        onOpenChange={(open) => !open && setCancelTarget(null)}
        open={Boolean(cancelTarget)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Job</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this job? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Running</AlertDialogCancel>
            <AlertDialogAction
              disabled={cancelMutation.isPending}
              onClick={handleCancelConfirm}
            >
              {cancelMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Cancel Job
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
