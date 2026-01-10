"use client";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import {
  AlertTriangle,
  Info,
  Loader2,
  type LucideIcon,
  XCircle,
} from "lucide-react";
import type * as React from "react";

export type ConfirmDialogVariant = "default" | "warning" | "destructive";

const variantIcons: Record<ConfirmDialogVariant, LucideIcon> = {
  default: Info,
  warning: AlertTriangle,
  destructive: XCircle,
};

const variantStyles: Record<
  ConfirmDialogVariant,
  { icon: string; container: string }
> = {
  default: {
    icon: "text-blue-500 bg-blue-500/10",
    container: "",
  },
  warning: {
    icon: "text-yellow-600 bg-yellow-500/10 dark:text-yellow-500 dark:bg-yellow-500/10",
    container:
      "border-yellow-200/50 bg-yellow-50/50 dark:border-yellow-900/50 dark:bg-yellow-900/10",
  },
  destructive: {
    icon: "text-destructive bg-destructive/10",
    container:
      "border-destructive/50 bg-destructive/5 dark:border-destructive/50 dark:bg-destructive/10",
  },
};

export interface ConfirmDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Called when dialog should close */
  onOpenChange: (open: boolean) => void;
  /** Dialog title */
  title: string;
  /** Dialog description */
  description?: string;
  /** Called when confirm button is clicked */
  onConfirm: () => void | Promise<void>;
  /** Called when cancel button is clicked (optional, defaults to closing dialog) */
  onCancel?: () => void;
  /** Confirm button label */
  confirmLabel?: string;
  /** Cancel button label */
  cancelLabel?: string;
  /** Visual variant */
  variant?: ConfirmDialogVariant;
  /** Override icon (optional) */
  icon?: LucideIcon;
  /** Icon className (optional) */
  iconClassName?: string;
  /** Confirm button variant */
  confirmVariant?: React.ComponentProps<typeof Button>["variant"];
  /** Loading state */
  isLoading?: boolean;
  /** Disable confirm button */
  confirmDisabled?: boolean;
  /** Show cancel button */
  showCancel?: boolean;
  /** Custom content to render below description */
  children?: React.ReactNode;
  /** Additional className for the content */
  className?: string;
}

/**
 * A flexible confirmation dialog with icon support.
 *
 * @example
 * // Delete confirmation
 * <ConfirmDialog
 *   open={showDelete}
 *   onOpenChange={setShowDelete}
 *   title="Delete this item?"
 *   description="This action cannot be undone."
 *   onConfirm={handleDelete}
 *   variant="destructive"
 * />
 *
 * @example
 * // Save warning with custom icon
 * <ConfirmDialog
 *   open={showWarning}
 *   onOpenChange={setShowWarning}
 *   title="Unsaved changes"
 *   description="You have unsaved changes. Do you want to save them?"
 *   onConfirm={handleSave}
 *   confirmLabel="Save"
 *   icon={Save}
 * />
 *
 * @example
 * // Alert mode (single action)
 * <ConfirmDialog
 *   open={showAlert}
 *   onOpenChange={setShowAlert}
 *   title="Success!"
 *   description="Your changes have been saved."
 *   onConfirm={() => setShowAlert(false)}
 *   confirmLabel="OK"
 *   showCancel={false}
 *   icon={CheckCircle}
 * />
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  onCancel,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  icon: IconProp,
  iconClassName,
  confirmVariant,
  isLoading = false,
  confirmDisabled = false,
  showCancel = true,
  children,
  className,
}: ConfirmDialogProps) {
  const styles = variantStyles[variant];
  const Icon = IconProp ?? variantIcons[variant];

  const handleConfirm = async () => {
    await onConfirm();
    // Note: We don't auto-close here - caller should control that
  };

  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  // Determine confirm button variant
  const getConfirmVariant = (): React.ComponentProps<
    typeof Button
  >["variant"] => {
    if (confirmVariant) {
      return confirmVariant;
    }
    if (variant === "destructive") {
      return "destructive";
    }
    if (variant === "warning") {
      return "default";
    }
    return "default";
  };

  return (
    <AlertDialog onOpenChange={onOpenChange} open={open}>
      <AlertDialogContent className={cn(styles.container, className)}>
        <AlertDialogHeader>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
            {Icon && (
              <div
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-full",
                  styles.icon,
                  iconClassName
                )}
              >
                <Icon className="size-5" />
              </div>
            )}
            <div className="flex flex-col gap-1 text-center sm:text-left">
              <AlertDialogTitle>{title}</AlertDialogTitle>
              {description && (
                <AlertDialogDescription>{description}</AlertDialogDescription>
              )}
            </div>
          </div>
        </AlertDialogHeader>

        {children && <div className="py-2">{children}</div>}

        <AlertDialogFooter>
          {showCancel && (
            <AlertDialogCancel disabled={isLoading} onClick={handleCancel}>
              {cancelLabel}
            </AlertDialogCancel>
          )}
          <Button
            disabled={confirmDisabled || isLoading}
            onClick={handleConfirm}
            variant={getConfirmVariant()}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                {confirmLabel}
              </>
            ) : (
              confirmLabel
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export interface ConfirmDialogOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmDialogVariant;
  icon?: LucideIcon;
  confirmVariant?: React.ComponentProps<typeof Button>["variant"];
  showCancel?: boolean;
}

/**
 * Imperative API for showing a confirm dialog.
 * Returns a promise that resolves to true if confirmed, false if cancelled.
 *
 * @example
 * const result = await confirm({
 *   title: "Delete this item?",
 *   description: "This action cannot be undone.",
 *   variant: "destructive",
 * });
 * if (result) {
 *   // User confirmed
 * }
 */
export function confirm(_options: ConfirmDialogOptions): Promise<boolean> {
  return new Promise((_resolve) => {
    // This is a simplified version - for full implementation,
    // you'd need to manage dialog state via context or store
    // For now, callers should use the controlled component
    throw new Error(
      "Imperative confirm() not implemented. Use the ConfirmDialog component directly."
    );
  });
}

// Export success and info variants for convenience
export { AlertTriangle, CheckCircle, Info, XCircle } from "lucide-react";
