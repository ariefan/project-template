import type { ScheduledJob } from "@workspace/contracts";
import { Badge } from "@workspace/ui/components/badge";
import type { ColumnDef } from "@workspace/ui/composed/data-view";

export const FREQUENCY_LABELS: Record<string, string> = {
  once: "Once",
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  custom: "Custom",
};

export const DELIVERY_LABELS: Record<string, string> = {
  email: "Email",
  none: "None",
  webhook: "Webhook",
  storage: "Storage",
};

export const JOB_TYPE_LABELS: Record<string, string> = {
  "reports:generate": "Report Generation",
  "storage:cleanup": "Storage Cleanup",
  "backups:create": "Organization Backup",
  "backups:cleanup": "Backup Cleanup",
  "dev:pokeapi-test": "Test Job (PokéAPI)",
  "subscriptions:monitor": "Subscription Monitor",
};

export function getJobTypeLabel(jobType: string): string {
  if (JOB_TYPE_LABELS[jobType]) {
    return JOB_TYPE_LABELS[jobType];
  }

  // Fallback: convert "namespace:resource-action" to "Resource Action"
  const parts = jobType.split(":");
  const label = (parts.length > 1 ? parts[1] : parts[0]) || jobType;
  return label
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export const schedulesTableColumns: ColumnDef<ScheduledJob>[] = [
  {
    id: "id",
    header: "ID",
    accessorKey: "id",
    width: 100,
    cell: ({ value }: { value: unknown }) => {
      const id = String(value);
      return id.length > 8 ? `${id.substring(0, 8)}...` : id;
    },
  },
  {
    id: "name",
    header: "Name",
    accessorKey: "name",
    sortable: true,
    filterable: true,
    filterType: "text",
    minWidth: 200,
  },
  {
    id: "jobType",
    header: "Job Type",
    accessorKey: "jobType",
    filterable: true,
    filterType: "select",
    filterOptions: [
      { value: "reports:generate", label: "Report Generation" },
      { value: "storage:cleanup", label: "Storage Cleanup" },
      { value: "backups:create", label: "Organization Backup" },
      { value: "backups:cleanup", label: "Backup Cleanup" },
      { value: "subscriptions:monitor", label: "Subscription Monitor" },
      { value: "dev:pokeapi-test", label: "Test Job" },
    ],
    width: 120,
    cell: ({ value }: { value: unknown }) => (
      <Badge variant="secondary">{getJobTypeLabel(String(value))}</Badge>
    ),
  },
  {
    id: "frequency",
    header: "Frequency",
    accessorKey: "frequency",
    sortable: true,
    filterable: true,
    filterType: "select",
    filterOptions: [
      { value: "once", label: "Once" },
      { value: "daily", label: "Daily" },
      { value: "weekly", label: "Weekly" },
      { value: "monthly", label: "Monthly" },
      { value: "custom", label: "Custom" },
    ],
    width: 120,
    cell: ({ value }: { value: unknown }) => (
      <Badge variant="secondary">
        {FREQUENCY_LABELS[String(value)] ?? String(value)}
      </Badge>
    ),
  },
  {
    id: "deliveryMethod",
    header: "Delivery",
    accessorKey: "deliveryMethod",
    filterable: true,
    filterType: "select",
    filterOptions: [
      { value: "email", label: "Email" },
      { value: "none", label: "None" },
      { value: "webhook", label: "Webhook" },
      { value: "storage", label: "Storage" },
    ],
    width: 100,
    cell: ({ value }: { value: unknown }) => (
      <Badge variant="outline">
        {DELIVERY_LABELS[String(value)] ?? String(value)}
      </Badge>
    ),
  },
  {
    id: "isActive",
    header: "Status",
    accessorKey: "isActive",
    filterable: true,
    filterType: "boolean",
    width: 100,
    cell: ({ value }: { value: unknown }) => (
      <Badge variant={value ? "default" : "secondary"}>
        {value ? "Active" : "Paused"}
      </Badge>
    ),
  },
  {
    id: "nextRunAt",
    header: "Next Run",
    accessorKey: "nextRunAt",
    sortable: true,
    width: 150,
    cell: ({ value }: { value: unknown }) =>
      value ? new Date(String(value)).toLocaleString() : "-",
  },
  {
    id: "lastRunAt",
    header: "Last Run",
    accessorKey: "lastRunAt",
    sortable: true,
    width: 150,
    cell: ({ value }: { value: unknown }) =>
      value ? new Date(String(value)).toLocaleString() : "Never",
  },
  {
    id: "failureCount",
    header: "Failures",
    accessorKey: "failureCount",
    width: 80,
    cell: ({ value }: { value: unknown }) => {
      const count = Number(value) || 0;
      return count > 0 ? (
        <Badge variant="destructive">{count}</Badge>
      ) : (
        <span className="text-muted-foreground">0</span>
      );
    },
  },
];
