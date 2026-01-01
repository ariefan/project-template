"use client";

import { useQuery } from "@tanstack/react-query";
import type { ExamplePost } from "@workspace/contracts";
import { examplePostsGetOptions } from "@workspace/contracts/query";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { PostForm } from "@/components/posts/post-form";
import { apiClient } from "@/lib/api-client";
import { useActiveOrganization } from "@/lib/auth";

interface EditPostFormProps {
  id: string;
}

export function EditPostForm({ id }: EditPostFormProps) {
  const { data: orgData } = useActiveOrganization();
  const orgId = orgData?.id ?? "";

  const { data, isLoading, error } = useQuery(
    examplePostsGetOptions({
      client: apiClient,
      path: { orgId, id },
    })
  );

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

  return <PostForm mode="edit" post={post} />;
}
