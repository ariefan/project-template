"use client";

import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/composed/form";
import { MarkdownEditor } from "@workspace/ui/composed/markdown-editor";
import { Loader2 } from "lucide-react";
import { useFormContext } from "react-hook-form";
import {
  FormValidationErrors,
  OptionsFields,
  PriorityField,
  ScopeField,
  TargetOrganizationSelector,
  TargetRoleSelect,
} from "./announcement-form-fields";
import type { AnnouncementFormValues } from "./announcement-form-schema";

interface AnnouncementFormLayoutProps {
  isSystemAdmin: boolean;
  mode: "create" | "edit";
  isPending: boolean;
  onCancel: () => void;
}

export function AnnouncementFormLayout({
  isSystemAdmin,
  mode,
  isPending,
  onCancel,
}: AnnouncementFormLayoutProps) {
  const form = useFormContext<AnnouncementFormValues>();
  const scope = form.watch("scope");

  return (
    <div className="space-y-6">
      <FormValidationErrors errors={form.formState.errors} />

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
                  <MarkdownEditor
                    className="min-h-[200px]"
                    markdown={field.value}
                    onChange={field.onChange}
                    placeholder="We're performing scheduled maintenance..."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <PriorityField control={form.control} />

            {isSystemAdmin && (
              <>
                <ScopeField control={form.control} setValue={form.setValue} />
                {scope === "organization" && (
                  <TargetRoleSelect control={form.control} />
                )}
              </>
            )}
          </div>

          {isSystemAdmin && scope === "organization" && (
            <TargetOrganizationSelector
              control={form.control}
              isSystemAdmin={isSystemAdmin}
            />
          )}

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
            {!isSystemAdmin && <TargetRoleSelect control={form.control} />}
            {isSystemAdmin && scope !== "organization" && (
              <TargetRoleSelect control={form.control} />
            )}

            <OptionsFields control={form.control} />
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
          onClick={onCancel}
          type="button"
          variant="outline"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
