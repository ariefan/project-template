"use client";

import { useQuery } from "@tanstack/react-query";
import type { ExamplePost, ExamplePostStatus } from "@workspace/contracts";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
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
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { getErrorMessage } from "@/lib/api-client";
import { authClient, useActiveOrganization, useSession } from "@/lib/auth";
import { usePostMutations } from "../hooks/use-posts-data";

interface PostFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post?: ExamplePost;
  mode: "create" | "edit";
}

export function PostFormDialog({
  open,
  onOpenChange,
  post,
  mode,
}: PostFormDialogProps) {
  const { data: orgData } = useActiveOrganization();
  const { data: session } = useSession();
  const orgId = orgData?.id ?? "";
  const userId = session?.user?.id ?? "";

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [authorId, setAuthorId] = useState("");
  const [status, setStatus] = useState<ExamplePostStatus>("draft");
  const [error, setError] = useState<string | null>(null);

  const { createPost, updatePost, isCreating, isUpdating } = usePostMutations();

  // Fetch organization members for author selection
  const { data: membersData } = useQuery({
    queryKey: ["organization-members", orgId],
    queryFn: async () => {
      // @ts-expect-error - Better Auth organization.getFullOrganization exists at runtime
      const result = await authClient.organization.getFullOrganization({
        query: { organizationId: orgId },
      });
      return result;
    },
    enabled: Boolean(orgId) && open,
  });

  // Deduplicate members by userId to avoid React key warnings
  const members = Array.from(
    new Map(
      (
        (membersData?.data?.members ?? []) as Array<{
          userId: string;
          user?: { name?: string; email?: string };
        }>
      ).map((member) => [member.userId, member])
    ).values()
  );

  // Initialize form with post data or defaults
  useEffect(() => {
    if (open) {
      if (mode === "edit" && post) {
        setTitle(post.title);
        setContent(post.content);
        setAuthorId(post.authorId);
        setStatus(post.status);
      } else {
        setTitle("");
        setContent("");
        setAuthorId(userId);
        setStatus("draft");
      }
      setError(null);
    }
  }, [open, mode, post, userId]);

  const isLoading = isCreating || isUpdating;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Validation
    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    if (!content.trim()) {
      setError("Content is required");
      return;
    }

    if (!authorId) {
      setError("Author is required");
      return;
    }

    try {
      if (mode === "create") {
        await createPost({ title, content, authorId, status });
      } else if (post) {
        await updatePost({ id: post.id, data: { title, content, status } });
      }
      onOpenChange(false);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Create Post" : "Edit Post"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Create a new blog post"
              : "Update your blog post"}
          </DialogDescription>
        </DialogHeader>

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
              <FieldLabel htmlFor="author">Author</FieldLabel>
              <Select
                disabled={isLoading || mode === "edit"}
                onValueChange={setAuthorId}
                value={authorId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select author" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((member) => (
                    <SelectItem key={member.userId} value={member.userId}>
                      {member.user?.name ?? member.user?.email ?? member.userId}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
          </FieldGroup>

          <DialogFooter className="mt-6">
            <Button
              disabled={isLoading}
              onClick={() => onOpenChange(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={isLoading} type="submit">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "create" ? "Create Post" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
