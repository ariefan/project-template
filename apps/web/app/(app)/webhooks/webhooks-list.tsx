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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
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
  Webhook as WebhookIcon,
  X,
  XCircle,
} from "lucide-react";
import { useState } from "react";
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

export function WebhooksList() {
  const queryClient = useQueryClient();
  const { data: orgData } = useActiveOrganization();
  const orgId = orgData?.id ?? "";

  const [page, setPage] = useState(1);
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

  const { data, isLoading, error } = useQuery({
    ...webhooksListOptions({
      client: apiClient,
      path: { orgId },
      query: { page, pageSize: 20 },
    }),
    enabled: Boolean(orgId),
  });

  const { data: eventTypesData } = useQuery({
    ...webhooksListEventTypesOptions({
      client: apiClient,
      path: { orgId },
    }),
    enabled: Boolean(orgId),
  });

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
    },
    onError: (err) => {
      setFormError(getErrorMessage(err));
    },
  });

  const updateMutation = useMutation({
    ...webhooksUpdateMutation({ client: apiClient }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooksList"] });
      setEditTarget(null);
      resetForm();
    },
    onError: (err) => {
      setFormError(getErrorMessage(err));
    },
  });

  const deleteMutation = useMutation({
    ...webhooksDeleteMutation({ client: apiClient }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooksList"] });
      setDeleteTarget(null);
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
    },
  });

  const testMutation = useMutation({
    ...webhooksTestMutation({ client: apiClient }),
  });

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
  }

  const webhooks = (data as { data?: WebhookRecord[] })?.data ?? [];
  const pagination = (
    data as {
      pagination?: {
        totalPages: number;
        hasNext: boolean;
        hasPrevious: boolean;
        total: number;
      };
    }
  )?.pagination;

  const eventTypes = (
    eventTypesData as {
      data?: { eventTypes: Record<string, string[]> };
    }
  )?.data?.eventTypes;

  function renderContent() {
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
          Failed to load webhooks
        </div>
      );
    }

    if (webhooks.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <WebhookIcon className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">No webhooks configured</p>
          <p className="mt-1 text-muted-foreground text-sm">
            Create a webhook to receive event notifications
          </p>
        </div>
      );
    }

    return (
      <>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>URL</TableHead>
              <TableHead>Events</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {webhooks.map((webhook) => (
              <TableRow key={webhook.id}>
                <TableCell className="font-medium">
                  {webhook.name ?? "Unnamed"}
                </TableCell>
                <TableCell className="max-w-[200px] truncate text-muted-foreground">
                  {webhook.url}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {webhook.events.slice(0, 2).map((event) => (
                      <Badge key={event} variant="outline">
                        {event}
                      </Badge>
                    ))}
                    {webhook.events.length > 2 && (
                      <Badge variant="outline">
                        +{webhook.events.length - 2}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    className={
                      webhook.isActive
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }
                    variant="secondary"
                  >
                    {webhook.isActive ? "active" : "inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditOpen(webhook)}>
                        <Activity className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleToggleStatus(webhook)}
                      >
                        {webhook.isActive ? (
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
                      <DropdownMenuItem
                        onClick={() => setDeliveriesTarget(webhook)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View Deliveries
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleTest(webhook.id)}>
                        <Play className="mr-2 h-4 w-4" />
                        Send Test
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setRotateTarget(webhook.id)}
                      >
                        <Key className="mr-2 h-4 w-4" />
                        Rotate Secret
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setDeleteTarget(webhook.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
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
              Page {page} of {pagination.totalPages} ({pagination.total}{" "}
              webhooks)
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

  function renderEventSelector() {
    if (!eventTypes) {
      return (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin" />
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

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Send className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>Webhooks</CardTitle>
                <CardDescription>
                  Configure endpoints to receive event notifications
                </CardDescription>
              </div>
            </div>
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
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Create Webhook
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>{renderContent()}</CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setEditTarget(null);
            resetForm();
          }
        }}
        open={Boolean(editTarget)}
      >
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
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
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
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rotate Secret Confirmation */}
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
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Rotate Secret
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* New Secret Display */}
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

      {/* Deliveries Sheet */}
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
    mutationFn: async (deliveryId: string) => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/v1/orgs/${orgId}/webhooks/${webhookId}/deliveries/${deliveryId}/retry`,
        {
          method: "POST",
          credentials: "include",
        }
      );
      if (!response.ok) {
        throw new Error("Failed to retry delivery");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooksListDeliveries"] });
    },
  });

  const deliveries = (data as { data?: WebhookDelivery[] })?.data ?? [];
  const pagination = (
    data as {
      pagination?: {
        totalPages: number;
        hasNext: boolean;
        hasPrevious: boolean;
        total: number;
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
                  onClick={() => retryMutation.mutate(delivery.id)}
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
