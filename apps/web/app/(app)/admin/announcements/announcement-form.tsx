"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  Announcement,
  CreateAnnouncementRequest,
} from "@workspace/contracts";
import {
  announcementsCreateMutation,
  announcementsUpdateMutation,
} from "@workspace/contracts/query";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Checkbox } from "@workspace/ui/components/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form";
import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Textarea } from "@workspace/ui/components/textarea";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { apiClient } from "@/lib/api-client";
import { useActiveOrganization } from "@/lib/auth";

const announcementFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  content: z.string().min(10, "Content must be at least 10 characters"),
  linkUrl: z
    .string()
    .refine((val) => val === "" || z.string().url().safeParse(val).success, {
      message: "Invalid URL",
    })
    .optional(),
  linkText: z.string().optional(),
  priority: z.enum(["info", "warning", "critical"]),
  scope: z.enum(["system", "organization"]),
  targetRoles: z.enum(["all", "admin", "member"]),
  isDismissible: z.boolean(),
  publishAt: z.string().optional(),
  expiresAt: z.string().optional(),
  isActive: z.boolean(),
});

type AnnouncementFormValues = z.infer<typeof announcementFormSchema>;

interface AnnouncementFormProps {
  announcement?: Announcement;
  mode: "create" | "edit";
}

export function AnnouncementForm({
  announcement,
  mode,
}: AnnouncementFormProps) {
  const router = useRouter();
  const { data: activeOrganization } = useActiveOrganization();
  const queryClient = useQueryClient();

  const form = useForm<AnnouncementFormValues>({
    resolver: zodResolver(announcementFormSchema),
    defaultValues: {
      title: announcement?.title ?? "",
      content: announcement?.content ?? "",
      linkUrl: announcement?.linkUrl ?? "",
      linkText: announcement?.linkText ?? "",
      priority: announcement?.priority ?? "info",
      scope: announcement?.scope ?? "organization",
      // Use first role as default, or "all" if available
      targetRoles: announcement?.targetRoles?.[0] ?? "all",
      isDismissible: announcement?.isDismissible ?? true,
      publishAt: announcement?.publishAt
        ? format(new Date(announcement.publishAt), "yyyy-MM-dd'T'HH:mm")
        : "",
      expiresAt: announcement?.expiresAt
        ? format(new Date(announcement.expiresAt), "yyyy-MM-dd'T'HH:mm")
        : "",
      isActive: announcement?.isActive ?? true,
    },
  });

  const createMutation = useMutation({
    ...announcementsCreateMutation({ client: apiClient }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          if (typeof key === "object" && key !== null && "_id" in key) {
            return (key as { _id: string })._id === "announcementsList";
          }
          return false;
        },
      });
      router.push("/admin/announcements");
    },
    onError: (error) => {
      console.error("Create announcement error:", error);
    },
  });

  const updateMutation = useMutation({
    ...announcementsUpdateMutation({ client: apiClient }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          if (typeof key === "object" && key !== null && "_id" in key) {
            return (key as { _id: string })._id === "announcementsList";
          }
          return false;
        },
      });
      router.push("/admin/announcements");
    },
    onError: (error) => {
      console.error("Update announcement error:", error);
    },
  });

  const onSubmit = (values: AnnouncementFormValues) => {
    if (!activeOrganization?.id) {
      return;
    }

    const payload: CreateAnnouncementRequest = {
      title: values.title,
      content: values.content,
      linkUrl: values.linkUrl || undefined,
      linkText: values.linkText || undefined,
      priority: values.priority,
      scope: values.scope,
      // Set orgId to null for global announcements, or the actual org ID for organization-scoped
      orgId: values.scope === "system" ? null : activeOrganization.id,
      // API expects array, wrap the single value
      targetRoles: [values.targetRoles],
      isDismissible: values.isDismissible,
      publishAt: values.publishAt
        ? new Date(values.publishAt).toISOString()
        : undefined,
      expiresAt: values.expiresAt
        ? new Date(values.expiresAt).toISOString()
        : undefined,
      isActive: values.isActive,
    };

    if (mode === "create") {
      createMutation.mutate({
        path: { orgId: activeOrganization.id },
        body: payload,
      });
    } else if (announcement) {
      updateMutation.mutate({
        path: {
          orgId: activeOrganization.id,
          announcementId: announcement.id,
        },
        body: payload,
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Form {...form}>
      <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
        {Object.keys(form.formState.errors).length > 0 && (
          <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
            <p className="font-semibold text-destructive text-sm">
              Form validation errors:
            </p>
            <ul className="mt-2 ml-4 list-disc text-destructive text-sm">
              {Object.entries(form.formState.errors).map(([key, error]) => (
                <li key={key}>
                  {key}: {error?.message?.toString()}
                </li>
              ))}
            </ul>
          </div>
        )}

        <Card>
          <CardContent className="space-y-6 pt-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Important system update" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="We're performing scheduled maintenance..."
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="linkUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Link URL (optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://example.com/more-info"
                        type="url"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="linkText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Link text (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Learn more" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select
                      defaultValue={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="info">Info</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="scope"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Scope</FormLabel>
                    <Select
                      defaultValue={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select scope" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="system">
                          Global (all organizations)
                        </SelectItem>
                        <SelectItem value="organization">
                          Organization only
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="publishAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Publish at (optional)</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expiresAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expires at (optional)</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="targetRoles"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target roles</FormLabel>
                    <Select
                      defaultValue={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select target role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="all">All users</SelectItem>
                        <SelectItem value="admin">Admin only</SelectItem>
                        <SelectItem value="member">Member only</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-center justify-end gap-6">
                <FormField
                  control={form.control}
                  name="isDismissible"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel>Dismissible</FormLabel>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel>Active</FormLabel>
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-4">
          <Button disabled={isPending} type="submit">
            {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {mode === "create" ? "Create announcement" : "Save changes"}
          </Button>
          <Button
            disabled={isPending}
            onClick={() => router.push("/admin/announcements")}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}
