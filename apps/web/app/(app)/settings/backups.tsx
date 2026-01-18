"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Backup } from "@workspace/contracts";
import {
  backupsCreate,
  backupsDelete,
  backupsList,
} from "@workspace/contracts/sdk";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from "@workspace/ui/components/item";
import { Label } from "@workspace/ui/components/label";
import { Progress } from "@workspace/ui/components/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { format, formatDistanceToNow } from "date-fns";
import {
  Archive,
  Download,
  Loader2,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import * as React from "react";
import { useState } from "react";
import { toast } from "sonner";
import {
  BackupCreateDialog,
  type CreateBackupOptions,
} from "@/components/backups/backup-create-dialog";
import { apiClient } from "@/lib/api-client";
import { useActiveOrganization } from "@/lib/auth";
import { env } from "@/lib/env";
import { SettingsBackupsSkeleton } from "./skeletons";

function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null || bytes === 0) {
    return "0 B";
  }
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
}

interface BackupError {
  message?: string;
  error?: {
    message?: string;
  };
}

function renderBackupsListContent(
  isLoading: boolean,
  backups: Backup[],
  deleteMutation: { isPending: boolean; mutate: (id: string) => void },
  restoreMutation: { isPending: boolean },
  handleDownload: (backup: Backup) => void,
  setRestoreBackup: (backup: Backup) => void
) {
  if (isLoading) {
    return <SettingsBackupsSkeleton />;
  }

  if (backups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <Archive className="mb-2 h-10 w-10 text-muted-foreground" />
        <p className="text-muted-foreground">No backups yet</p>
        <p className="text-muted-foreground text-sm">
          Create your first backup to protect your data
        </p>
      </div>
    );
  }

  return (
    <ItemGroup>
      {backups.map((backup, index) => (
        <React.Fragment key={backup.id}>
          <BackupItem
            backup={backup}
            isDeleting={deleteMutation.isPending}
            isRestoring={restoreMutation.isPending}
            onDelete={(id) => deleteMutation.mutate(id)}
            onDownload={handleDownload}
            onRestore={setRestoreBackup}
          />
          {index !== backups.length - 1 && <ItemSeparator />}
        </React.Fragment>
      ))}
    </ItemGroup>
  );
}

interface BackupItemProps {
  backup: Backup;
  onDownload: (backup: Backup) => void;
  onRestore: (backup: Backup) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
  isRestoring: boolean;
}

function BackupItem({
  backup,
  onDownload,
  onRestore,
  onDelete,
  isDeleting,
  isRestoring,
}: BackupItemProps) {
  return (
    <Item variant="default">
      <ItemMedia variant="icon">
        <Archive className="h-4 w-4" />
      </ItemMedia>

      <ItemContent>
        <ItemTitle>
          {format(new Date(backup.createdAt), "MMM d, yyyy 'at' h:mm a")}
        </ItemTitle>
        <ItemDescription>
          {formatDistanceToNow(new Date(backup.createdAt), { addSuffix: true })}
          {backup.fileSize && ` • ${formatBytes(backup.fileSize)}`}
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        {backup.status !== "completed" && backup.status !== "failed" && (
          <div className="mr-2 flex min-w-[120px] items-center gap-2">
            <Progress
              className="h-2 w-24"
              value={
                backup.metadata &&
                typeof backup.metadata === "object" &&
                "progress" in backup.metadata
                  ? (backup.metadata.progress as number)
                  : undefined
              }
            />
            <Badge className="text-xs" variant="secondary">
              {backup.status.replace("_", " ")}
            </Badge>
          </div>
        )}
        {backup.status === "failed" && (
          <Badge className="mr-2" variant="destructive">
            Failed
          </Badge>
        )}
        {backup.status === "completed" && (
          <>
            <Button
              onClick={() => onDownload(backup)}
              size="sm"
              variant="outline"
            >
              <Download className="mr-1 h-4 w-4" />
              Download
            </Button>
            <Button
              disabled={isRestoring}
              onClick={() => onRestore(backup)}
              size="sm"
              variant="outline"
            >
              <RotateCcw className="mr-1 h-4 w-4" />
              Restore
            </Button>
          </>
        )}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button disabled={isDeleting} size="sm" variant="destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Backup</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this backup? This action cannot
                be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => onDelete(backup.id)}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </ItemActions>
    </Item>
  );
}

