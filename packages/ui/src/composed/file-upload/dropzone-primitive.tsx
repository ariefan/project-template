import type * as React from "react";
import { cn } from "../../lib/utils";

export interface DropzonePrimitiveProps
  extends React.HTMLAttributes<HTMLDivElement> {
  isDragging?: boolean;
  disabled?: boolean;
  compact?: boolean;
}

export function DropzonePrimitive({
  className,
  isDragging,
  disabled,
  compact = false,
  children,
  ...props
}: DropzonePrimitiveProps) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: Dropzone interactivity managed by parent
    <div
      className={cn(
        "flex cursor-pointer items-center justify-center gap-4 rounded-lg border-2 border-dashed transition-colors",
        compact ? "p-4" : "p-8",
        disabled ? "cursor-not-allowed opacity-60" : "hover:border-primary/50",
        isDragging
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25 hover:bg-muted/50",
        className
      )}
      role="button"
      tabIndex={disabled ? -1 : 0}
      {...props}
    >
      {children}
    </div>
  );
}
