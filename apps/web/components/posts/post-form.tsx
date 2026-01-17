"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ExamplePost, ExamplePostStatus } from "@workspace/contracts";
import {
  examplePostsCreateMutation,
  examplePostsUpdateMutation,
} from "@workspace/contracts/query";
import { Button } from "@workspace/ui/components/button";
import { Calendar } from "@workspace/ui/components/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Field, FieldGroup, FieldLabel } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Switch } from "@workspace/ui/components/switch";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  type CompressedFileWithPreview,
  FileUploader,
  ImageUploader,
  type UploadFile,
} from "@workspace/ui/composed/file-upload";
import { cn } from "@workspace/ui/lib/utils";
import { format } from "date-fns";
import { ArrowLeft, CalendarIcon, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { apiClient, getErrorMessage } from "@/lib/api-client";
import { useActiveOrganization, useSession } from "@/lib/auth";
import { env } from "@/lib/env";

interface PostFormProps {
  post?: ExamplePost;
  mode: "create" | "edit";
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Form logic is complex but standard
export function PostForm({ post, mode }: PostFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: orgData } = useActiveOrganization();
  const { data: session } = useSession();
  const orgId = orgData?.id ?? "";
  const userId = session?.user?.id ?? "";

  // Basic Fields
  const [title, setTitle] = useState(post?.title ?? "");
  const [content, setContent] = useState(post?.content ?? "");
  const [status, setStatus] = useState<ExamplePostStatus>(
    post?.status ?? "draft"
  );
  const [category, setCategory] = useState(post?.category ?? "");
  const [tags, setTags] = useState(post?.tags?.join(", ") ?? "");
  const [isFeatured, setIsFeatured] = useState(post?.isFeatured ?? false);
  const [publishDate, setPublishDate] = useState<Date | undefined>(
    post?.publishDate ? new Date(post.publishDate) : undefined
  );

  // File Relations (IDs)
  const [coverImageId, setCoverImageId] = useState<string | undefined>(
    post?.coverImageId
  );
  const [attachmentFileId, setAttachmentFileId] = useState<string | undefined>(
    post?.attachmentFileId
  );
  const [galleryImageIds, setGalleryImageIds] = useState<string[]>(
    post?.galleryImageIds ?? []
  );
  const [documentFileIds, setDocumentFileIds] = useState<string[]>(
    post?.documentFileIds ?? []
  );

  const [error, setError] = useState<string | null>(null);

  // Helper to upload a single file using XHR for progress
  const uploadFile = (
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<{ id: string; url: string }> => {
    if (!orgId) {
      throw new Error("Organization ID missing");
    }

    const formData = new FormData();
    formData.append("file", file);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      if (onProgress) {
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            onProgress(Math.round((e.loaded / e.total) * 100));
          }
        });
      }

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            // Assuming API returns { id: string, ... } or similar wrapper
            // Adjust based on actual API response structure.
            // Usually modules/files/services returns File object.
            resolve({ id: response.id, url: response.url });
          } catch (_e) {
            reject(new Error("Invalid response from server"));
          }
        } else {
          reject(new Error("Upload failed"));
        }
      });

      xhr.addEventListener("error", () => reject(new Error("Network error")));
      xhr.open("POST", `${env.NEXT_PUBLIC_API_URL}/v1/orgs/${orgId}/files`);
      xhr.withCredentials = true;
      xhr.send(formData);
    });
  };

  // Handlers for ImageUploader (Cover)
  const handleCoverUpload = async (files: CompressedFileWithPreview[]) => {
    if (files.length === 0) {
      return;
    }
    const file = files[0];
    if (!file) {
      return;
    }
    try {
      const { id } = await uploadFile(file);
      setCoverImageId(id);
      toast.success("Cover image uploaded");
    } catch (_e) {
      toast.error("Failed to upload cover image");
    }
  };

  // Handlers for ImageUploader (Gallery)
  const handleGalleryUpload = async (files: CompressedFileWithPreview[]) => {
    const newIds: string[] = [];
    for (const file of files) {
      try {
        const { id } = await uploadFile(file);
        newIds.push(id);
      } catch (e) {
        console.error(e);
      }
    }
    if (newIds.length > 0) {
      setGalleryImageIds((prev) => [...prev, ...newIds]);
      toast.success(`Uploaded ${newIds.length} gallery images`);
    }
  };

  // Handlers for FileUploader (Attachment)
  const handleAttachmentUpload = async (
    fileState: UploadFile,
    onProgress: (p: number) => void
  ): Promise<string | undefined> => {
    const { id } = await uploadFile(fileState.file, onProgress);
    setAttachmentFileId(id);
    return id; // ID as URL/Identifier for Uploader
  };

  // Handlers for FileUploader (Documents)
  const handleDocumentUpload = async (
    fileState: UploadFile,
    onProgress: (p: number) => void
  ): Promise<string | undefined> => {
    const { id } = await uploadFile(fileState.file, onProgress);
    setDocumentFileIds((prev) => [...prev, id]);
    return id;
  };

  const createMutation = useMutation({
    ...examplePostsCreateMutation({ client: apiClient }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0] as { _id: string } | undefined;
          return key?._id === "examplePostsList";
        },
      });
      router.push("/posts");
    },
    onError: (err) => {
      setError(getErrorMessage(err));
    },
  });

  const updateMutation = useMutation({
    ...examplePostsUpdateMutation({ client: apiClient }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0] as { _id: string } | undefined;
          return key?._id === "examplePostsList";
        },
      });
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0] as { _id: string } | undefined;
          return key?._id === "examplePostsGet";
        },
      });
      router.push(`/posts/${post?.id}`);
    },
    onError: (err) => {
      setError(getErrorMessage(err));
    },
  });

  const isLoading = createMutation.isPending || updateMutation.isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    if (!content.trim()) {
      setError("Content is required");
      return;
    }

    const parseTags = tags
      .split(",")
      .map((t: string) => t.trim())
      .filter(Boolean);

    const payload = {
      title,
      content,
      status,
      category: category || undefined,
      tags: parseTags,
      isFeatured,
      publishDate: publishDate?.toISOString(),
      coverImageId: coverImageId || undefined,
      attachmentFileId: attachmentFileId || undefined,
      galleryImageIds,
      documentFileIds,
    };

    if (mode === "create") {
      createMutation.mutate({
        path: { orgId },
        body: { ...payload, authorId: userId },
      });
    } else if (post) {
      updateMutation.mutate({
        path: { orgId, id: post.id },
        body: payload,
      });
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-4">
          <Button asChild size="icon" variant="ghost">
            <Link href="/posts">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <CardTitle>
              {mode === "create" ? "Create Post" : "Edit Post"}
            </CardTitle>
            <CardDescription>
              {mode === "create"
                ? "Create a new blog post"
                : "Update your blog post"}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-destructive text-sm">
                {error}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="title">Title</FieldLabel>
                <Input
                  disabled={isLoading}
                  id="title"
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter post title"
                  value={title}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="category">Category</FieldLabel>
                <Input
                  disabled={isLoading}
                  id="category"
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. Technology, Lifestyle"
                  value={category}
                />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="tags">Tags (comma separated)</FieldLabel>
              <Input
                disabled={isLoading}
                id="tags"
                onChange={(e) => setTags(e.target.value)}
                placeholder="react, typescript, api"
                value={tags}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="content">Content</FieldLabel>
              <Textarea
                className="min-h-[200px]"
                disabled={isLoading}
                id="content"
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your post content (Markdown supported)"
                value={content}
              />
            </Field>

            <div className="grid gap-4 md:grid-cols-3">
              <Field>
                <FieldLabel htmlFor="status">Status</FieldLabel>
                <Select
                  disabled={isLoading}
                  onValueChange={(value) =>
                    setStatus(value as ExamplePostStatus)
                  }
                  value={status}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel>Publish Date</FieldLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !publishDate && "text-muted-foreground"
                      )}
                      variant={"outline"}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {publishDate ? (
                        format(publishDate, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      initialFocus
                      mode="single"
                      onSelect={setPublishDate}
                      selected={publishDate}
                    />
                  </PopoverContent>
                </Popover>
              </Field>

              <Field>
                <FieldLabel>Featured</FieldLabel>
                <div className="flex h-10 items-center gap-2">
                  <Switch
                    checked={isFeatured}
                    id="featured"
                    onCheckedChange={setIsFeatured}
                  />
                  <label className="cursor-pointer text-sm" htmlFor="featured">
                    Feature this post
                  </label>
                </div>
              </Field>
            </div>

            <hr className="my-4" />

            <div className="grid gap-6 md:grid-cols-2">
              <Field>
                <FieldLabel>Cover Image</FieldLabel>
                {coverImageId && (
                  <div className="mb-2 text-muted-foreground text-xs">
                    Current ID: {coverImageId}
                  </div>
                )}
                <ImageUploader
                  autoUpload={true}
                  defaultOptions={{
                    maxSizeMB: 1,
                    maxWidthOrHeight: 1200,
                  }}
                  enableCropping={true}
                  onConfirm={handleCoverUpload}
                  showCompressionOptions={false}
                  showConfirmButton={false}
                />
              </Field>

              <Field>
                <FieldLabel>Attachment (PDF, ZIP)</FieldLabel>
                {attachmentFileId && (
                  <div className="mb-2 text-muted-foreground text-xs">
                    Current ID: {attachmentFileId}
                  </div>
                )}
                <FileUploader
                  autoUpload={true}
                  maxFiles={1}
                  onUpload={handleAttachmentUpload}
                />
              </Field>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Field>
                <FieldLabel>Gallery Images</FieldLabel>
                {galleryImageIds.length > 0 && (
                  <div className="mb-2 text-muted-foreground text-xs">
                    {galleryImageIds.length} images selected
                  </div>
                )}
                <ImageUploader
                  autoUpload={true}
                  defaultOptions={{
                    maxSizeMB: 1,
                    maxWidthOrHeight: 1200,
                  }}
                  enableCropping={false}
                  onConfirm={handleGalleryUpload}
                  showCompressionOptions={false}
                  showConfirmButton={false}
                />
              </Field>

              <Field>
                <FieldLabel>Related Documents</FieldLabel>
                {documentFileIds.length > 0 && (
                  <div className="mb-2 text-muted-foreground text-xs">
                    {documentFileIds.length} documents selected
                  </div>
                )}
                <FileUploader
                  autoUpload={true}
                  key="docs-uploader"
                  maxFiles={5}
                  onUpload={handleDocumentUpload}
                />
              </Field>
            </div>

            <div className="flex gap-4">
              <Button disabled={isLoading} type="submit">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === "create" ? "Create Post" : "Save Changes"}
              </Button>
              <Button
                asChild
                disabled={isLoading}
                type="button"
                variant="outline"
              >
                <Link href="/posts">Cancel</Link>
              </Button>
            </div>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