export function BackupsTab() {
  const { data: org } = useActiveOrganization();
  const orgId = org?.id;
  const queryClient = useQueryClient();
  const [restoreBackup, setRestoreBackup] = useState<Backup | null>(null);
  const [restoreStrategy, setRestoreStrategy] = useState<
    "skip" | "overwrite" | "wipe_and_replace"
  >("skip");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [wipeConfirmation, setWipeConfirmation] = useState("");

  // Fetch backups
  const { data: backupsData, isLoading } = useQuery({
    queryKey: ["backups", orgId],
    queryFn: async () => {
      if (!orgId) {
        return { data: [] };
      }
      const response = await backupsList({
        client: apiClient,
        path: { orgId },
      });
      return response.data as { data: Backup[] } | undefined;
    },
    enabled: !!orgId,
    refetchInterval: (query) => {
      const data = query.state.data as { data: Backup[] } | undefined;
      const hasPending = data?.data?.some(
        (b) => b.status === "pending" || b.status === "in_progress"
      );
      return hasPending ? 2000 : false;
    },
  });

  const backups = backupsData?.data ?? [];

  // Create backup mutation
  const createMutation = useMutation({
    mutationFn: async (options?: CreateBackupOptions) => {
      if (!orgId) {
        throw new Error("No organization selected");
      }
      const { error } = await backupsCreate({
        client: apiClient,
        path: { orgId },
        body: options ?? {},
      });
      if (error) {
        const typedError = error as BackupError;
        const msg =
          typedError.message ||
          typedError.error?.message ||
          "Failed to create backup";
        throw new Error(msg);
      }
    },
    onSuccess: () => {
      toast.success("Organization backup started");
      setIsDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["backups", orgId] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Delete backup mutation
  const deleteMutation = useMutation({
    mutationFn: async (backupId: string) => {
      if (!orgId) {
        throw new Error("No organization selected");
      }
      const { error } = await backupsDelete({
        client: apiClient,
        path: { orgId, id: backupId },
      });
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      toast.success("Backup deleted");
      queryClient.invalidateQueries({ queryKey: ["backups", orgId] });
    },
    onError: () => toast.error("Failed to delete backup"),
  });

  // Restore mutation
  const restoreMutation = useMutation({
    mutationFn: async ({
      backupId,
      strategy,
    }: {
      backupId: string;
      strategy: "skip" | "overwrite" | "wipe_and_replace";
    }) => {
      if (!orgId) {
        throw new Error("No organization selected");
      }
      const response = await fetch(
        `${env.NEXT_PUBLIC_API_URL}/v1/orgs/${orgId}/backups/${backupId}/restore`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ strategy }),
        }
      );
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error?.message || "Failed to restore backup");
      }
      return response.json();
    },
    onSuccess: (data) => {
      const result = data?.data;
      if (result) {
        toast.success(
          `Restored ${result.rowsRestored} rows, ${result.filesRestored} files`
        );
      } else {
        toast.success("Restore completed");
      }
      setRestoreBackup(null);
      queryClient.invalidateQueries({ queryKey: ["backups", orgId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function handleCreate(options: CreateBackupOptions) {
    createMutation.mutate(options);
  }

  function handleDownload(backup: Backup) {
    if (!orgId) {
      return;
    }
    window.open(
      `${env.NEXT_PUBLIC_API_URL}/v1/orgs/${orgId}/backups/${backup.id}/download`,
      "_blank"
    );
  }

  function handleRestore() {
    if (!restoreBackup) {
      return;
    }
    restoreMutation.mutate({
      backupId: restoreBackup.id,
      strategy: restoreStrategy,
    });
  }

  if (!orgId) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">No organization selected</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Archive className="h-5 w-5" />
                Data Backups
              </CardTitle>
              <CardDescription>
                Create and manage backups of your organization data
              </CardDescription>
            </div>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Backup
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Backups include all organization data: posts, comments, files,
            webhooks, and settings. They are automatically deleted after the
            retention period based on your plan.
          </p>
        </CardContent>
      </Card>

      {/* Backups List */}
      <Card>
        <CardHeader>
          <CardTitle>Backup History</CardTitle>
        </CardHeader>
        <CardContent>
          {renderBackupsListContent(
            isLoading,
            backups,
            deleteMutation,
            restoreMutation,
            handleDownload,
            setRestoreBackup
          )}
        </CardContent>
      </Card>

      {/* Restore Confirmation Dialog */}
      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setRestoreBackup(null);
            setWipeConfirmation("");
          }
        }}
        open={!!restoreBackup}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore Backup</DialogTitle>
            <DialogDescription>
              This will restore data from backup{" "}
              <span className="font-mono">{restoreBackup?.id}</span>. Existing
              data may be affected based on your chosen strategy.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Conflict Resolution Strategy</Label>
              <Select
                onValueChange={(v) =>
                  setRestoreStrategy(
                    v as "skip" | "overwrite" | "wipe_and_replace"
                  )
                }
                value={restoreStrategy}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="skip">Skip existing records</SelectItem>
                  <SelectItem value="overwrite">
                    Overwrite existing records
                  </SelectItem>
                  <SelectItem value="wipe_and_replace">
                    ⚠️ Wipe & Replace (Dangerous)
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                {restoreStrategy === "skip" &&
                  "Records that already exist will be left unchanged."}
                {restoreStrategy === "overwrite" &&
                  "⚠️ Records that already exist will be replaced with backup data."}
                {restoreStrategy === "wipe_and_replace" &&
                  "🚨 ALL organization data will be DELETED first, then replaced with backup data."}
              </p>
            </div>
            {restoreStrategy === "wipe_and_replace" && (
              <div className="space-y-2">
                <Label className="text-destructive">
                  Type DELETE to confirm
                </Label>
                <input
                  className="flex h-10 w-full rounded-md border border-destructive bg-background px-3 py-2 text-sm"
                  onChange={(e) => setWipeConfirmation(e.target.value)}
                  placeholder="Type DELETE here"
                  type="text"
                  value={wipeConfirmation}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setRestoreBackup(null);
                setWipeConfirmation("");
              }}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={
                restoreMutation.isPending ||
                (restoreStrategy === "wipe_and_replace" &&
                  wipeConfirmation !== "DELETE")
              }
              onClick={handleRestore}
              variant={
                restoreStrategy === "wipe_and_replace"
                  ? "destructive"
                  : "default"
              }
            >
              {restoreMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {restoreStrategy === "wipe_and_replace"
                ? "Wipe & Restore"
                : "Restore"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BackupCreateDialog
        description="Create a backup of your organization data and files."
        isPending={createMutation.isPending}
        onOpenChange={setIsDialogOpen}
        onSubmit={handleCreate}
        open={isDialogOpen}
        title="Create Organization Backup"
      />
    </div>
  );
}
