"use client";

/**
 * Enhanced Form - Re-exports shadcn form primitives + react-hook-form utilities
 *
 * This ensures type identity consistency across the monorepo by providing
 * a single source for both form components and react-hook-form hooks/types.
 *
 * Always import from here instead of directly from "react-hook-form" when
 * using with FormField components.
 */

// Re-export all shadcn form primitives
export {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useFormField,
} from "@workspace/ui/components/form";
export type {
  Control,
  ControllerProps,
  FieldPath,
  FieldValues,
  SubmitHandler,
  UseFormReturn,
} from "react-hook-form";
// Re-export react-hook-form utilities for type identity consistency
export {
  useFieldArray,
  useForm,
  useFormContext,
  useWatch,
} from "react-hook-form";
