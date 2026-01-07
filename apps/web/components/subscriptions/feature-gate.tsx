"use client";

import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { Lock } from "lucide-react";
import { type ReactNode, useState } from "react";
import { useCurrentSubscription } from "@/hooks/use-subscriptions";
import { UpgradeModal } from "./upgrade-modal";

interface FeatureGateProps {
  featureKey: string;
  featureName?: string;
  children: ReactNode;
  fallback?: ReactNode;
  variant?: "hide" | "lock" | "blur";
  className?: string;
}

/**
 * Component to gate features based on subscription plans.
 */
export function FeatureGate({
  featureKey,
  featureName,
  children,
  fallback,
  variant = "lock",
  className,
}: FeatureGateProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data: response, isLoading } = useCurrentSubscription();

  const subscription =
    response && !("error" in response) ? response.data : null;
  const features = (subscription?.plan?.features as Record<string, any>) || {};

  const hasAccess = Boolean(features[featureKey]);

  if (isLoading) return null;

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (variant === "hide") {
    return null;
  }

  const upgradePrompt = (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border-2 border-border/50 border-dashed bg-muted/30 p-8 text-center transition-all hover:border-primary/30",
        className
      )}
    >
      <div className="flex flex-col items-center space-y-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border/50 bg-background shadow-sm transition-transform group-hover:scale-110">
          <Lock className="h-5 w-5 text-muted-foreground/60" />
        </div>
        <div className="space-y-1">
          <p className="font-bold uppercase italic tracking-tighter">
            {featureName || featureKey} is locked
          </p>
          <p className="font-medium text-muted-foreground text-xs italic">
            Upgrade your plan to unlock this feature.
          </p>
        </div>
        <Button
          className="h-9 border-primary/20 px-6 font-black text-primary uppercase italic tracking-tighter hover:bg-primary hover:text-primary-foreground"
          onClick={() => setIsModalOpen(true)}
          size="sm"
          variant="outline"
        >
          Upgrade Now
        </Button>
      </div>

      <UpgradeModal
        featureName={featureName}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      {/* Subtle blur background */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
    </div>
  );

  if (variant === "blur") {
    return (
      <div className="relative">
        <div className="pointer-events-none select-none opacity-50 blur-sm filter">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div className="max-w-sm scale-95 space-y-4 rounded-2xl border border-border bg-background/80 p-6 text-center shadow-2xl backdrop-blur-md transition-transform hover:scale-100">
            <Lock className="mx-auto h-8 w-8 text-primary" />
            <div className="space-y-1">
              <p className="font-extrabold text-lg uppercase italic tracking-tighter">
                Premium Feature
              </p>
              <p className="font-medium text-muted-foreground text-sm italic">
                This view requires a Pro subscription.
              </p>
            </div>
            <Button
              className="h-11 w-full font-black uppercase italic"
              onClick={() => setIsModalOpen(true)}
            >
              Unlock with Pro
            </Button>
          </div>
        </div>
        <UpgradeModal
          featureName={featureName}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      </div>
    );
  }

  return upgradePrompt;
}
