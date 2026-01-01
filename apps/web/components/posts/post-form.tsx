"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ExamplePost, ExamplePostStatus } from "@workspace/contracts";
import {
  examplePostsCreateMutation,
  examplePostsUpdateMutation,
} from "@workspace/contracts/query";
import { Button } from "@workspace/ui/components/button";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Textarea } from "@workspace/ui/components/textarea";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiClient, getErrorMessage } from "@/lib/api-client";
import { useActiveOrganization, useSession } from "@/lib/auth";

interface PostFormProps {
  post?: ExamplePost;
  mode: "create" | "edit";
}

export function PostForm({ post, mode }: PostFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: orgData } = useActiveOrganization();
  const { data: session } = useSession();
  const orgId = orgData?.id ?? "";
  const userId = session?.user?.id ?? "";

  const [title, setTitle] = useState(post?.title ?? "");
  const [content, setContent] = useState(post?.content ?? "");
  const [status, setStatus] = useState<ExamplePostStatus>(
    post?.status ?? "draft"
  );
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    ...examplePostsCreateMutation({ client: apiClient }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["examplePostsList"] });
      router.push("/posts");
    },
    onError: (err) => {
      setError(getErrorMessage(err));
    },
  });

  const updateMutation = useMutation({
    ...examplePostsUpdateMutation({ client: apiClient }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["examplePostsList"] });
      queryClient.invalidateQueries({ queryKey: ["examplePostsGet"] });
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

    if (mode === "create") {
      createMutation.mutate({
        path: { orgId },
        body: { title, content, status, authorId: userId },
      });
    } else if (post) {
      updateMutation.mutate({
        path: { orgId, id: post.id },
        body: { title, content, status },
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

            <Field>
              <FieldLabel htmlFor="status">Status</FieldLabel>
              <Select
                disabled={isLoading}
                onValueChange={(value) => setStatus(value as ExamplePostStatus)}
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
