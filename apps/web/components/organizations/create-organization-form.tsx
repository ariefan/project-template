"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@workspace/ui/components/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form";
import { Input } from "@workspace/ui/components/input";
import type { CompressedFileWithPreview } from "@workspace/ui/composed/file-upload";
import { ImageUploader } from "@workspace/ui/composed/file-upload/image-uploader";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { authClient } from "@/lib/auth";
import { env } from "@/lib/env";

const createOrganizationSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  slug: z.string().min(2, "Slug must be at least 2 characters"),
});

type CreateOrganizationFormValues = z.infer<typeof createOrganizationSchema>;

interface CreateOrganizationFormProps {
  onSuccess?: () => void;
  className?: string;
}

export function CreateOrganizationForm({
  onSuccess,
  className,
}: CreateOrganizationFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [logoFiles, setLogoFiles] = useState<CompressedFileWithPreview[]>([]);

  const form = useForm<CreateOrganizationFormValues>({
    resolver: zodResolver(createOrganizationSchema),
    defaultValues: {
      name: "",
      slug: "",
    },
  });

  // Helper to upload file
  async function uploadLogo(orgId: string, file: File): Promise<string | null> {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(
        `${env.NEXT_PUBLIC_API_URL}/v1/orgs/${orgId}/files`,
        {
          method: "POST",
          body: formData,
          // Credentials included by default in most fetch wrappers, but let's be safe if using native
          headers: {
            // Do not set Content-Type for FormData, let browser handle boundary
          },
        }
      );

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      const fileId = data?.data?.id;
      if (!fileId) {
        return null;
      }

      // Construct download URL
      return `${env.NEXT_PUBLIC_API_URL}/v1/orgs/${orgId}/files/${fileId}/download`;
    } catch (e) {
      console.error("Logo upload failed", e);
      return null;
    }
  }

  async function createOrg(data: CreateOrganizationFormValues) {
    const { data: org, error } = await authClient.organization.create({
      name: data.name,
      slug: data.slug,
    });

    if (error) {
      throw error;
    }
    return org;
  }

  async function handleLogoUpload(orgId: string, file: File) {
    const logoUrl = await uploadLogo(orgId, file);
    if (logoUrl) {
      await authClient.organization.update({
        organizationId: orgId,
        data: { logo: logoUrl },
      });
    }
  }

  async function onSubmit(data: CreateOrganizationFormValues) {
    setLoading(true);
    try {
      // 1. Create Organization
      const org = await createOrg(data);

      const orgId = org?.id;

      // 2. Upload Logo if present
      const firstLogo = logoFiles[0];
      if (orgId && firstLogo) {
        await handleLogoUpload(orgId, firstLogo);
      }

      toast.success("Organization created successfully");
      router.refresh();

      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/dashboard");
      }
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "An unknown error occurred";
      toast.error(
        message || "Failed to create organization. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  // Auto-generate slug from name
  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const name = e.target.value;
    form.setValue("name", name);
    if (!form.formState.dirtyFields.slug) {
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      form.setValue("slug", slug);
    }
  }

  return (
    <Form {...form}>
      <form className={className} onSubmit={form.handleSubmit(onSubmit)}>
        <div className="space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Organization Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Acme Inc."
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      handleNameChange(e);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="slug"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Slug</FormLabel>
                <FormControl>
                  <Input placeholder="acme-inc" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-2">
            <FormLabel>Logo (Optional)</FormLabel>
            <ImageUploader
              autoUpload={false}
              className="max-w-xs"
              defaultOptions={{
                maxSizeMB: 1,
                maxWidthOrHeight: 512,
                useWebWorker: true,
              }}
              enableCropping={true} // We handle upload manually on submit
              layout="grid"
              onCompressed={(files) => setLogoFiles(files)}
              onConfirm={(files) => setLogoFiles(files)} // Hidden as we just want selection state
              showCompressionOptions={false}
              showConfirmButton={false}
            />
            <p className="text-[0.8rem] text-muted-foreground">
              Select an image to use as your organization logo.
            </p>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <Button disabled={loading} type="submit">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Organization
          </Button>
        </div>
      </form>
    </Form>
  );
}
