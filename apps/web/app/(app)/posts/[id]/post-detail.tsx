"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ExamplePost, ExamplePostStatus } from "@workspace/contracts";
import {
  examplePostsDeleteMutation,
  examplePostsGetOptions,
} from "@workspace/contracts/query";
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
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@workspace/ui/components/carousel";
import { Separator } from "@workspace/ui/components/separator";
import { ConfirmDialog } from "@workspace/ui/composed/confirm-dialog";
import { format } from "date-fns";
import {
  ArrowLeft,
  Calendar,
  Edit,
  FileText,
  Loader2,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { useActiveOrganization } from "@/lib/auth";
import { env } from "@/lib/env";

interface PostDetailProps {
  id: string;
}

const STATUS_COLORS: Record<ExamplePostStatus, string> = {
  draft: "bg-gray-100 text-gray-800",
  published: "bg-green-100 text-green-800",
  archived: "bg-yellow-100 text-yellow-800",
};

export function PostDetail({ id }: PostDetailProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: orgData } = useActiveOrganization();
  const orgId = orgData?.id ?? "";

  const { data, isLoading, error } = useQuery(
    examplePostsGetOptions({
      client: apiClient,
      path: { orgId, id },
    })
  );

  const deleteMutation = useMutation({
    ...examplePostsDeleteMutation({ client: apiClient }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0] as { _id: string };
          return key?._id === "examplePostsList";
        },
      });
      router.push("/posts");
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-destructive">Failed to load post</p>
          <Button asChild className="mt-4" variant="outline">
            <Link href="/posts">Back to Posts</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const post = (data as { data: ExamplePost }).data;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <Button asChild className="mt-1" size="icon" variant="ghost">
              <Link href="/posts">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <CardTitle className="text-2xl">{post.title}</CardTitle>
                <Badge
                  className={STATUS_COLORS[post.status]}
                  variant="secondary"
                >
                  {post.status}
                </Badge>
                {post.isFeatured && (
                  <Badge
                    className="bg-amber-500 hover:bg-amber-600"
                    variant="default"
                  >
                    Featured
                  </Badge>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {post.category && (
                  <Badge variant="outline">{post.category}</Badge>
                )}
                {post.tags?.map((tag) => (
                  <Badge className="text-xs" key={tag} variant="secondary">
                    #{tag}
                  </Badge>
                ))}
              </div>
              <CardDescription className="mt-2 flex items-center gap-4">
                <span>
                  Created {format(new Date(post.createdAt), "MMMM d, yyyy")}
                </span>
                {post.publishDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Publish:{" "}
                    {format(new Date(post.publishDate), "MMMM d, yyyy")}
                  </span>
                )}
              </CardDescription>
            </div>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href={`/posts/${id}/edit`}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>
            <ConfirmDialog
              description="Are you sure you want to delete this post? This action cannot be undone."
              onConfirm={async () => {
                await deleteMutation.mutateAsync({ path: { orgId, id } });
              }}
              title="Delete Post"
              trigger={
                <Button
                  disabled={deleteMutation.isPending}
                  variant="destructive"
                >
                  {deleteMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  Delete
                </Button>
              }
              variant="destructive"
            />
          </div>
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="pt-6">
        <div className="space-y-6">
          {/* Cover Image */}
          {post.coverImageId && (
            <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-muted">
              {/* biome-ignore lint/a11y/useAltText: Demo */}
              {/* biome-ignore lint/correctness/useImageSize: Dynamic content */}
              {/* biome-ignore lint/performance/noImgElement: External URL */}
              <img
                className="h-full w-full object-cover"
                src={`${env.NEXT_PUBLIC_API_URL}/v1/orgs/${orgId}/files/${post.coverImageId}/download`}
              />
            </div>
          )}

          {/* Content */}
          <div className="prose dark:prose-invert max-w-none">
            <div className="whitespace-pre-wrap">{post.content}</div>
          </div>

          {/* Gallery */}
          {post.galleryImageIds && post.galleryImageIds.length > 0 && (
            <div>
              <h3 className="mb-4 font-semibold text-lg">Gallery</h3>
              <Carousel className="mx-auto w-full max-w-2xl">
                <CarouselContent>
                  {post.galleryImageIds.map((id) => (
                    <CarouselItem key={id}>
                      <div className="aspect-video w-full overflow-hidden rounded-lg border bg-muted">
                        {/* biome-ignore lint/a11y/useAltText: Demo */}
                        {/* biome-ignore lint/correctness/useImageSize: Dynamic content */}
                        {/* biome-ignore lint/performance/noImgElement: External URL */}
                        <img
                          className="h-full w-full object-contain"
                          src={`${env.NEXT_PUBLIC_API_URL}/v1/orgs/${orgId}/files/${id}/download`}
                        />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious />
                <CarouselNext />
              </Carousel>
            </div>
          )}

          {/* Attachments */}
          {(post.attachmentFileId ||
            (post.documentFileIds && post.documentFileIds.length > 0)) && (
            <div>
              <h3 className="mb-4 font-semibold text-lg">Attachments</h3>
              <div className="grid gap-2 md:grid-cols-2">
                {post.attachmentFileId && (
                  <Button
                    asChild
                    className="h-auto justify-start py-4"
                    variant="outline"
                  >
                    <a
                      href={`${env.NEXT_PUBLIC_API_URL}/v1/orgs/${orgId}/files/${post.attachmentFileId}/download`}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      <div className="text-left">
                        <div className="font-medium">Main Attachment</div>
                        <div className="text-muted-foreground text-xs">
                          Download
                        </div>
                      </div>
                    </a>
                  </Button>
                )}
                {post.documentFileIds?.map((id, idx) => (
                  <Button
                    asChild
                    className="h-auto justify-start py-4"
                    key={id}
                    variant="outline"
                  >
                    <a
                      href={`${env.NEXT_PUBLIC_API_URL}/v1/orgs/${orgId}/files/${id}/download`}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      <div className="text-left">
                        <div className="font-medium">Document {idx + 1}</div>
                        <div className="text-muted-foreground text-xs">
                          Download
                        </div>
                      </div>
                    </a>
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
