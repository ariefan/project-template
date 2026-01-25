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
import { Label } from "@workspace/ui/components/label";
import { Switch } from "@workspace/ui/components/switch";
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
  AvatarUploader,
  type CompressedFileWithPreview,
  FileUploader,
  ImageUploader,
  type ImageUploaderRef,
  type UploadFile,
} from "@workspace/ui/composed/file-upload";
import { Code, Crop, Download, RefreshCw, Trash2 } from "lucide-react";
import React, { useEffect, useState } from "react";
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
  const [isAutoUpload, setIsAutoUpload] = useState(true);
  const [showCompressionOptions, setShowCompressionOptions] = useState(true);
  const [enableCropping, setEnableCropping] = useState(true);
  const [autoImageUpload, setAutoImageUpload] = useState(true);
  const [fileUploaderKey, setFileUploaderKey] = useState(0);
  const imageUploaderRef = React.useRef<ImageUploaderRef>(null);
  const [exampleFiles, setExampleFiles] = useState<UploadFile[]>([]);

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
  const uploadFile = (
    fileState: UploadFile,
    onProgress: (progress: number) => void
  ): Promise<string | undefined> => {
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
          resolve(undefined);
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

  // Generate example data
  const loadExampleFiles = () => {
    const textFile = new File(
      ["This is a test text file content."],
      "document.txt",
      {
        type: "text/plain",
        lastModified: Date.now(),
      }
    );

    // Create a dummy PDF file (empty)
    const pdfFile = new File(["%PDF-1.4\n..."], "report.pdf", {
      type: "application/pdf",
      lastModified: Date.now(),
    });

    const newFiles: UploadFile[] = [
      {
        id: "example-1",
        file: Object.assign(textFile, { preview: undefined }),
        progress: 0,
        status: "idle",
      },
      {
        id: "example-2",
        file: Object.assign(pdfFile, { preview: undefined }),
        progress: 0,
        status: "idle",
      },
    ];

    setExampleFiles(newFiles);
    setFileUploaderKey((prev) => prev + 1);
    toast.success("Loaded example files");
  };

  const loadExampleImages = async () => {
    const toastId = toast.loading("Fetching example images...");

    try {
      const exampleImageUrls = [
        "/demo/image-01.jpg",
        "/demo/image-02.jpg",
        "/demo/image-03.jpg",
        "/demo/image-04.jpg",
        "/demo/image-05.jpg",
      ];

      const files = await Promise.all(
        exampleImageUrls.map(async (url, i) => {
          const res = await fetch(url);
          const blob = await res.blob();
          return new File([blob], `example-${i + 1}.jpg`, {
            type: "image/jpeg",
          });
        })
      );

      // Reset uploader to clear previous files if we want fresh start,
      // or just append. Let's append to demonstrate adding files.
      // If we want fresh start, we can call clearFiles() first.
      imageUploaderRef.current?.clearFiles();
      // Small delay to ensure state update if clearing
      setTimeout(() => {
        imageUploaderRef.current?.addFiles(files);
      }, 0);

      toast.success("Example images loaded", { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error("Failed to load example images", { id: toastId });
    }
  };

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6">
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
      {isClient && organization && (
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

      <Tabs className="w-full" onValueChange={setActiveTab} value={activeTab}>
        <TabsList className="grid w-full grid-cols-3 lg:w-[450px]">
          <TabsTrigger value="upload">File Upload</TabsTrigger>
          <TabsTrigger value="compression">Image Upload</TabsTrigger>
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
                    Upload files to your organization storage with progress
                    tracking
                  </CardDescription>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={isAutoUpload}
                      id="auto-upload"
                      onCheckedChange={setIsAutoUpload}
                    />
                    <Label htmlFor="auto-upload">Auto Upload</Label>
                  </div>
                  <Button
                    onClick={loadExampleFiles}
                    size="sm"
                    variant="secondary"
                  >
                    Load Example Data
                  </Button>
                  <Button
                    onClick={() => setIsMultiple(!isMultiple)}
                    size="sm"
                    variant="outline"
                  >
                    {isMultiple ? "Multi-File" : "Single File"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <FileUploader
                autoUpload={isAutoUpload}
                initialFiles={exampleFiles}
                key={fileUploaderKey}
                maxSize={MAX_FILE_SIZE}
                multiple={isMultiple}
                onUpload={uploadFile}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Image Upload Tab */}
        <TabsContent value="compression">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="avatar">Avatar</TabsTrigger>
              <TabsTrigger value="cover">Cover Image</TabsTrigger>
              <TabsTrigger value="small">Small Input</TabsTrigger>
            </TabsList>

            {/* General Example */}
            <TabsContent value="general">
              <Card>
                <CardHeader>
                  <CardTitle>General Image Upload</CardTitle>
                  <CardDescription>
                    Standard uploader with all features enabled (cropping, defaults).
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 flex items-center gap-4">
                    <Button
                      onClick={loadExampleImages}
                      size="sm"
                      variant="secondary"
                    >
                      Load Example Images
                    </Button>
                    <div className="flex items-center gap-2">
                         <Label>Options:</Label>
                         <Switch checked={enableCropping} onCheckedChange={setEnableCropping} /> <span className="text-sm">Cropping</span>
                         <Switch checked={showCompressionOptions} onCheckedChange={setShowCompressionOptions} /> <span className="text-sm">Compression UI</span>
                    </div>
                  </div>
                  <ImageUploader
                    autoUpload={autoImageUpload}
                    enableCropping={enableCropping}
                    isUploading={isUploadingCompressed}
                    onConfirm={handleCompressedUpload}
                    showCompressionOptions={showCompressionOptions}
                    showConfirmButton
                    ref={imageUploaderRef}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Avatar Example */}
            <TabsContent value="avatar">
              <Card>
                <CardHeader>
                  <CardTitle>Avatar Upload</CardTitle>
                  <CardDescription>
                    Circular crop, 1:1 aspect ratio, single file.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center gap-4">
                    <AvatarUploader
                      autoUpload={false}
                      initials="JD"
                      onConfirm={handleCompressedUpload}
                      showConfirmButton
                    />
                    <p className="text-muted-foreground text-sm">
                      Click to upload or drag & drop. Hover to edit.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Cover Image Example */}
            <TabsContent value="cover">
              <Card>
                 <CardHeader>
                  <CardTitle>Cover Image Upload</CardTitle>
                  <CardDescription>
                    Fixed 16:9 aspect ratio, single file.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                   <ImageUploader
                      autoUpload={false}
                      aspectRatio={16/9}
                      lockAspectRatio
                      enableCropping
                      maxFiles={1}
                      onConfirm={handleCompressedUpload}
                      showCompressionOptions
                      showConfirmButton
                    />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Small Input Example */}
            <TabsContent value="small">
               <Card>
                 <CardHeader>
                  <CardTitle>Small Input</CardTitle>
                  <CardDescription>
                    Compact variant for tight spaces.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Profile Picture</Label>
                    <ImageUploader
                      autoUpload={false}
                      maxFiles={1}
                      onConfirm={handleCompressedUpload}
                      size="sm"
                      showConfirmButton={false}
                    />
                  </div>
                   <div className="space-y-2">
                    <Label>Cover Photo (Max 2)</Label>
                    <ImageUploader
                      autoUpload={false}
                      maxFiles={2}
                      onConfirm={handleCompressedUpload}
                      size="sm"
                      showConfirmButton={false}
                    />
                  </div>
                </CardContent>
               </Card>
            </TabsContent>

          </Tabs>
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
