"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { FileAccess, File as FileRecord } from "@workspace/contracts";
import {
  filesDeleteMutation,
  filesListOptions,
  filesUpdateMutation,
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
import { format } from "date-fns";
import {
  Download,
  File as FileIcon,
  FileImage,
  FileText,
  FileVideo,
  FolderOpen,
  Globe,
  Loader2,
  Lock,
  MoreHorizontal,
  Trash2,
  Upload,
} from "lucide-react";
import { useRef, useState } from "react";
import { apiClient, getErrorMessage } from "@/lib/api-client";
import { useActiveOrganization } from "@/lib/auth";

function formatFileSize(bytes: number): string {
  if (bytes === 0) {
    return "0 Bytes";
  }
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) {
    return <FileImage className="h-5 w-5 text-blue-500" />;
  }
  if (mimeType.startsWith("video/")) {
    return <FileVideo className="h-5 w-5 text-purple-500" />;
  }
  if (mimeType.includes("pdf") || mimeType.includes("text")) {
    return <FileText className="h-5 w-5 text-red-500" />;
  }
  return <FileIcon className="h-5 w-5 text-gray-500" />;
}

function getScanStatusVariant(status: string) {
  if (status === "clean") {
    return "default";
  }
  if (status === "infected") {
    return "destructive";
  }
  return "secondary";
}

export function FilesList() {
  const queryClient = useQueryClient();
  const { data: orgData } = useActiveOrganization();
  const orgId = orgData?.id ?? "";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [page, setPage] = useState(1);
  const [accessFilter, setAccessFilter] = useState<FileAccess | "all">("all");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    ...filesListOptions({
      client: apiClient,
      path: { orgId },
      query: {
        page,
        pageSize: 20,
        access: accessFilter === "all" ? undefined : accessFilter,
      },
    }),
    enabled: Boolean(orgId),
  });

  const deleteMutation = useMutation({
    ...filesDeleteMutation({ client: apiClient }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["filesList"] });
      setDeleteTarget(null);
    },
  });

  const updateMutation = useMutation({
    ...filesUpdateMutation({ client: apiClient }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["filesList"] });
    },
  });

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/v1/orgs/${orgId}/files`,
        {
          method: "POST",
          body: formData,
          credentials: "include",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message ?? "Upload failed");
      }

      queryClient.invalidateQueries({ queryKey: ["filesList"] });
      setIsUploadDialogOpen(false);
    } catch (err) {
      setUploadError(getErrorMessage(err));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function handleDeleteConfirm() {
    if (deleteTarget) {
      deleteMutation.mutate({ path: { orgId, fileId: deleteTarget } });
    }
  }

  function handleDownload(fileId: string, filename: string) {
    const downloadUrl = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/v1/orgs/${orgId}/files/${fileId}/download`;
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = filename;
    link.click();
  }

  function handleToggleAccess(fileId: string, currentAccess: FileAccess) {
    const newAccess: FileAccess =
      currentAccess === "private" ? "public" : "private";
    updateMutation.mutate({
      path: { orgId, fileId },
      body: { access: newAccess },
    });
  }

  const files = (data as { data?: FileRecord[] })?.data ?? [];
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
      console.error("Files loading error:", error);
      return (
        <div className="py-12 text-center text-destructive">
          Failed to load files:{" "}
          {error instanceof Error ? error.message : "Unknown error"}
        </div>
      );
    }

    if (files.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FolderOpen className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">No files uploaded yet</p>
          <p className="mt-1 text-muted-foreground text-sm">
            Click "Upload File" to get started
          </p>
        </div>
      );
    }

    return (
      <>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>File</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Access</TableHead>
              <TableHead>Scan Status</TableHead>
              <TableHead>Uploaded</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {files.map((file) => (
              <TableRow key={file.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    {getFileIcon(file.mimeType)}
                    <div>
                      <p className="font-medium">{file.filename}</p>
                      <p className="text-muted-foreground text-xs">
                        {file.mimeType}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatFileSize(file.size)}
                </TableCell>
                <TableCell>
                  <Badge
                    className="cursor-pointer"
                    onClick={() => handleToggleAccess(file.id, file.access)}
                    variant={file.access === "public" ? "default" : "secondary"}
                  >
                    {file.access === "public" ? (
                      <Globe className="mr-1 h-3 w-3" />
                    ) : (
                      <Lock className="mr-1 h-3 w-3" />
                    )}
                    {file.access}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={getScanStatusVariant(file.virusScanStatus)}>
                    {file.virusScanStatus}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {format(new Date(file.uploadedAt), "MMM d, yyyy")}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleDownload(file.id, file.filename)}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleToggleAccess(file.id, file.access)}
                      >
                        {file.access === "public" ? (
                          <>
                            <Lock className="mr-2 h-4 w-4" />
                            Make Private
                          </>
                        ) : (
                          <>
                            <Globe className="mr-2 h-4 w-4" />
                            Make Public
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setDeleteTarget(file.id)}
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
              Page {page} of {pagination.totalPages} ({pagination.totalCount}{" "}
              files)
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
              <FolderOpen className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>Files</CardTitle>
                <CardDescription>Upload and manage your files</CardDescription>
              </div>
            </div>
            <Dialog
              onOpenChange={setIsUploadDialogOpen}
              open={isUploadDialogOpen}
            >
              <DialogTrigger asChild>
                <Button>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload File
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload File</DialogTitle>
                  <DialogDescription>
                    Select a file to upload (max 10MB)
                  </DialogDescription>
                </DialogHeader>
                {uploadError && (
                  <div className="rounded-md bg-destructive/10 p-3 text-destructive text-sm">
                    {uploadError}
                  </div>
                )}
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="file">File</Label>
                    <Input
                      disabled={isUploading}
                      id="file"
                      onChange={handleUpload}
                      ref={fileInputRef}
                      type="file"
                    />
                  </div>
                </div>
                <DialogFooter>
                  {isUploading && (
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading...
                    </div>
                  )}
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-4">
            <Select
              onValueChange={(value) => {
                setAccessFilter(value as FileAccess | "all");
                setPage(1);
              }}
              value={accessFilter}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by access" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Files</SelectItem>
                <SelectItem value="private">Private</SelectItem>
                <SelectItem value="public">Public</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {renderContent()}
        </CardContent>
      </Card>

      <AlertDialog
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        open={Boolean(deleteTarget)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete File</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this file? This action cannot be
              undone.
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
    </>
  );
}
