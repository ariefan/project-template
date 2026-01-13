"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  WebhookDelivery,
  WebhookDeliveryStatus,
  Webhook as WebhookRecord,
} from "@workspace/contracts";
import {
  webhooksCreateMutation,
  webhooksDeleteMutation,
  webhooksListDeliveriesOptions,
  webhooksListEventTypesOptions,
  webhooksListOptions,
  webhooksRetryDeliveryMutation,
  webhooksRotateSecretMutation,
  webhooksTestMutation,
  webhooksUpdateMutation,
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
import { Card, CardContent } from "@workspace/ui/components/card";
import { Checkbox } from "@workspace/ui/components/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Textarea } from "@workspace/ui/components/textarea";
import { formatDistanceToNow } from "date-fns";
import {
  Activity,
  Check,
  CheckCircle,
  Clock,
  Copy,
  Eye,
  Key,
  Loader2,
  MoreHorizontal,
  Play,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { apiClient, getErrorMessage } from "@/lib/api-client";
import { useActiveOrganization } from "@/lib/auth";

const DELIVERY_STATUS_COLORS: Record<WebhookDeliveryStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  delivered: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  exhausted: "bg-gray-100 text-gray-800",
};

interface WebhookFormData {
  name: string;
  url: string;
  description: string;
  events: string[];
}

import {
  type ColumnDef,
  ColumnsButton,
  DataView as DataTable,
  FilterButton,
  type FilterValue,
  SearchInput,
  SortButton,
} from "@workspace/ui/composed/data-view"; // Import DataView and Toolbar components
import { PageHeader } from "@/components/layouts/page-header";

// ... previous imports ...

export function WebhooksList() {
  const queryClient = useQueryClient();
  const { data: orgData } = useActiveOrganization();
  const orgId = orgData?.id ?? "";

  // DataView State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState<FilterValue[]>([]);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<WebhookRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [rotateTarget, setRotateTarget] = useState<string | null>(null);
  const [deliveriesTarget, setDeliveriesTarget] =
    useState<WebhookRecord | null>(null);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState<WebhookFormData>({
    name: "",
    url: "",
    description: "",
    events: [],
  });

  // Calculate isActive filter
  const activeFilterVal = filters.find((f) => f.field === "isActive")?.value;
  const isActiveFilter = (() => {
    if (activeFilterVal === "true") {
      return true;
    }
    if (activeFilterVal === "false") {
      return false;
    }
    return undefined;
  })();

  const { data, isLoading } = useQuery({
    ...webhooksListOptions({
      client: apiClient,
      path: { orgId },
      query: {
        page,
        pageSize,
        isActive: isActiveFilter,
      },
    }),
    enabled: Boolean(orgId),
    placeholderData: (previousData) => previousData,
  });

  // ... event types query ...
  const { data: eventTypesData } = useQuery({
    ...webhooksListEventTypesOptions({
      client: apiClient,
      path: { orgId },
    }),
    enabled: Boolean(orgId),
  });

  // ... mutations (create, update, delete, rotate, test, retry) - KEEP THESE ...
  // (Copied strictly from previous context to avoid losing logic)
  const createMutation = useMutation({
    ...webhooksCreateMutation({ client: apiClient }),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["webhooksList"] });
      const createdData = response as {
        data?: { secret?: string };
      };
      if (createdData?.data?.secret) {
        setNewSecret(createdData.data.secret);
      }
      setCreateDialogOpen(false);
      resetForm();
      toast.success("Webhook created successfully");
    },
    onError: (err) => {
      setFormError(getErrorMessage(err));
      toast.error("Failed to create webhook");
    },
  });

  const updateMutation = useMutation({
    ...webhooksUpdateMutation({ client: apiClient }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooksList"] });
      setEditTarget(null);
      resetForm();
      toast.success("Webhook updated successfully");
    },
    onError: (err) => {
      setFormError(getErrorMessage(err));
      toast.error("Failed to update webhook");
    },
  });

  const deleteMutation = useMutation({
    ...webhooksDeleteMutation({ client: apiClient }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooksList"] });
      setDeleteTarget(null);
      toast.success("Webhook deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete webhook");
    },
  });

  const rotateMutation = useMutation({
    ...webhooksRotateSecretMutation({ client: apiClient }),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["webhooksList"] });
      const rotatedData = response as {
        data?: { secret?: string };
      };
      if (rotatedData?.data?.secret) {
        setNewSecret(rotatedData.data.secret);
      }
      setRotateTarget(null);
      toast.success("Secret rotated successfully");
    },
    onError: () => {
      toast.error("Failed to rotate secret");
    },
  });

  const testMutation = useMutation({
    ...webhooksTestMutation({ client: apiClient }),
    onSuccess: (response) => {
      const r = response as {
        data?: { success?: boolean; httpStatus?: number; error?: string };
      };
      if (r.data?.success) {
        toast.success(`Test sent: HTTP ${r.data.httpStatus}`);
      } else if (r.data?.error) {
        toast.error(`Test failed: ${r.data.error}`);
      }
    },
    onError: () => {
      toast.error("Failed to send test event");
    },
  });

  // ... form handlers ...
  function resetForm() {
    setFormData({ name: "", url: "", description: "", events: [] });
    setFormError(null);
  }

  function handleCreateSubmit() {
    if (!formData.url || formData.events.length === 0) {
      setFormError("URL and at least one event are required");
      return;
    }
    createMutation.mutate({
      path: { orgId },
      body: {
        url: formData.url,
        events: formData.events,
        name: formData.name || undefined,
        description: formData.description || undefined,
      },
    });
  }

  function handleEditSubmit() {
    if (!editTarget) {
      return;
    }
    updateMutation.mutate({
      path: { orgId, webhookId: editTarget.id },
      body: {
        url: formData.url || undefined,
        events: formData.events.length > 0 ? formData.events : undefined,
        name: formData.name || undefined,
        description: formData.description || undefined,
      },
    });
  }

  function handleEditOpen(webhook: WebhookRecord) {
    setFormData({
      name: webhook.name ?? "",
      url: webhook.url,
      description: webhook.description ?? "",
      events: webhook.events,
    });
    setEditTarget(webhook);
  }

  function handleToggleStatus(webhook: WebhookRecord) {
    updateMutation.mutate({
      path: { orgId, webhookId: webhook.id },
      body: { isActive: !webhook.isActive },
    });
  }

  function handleDeleteConfirm() {
    if (deleteTarget) {
      deleteMutation.mutate({ path: { orgId, webhookId: deleteTarget } });
    }
  }

  function handleRotateConfirm() {
    if (rotateTarget) {
      rotateMutation.mutate({ path: { orgId, webhookId: rotateTarget } });
    }
  }

  function handleTest(webhookId: string) {
    testMutation.mutate({ path: { orgId, webhookId } });
  }

  function handleEventToggle(eventType: string) {
    setFormData((prev) => ({
      ...prev,
      events: prev.events.includes(eventType)
        ? prev.events.filter((e) => e !== eventType)
        : [...prev.events, eventType],
    }));
  }

  async function copyToClipboard(text: string) {
    await navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  }

  const webhooks = (data as { data?: WebhookRecord[] })?.data ?? [];

  const eventTypes = (
    eventTypesData as {
      data?: { eventTypes: Record<string, string[]> };
    }
  )?.data?.eventTypes;

  // Define Columns
  const columns: ColumnDef<WebhookRecord>[] = [
    {
      id: "name",
      header: "Name",
      accessorKey: "name",
      cell: ({ row }) => (
        <span className="font-medium">{row.name || "Unnamed"}</span>
      ),
    },
    {
      id: "url",
      header: "URL",
      accessorKey: "url",
      cell: ({ row }) => (
        <span
          className="block max-w-[300px] truncate text-muted-foreground"
          title={row.url}
        >
          {row.url}
        </span>
      ),
    },
    {
      id: "events",
      header: "Events",
      accessorKey: "events",
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.events.slice(0, 2).map((event) => (
            <Badge key={event} variant="outline">
              {event}
            </Badge>
          ))}
          {row.events.length > 2 && (
            <Badge variant="outline">+{row.events.length - 2}</Badge>
          )}
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      accessorKey: "isActive",
      filterable: true,
      filterType: "select",
      filterOptions: [
        { label: "Active", value: "true" },
        { label: "Inactive", value: "false" },
      ],
      cell: ({ row }) => (
        <Badge
          className={
            row.isActive
              ? "bg-green-100 text-green-800 hover:bg-green-100"
              : "bg-gray-100 text-gray-800 hover:bg-gray-100"
          }
          variant="secondary"
        >
          {row.isActive ? "active" : "inactive"}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "",
      align: "right",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleEditOpen(row)}>
              <Activity className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleToggleStatus(row)}>
              {row.isActive ? (
                <>
                  <X className="mr-2 h-4 w-4" />
                  Disable
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Enable
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDeliveriesTarget(row)}>
              <Eye className="mr-2 h-4 w-4" />
              View Deliveries
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleTest(row.id)}>
              <Play className="mr-2 h-4 w-4" />
              Send Test
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setRotateTarget(row.id)}>
              <Key className="mr-2 h-4 w-4" />
              Rotate Secret
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => setDeleteTarget(row.id)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  function renderEventSelector() {
    // ... existing implementation ...
    if (!eventTypes) {
      return (
        <div className="flex items-center justify-center py-4">
          <Skeleton className="h-4 w-4 rounded-full" />
        </div>
      );
    }

    return (
      <div className="grid gap-4">
        {Object.entries(eventTypes).map(([resource, events]) => (
          <div key={resource}>
            <h4 className="mb-2 font-medium capitalize">{resource}</h4>
            <div className="grid grid-cols-2 gap-2">
              {events.map((event: string) => (
                <div className="flex items-center space-x-2" key={event}>
                  <Checkbox
                    checked={formData.events.includes(event)}
                    id={event}
                    onCheckedChange={() => handleEventToggle(event)}
                  />
                  <label
                    className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    htmlFor={event}
                  >
                    {event}
                  </label>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  const createAction = (
    <Dialog
      onOpenChange={(open) => {
        setCreateDialogOpen(open);
        if (!open) {
          resetForm();
        }
      }}
      open={createDialogOpen}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Webhook
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Webhook</DialogTitle>
          <DialogDescription>
            Configure an endpoint to receive event notifications
          </DialogDescription>
        </DialogHeader>
        {formError && (
          <div className="rounded-md bg-destructive/10 p-3 text-destructive text-sm">
            {formError}
          </div>
        )}
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Name (optional)</Label>
            <Input
              id="name"
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="My Webhook"
              value={formData.name}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="url">URL</Label>
            <Input
              id="url"
              onChange={(e) =>
                setFormData({ ...formData, url: e.target.value })
              }
              placeholder="https://example.com/webhook"
              value={formData.url}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              onChange={(e) =>
                setFormData({
                  ...formData,
                  description: e.target.value,
                })
              }
              placeholder="Describe what this webhook is for"
              value={formData.description}
            />
          </div>
          <div className="grid gap-2">
            <Label>Events</Label>
            <div className="max-h-[200px] overflow-y-auto rounded-md border p-3">
              {renderEventSelector()}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={createMutation.isPending}
            onClick={handleCreateSubmit}
          >
            {createMutation.isPending && (
              <Skeleton className="mr-2 h-4 w-4 rounded-full" />
            )}
            Create Webhook
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // Dialogs and Sheets are rendered outside DataView but used by it's actions
  return (
    <>
      <PageHeader
        actions={createAction}
        description="Configure endpoints to receive event notifications"
        icon={<Send className="size-6" />}
        title="Webhooks"
      />
      <DataTable
        columns={columns}
        data={webhooks}
        emptyMessage="No webhooks found"
        filters={filters}
        // Pagination
        getRowId={(row) => row.id}
        loading={isLoading}
        onFiltersChange={setFilters}
        // Filters
        onPaginationChange={(p) => {
          setPage(p.page);
          setPageSize(p.pageSize);
        }}
        paginated
        // Actions
        pagination={{
          page,
          pageSize,
          total:
            (data as { meta?: { totalCount?: number } } | undefined)?.meta
              ?.totalCount ?? 0,
        }}
        toolbarLeft={<SearchInput placeholder="Search webhooks..." />}
        toolbarRight={
          <>
            <ColumnsButton />
            <FilterButton />
            <SortButton />
          </>
        }
      />

      {/* Edit Dialog - KEEP SAME */}
      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setEditTarget(null);
            resetForm();
          }
        }}
        open={Boolean(editTarget)}
      >
        {/* ... existing content ... */}
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Webhook</DialogTitle>
            <DialogDescription>Update webhook configuration</DialogDescription>
          </DialogHeader>
          {formError && (
            <div className="rounded-md bg-destructive/10 p-3 text-destructive text-sm">
              {formError}
            </div>
          )}
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                value={formData.name}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-url">URL</Label>
              <Input
                id="edit-url"
                onChange={(e) =>
                  setFormData({ ...formData, url: e.target.value })
                }
                value={formData.url}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                value={formData.description}
              />
            </div>
            <div className="grid gap-2">
              <Label>Events</Label>
              <div className="max-h-[200px] overflow-y-auto rounded-md border p-3">
                {renderEventSelector()}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={updateMutation.isPending}
              onClick={handleEditSubmit}
            >
              {updateMutation.isPending && (
                <Skeleton className="mr-2 h-4 w-4 rounded-full" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation - KEEP SAME */}
      <AlertDialog
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        open={Boolean(deleteTarget)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Webhook</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this webhook? All delivery history
              will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending}
              onClick={handleDeleteConfirm}
            >
              {deleteMutation.isPending && (
                <Skeleton className="mr-2 h-4 w-4 rounded-full" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rotate Secret Confirmation - KEEP SAME */}
      <AlertDialog
        onOpenChange={(open) => !open && setRotateTarget(null)}
        open={Boolean(rotateTarget)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rotate Webhook Secret</AlertDialogTitle>
            <AlertDialogDescription>
              This will generate a new secret. You&apos;ll need to update your
              endpoint with the new secret to verify signatures.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={rotateMutation.isPending}
              onClick={handleRotateConfirm}
            >
              {rotateMutation.isPending && (
                <Skeleton className="mr-2 h-4 w-4 rounded-full" />
              )}
              Rotate Secret
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* New Secret Display - KEEP SAME */}
      <Dialog onOpenChange={() => setNewSecret(null)} open={Boolean(newSecret)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Webhook Secret</DialogTitle>
            <DialogDescription>
              Copy this secret now. You won&apos;t be able to see it again.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 rounded-md bg-muted p-3 font-mono text-sm">
            <code className="flex-1 break-all">{newSecret}</code>
            <Button
              onClick={() => copyToClipboard(newSecret ?? "")}
              size="icon"
              variant="ghost"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setNewSecret(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deliveries Sheet - KEEP SAME */}
      <Sheet
        onOpenChange={(open) => !open && setDeliveriesTarget(null)}
        open={Boolean(deliveriesTarget)}
      >
        <SheetContent className="w-[600px] sm:max-w-[600px]">
          <SheetHeader>
            <SheetTitle>Webhook Deliveries</SheetTitle>
            <SheetDescription>
              {deliveriesTarget?.name ?? deliveriesTarget?.url}
            </SheetDescription>
          </SheetHeader>
          {deliveriesTarget && (
            <DeliveriesPanel orgId={orgId} webhookId={deliveriesTarget.id} />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

function DeliveriesPanel({
  orgId,
  webhookId,
}: {
  orgId: string;
  webhookId: string;
}) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    ...webhooksListDeliveriesOptions({
      client: apiClient,
      path: { orgId, webhookId },
      query: { page, pageSize: 20 },
    }),
    enabled: Boolean(orgId && webhookId),
  });

  const retryMutation = useMutation({
    ...webhooksRetryDeliveryMutation({ client: apiClient }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooksListDeliveries"] });
      toast.success("Delivery retry initiated");
    },
    onError: () => {
      toast.error("Failed to retry delivery");
    },
  });

  const deliveries = (data as { data?: WebhookDelivery[] })?.data ?? [];
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

  function getStatusIcon(status: WebhookDeliveryStatus) {
    switch (status) {
      case "delivered":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "exhausted":
        return <XCircle className="h-4 w-4 text-gray-500" />;
      default:
        return null;
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center text-destructive">
        Failed to load deliveries
      </div>
    );
  }

  if (deliveries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Send className="mb-4 h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">No deliveries yet</p>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      {deliveries.map((delivery) => (
        <Card key={delivery.id}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {getStatusIcon(delivery.status)}
                  <Badge
                    className={DELIVERY_STATUS_COLORS[delivery.status]}
                    variant="secondary"
                  >
                    {delivery.status}
                  </Badge>
                  <Badge variant="outline">{delivery.eventType}</Badge>
                </div>
                <p className="text-muted-foreground text-sm">
                  {formatDistanceToNow(new Date(delivery.createdAt), {
                    addSuffix: true,
                  })}
                  {delivery.httpStatus && ` • HTTP ${delivery.httpStatus}`}
                </p>
                <p className="text-muted-foreground text-xs">
                  Attempts: {delivery.attemptCount}
                  {delivery.nextRetryAt &&
                    ` • Next retry: ${formatDistanceToNow(new Date(delivery.nextRetryAt), { addSuffix: true })}`}
                </p>
              </div>
              {(delivery.status === "failed" ||
                delivery.status === "exhausted") && (
                <Button
                  disabled={retryMutation.isPending}
                  onClick={() =>
                    retryMutation.mutate({
                      path: { orgId, webhookId, deliveryId: delivery.id },
                    })
                  }
                  size="sm"
                  variant="outline"
                >
                  <RefreshCw className="mr-2 h-3 w-3" />
                  Retry
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      {pagination && (
        <div className="flex items-center justify-between pt-4">
          <div className="text-muted-foreground text-sm">
            Page {page} of {pagination.totalPages}
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
    </div>
  );
}
