"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Backup } from "@workspace/contracts";
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
import { Input } from "@workspace/ui/components/input";
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
import { ConfirmDialog } from "@workspace/ui/composed/confirm-dialog";
import { format, formatDistanceToNow } from "date-fns";
import {
  AlertTriangle,
  Archive,
  DatabaseBackup,
  Download,
  Loader2,
  Lock,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import * as React from "react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layouts/page-header";
import { env } from "@/lib/env";
import {
  BackupCreateDialog,
  type CreateBackupOptions,
} from "../../../../components/backups/backup-create-dialog";

function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null || bytes === 0) {
    return "0 B";
  }
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
}

function renderBackupsContent(
  isLoading: boolean,
  backups: Backup[],
  deleteMutation: { isPending: boolean; mutate: (id: string) => void },
  restoreMutation: { isPending: boolean },
  handleDownload: (backup: Backup) => void,
  setRestoreBackup: (backup: Backup) => void
) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (backups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <Archive className="mb-2 h-10 w-10 text-muted-foreground" />
        <p className="text-muted-foreground">No system backups found</p>
        <p className="text-muted-foreground text-sm">
          Create a scheduled job or run a manual backup
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

// Helper to safely access metadata fields
function getBackupMeta(backup: Backup | null) {
  if (!backup) {
    return { isEncrypted: false, includesFiles: false };
  }
  const meta = backup.metadata as Record<string, unknown> | null | undefined;
  return {
    isEncrypted: meta?.isEncrypted === true,
    includesFiles: meta?.includesFiles === true,
  };
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
  const meta = getBackupMeta(backup);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

  return (
    <>
      <Item variant="default">
        <ItemMedia variant="icon">
          {meta.isEncrypted ? (
            <Lock className="size-4" />
          ) : (
            <DatabaseBackup className="size-4" />
          )}
        </ItemMedia>
        <ItemContent>
          <ItemTitle>
            {format(new Date(backup.createdAt), "MMM d, yyyy 'at' h:mm a")}
            {meta.isEncrypted && (
              <Badge className="ml-2 text-xs" variant="outline">
                <Lock className="mr-1 h-3 w-3" />
                Encrypted
              </Badge>
            )}
          </ItemTitle>
          <ItemDescription>
            {formatDistanceToNow(new Date(backup.createdAt), {
              addSuffix: true,
            })}
            {backup.fileSize && ` • ${formatBytes(backup.fileSize)}`}
            {meta.includesFiles && " • Full backup"}
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
          <Button
            disabled={isDeleting}
            onClick={() => setShowDeleteConfirm(true)}
            size="sm"
            variant="destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </ItemActions>
      </Item>
      <ConfirmDialog
        confirmLabel="Delete"
        description="Are you sure you want to delete this backup? This action cannot be undone."
        isLoading={isDeleting}
        onConfirm={() => {
          onDelete(backup.id);
          setShowDeleteConfirm(false);
        }}
        onOpenChange={setShowDeleteConfirm}
        open={showDeleteConfirm}
        title="Delete Backup"
        variant="destructive"
      />
    </>
  );
}

export default function SystemBackupsPage() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [downloadPassword, setDownloadPassword] = useState("");
  const [downloadingBackupId, setDownloadingBackupId] = useState<string | null>(
    null
  );
  // Restore state
  const [restoreBackup, setRestoreBackup] = useState<Backup | null>(null);
  const [restoreConfirmation, setRestoreConfirmation] = useState("");
  const [restorePassword, setRestorePassword] = useState("");

  // Fetch backups with polling for live updates
  const { data: backupsData, isLoading } = useQuery({
    queryKey: ["system-backups"],
    queryFn: async () => {
      const response = await fetch(
        `${env.NEXT_PUBLIC_API_URL}/v1/admin/backups`,
        {
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }
      );
      if (!response.ok) {
        throw new Error("Failed to fetch backups");
      }
      return response.json() as Promise<{ data: Backup[] }>;
    },
  });

  const backups = backupsData?.data ?? [];

  // Create backup mutation
  const createMutation = useMutation({
    mutationFn: async (options: CreateBackupOptions) => {
      const response = await fetch(
        `${env.NEXT_PUBLIC_API_URL}/v1/admin/backups`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(options),
        }
      );
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error?.message || "Failed to create backup");
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success("System backup started");
      queryClient.invalidateQueries({ queryKey: ["system-backups"] });
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Delete backup mutation
  const deleteMutation = useMutation({
    mutationFn: async (backupId: string) => {
      const response = await fetch(
        `${env.NEXT_PUBLIC_API_URL}/v1/admin/backups/${backupId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );
      if (!response.ok) {
        throw new Error("Failed to delete backup");
      }
    },
    onSuccess: () => {
      toast.success("Backup deleted");
      queryClient.invalidateQueries({ queryKey: ["system-backups"] });
    },
    onError: () => {
      toast.error("Failed to delete backup");
    },
  });

  // Restore mutation
  const restoreMutation = useMutation({
    mutationFn: async ({
      backupId,
      confirmation,
      password,
    }: {
      backupId: string;
      confirmation: string;
      password?: string;
    }) => {
      const response = await fetch(
        `${env.NEXT_PUBLIC_API_URL}/v1/admin/backups/${backupId}/restore`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ confirmation, password }),
        }
      );
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error?.message || "Failed to restore backup");
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success("System backup restored successfully!");
      setRestoreBackup(null);
      setRestoreConfirmation("");
      setRestorePassword("");
      queryClient.invalidateQueries({ queryKey: ["system-backups"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  function handleDownload(backup: Backup) {
    const { isEncrypted } = getBackupMeta(backup);

    if (isEncrypted) {
      setDownloadingBackupId(backup.id);
      setDownloadPassword("");
    } else {
      window.open(
        `${env.NEXT_PUBLIC_API_URL}/v1/admin/backups/${backup.id}/download`,
        "_blank"
      );
    }
  }

  function handleEncryptedDownload() {
    if (!(downloadingBackupId && downloadPassword)) {
      toast.error("Password is required");
      return;
    }
    window.open(
      `${env.NEXT_PUBLIC_API_URL}/v1/admin/backups/${downloadingBackupId}/download?password=${encodeURIComponent(downloadPassword)}`,
      "_blank"
    );
    setDownloadingBackupId(null);
    setDownloadPassword("");
  }

  function handleRestore() {
    if (!restoreBackup || restoreConfirmation !== "RESTORE") {
      toast.error("You must type 'RESTORE' to confirm");
      return;
    }
    const { isEncrypted } = getBackupMeta(restoreBackup);
    if (isEncrypted && !restorePassword) {
      toast.error("Password is required for encrypted backups");
      return;
    }
    restoreMutation.mutate({
      backupId: restoreBackup.id,
      confirmation: restoreConfirmation,
      password: isEncrypted ? restorePassword : undefined,
    });
  }

  return (
    <div className="container mx-auto max-w-7xl space-y-6 py-6">
      <PageHeader
        description="Manage system-wide database backups (pg_dump)"
        title="System Backups"
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>System Backups</CardTitle>
              <CardDescription>
                Create and manage full system backups (database + files)
              </CardDescription>
            </div>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create System Backup
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {renderBackupsContent(
            isLoading,
            backups,
            deleteMutation,
            restoreMutation,
            handleDownload,
            setRestoreBackup
          )}
        </CardContent>
      </Card>

      <BackupCreateDialog
        description="Create a full backup of the system database and storage files."
        isPending={createMutation.isPending}
        onOpenChange={setIsDialogOpen}
        onSubmit={(options) => createMutation.mutate(options)}
        open={isDialogOpen}
        title="Create System Backup"
      />

      {/* Password prompt dialog for encrypted downloads */}
      <Dialog
        onOpenChange={(open) => !open && setDownloadingBackupId(null)}
        open={!!downloadingBackupId}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter Decryption Password</DialogTitle>
            <DialogDescription>
              This backup is encrypted. Enter the password to download.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="downloadPassword">Password</Label>
              <Input
                id="downloadPassword"
                onChange={(e) => setDownloadPassword(e.target.value)}
                placeholder="Enter encryption password"
                type="password"
                value={downloadPassword}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleEncryptedDownload}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore confirmation dialog */}
      <ConfirmDialog
        cancelLabel="Cancel"
        confirmDisabled={restoreConfirmation !== "RESTORE"}
        confirmLabel="Restore Database"
        description="This will restore the ENTIRE database from backup, potentially overwriting ALL current data. This operation CANNOT be undone."
        icon={AlertTriangle}
        isLoading={restoreMutation.isPending}
        onConfirm={handleRestore}
        onOpenChange={(open) => {
          if (!open) {
            setRestoreBackup(null);
            setRestoreConfirmation("");
            setRestorePassword("");
          }
        }}
        open={!!restoreBackup}
        title="DANGEROUS OPERATION"
        variant="destructive"
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-destructive text-sm">
            <strong>Warning:</strong> Restoring a system backup will:
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>Drop and recreate database objects</li>
              <li>Overwrite ALL current data</li>
              <li>Potentially cause downtime</li>
            </ul>
          </div>
          {getBackupMeta(restoreBackup).isEncrypted && (
            <div className="space-y-2">
              <Label htmlFor="restorePassword">Decryption Password</Label>
              <Input
                id="restorePassword"
                onChange={(e) => setRestorePassword(e.target.value)}
                placeholder="Enter backup password"
                type="password"
                value={restorePassword}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="restoreConfirmation">
              Type <span className="font-bold font-mono">RESTORE</span> to
              confirm
            </Label>
            <Input
              id="restoreConfirmation"
              onChange={(e) => setRestoreConfirmation(e.target.value)}
              placeholder="RESTORE"
              value={restoreConfirmation}
            />
          </div>
        </div>
      </ConfirmDialog>
    </div>
  );
}
