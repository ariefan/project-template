"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import {
  FileUploader,
  type UploadFile,
} from "@workspace/ui/composed/file-upload";
import {
  type CompressedFileWithPreview,
  ImageCompressor,
} from "@workspace/ui/composed/file-upload";
import { Code, Crop, Download, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useActiveOrganization } from "@/lib/auth";
import { env } from "@/lib/env";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Format bytes to human readable
function formatBytes(bytes: number): string {
  if (bytes === 0) {
    return "0 B";
  }
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
}

interface StoredFile {
  id: string;
  filename: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
}

export function StorageTester() {
  const { data: organization } = useActiveOrganization();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("upload");
  const [isClient, setIsClient] = useState(false);
  // FileUploader options
  const [isMultiple, setIsMultiple] = useState(true);

  const [isUploadingCompressed, setIsUploadingCompressed] = useState(false);
  const [showCode, setShowCode] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Fetch files
  const filesQuery = useQuery({
    queryKey: ["files", organization?.id],
    queryFn: async () => {
      if (!organization?.id) {
        return [];
      }
      const response = await fetch(
        `${env.NEXT_PUBLIC_API_URL}/v1/orgs/${organization.id}/files?page=1&pageSize=50`,
        { credentials: "include" }
      );
      if (!response.ok) {
        throw new Error("Failed to fetch files");
      }
      const data = await response.json();
      return (data as { data: StoredFile[] }).data || [];
    },
    enabled: !!organization?.id,
  });

  // Delete file
  const deleteFile = async (fileId: string) => {
    if (!organization?.id) {
      throw new Error("No organization selected");
    }
    const response = await fetch(
      `${env.NEXT_PUBLIC_API_URL}/v1/orgs/${organization.id}/files/${fileId}`,
      { method: "DELETE", credentials: "include" }
    );
    if (!response.ok) {
      throw new Error("Failed to delete file");
    }
    toast.success("File deleted");
    queryClient.invalidateQueries({ queryKey: ["files"] });
  };

  // Upload with progress tracking using XMLHttpRequest
  // Note: Updated to match FileUploader interface
  const uploadFile = async (
    fileState: UploadFile,
    onProgress: (progress: number) => void
  ): Promise<string | void> => {
    if (!organization?.id) {
      throw new Error("No organization selected");
    }

    const formData = new FormData();
    formData.append("file", fileState.file);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          onProgress(progress);
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          try {
            const error = JSON.parse(xhr.responseText);
            reject(new Error(error.error?.message || "Upload failed"));
          } catch {
            reject(new Error("Upload failed"));
          }
        }
      });

      xhr.addEventListener("error", () => reject(new Error("Network error")));

      xhr.open(
        "POST",
        `${env.NEXT_PUBLIC_API_URL}/v1/orgs/${organization.id}/files`
      );
      xhr.withCredentials = true;
      xhr.send(formData);
    });
  };

  // Handle upload of compressed files
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Developer tool with async upload logic
  const handleCompressedUpload = async (files: CompressedFileWithPreview[]) => {
    if (files.length === 0 || !organization?.id) {
      return;
    }

    setIsUploadingCompressed(true);
    let successCount = 0;
    let errorCount = 0;

    for (const file of files) {
      try {
        await uploadFile(
          {
            id: file.name,
            file,
            progress: 0,
            status: "idle",
          },
          () => {} // No progress tracking for this simplified example
        );
        successCount++;
      } catch {
        errorCount++;
      }
    }

    setIsUploadingCompressed(false);

    if (successCount > 0) {
      toast.success(
        `Uploaded ${successCount} compressed file${successCount !== 1 ? "s" : ""} successfully`
      );
      queryClient.invalidateQueries({ queryKey: ["files"] });
    }
    if (errorCount > 0) {
      toast.error(
        `${errorCount} file${errorCount !== 1 ? "s" : ""} failed to upload`
      );
    }
  };

  return (
    <div className="container mx-auto max-w-5xl space-y-6 py-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-3xl tracking-tight">
              Storage Playground
            </h1>
            <p className="text-muted-foreground">
              Developer demo: file uploads with progress, image compression,
              WhatsApp-style cropping, and API integration.
            </p>
          </div>
          <Button
            onClick={() => setShowCode(!showCode)}
            size="sm"
            variant={showCode ? "default" : "outline"}
          >
            <Code className="mr-2 h-4 w-4" />
            {showCode ? "Hide Code" : "View Code"}
          </Button>
        </div>
      </div>

      {/* Organization Info */}
      {organization && (
        <div className="rounded-lg border bg-muted/50 px-4 py-3 text-sm">
          <span className="text-muted-foreground">Organization: </span>
          <span className="font-medium">{organization.name}</span>
          <span className="mx-2 text-muted-foreground">•</span>
          <span className="text-muted-foreground">ID: </span>
          <span className="font-mono text-xs">{organization.id}</span>
        </div>
      )}

      {/* Code Snippet Panel */}
      {showCode && (
        <Card className="border-primary/50 bg-muted/30">
          <CardHeader className="pb-3">
            <CardTitle className="font-mono text-sm">
              Implementation Pattern
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-lg bg-card p-4 text-xs">
              <code>{`// Upload with progress tracking
const uploadFile = async (file: File, onProgress: (p: number) => void) => {
  const formData = new FormData();
  formData.append("file", file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error("Upload failed"));
    });

    xhr.open("POST", "/api/files");
    xhr.withCredentials = true;
    xhr.send(formData);
  });
};

// Usage
<FileUploader onUpload={uploadFile} />
`}</code>
            </pre>
          </CardContent>
        </Card>
      )}

      <Tabs
        className="w-full"
        defaultValue="upload"
        onValueChange={setActiveTab}
        {...(isClient && { value: activeTab })}
      >
        <TabsList className="grid w-full grid-cols-3 lg:w-[450px]">
          <TabsTrigger value="upload">Upload</TabsTrigger>
          <TabsTrigger value="compression">Compression</TabsTrigger>
          <TabsTrigger value="manager">
            Files
            {filesQuery.data && filesQuery.data.length > 0 && (
              <span className="ml-2 rounded bg-primary/20 px-1.5 text-xs">
                {filesQuery.data.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Upload Tab */}
        <TabsContent value="upload">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>File Upload</CardTitle>
                  <CardDescription>
                    Upload files to your organization storage with progress tracking
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={() => setIsMultiple(!isMultiple)}
                        size="sm"
                        variant="outline"
                    >
                        {isMultiple ? "Multi-File" : "Single File"} Mode
                    </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <FileUploader
                maxSize={MAX_FILE_SIZE}
                multiple={isMultiple}
                onUpload={uploadFile}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compression Tab */}
        <TabsContent value="compression">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Crop className="h-5 w-5 text-primary" />
                <CardTitle>Image Compression & Cropping</CardTitle>
              </div>
              <CardDescription>
                Compress images client-side before uploading. Enable cropping to
                rotate, flip, and crop images with preset aspect ratios (square,
                4:3, 16:9) before compression.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ImageCompressor
                defaultOptions={{
                  alwaysKeepResolution: false,
                  maxSizeMB: 1,
                  maxWidthOrHeight: 1920,
                  useWebWorker: true,
                }}
                isUploading={isUploadingCompressed}
                onCompressed={() => {
                  // Refresh files list after compression
                  queryClient.invalidateQueries({ queryKey: ["files"] });
                }}
                onUpload={handleCompressedUpload}
                showUploadButton
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* File Manager Tab */}
        <TabsContent value="manager">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Files</CardTitle>
                  <CardDescription>
                    {filesQuery.data?.length || 0} files stored
                  </CardDescription>
                </div>
                <Button
                  onClick={() => filesQuery.refetch()}
                  size="sm"
                  variant="outline"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Uploaded</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filesQuery.isLoading && (
                      <TableRow>
                        <TableCell
                          className="py-8 text-center text-muted-foreground"
                          colSpan={5}
                        >
                          Loading...
                        </TableCell>
                      </TableRow>
                    )}
                    {!filesQuery.isLoading && filesQuery.data?.length === 0 && (
                      <TableRow>
                        <TableCell
                          className="py-8 text-center text-muted-foreground"
                          colSpan={5}
                        >
                          No files. Upload some to get started.
                        </TableCell>
                      </TableRow>
                    )}
                    {!filesQuery.isLoading &&
                      (filesQuery.data?.length ?? 0) > 0 &&
                      filesQuery.data?.map((file) => (
                        <TableRow key={file.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {file.mimeType.startsWith("image/") && (
                                <div className="flex h-8 w-8 items-center justify-center rounded bg-muted text-[10px] text-muted-foreground">
                                  IMG
                                </div>
                              )}
                              <span className="max-w-[200px] truncate">
                                {file.filename}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">
                            {file.mimeType}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {formatBytes(file.size)}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">
                            {new Date(file.uploadedAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                onClick={() =>
                                  window.open(
                                    `${env.NEXT_PUBLIC_API_URL}/v1/orgs/${organization?.id}/files/${file.id}/download`,
                                    "_blank"
                                  )
                                }
                                size="icon"
                                title="Download"
                                variant="ghost"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                className="text-destructive hover:bg-destructive/10"
                                onClick={() => deleteFile(file.id)}
                                size="icon"
                                title="Delete"
                                variant="ghost"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
