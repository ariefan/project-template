"use client";

import type { SubscriptionPlan } from "@workspace/contracts";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";
import { Check } from "lucide-react";

interface PlanCardProps {
  plan: SubscriptionPlan;
  isPopular?: boolean;
  onSelect?: (planId: string) => void;
  isLoading?: boolean;
  currentPlanId?: string;
  className?: string;
}

export function PlanCard({
  plan,
  isPopular,
  onSelect,
  isLoading,
  currentPlanId,
  className,
}: PlanCardProps) {
  const isCurrent = currentPlanId === plan.id;

  return (
    <Card
      className={cn(
        "relative flex flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl",
        isPopular
          ? "z-10 scale-105 border-primary ring-2 ring-primary ring-offset-2"
          : "border-border/50",
        className
      )}
    >
      {isPopular && (
        <div className="absolute top-0 right-0 p-3">
          <Badge className="bg-primary px-3 py-1 font-semibold text-primary-foreground">
            Most Popular
          </Badge>
        </div>
      )}

      <CardHeader className="pt-8 text-center">
        <CardTitle className="font-bold text-2xl">{plan.name}</CardTitle>
        <p className="mt-2 line-clamp-2 text-muted-foreground">
          {plan.description}
        </p>
      </CardHeader>

      <CardContent className="flex flex-grow flex-col items-center px-6">
        <div className="mt-2 flex items-baseline gap-1">
          <span className="font-bold text-4xl">${plan.priceCents / 100}</span>
          <span className="text-muted-foreground">
            /{plan.billingPeriod === "monthly" ? "mo" : "yr"}
          </span>
        </div>

        <div className="mt-8 w-full space-y-4">
          {plan.features?.maxUsers && (
            <div className="flex items-start gap-3 text-sm">
              <div className="mt-1 rounded-full bg-primary/10 p-0.5">
                <Check className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-muted-foreground">
                {plan.features.maxUsers === -1
                  ? "Unlimited"
                  : plan.features.maxUsers}{" "}
                Users
              </span>
            </div>
          )}
          {plan.features?.maxStorageGb && (
            <div className="flex items-start gap-3 text-sm">
              <div className="mt-1 rounded-full bg-primary/10 p-0.5">
                <Check className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-muted-foreground">
                {plan.features.maxStorageGb === -1
                  ? "Unlimited"
                  : plan.features.maxStorageGb + "GB"}{" "}
                Storage
              </span>
            </div>
          )}
          {plan.features?.advancedReporting && (
            <div className="flex items-start gap-3 text-sm">
              <div className="mt-1 rounded-full bg-primary/10 p-0.5">
                <Check className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-muted-foreground">Advanced Reporting</span>
            </div>
          )}
          {plan.features?.apiAccess && (
            <div className="flex items-start gap-3 text-sm">
              <div className="mt-1 rounded-full bg-primary/10 p-0.5">
                <Check className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-muted-foreground">API Access</span>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="px-6 pt-6 pb-8">
        <Button
          className={cn(
            "h-12 w-full font-bold text-md transition-all",
            isPopular
              ? "bg-primary shadow-lg shadow-primary/20 hover:bg-primary/90"
              : ""
          )}
          disabled={isLoading || isCurrent}
          onClick={() => onSelect?.(plan.id)}
          variant={isCurrent ? "outline" : "default"}
        >
          {isCurrent ? "Current Plan" : isCurrent ? "Downgrade" : "Select Plan"}
        </Button>
      </CardFooter>

      {/* Subtle background gradient for popular card */}
      {isPopular && (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
      )}
    </Card>
  );
}
