"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import {
  Download,
  Filter,
  History,
  RefreshCw,
  Search,
  ShieldCheck,
  Terminal,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AuditTrailTable } from "@/components/admin/audit-trail-table";
import { apiClient } from "@/lib/api-client";

export default function AuditTrailPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [eventType, setEventType] = useState("");

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["admin", "audit-trail", { page, eventType, search }],
    queryFn: async () => {
      const response = await apiClient.get({
        url: "/v1/audit-logs",
        query: {
          page,
          pageSize: 20,
          eventType: eventType || undefined,
          actorId: search || undefined,
        },
      });

      if (response.error) {
        throw new Error((response.error as { message: string }).message);
      }
      return response.data as {
        data: import("@workspace/contracts").AuditLog[];
        pagination: { total: number };
      };
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post({
        url: "/v1/audit-logs/verify",
      });
      if (response.error) {
        throw new Error((response.error as { message: string }).message);
      }
      return response.data as { status: string; verifiedAt: string };
    },
    onSuccess: (res) => {
      toast.success("Chain Integrity Verified", {
        description: `Verified at ${new Date(res.verifiedAt).toLocaleTimeString()}. No tampering detected.`,
        icon: <ShieldCheck className="h-4 w-4 text-green-500" />,
      });
    },
    onError: () => {
      toast.error("Integrity Check Failed", {
        description: "Potential tampering detected in the audit log chain!",
      });
    },
  });

  const isVerifying = verifyMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
            <History className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-bold text-3xl tracking-tight">Audit Trail</h1>
            <p className="text-muted-foreground">
              Monitor platform-wide activity and verify system integrity.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            className="hidden sm:flex"
            disabled={isVerifying || isLoading}
            onClick={() => verifyMutation.mutate()}
            size="sm"
            variant="outline"
          >
            <ShieldCheck
              className={`mr-2 h-4 w-4 ${isVerifying ? "animate-pulse text-amber-500" : "text-green-500"}`}
            />
            {isVerifying ? "Verifying..." : "Verify Integrity"}
          </Button>
          <Button className="hidden sm:flex" size="sm" variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button
            disabled={isLoading || isRefetching}
            onClick={() => refetch()}
            size="sm"
            variant="secondary"
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </div>

      <Card className="border-border/60 bg-card/50">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 items-center gap-2">
              <div className="relative max-w-sm flex-1">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="bg-background/50 pl-9 focus:bg-background"
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter by Actor ID..."
                  value={search}
                />
              </div>
              <div className="hidden items-center gap-2 sm:flex">
                <Badge
                  className="h-9 px-3 font-normal text-muted-foreground"
                  variant="outline"
                >
                  <Terminal className="mr-2 h-3.5 w-3.5" />
                  Live Stream
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                className="h-9 rounded-md border border-input bg-background/50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                onChange={(e) => setEventType(e.target.value)}
                value={eventType}
              >
                <option value="">All Events</option>
                <option value="policy.added">Policy Added</option>
                <option value="policy.removed">Policy Removed</option>
                <option value="permission.denied">Permission Denied</option>
                <option value="role.assigned">Role Assigned</option>
                <option value="role.removed">Role Removed</option>
              </select>
              <Button className="h-9" size="sm" variant="outline">
                <Filter className="mr-2 h-4 w-4" />
                Advanced
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <AuditTrailTable isLoading={isLoading} logs={data?.data || []} />

          {data?.pagination && data.pagination.total > 20 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-muted-foreground text-sm">
                Showing {Math.min(data.data.length, 20)} of{" "}
                {data.pagination.total} entries
              </p>
              <div className="flex gap-2">
                <Button
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  size="sm"
                  variant="outline"
                >
                  Previous
                </Button>
                <Button
                  disabled={data.data.length < 20}
                  onClick={() => setPage((p) => p + 1)}
                  size="sm"
                  variant="outline"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Context Banner */}
      <div className="flex items-start gap-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="text-sm">
          <p className="font-semibold text-primary">
            Platform Surveillance Active
          </p>
          <p className="text-muted-foreground">
            You are viewing the global audit trail. Every action across every
            organization is being tracked and cryptographically chained. Tamper
            detection is enabled by default.
          </p>
        </div>
      </div>
    </div>
  );
}
