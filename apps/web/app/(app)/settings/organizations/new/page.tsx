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
import { useForm } from "@workspace/ui/composed/form";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { authClient } from "@/lib/auth";

const createOrganizationSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  slug: z.string().min(2, "Slug must be at least 2 characters"),
  logo: z.string().optional(),
});

type CreateOrganizationFormValues = z.infer<typeof createOrganizationSchema>;

export default function CreateOrganizationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm<CreateOrganizationFormValues>({
    resolver: zodResolver(createOrganizationSchema),
    defaultValues: {
      name: "",
      slug: "",
      logo: "",
    },
  });

  async function onSubmit(data: CreateOrganizationFormValues) {
    setLoading(true);
    try {
      // biome-ignore lint/suspicious/noExplicitAny: library types are incomplete
      const { error } = await (authClient as any).organization.create({
        name: data.name,
        slug: data.slug,
        logo: data.logo,
      });

      if (error) {
        throw error;
      }

      toast.success("Organization created successfully");
      router.push("/dashboard");
      router.refresh();
      // biome-ignore lint/suspicious/noExplicitAny: error handling
    } catch (e: any) {
      toast.error(
        e.message || "Failed to create organization. Please try again."
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
    <div className="container mx-auto max-w-7xl px-4 py-6">
      <div className="mb-8 text-center">
        <h1 className="font-bold text-3xl">Create Organization</h1>
        <p className="mt-2 text-muted-foreground">
          Create a new organization to collaborate with your team.
        </p>
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>Organization Details</CardTitle>
          <CardDescription>
            Enter the details for your new organization.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
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
                    <FormDescription>
                      The URL-friendly identifier for your organization.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="logo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Logo URL (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="https://..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-4">
                <Button
                  onClick={() => router.back()}
                  type="button"
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button disabled={loading} type="submit">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Organization
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
