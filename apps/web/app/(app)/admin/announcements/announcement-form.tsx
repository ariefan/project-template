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
import { Form, useForm } from "@workspace/ui/composed/form";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { useActiveOrganization, useSession } from "@/lib/auth";
import { AnnouncementFormLayout } from "./announcement-form-layout";
import {
  type AnnouncementFormValues,
  announcementFormSchema,
} from "./announcement-form-schema";

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
  const { data: session } = useSession();
  const isSystemAdmin = session?.user?.role === "super_admin";

  const form = useForm<AnnouncementFormValues>({
    resolver: zodResolver(announcementFormSchema),
    defaultValues: {
      title: announcement?.title ?? "",
      content: announcement?.content ?? "",
      linkUrl: announcement?.linkUrl ?? "",
      linkText: announcement?.linkText ?? "",
      priority:
        (announcement?.priority as "info" | "warning" | "critical") ?? "info",
      scope: announcement?.scope ?? (isSystemAdmin ? "system" : "organization"),
      targetRoles: announcement?.targetRoles?.[0] ?? "all",
      isDismissible: announcement?.isDismissible ?? true,
      publishAt: announcement?.publishAt
        ? format(new Date(announcement.publishAt), "yyyy-MM-dd'T'HH:mm")
        : "",
      expiresAt: announcement?.expiresAt
        ? format(new Date(announcement.expiresAt), "yyyy-MM-dd'T'HH:mm")
        : "",
      isActive: announcement?.isActive ?? true,
      targetOrgId: announcement?.orgId ?? activeOrganization?.id ?? "",
    },
  });

  const { onSubmit, isPending } = useAnnouncementActions({
    mode,
    announcement,
    activeOrgId: activeOrganization?.id,
    isSystemAdmin,
    router,
  });

  return (
    <Form {...form}>
      <form
        className="space-y-6"
        onSubmit={form.handleSubmit(onSubmit, (errors) => {
          toast.error("Please check the form for validation errors");
          console.log("Form errors:", errors);
        })}
      >
        <AnnouncementFormLayout
          isPending={isPending}
          isSystemAdmin={isSystemAdmin}
          mode={mode}
          onCancel={() => router.push("/admin/announcements")}
        />
      </form>
    </Form>
  );
}

// --- Helpers ---

function buildPayload(
  values: AnnouncementFormValues,
  activeOrgId: string | undefined,
  isSystemAdmin: boolean
): CreateAnnouncementRequest {
  let targetOrgId: string | null = activeOrgId ?? null;

  if (isSystemAdmin) {
    if (values.scope === "system") {
      targetOrgId = null;
    } else if (values.scope === "organization") {
      targetOrgId = values.targetOrgId || null;
    }
  }

  return {
    orgId: targetOrgId,
    title: values.title,
    content: values.content,
    linkUrl: values.linkUrl,
    linkText: values.linkText,
    priority: values.priority,
    scope: values.scope,
    targetRoles: values.targetRoles === "all" ? [] : [values.targetRoles],
    isDismissible: values.isDismissible,
    publishAt:
      values.publishAt && !Number.isNaN(new Date(values.publishAt).getTime())
        ? new Date(values.publishAt).toISOString()
        : undefined,
    expiresAt:
      values.expiresAt && !Number.isNaN(new Date(values.expiresAt).getTime())
        ? new Date(values.expiresAt).toISOString()
        : undefined,
    isActive: values.isActive,
  };
}

function useAnnouncementMutations(router: ReturnType<typeof useRouter>) {
  const queryClient = useQueryClient();

  const onSuccess = () => {
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
  };

  const createMutation = useMutation({
    ...announcementsCreateMutation({ client: apiClient }),
    onSuccess,
    onError: (error) => console.error("Create error:", error),
  });

  const updateMutation = useMutation({
    ...announcementsUpdateMutation({ client: apiClient }),
    onSuccess,
    onError: (error) => console.error("Update error:", error),
  });

  return { createMutation, updateMutation };
}

function useAnnouncementActions({
  mode,
  announcement,
  activeOrgId,
  isSystemAdmin,
  router,
}: {
  mode: "create" | "edit";
  announcement?: Announcement;
  activeOrgId?: string;
  isSystemAdmin: boolean;
  router: ReturnType<typeof useRouter>;
}) {
  const { createMutation, updateMutation } = useAnnouncementMutations(router);

  const onSubmit = (values: AnnouncementFormValues) => {
    const payload = buildPayload(values, activeOrgId, isSystemAdmin);

    if (!payload.orgId && values.scope === "organization") {
      toast.error(
        "Observation scope requires an active organization or a selected target organization."
      );
      return;
    }

    const pathOrgId = payload.orgId ?? "system";

    if (mode === "create") {
      createMutation.mutate({
        path: { orgId: pathOrgId },
        body: payload,
      });
    } else if (announcement) {
      updateMutation.mutate({
        path: {
          orgId: pathOrgId,
          announcementId: announcement.id,
        },
        body: payload,
      });
    }
  };

  return {
    onSubmit,
    isPending: createMutation.isPending || updateMutation.isPending,
  };
}
