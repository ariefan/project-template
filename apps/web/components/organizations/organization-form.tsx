"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import type { CompressedFileWithPreview } from "@workspace/ui/composed/file-upload";
import {
  ImageUploader,
  type ImageUploaderRef,
} from "@workspace/ui/composed/file-upload/image-uploader";
import { Loader2, type LucideIcon, Settings2 } from "lucide-react";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

export const organizationSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  slug: z.string().min(2, "Slug must be at least 2 characters"),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  supportEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  description: z.string().max(500, "Description too long").optional(),
});

export type OrganizationFormValues = z.infer<typeof organizationSchema>;

interface OrganizationFormProps {
  organization: {
    id: string;
    name: string;
    slug: string;
    logo?: string | null;
    metadata?: Record<string, unknown> | null;
  };
  onSubmit: (data: OrganizationFormValues, logoFile?: File) => Promise<void>;
  variant?: "card" | "plain";
  title?: string;
  description?: string;
  icon?: LucideIcon;
  submitLabel?: string;
}

export function OrganizationForm({
  organization,
  onSubmit,
  variant = "card",
  title = "General Settings",
  description = "Manage organization core configuration and identity.",
  icon: Icon = Settings2,
  submitLabel = "Save Changes",
}: OrganizationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const imageUploaderRef = useRef<ImageUploaderRef>(null);
  const [newLogoFiles, setNewLogoFiles] = useState<CompressedFileWithPreview[]>(
    []
  );

  const form = useForm<OrganizationFormValues>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: organization.name,
      slug: organization.slug,
      website: (organization.metadata?.website as string) || "",
      supportEmail: (organization.metadata?.supportEmail as string) || "",
      description: (organization.metadata?.description as string) || "",
    },
  });

  async function handleSubmit(data: OrganizationFormValues) {
    setIsSubmitting(true);
    try {
      const logoFile = newLogoFiles.length > 0 ? newLogoFiles[0] : undefined;
      await onSubmit(data, logoFile);
      setNewLogoFiles([]);
      imageUploaderRef.current?.clearFiles();
    } finally {
      setIsSubmitting(false);
    }
  }

  const initialUrls = organization.logo
    ? [{ id: "current-logo", url: organization.logo, name: "Current Logo" }]
    : [];

  const footer = (
    <div
      className={
        variant === "card"
          ? "flex justify-end bg-muted/5 p-4 pr-6"
          : "flex justify-end pt-4"
      }
    >
      <Button
        className={variant === "card" ? "px-8" : "w-full sm:w-auto"}
        disabled={isSubmitting}
        size={variant === "card" ? "lg" : "default"}
        type="submit"
      >
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {submitLabel}
      </Button>
    </div>
  );

  const formContent = (
    <Form {...form}>
      <form
        className={variant === "card" ? "divide-y divide-border" : "space-y-6"}
        onSubmit={form.handleSubmit(handleSubmit)}
      >
        <div
          className={
            variant === "card" ? "grid gap-0 sm:grid-cols-2" : "grid gap-6"
          }
        >
          <ProfileDetailsFields control={form.control} variant={variant} />
          <BrandingFields
            control={form.control}
            initialUrls={initialUrls}
            isSubmitting={isSubmitting}
            newLogoFiles={newLogoFiles}
            onLogoConfirm={setNewLogoFiles}
            submitLabel={submitLabel}
            uploaderRef={imageUploaderRef}
            variant={variant}
          />
        </div>
        {footer}
      </form>
    </Form>
  );

  if (variant === "plain") {
    return formContent;
  }

  return (
    <Card className="overflow-hidden border-border bg-card/50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">{formContent}</CardContent>
    </Card>
  );
}

function ProfileDetailsFields({
  control,
  variant,
}: {
  // biome-ignore lint/suspicious/noExplicitAny: complex react-hook-form type
  control: any;
  variant: "card" | "plain";
}) {
  return (
    <div className={variant === "card" ? "p-6" : "space-y-4"}>
      {variant === "card" && (
        <div className="mb-6 space-y-1">
          <h3 className="font-semibold text-base">Profile Details</h3>
          <p className="text-muted-foreground text-xs">
            Basic information and contact details.
          </p>
        </div>
      )}
      <div className="space-y-4">
        <FormField
          control={control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Organization Name</FormLabel>
              <FormControl>
                <Input
                  className="bg-background"
                  {...field}
                  placeholder="Acme Inc."
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Slug</FormLabel>
              <FormControl>
                <Input
                  className="bg-background"
                  {...field}
                  placeholder="acme"
                />
              </FormControl>
              <FormDescription className="text-[10px]">
                Used in URLs and identifiers.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="website"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Website</FormLabel>
              <FormControl>
                <Input
                  className="bg-background"
                  {...field}
                  placeholder="https://acme.inc"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="supportEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Support Email</FormLabel>
              <FormControl>
                <Input
                  className="bg-background"
                  {...field}
                  placeholder="support@acme.inc"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}

function BrandingFields({
  control,
  variant,
  initialUrls,
  isSubmitting,
  newLogoFiles,
  onLogoConfirm,
  submitLabel,
  uploaderRef,
}: {
  // biome-ignore lint/suspicious/noExplicitAny: complex react-hook-form type
  control: any;
  variant: "card" | "plain";
  initialUrls: { id: string; url: string; name: string }[];
  isSubmitting: boolean;
  newLogoFiles: CompressedFileWithPreview[];
  onLogoConfirm: (files: CompressedFileWithPreview[]) => void;
  submitLabel: string;
  uploaderRef: React.RefObject<ImageUploaderRef | null>;
}) {
  return (
    <div className={variant === "card" ? "p-6" : "space-y-4"}>
      {variant === "card" && (
        <div className="mb-6 space-y-1">
          <h3 className="font-semibold text-base">Branding & Presence</h3>
          <p className="text-muted-foreground text-xs">
            Your visual identity and public description.
          </p>
        </div>
      )}
      <div className="space-y-6">
        <div className="space-y-2">
          <Label className="text-sm">Organization Logo</Label>
          <ImageUploader
            defaultOptions={{
              maxSizeMB: 1,
              maxWidthOrHeight: 512,
              useWebWorker: true,
            }}
            enableCropping={true}
            initialUrls={initialUrls}
            isUploading={isSubmitting}
            onConfirm={onLogoConfirm}
            ref={uploaderRef}
            showConfirmButton={false}
          />
          {newLogoFiles.length > 0 && (
            <p className="text-primary text-xs italic">
              New logo selected. Click "{submitLabel}" to apply.
            </p>
          )}
        </div>
        <FormField
          control={control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Brief Description</FormLabel>
              <FormControl>
                <Textarea
                  className="h-24 bg-background px-3 py-2 text-sm"
                  placeholder="Tell us a little about your organization..."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
