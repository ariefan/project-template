"use client";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog";
import { Button } from "@workspace/ui/components/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@workspace/ui/components/drawer";
import { useIsMobile } from "@workspace/ui/hooks/use-mobile";
import { cn } from "@workspace/ui/lib/utils";
import {
  AlertTriangle,
  Info,
  Loader2,
  type LucideIcon,
  XCircle,
} from "lucide-react";
import * as React from "react";

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
      "border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:!bg-background dark:bg-gradient-to-b dark:from-yellow-500/10 dark:to-yellow-500/10",
  },
  destructive: {
    icon: "text-destructive bg-destructive/10",
    container:
      "border-red-200 bg-red-50 dark:border-red-900 dark:!bg-background dark:bg-gradient-to-b dark:from-destructive/10 dark:to-destructive/10",
  },
};

export interface ConfirmDialogProps {
  /** Whether the dialog is open (controlled) */
  open?: boolean;
  /** Called when dialog should close */
  onOpenChange?: (open: boolean) => void;
  /** Trigger element for uncontrolled mode */
  trigger?: React.ReactNode;
  /** Dialog title */
  title: string;
  /** Dialog description */
  description?: string;
  /** Called when confirm button is clicked */
  onConfirm: () => void | Promise<void>;
  /** Called when cancel button is clicked */
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
  /** Loading state (controlled) */
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
 * Automatically adapts to Drawer on mobile devices.
 * Supports both controlled (open/onOpenChange) and uncontrolled (trigger) modes.
 */
export function ConfirmDialog({
  open: openProp,
  onOpenChange: onOpenChangeProp,
  trigger,
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
  isLoading: isLoadingProp,
  confirmDisabled = false,
  showCancel = true,
  children,
  className,
}: ConfirmDialogProps) {
  const isMobile = useIsMobile();
  const [internalOpen, setInternalOpen] = React.useState(false);
  const [internalLoading, setInternalLoading] = React.useState(false);

  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : internalOpen;
  const setOpen = isControlled ? onOpenChangeProp || noop : setInternalOpen;

  const isLoading =
    isLoadingProp !== undefined ? isLoadingProp : internalLoading;

  const handleConfirm = async () => {
    if (!isControlled) {
      setInternalLoading(true);
    }
    try {
      await onConfirm();
      if (!isControlled) {
        setOpen(false);
      }
    } catch (error) {
      console.error(error);
    } finally {
      if (!isControlled) {
        setInternalLoading(false);
      }
    }
  };

  const handleCancel = () => {
    onCancel?.();
    setOpen(false);
  };

  const commonProps = {
    open: Boolean(open),
    onOpenChange: setOpen,
    trigger,
    title,
    description,
    confirmLabel,
    cancelLabel,
    variant,
    icon: IconProp,
    iconClassName,
    confirmVariant,
    isLoading: Boolean(isLoading),
    confirmDisabled,
    showCancel,
    children,
    className,
    onConfirm: handleConfirm,
    onCancel: handleCancel,
  };

  if (isMobile) {
    return <MobileConfirmDialog {...commonProps} />;
  }

  return <DesktopConfirmDialog {...commonProps} />;
}

// Helper to avoid empty block lint error
const noop = () => {
  // noop
};

interface InnerConfirmDialogProps
  extends Omit<ConfirmDialogProps, "open" | "onOpenChange" | "isLoading"> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function MobileConfirmDialog(props: InnerConfirmDialogProps) {
  const {
    open,
    onOpenChange,
    trigger,
    title,
    description,
    confirmLabel,
    cancelLabel,
    variant = "default",
    icon: IconProp,
    iconClassName,
    confirmVariant,
    isLoading,
    confirmDisabled,
    showCancel,
    children,
    className,
    onConfirm,
    onCancel,
  } = props;

  const styles = variantStyles[variant];
  const Icon = IconProp ?? variantIcons[variant];

  let finalConfirmVariant = confirmVariant;
  if (!finalConfirmVariant) {
    if (variant === "destructive") {
      finalConfirmVariant = "destructive";
    } else {
      finalConfirmVariant = "default";
    }
  }

  return (
    <Drawer dismissible={false} onOpenChange={onOpenChange} open={open}>
      {trigger && <DrawerTrigger asChild>{trigger}</DrawerTrigger>}
      <DrawerContent className={cn(styles.container, className)}>
        <DrawerHeader className="text-left">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
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
              <DrawerTitle>{title}</DrawerTitle>
            </div>
            {description && (
              <DrawerDescription>{description}</DrawerDescription>
            )}
          </div>
        </DrawerHeader>

        {children && <div className="px-4 py-2">{children}</div>}

        <DrawerFooter className="pt-2">
          <Button
            className="w-full"
            disabled={confirmDisabled || isLoading}
            onClick={onConfirm}
            variant={finalConfirmVariant}
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
          {showCancel && (
            <DrawerClose asChild>
              <Button onClick={onCancel} variant="outline">
                {cancelLabel}
              </Button>
            </DrawerClose>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

function DesktopConfirmDialog(props: InnerConfirmDialogProps) {
  const {
    open,
    onOpenChange,
    trigger,
    title,
    description,
    confirmLabel,
    cancelLabel,
    variant = "default",
    icon: IconProp,
    iconClassName,
    confirmVariant,
    isLoading,
    confirmDisabled,
    showCancel,
    children,
    className,
    onConfirm,
    onCancel,
  } = props;

  const styles = variantStyles[variant];
  const Icon = IconProp ?? variantIcons[variant];

  let finalConfirmVariant = confirmVariant;
  if (!finalConfirmVariant) {
    if (variant === "destructive") {
      finalConfirmVariant = "destructive";
    } else {
      finalConfirmVariant = "default";
    }
  }

  return (
    <AlertDialog onOpenChange={onOpenChange} open={open}>
      {trigger && <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>}
      <AlertDialogContent className={cn(styles.container, className)}>
        <AlertDialogHeader>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
            {Icon && (
              <div
                className={cn(
                  "flex size-12 shrink-0 items-center justify-center rounded-full",
                  styles.icon,
                  iconClassName
                )}
              >
                <Icon className="size-6" />
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
            <AlertDialogCancel disabled={isLoading} onClick={onCancel}>
              {cancelLabel}
            </AlertDialogCancel>
          )}
          <Button
            disabled={confirmDisabled || isLoading}
            onClick={onConfirm}
            variant={finalConfirmVariant}
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
