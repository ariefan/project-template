"use client";

import { Button } from "@workspace/ui/components/button";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";
import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";

interface PageHeaderProps {
  title: React.ReactNode;
  description?: string;

  // Navigation
  backHref?: string;
  backLabel?: string;
  onBack?: () => void;

  // Actions (top-right buttons)
  actions?: React.ReactNode;

  // Stats section (below title/description)
  stats?: React.ReactNode;

  // Optional icon
  icon?: React.ReactNode;

  // Variant for contextual sizing
  variant?: "default" | "compact";

  // Loading state shows skeleton
  loading?: boolean;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Header has flexible layout options
export function PageHeader({
  title,
  description,
  backHref,
  backLabel = "Back",
  onBack,
  actions,
  stats,
  icon,
  variant = "default",
  loading = false,
}: PageHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (backHref) {
      router.push(backHref);
    } else {
      router.back();
    }
  };

  const showBack = Boolean(backHref || onBack);
  const isCompact = variant === "compact";

  // Loading skeleton
  if (loading) {
    return (
      <div className={cn("space-y-4", isCompact ? "mb-4" : "mb-6")}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            {showBack && <Skeleton className="h-8 w-28" />}
            <div className="flex items-center gap-4">
              {icon && <Skeleton className="size-8 rounded-full" />}
              <div className="space-y-2">
                <Skeleton className={cn("w-48", isCompact ? "h-6" : "h-8")} />
                {description !== undefined && <Skeleton className="h-4 w-72" />}
              </div>
            </div>
          </div>
          {actions && <Skeleton className="h-9 w-24" />}
        </div>
        {stats && <Skeleton className="h-20 w-full" />}
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", isCompact ? "mb-4" : "mb-6")}>
      {/* Header section */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          {/* Back button */}
          {showBack && (
            <Button
              className="mb-2 -ml-2"
              onClick={handleBack}
              size="sm"
              variant="ghost"
            >
              <ChevronLeft className="size-4" />
              {backLabel}
            </Button>
          )}

          {/* Icon and Title/Description Group */}
          <div className="flex items-center gap-4">
            {/* Icon Section (Left) */}
            {icon && <div className="shrink-0 text-primary">{icon}</div>}

            {/* Text Section (Right) */}
            <div>
              <h1
                className={cn(
                  "flex items-center gap-2 font-bold",
                  isCompact ? "text-xl" : "text-2xl"
                )}
              >
                {title}
              </h1>
              {description && (
                <p
                  className={cn(
                    "mt-1 text-muted-foreground",
                    isCompact && "text-sm"
                  )}
                >
                  {description}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      {/* Stats section */}
      {stats && <div>{stats}</div>}
    </div>
  );
}
