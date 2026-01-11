"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { LegalDocumentType } from "@workspace/contracts";
import {
  legalDocumentsAdminCreate,
  legalDocumentsAdminCreateVersion,
} from "@workspace/contracts";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useForm,
} from "@workspace/ui/composed/form";
import { MarkdownEditor } from "@workspace/ui/composed/markdown-editor";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { z } from "zod";
import { apiClient } from "@/lib/api-client";

const legalDocumentFormSchema = z.object({
  type: z.enum([
    "terms_of_service",
    "privacy_policy",
    "cookie_policy",
    "eula",
    "community_guidelines",
  ]),
  slug: z.string().min(1, "Slug is required").max(100),
  locale: z.string().min(2).max(10),
  title: z.string().min(3, "Title must be at least 3 characters").max(200),
  content: z.string().min(10, "Content must be at least 10 characters"),
  changelog: z.string().optional(),
  requiresReAcceptance: z.boolean(),
});

type LegalDocumentFormValues = z.infer<typeof legalDocumentFormSchema>;

interface LegalDocumentFormProps {
  document?: {
    id: string;
    type: string;
    slug: string;
    locale: string;
    activeVersion?: {
      title: string;
      content: string;
      changelog?: string;
      requiresReAcceptance: boolean;
    };
  };
  mode: "create" | "edit";
}

export function LegalDocumentForm({ document, mode }: LegalDocumentFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const form = useForm<LegalDocumentFormValues>({
    resolver: zodResolver(legalDocumentFormSchema),
    defaultValues: {
      type:
        (document?.type as LegalDocumentFormValues["type"]) ??
        "terms_of_service",
      slug: document?.slug ?? "",
      locale: document?.locale ?? "en",
      title: document?.activeVersion?.title ?? "",
      content: document?.activeVersion?.content ?? "",
      changelog: document?.activeVersion?.changelog ?? "",
      requiresReAcceptance:
        document?.activeVersion?.requiresReAcceptance ?? false,
    },
  });

  // Create document mutation
  const createMutation = useMutation({
    mutationFn: async (values: LegalDocumentFormValues) => {
      const response = await legalDocumentsAdminCreate({
        client: apiClient,
        body: {
          type: values.type as LegalDocumentType,
          slug: values.slug,
          locale: values.locale,
          title: values.title,
          content: values.content,
        },
      });
      return response.data;
    },
    onSuccess: (_data) => {
      queryClient.invalidateQueries({ queryKey: ["legalDocumentsAdminList"] });
      toast.success("Document created successfully!");
      router.push("/admin/legal-documents");
    },
    onError: (error) => {
      toast.error(`Failed to create document: ${error.message}`);
    },
  });

  // Create new version mutation (for edit mode)
  const createVersionMutation = useMutation({
    mutationFn: async (values: LegalDocumentFormValues) => {
      if (!document) {
        throw new Error("Document ID required");
      }
      const response = await legalDocumentsAdminCreateVersion({
        client: apiClient,
        path: { documentId: document.id },
        body: {
          title: values.title,
          content: values.content,
          changelog: values.changelog,
          requiresReAcceptance: values.requiresReAcceptance,
        },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["legalDocumentsAdminList"] });
      queryClient.invalidateQueries({
        queryKey: ["legalDocumentsAdminGet", document?.id],
      });
      toast.success("New version created successfully!");
      router.push("/admin/legal-documents");
    },
    onError: (error) => {
      toast.error(`Failed to create version: ${error.message}`);
    },
  });

  const isPending = createMutation.isPending || createVersionMutation.isPending;

  const onSubmit = (values: LegalDocumentFormValues) => {
    if (mode === "create") {
      createMutation.mutate(values);
    } else {
      createVersionMutation.mutate(values);
    }
  };

  // Generate slug from type
  const generateSlug = (type: string) => {
    return type.replace(/_/g, "-");
  };

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
          <CardHeader>
            <CardTitle>Document Settings</CardTitle>
            <CardDescription>
              Configure the document type and metadata
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Document Type</FormLabel>
                    <Select
                      defaultValue={field.value}
                      disabled={mode === "edit"}
                      onValueChange={(value) => {
                        field.onChange(value);
                        if (mode === "create") {
                          form.setValue("slug", generateSlug(value));
                        }
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="terms_of_service">
                          Terms of Service
                        </SelectItem>
                        <SelectItem value="privacy_policy">
                          Privacy Policy
                        </SelectItem>
                        <SelectItem value="cookie_policy">
                          Cookie Policy
                        </SelectItem>
                        <SelectItem value="eula">EULA</SelectItem>
                        <SelectItem value="community_guidelines">
                          Community Guidelines
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="locale"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Locale</FormLabel>
                    <Select
                      defaultValue={field.value}
                      disabled={mode === "edit"}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select locale" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="en">English (en)</SelectItem>
                        <SelectItem value="id">Indonesian (id)</SelectItem>
                        <SelectItem value="es">Spanish (es)</SelectItem>
                        <SelectItem value="fr">French (fr)</SelectItem>
                        <SelectItem value="de">German (de)</SelectItem>
                        <SelectItem value="ja">Japanese (ja)</SelectItem>
                        <SelectItem value="zh">Chinese (zh)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Language for this document version
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL Slug</FormLabel>
                  <FormControl>
                    <Input placeholder="terms-of-service" {...field} />
                  </FormControl>
                  <FormDescription>
                    Used in the public URL: /legal/{field.value || "slug"}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Version Content</CardTitle>
            <CardDescription>
              {mode === "create"
                ? "This will create the initial version (v1)"
                : "Edit this to create a new version"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Terms of Service" {...field} />
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
                    <MarkdownEditor
                      className="min-h-[400px]"
                      markdown={field.value}
                      onChange={field.onChange}
                      placeholder="# Terms of Service\n\nWelcome to our service..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {mode === "edit" && (
              <FormField
                control={form.control}
                name="changelog"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Changelog (optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Summary of changes from previous version"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Describe what changed in this version for legal compliance
                      tracking
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="requiresReAcceptance"
              render={({ field }) => (
                <FormItem className="flex items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Require Re-acceptance</FormLabel>
                    <FormDescription>
                      Force users who previously accepted to re-accept this
                      version. Use this for significant legal changes.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex items-center gap-4">
          <Button disabled={isPending} type="submit">
            {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {mode === "create" ? "Create Document" : "Save as New Version"}
          </Button>
          <Button
            disabled={isPending}
            onClick={() => router.push("/admin/legal-documents")}
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
