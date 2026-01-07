"use client";

import { Progress } from "@workspace/ui/components/progress";
import { cn } from "@workspace/ui/lib/utils";

interface UsageBarProps {
  label: string;
  current: number;
  limit: number;
  unit?: string;
  className?: string;
}

export function UsageBar({
  label,
  current,
  limit,
  unit = "",
  className,
}: UsageBarProps) {
  const percentage = Math.min(Math.round((current / limit) * 100), 100);
  const isNearLimit = percentage >= 80;
  const isAtLimit = percentage >= 100;

  let progressColorClass = "[&>div]:bg-primary";
  if (isAtLimit) {
    progressColorClass = "[&>div]:bg-destructive";
  } else if (isNearLimit) {
    progressColorClass = "[&>div]:bg-amber-500";
  }

  let textColorClass = "text-muted-foreground/50";
  if (isAtLimit) {
    textColorClass = "text-destructive";
  } else if (isNearLimit) {
    textColorClass = "text-amber-500";
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between font-medium text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span>
          {current} / {limit} {unit}
        </span>
      </div>
      <Progress className={cn("h-2", progressColorClass)} value={percentage} />
      <div className="flex justify-end font-bold uppercase tracking-tighter">
        <span className={cn("text-[10px]", textColorClass)}>
          {percentage}% consumed
        </span>
      </div>
    </div>
  );
}
