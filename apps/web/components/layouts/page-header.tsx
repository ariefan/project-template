"use client";

import { Button } from "@workspace/ui/components/button";
import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";

interface PageHeaderProps {
  title: string;
  description?: string;

  // Navigation
  backHref?: string;
  backLabel?: string;
  onBack?: () => void;

  // Actions (top-right buttons)
  actions?: React.ReactNode;

  // Stats section (below title/description)
  stats?: React.ReactNode;

  // Optional badge next to title
  badge?: React.ReactNode;

  // Optional icon
  icon?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  backHref,
  backLabel = "Back",
  onBack,
  actions,
  stats,
  badge,
  icon,
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

  return (
    <div className="mb-6 space-y-6">
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
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-2xl">{title}</h1>
                {badge}
              </div>
              {description && (
                <p className="mt-1 text-muted-foreground">{description}</p>
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
