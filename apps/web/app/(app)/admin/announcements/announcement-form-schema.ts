import { z } from "zod";

export const announcementFormSchema = z
  .object({
    title: z.string().min(3, "Title must be at least 3 characters"),
    content: z.string().min(10, "Content must be at least 10 characters"),
    linkUrl: z.string().optional(),
    linkText: z.string().optional(),
    priority: z.enum(["info", "warning", "critical", "success"]),
    scope: z.enum(["system", "organization"]),
    targetRoles: z.enum(["all", "admin", "member"]),
    isDismissible: z.boolean(),
    publishAt: z.string().optional(),
    expiresAt: z.string().optional(),
    isActive: z.boolean(),
    targetOrgId: z.string().optional(),
  })
  .superRefine((data, _ctx) => {
    if (data.scope === "organization" && !data.targetOrgId) {
      // Note: We'll handle the "auto-fill from active context" logic in the component
      // This validation is for when the user is expected to manually select it
    }
  });

export type AnnouncementFormValues = z.infer<typeof announcementFormSchema>;
