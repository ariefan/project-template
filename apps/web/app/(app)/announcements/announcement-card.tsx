"use client";

import type { AnnouncementWithInteraction } from "@workspace/contracts";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";
import { formatDistanceToNow } from "date-fns";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Info,
  X,
} from "lucide-react";
import Link from "next/link";

interface AnnouncementCardProps {
  announcement: AnnouncementWithInteraction;
  onMarkRead?: () => void;
  onDismiss?: () => void;
  onAcknowledge?: () => void;
  compact?: boolean;
  className?: string;
}

const PRIORITY_CONFIG = {
  info: {
    icon: Info,
    iconColor: "text-blue-500",
    badgeVariant: "default" as const,
    borderColor: "border-blue-200",
    bgColor: "bg-blue-50",
  },
  warning: {
    icon: AlertTriangle,
    iconColor: "text-amber-500",
    badgeVariant: "secondary" as const,
    borderColor: "border-amber-200",
    bgColor: "bg-amber-50",
  },
  critical: {
    icon: AlertCircle,
    iconColor: "text-red-500",
    badgeVariant: "destructive" as const,
    borderColor: "border-red-200",
    bgColor: "bg-red-50",
  },
};

export function AnnouncementCard({
  announcement,
  onMarkRead,
  onDismiss,
  onAcknowledge,
  compact = false,
  className,
}: AnnouncementCardProps) {
  const config = PRIORITY_CONFIG[announcement.priority];
  const Icon = config.icon;

  const isUnread = !announcement.hasRead;
  const isUnacknowledged =
    announcement.priority === "critical" && !announcement.hasAcknowledged;

  return (
    <Card
      className={cn(
        "relative transition-all hover:shadow-md",
        config.borderColor,
        isUnread && "border-l-4",
        className
      )}
    >
      {announcement.isDismissible && onDismiss && (
        <Button
          className="absolute top-2 right-2 size-6"
          onClick={onDismiss}
          size="icon"
          variant="ghost"
        >
          <X className="size-4" />
        </Button>
      )}

      <CardHeader className={cn("pb-3", compact && "pb-2")}>
        <div className="flex items-start gap-3">
          <div className={cn("rounded-full p-2", config.bgColor, "shrink-0")}>
            <Icon className={cn("size-5", config.iconColor)} />
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className={cn(compact ? "text-base" : "text-lg")}>
                {announcement.title}
              </CardTitle>
              <Badge className="capitalize" variant={config.badgeVariant}>
                {announcement.priority}
              </Badge>
              {isUnread && (
                <Badge className="bg-blue-50" variant="outline">
                  New
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs">
              {formatDistanceToNow(new Date(announcement.publishAt), {
                addSuffix: true,
              })}
              {announcement.expiresAt && (
                <>
                  {" • "}
                  Expires{" "}
                  {formatDistanceToNow(new Date(announcement.expiresAt), {
                    addSuffix: true,
                  })}
                </>
              )}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className={cn("pb-3", compact && "pb-2")}>
        <div className="prose prose-sm dark:prose-invert max-w-none">
          {/* Support markdown rendering if needed */}
          <p className="whitespace-pre-wrap text-sm">{announcement.content}</p>
        </div>
      </CardContent>

      {(announcement.linkUrl ||
        isUnread ||
        isUnacknowledged ||
        (onMarkRead && announcement.hasRead)) && (
        <CardFooter className="flex flex-wrap items-center gap-2">
          {announcement.linkUrl && (
            <Button asChild size="sm" variant="outline">
              <Link
                href={announcement.linkUrl}
                rel="noopener noreferrer"
                target="_blank"
              >
                {announcement.linkText || "Learn more"}
                <ExternalLink className="ml-2 size-4" />
              </Link>
            </Button>
          )}

          {isUnread && onMarkRead && (
            <Button
              className="gap-2"
              onClick={onMarkRead}
              size="sm"
              variant="ghost"
            >
              <CheckCircle className="size-4" />
              Mark as read
            </Button>
          )}

          {isUnacknowledged && onAcknowledge && (
            <Button
              className="gap-2"
              onClick={onAcknowledge}
              size="sm"
              variant="default"
            >
              <CheckCircle className="size-4" />
              Acknowledge
            </Button>
          )}

          {onMarkRead && announcement.hasRead && (
            <span className="flex items-center gap-1 text-muted-foreground text-xs">
              <CheckCircle className="size-3" />
              Read
            </span>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
