"use client";

import type { AuditLog } from "@workspace/contracts";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { format } from "date-fns";
import {
  AlertTriangle,
  Eye,
  Fingerprint,
  Globe,
  Info,
  Shield,
  User,
} from "lucide-react";

interface AuditTrailTableProps {
  logs: AuditLog[];
  isLoading?: boolean;
}

export function AuditTrailTable({ logs, isLoading }: AuditTrailTableProps) {
  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!logs?.length) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed text-center">
        <Shield className="mb-4 h-12 w-12 text-muted-foreground/40" />
        <h3 className="font-medium text-lg">No audit logs found</h3>
        <p className="text-muted-foreground text-sm">
          Adjust your filters or check back later.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-[180px]">Timestamp</TableHead>
            <TableHead>Event</TableHead>
            <TableHead>Actor</TableHead>
            <TableHead>Resource</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow
              className="group transition-colors hover:bg-muted/30"
              key={log.eventId}
            >
              <TableCell className="font-mono text-muted-foreground text-xs">
                {format(new Date(log.timestamp), "MMM dd, HH:mm:ss.SSS")}
              </TableCell>
              <TableCell>
                <EventBadge eventType={log.eventType} />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <ActorAvatar actor={log.actor} />
                  <div className="flex flex-col">
                    <span className="font-medium text-sm">
                      {log.actor.email || log.actor.id}
                    </span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      {log.actor.type}
                    </span>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium text-sm">
                    {log.resource.type}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {log.resource.id}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <LogDetailDialog log={log} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function EventBadge({ eventType }: { eventType: string }) {
  const isDenial = eventType.includes("denied") || eventType.includes("failed");
  const isGrant = eventType.includes("granted") || eventType.includes("added");

  let variant: "destructive" | "default" | "secondary" = "secondary";
  if (isDenial) {
    variant = "destructive";
  } else if (isGrant) {
    variant = "default";
  }

  return (
    <Badge className="px-2 py-0 font-medium capitalize" variant={variant}>
      {eventType.split(".").pop()}
    </Badge>
  );
}

function ActorAvatar({ actor }: { actor: AuditLog["actor"] }) {
  if (actor.type === "system") {
    return <Globe className="h-4 w-4 text-blue-500" />;
  }
  if (actor.type === "service") {
    return <Fingerprint className="h-4 w-4 text-purple-500" />;
  }
  return <User className="h-4 w-4 text-muted-foreground" />;
}

function LogDetailDialog({ log }: { log: AuditLog }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
          size="icon"
          variant="ghost"
        >
          <Eye className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>Audit Event Details</DialogTitle>
            <Badge className="font-mono text-[10px]" variant="outline">
              {log.eventId}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <DetailItem
              label="Timestamp"
              value={format(new Date(log.timestamp), "yyyy-MM-dd HH:mm:ss.SSS")}
            />
            <DetailItem label="Event Type" value={log.eventType} />
            <DetailItem label="Actor ID" value={log.actor.id} />
            <DetailItem label="Actor Email" value={log.actor.email || "N/A"} />
            <DetailItem
              label="IP Address"
              value={log.actor.ipAddress || "N/A"}
            />
            <DetailItem
              className="col-span-2"
              label="User Agent"
              value={log.actor.userAgent || "N/A"}
            />
          </div>

          {log.changes && Object.keys(log.changes).length > 0 && (
            <div className="space-y-2">
              <h4 className="flex items-center gap-2 font-semibold text-primary text-sm">
                <AlertTriangle className="h-4 w-4" />
                Changes Detected
              </h4>
              <div className="space-y-2 overflow-x-auto rounded-md bg-muted/50 p-4 font-mono text-xs">
                {Object.entries(log.changes).map(([key, change]) => (
                  <div
                    className="flex flex-col gap-1 border-border/50 border-b pb-2 last:border-0"
                    key={key}
                  >
                    <span className="font-bold text-muted-foreground">
                      {key}:
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="truncate text-red-500 line-through">
                        {JSON.stringify(change.old)}
                      </div>
                      <div className="truncate text-green-500">
                        {JSON.stringify(change.new)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <h4 className="flex items-center gap-2 font-semibold text-sm">
              <Info className="h-4 w-4" />
              Full Context (JSON)
            </h4>
            <pre className="overflow-x-auto rounded-md border border-slate-800 bg-slate-950 p-4 font-mono text-[11px] text-slate-300">
              {JSON.stringify(log, null, 2)}
            </pre>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DetailItem({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="mb-0.5 font-semibold text-[10px] text-muted-foreground uppercase tracking-wider">
        {label}
      </p>
      <p className="truncate font-medium">{value}</p>
    </div>
  );
}
