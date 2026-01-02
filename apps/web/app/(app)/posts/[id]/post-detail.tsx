"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ExamplePost, ExamplePostStatus } from "@workspace/contracts";
import {
  examplePostsDeleteMutation,
  examplePostsGetOptions,
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
import { Separator } from "@workspace/ui/components/separator";
import { format } from "date-fns";
import { ArrowLeft, Edit, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiClient } from "@/lib/api-client";
import { useActiveOrganization } from "@/lib/auth";

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
      router.push("/posts");
    },
  });

  function handleDeleteConfirm() {
    deleteMutation.mutate({ path: { orgId, id } });
  }

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
    <>
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
                </div>
                <CardDescription className="mt-1">
                  Created on {format(new Date(post.createdAt), "MMMM d, yyyy")}
                  {post.publishedAt &&
                    ` | Published on ${format(new Date(post.publishedAt), "MMMM d, yyyy")}`}
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
              <Button
                disabled={deleteMutation.isPending}
                onClick={() => setShowDeleteDialog(true)}
                variant="destructive"
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Delete
              </Button>
            </div>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="pt-6">
          <div className="prose dark:prose-invert max-w-none">
            <div className="whitespace-pre-wrap">{post.content}</div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog onOpenChange={setShowDeleteDialog} open={showDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Post</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this post? This action cannot be
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
