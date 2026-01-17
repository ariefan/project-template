"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ExamplePost, ExamplePostStatus } from "@workspace/contracts";
import {
  examplePostsDeleteMutation,
  examplePostsGetOptions,
} from "@workspace/contracts/query";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import {
  FieldGroup,
  FieldLegend,
  FieldSet,
} from "@workspace/ui/components/field";
import { ConfirmDialog } from "@workspace/ui/composed/confirm-dialog";
import { format } from "date-fns";
import {
  Edit,
  File,
  FileText,
  Image as ImageIcon,
  Loader2,
  Star,
  Tag,
  Trash2,
  User,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/layouts/page-header";
import { apiClient, filesGet } from "@/lib/api-client";
import { useActiveOrganization } from "@/lib/auth";

interface CrudDetailProps {
  id: string;
}

const STATUS_COLORS: Record<ExamplePostStatus, string> = {
  draft: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  published:
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  archived:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
};

// Simple component to display a field label and value
function DetailField({
  label,
  children,
  icon: Icon,
}: {
  label: string;
  children: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-2 font-medium text-muted-foreground text-sm">
        {Icon && <Icon className="size-4" />}
        {label}
      </div>
      <div className="text-sm">{children}</div>
    </div>
  );
}

// Component to fetch and display an image by fileId
function FileImage({
  fileId,
  orgId,
  alt,
}: {
  fileId: string;
  orgId: string;
  alt: string;
}) {
  const { data: fileUrl } = useQuery({
    queryKey: ["file-url", fileId, orgId],
    queryFn: async () => {
      if (fileId.startsWith("file_picsum_")) {
        const id = fileId.replace("file_picsum_", "");
        return `https://picsum.photos/id/${id}/800/600`;
      }
      try {
        const { data, error } = await filesGet({
          client: apiClient,
          path: { orgId, fileId },
        });
        if (!error && data && "data" in data && data.data.url) {
          return data.data.url;
        }
        return null;
      } catch {
        return null;
      }
    },
    enabled: !!fileId,
    staleTime: 1000 * 60 * 60,
  });

  if (!fileUrl) {
    return (
      <div className="flex h-32 w-full items-center justify-center rounded border bg-muted text-muted-foreground">
        <ImageIcon className="size-8 opacity-50" />
      </div>
    );
  }

  return (
    <div className="relative h-48 w-full overflow-hidden rounded border">
      <Image
        alt={alt}
        className="object-cover"
        fill
        sizes="(max-width: 768px) 100vw, 50vw"
        src={fileUrl}
      />
    </div>
  );
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Component has many visual variants
export function CrudDetail({ id }: CrudDetailProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: orgData } = useActiveOrganization();
  const orgId = orgData?.id ?? "";
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

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
      router.push("/developer/crud");
    },
  });

  function handleDeleteConfirm() {
    deleteMutation.mutate({ path: { orgId, id } });
  }

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-7xl p-4">
        <PageHeader
          backHref="/developer/crud"
          backLabel="Back to Posts"
          loading
          title="Loading..."
          variant="compact"
        />
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container mx-auto max-w-7xl p-4">
        <PageHeader
          backHref="/developer/crud"
          backLabel="Back to Posts"
          title="Error Loading Post"
          variant="compact"
        />
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-destructive">Failed to load post</p>
            <Button asChild className="mt-4" variant="outline">
              <Link href="/developer/crud">Back to Posts</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const post = (data as { data: ExamplePost }).data;

  // Actions for the page header
  const actions = (
    <>
      <Button asChild size="sm" variant="outline">
        <Link href={`/developer/crud/${id}/edit`}>
          <Edit className="size-4" />
          Edit
        </Link>
      </Button>
      <Button
        disabled={deleteMutation.isPending}
        onClick={() => setShowDeleteDialog(true)}
        size="sm"
        variant="destructive"
      >
        {deleteMutation.isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Trash2 className="size-4" />
        )}
        Delete
      </Button>
    </>
  );

  const timestamps = (
    <div className="flex flex-wrap gap-4 text-muted-foreground text-sm">
      <span>Created {format(new Date(post.createdAt), "MMMM d, yyyy")}</span>
      {post.updatedAt !== post.createdAt && (
        <span>Updated {format(new Date(post.updatedAt), "MMMM d, yyyy")}</span>
      )}
      {post.publishDate && (
        <span>
          Scheduled {format(new Date(post.publishDate), "MMMM d, yyyy")}
        </span>
      )}
    </div>
  );

  return (
    <div className="container mx-auto max-w-5xl p-4">
      <PageHeader
        actions={actions}
        backHref="/developer/crud"
        backLabel="Back to Posts"
        stats={timestamps}
        title={
          <>
            {post.title}
            <Badge className={STATUS_COLORS[post.status]} variant="secondary">
              {post.status}
            </Badge>
            {post.isFeatured && (
              <Badge className="bg-yellow-500/15 text-yellow-700 dark:text-yellow-400">
                <Star className="mr-1 size-3 fill-current" />
                Featured
              </Badge>
            )}
            {post.isDeleted && <Badge variant="destructive">Deleted</Badge>}
          </>
        }
        variant="compact"
      />

      <div className="space-y-6">
        {/* Basic Info Card */}
        <Card>
          <CardContent>
            <FieldSet>
              <FieldLegend>Basic Information</FieldLegend>
              <FieldGroup>
                <DetailField icon={User} label="Author">
                  {post.authorId}
                </DetailField>

                <DetailField icon={FileText} label="Content">
                  <div className="whitespace-pre-wrap rounded-lg border bg-muted/50 p-4">
                    {post.content}
                  </div>
                </DetailField>
              </FieldGroup>
            </FieldSet>
          </CardContent>
        </Card>

        {/* Categorization Card */}
        {(post.category || (post.tags && post.tags.length > 0)) && (
          <Card>
            <CardContent>
              <FieldSet>
                <FieldLegend>Categorization</FieldLegend>
                <FieldGroup>
                  {post.category && (
                    <DetailField label="Category">
                      <Badge variant="outline">{post.category}</Badge>
                    </DetailField>
                  )}

                  {post.tags && post.tags.length > 0 && (
                    <DetailField icon={Tag} label="Tags">
                      <div className="flex flex-wrap gap-2">
                        {post.tags.map((tag) => (
                          <Badge key={tag} variant="secondary">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    </DetailField>
                  )}
                </FieldGroup>
              </FieldSet>
            </CardContent>
          </Card>
        )}

        {/* Media Card */}
        {(post.coverImageId ||
          post.attachmentFileId ||
          (post.galleryImageIds && post.galleryImageIds.length > 0) ||
          (post.documentFileIds && post.documentFileIds.length > 0)) && (
          <Card>
            <CardContent>
              <FieldSet>
                <FieldLegend>Media</FieldLegend>
                <FieldGroup>
                  {post.coverImageId && (
                    <DetailField icon={ImageIcon} label="Cover Image">
                      <FileImage
                        alt="Cover"
                        fileId={post.coverImageId}
                        orgId={orgId}
                      />
                    </DetailField>
                  )}

                  {post.galleryImageIds && post.galleryImageIds.length > 0 && (
                    <DetailField icon={ImageIcon} label="Gallery">
                      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                        {post.galleryImageIds.map((fileId, idx) => (
                          <FileImage
                            alt={`Gallery ${idx + 1}`}
                            fileId={fileId}
                            key={fileId}
                            orgId={orgId}
                          />
                        ))}
                      </div>
                    </DetailField>
                  )}

                  {post.attachmentFileId && (
                    <DetailField icon={File} label="Attachment">
                      <Badge variant="outline">{post.attachmentFileId}</Badge>
                    </DetailField>
                  )}

                  {post.documentFileIds && post.documentFileIds.length > 0 && (
                    <DetailField icon={File} label="Documents">
                      <div className="flex flex-wrap gap-2">
                        {post.documentFileIds.map((fileId) => (
                          <Badge key={fileId} variant="outline">
                            {fileId}
                          </Badge>
                        ))}
                      </div>
                    </DetailField>
                  )}
                </FieldGroup>
              </FieldSet>
            </CardContent>
          </Card>
        )}
      </div>

      <ConfirmDialog
        description="Are you sure you want to delete this post? This action cannot be undone."
        isLoading={deleteMutation.isPending}
        onConfirm={handleDeleteConfirm}
        onOpenChange={setShowDeleteDialog}
        open={showDeleteDialog}
        title="Delete Post"
        variant="destructive"
      />
    </div>
  );
}
