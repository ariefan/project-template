"use client";

import { useQuery } from "@tanstack/react-query";
import { systemOrganizationsListOptions } from "@workspace/contracts/query";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/composed/form";
import { cn } from "@workspace/ui/lib/utils";
import { Check, ChevronsUpDown } from "lucide-react";
import type { Control, FieldErrors, UseFormSetValue } from "react-hook-form";
import { apiClient } from "@/lib/api-client";
import type { AnnouncementFormValues } from "./announcement-form-schema";

interface AnnouncementFormValuesControl {
  control: Control<AnnouncementFormValues>;
}

export function FormValidationErrors({
  errors,
}: {
  errors: FieldErrors<AnnouncementFormValues>;
}) {
  if (Object.keys(errors).length === 0) {
    return null;
  }
  return (
    <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
      <p className="font-semibold text-destructive text-sm">
        Form validation errors:
      </p>
      <ul className="mt-2 ml-4 list-disc text-destructive text-sm">
        {Object.entries(errors).map(([key, error]) => (
          <li key={key}>
            {key}:{" "}
            {(
              error as import("react-hook-form").FieldError
            )?.message?.toString()}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PriorityField({ control }: AnnouncementFormValuesControl) {
  return (
    <FormField
      control={control}
      name="priority"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Priority</FormLabel>
          <Select defaultValue={field.value} onValueChange={field.onChange}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="success">Success</SelectItem>
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function ScopeField({
  control,
  setValue,
}: AnnouncementFormValuesControl & {
  setValue: UseFormSetValue<AnnouncementFormValues>;
}) {
  return (
    <FormField
      control={control}
      name="scope"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Scope</FormLabel>
          <Select
            defaultValue={field.value}
            onValueChange={(value) => {
              field.onChange(value);
              if (value === "system") {
                setValue("targetOrgId", "");
              }
            }}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Select scope" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value="system">Global (all organizations)</SelectItem>
              <SelectItem value="organization">Organization only</SelectItem>
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function TargetRoleSelect({ control }: AnnouncementFormValuesControl) {
  return (
    <FormField
      control={control}
      name="targetRoles"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Target roles</FormLabel>
          <Select defaultValue={field.value} onValueChange={field.onChange}>
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
  );
}

// Keep the old name for backward compatibility if desired, but better to export the new one
export const TargetRoleField = TargetRoleSelect;

export function OptionsFields({ control }: AnnouncementFormValuesControl) {
  return (
    <div className="flex items-center justify-end gap-6">
      <FormField
        control={control}
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
        control={control}
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
  );
}

export function TargetOrganizationSelector({
  control,
  isSystemAdmin,
}: AnnouncementFormValuesControl & { isSystemAdmin: boolean }) {
  const { data: orgsData } = useQuery({
    ...systemOrganizationsListOptions({
      client: apiClient,
      query: {
        page: 1,
        pageSize: 100,
      },
    }),
    enabled: isSystemAdmin,
  });

  const organizations =
    orgsData && "data" in orgsData && Array.isArray(orgsData.data)
      ? (orgsData.data as Array<{ id: string; name: string }>)
      : [];

  return (
    <FormField
      control={control}
      name="targetOrgId"
      render={({ field }) => (
        <FormItem className="flex flex-col">
          <FormLabel>Target Organization</FormLabel>
          <Popover>
            <PopoverTrigger asChild>
              <FormControl>
                <Button
                  className={cn(
                    "w-full justify-between",
                    !field.value && "text-muted-foreground"
                  )}
                  role="combobox"
                  variant="outline"
                >
                  {field.value
                    ? organizations.find((org) => org.id === field.value)?.name
                    : "Select organization"}
                  <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0">
              <Command>
                <CommandInput placeholder="Search organization..." />
                <CommandList>
                  <CommandEmpty>No organization found.</CommandEmpty>
                  <CommandGroup>
                    {organizations.map((org) => (
                      <CommandItem
                        key={org.id}
                        onSelect={() => {
                          field.onChange(org.id);
                        }}
                        value={org.name}
                      >
                        <Check
                          className={cn(
                            "mr-2 size-4",
                            org.id === field.value ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {org.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
