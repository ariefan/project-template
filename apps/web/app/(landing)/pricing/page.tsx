"use client";

import type { SubscriptionPlan } from "@workspace/contracts";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { useState } from "react";
import { Footer } from "@/components/landing/footer";
import { Navigation } from "@/components/landing/navigation";
import { PlanCard } from "@/components/subscriptions/plan-card";
import { usePublicPlans } from "@/hooks/use-subscriptions";

export default function PricingPage() {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">(
    "monthly"
  );
  const { data: response, isLoading, error } = usePublicPlans(billingPeriod);
  if (error) {
    console.error("[DEBUG] PricingPage - Query Error:", error);
  }
  console.log("[DEBUG] PricingPage - API Response:", response);
  const plans: SubscriptionPlan[] =
    response && !("error" in response) && response.data
      ? (response.data as unknown as SubscriptionPlan[])
      : [];
  console.log("[DEBUG] PricingPage - Processed Plans:", plans);

  return (
    <div className="flex min-h-screen flex-col">
      <Navigation />

      <main className="flex-grow px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-16 text-center">
            <h1 className="mb-4 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text font-extrabold text-4xl text-transparent tracking-tight md:text-6xl">
              Simple, Transparent Pricing
            </h1>
            <p className="mx-auto max-w-2xl text-muted-foreground text-xl">
              Choose the perfect plan for your project. No hidden fees, cancel
              anytime.
            </p>

            {/* Billing Toggle */}
            <div className="mt-10 flex justify-center">
              <Tabs
                className="w-[300px]"
                onValueChange={(v) =>
                  setBillingPeriod(v as "monthly" | "yearly")
                }
                value={billingPeriod}
              >
                <TabsList className="grid w-full grid-cols-2 border border-border/50 bg-muted/50 p-1 backdrop-blur-sm">
                  <TabsTrigger
                    className="font-semibold transition-all"
                    value="monthly"
                  >
                    Monthly
                  </TabsTrigger>
                  <TabsTrigger
                    className="font-semibold transition-all"
                    value="yearly"
                  >
                    Yearly
                    <span className="ml-1.5 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary text-xs">
                      -20%
                    </span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          {/* Pricing Grid */}
          <div className="mx-auto grid max-w-6xl grid-cols-1 items-stretch gap-8 md:grid-cols-2 lg:grid-cols-3">
            {isLoading &&
              // Loading Skeletons
              Array.from({ length: 3 }).map((_, i) => (
                <div
                  className="space-y-6 rounded-xl border border-border/50 p-8"
                  key={`skeleton-${i.toString()}`}
                >
                  <Skeleton className="mx-auto h-8 w-3/4" />
                  <Skeleton className="mx-auto h-12 w-1/2" />
                  <div className="space-y-3 pt-6">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                  </div>
                  <Skeleton className="mt-8 h-12 w-full" />
                </div>
              ))}
            {!isLoading &&
              plans.length > 0 &&
              plans.map((plan) => (
                <PlanCard
                  isPopular={plan.id === "pro-plan"}
                  key={plan.id}
                  onSelect={(id) => {
                    // Redirect to subscribe/login
                    window.location.href = `/login?redirect=/subscriptions/checkout?plan=${id}`;
                  }} // Hardcoded for demo, normally from API
                  plan={plan}
                />
              ))}
            {!isLoading && plans.length === 0 && (
              <div className="col-span-full rounded-xl border-2 border-border border-dashed py-20 text-center">
                <p className="text-lg text-muted-foreground italic">
                  No public plans found for this billing period.
                </p>
              </div>
            )}
          </div>

          {/* FAQ/Trust Section placeholder */}
          <div className="mt-24 text-center">
            <p className="mb-8 font-semibold text-muted-foreground text-sm uppercase tracking-widest">
              Trusted by innovative companies worldwide
            </p>
            <div className="flex flex-wrap justify-center gap-12 opacity-50 contrast-125 grayscale">
              {/* Logo stubs */}
              <div className="h-8 w-24 rounded-md bg-foreground/20" />
              <div className="h-8 w-24 rounded-md bg-foreground/20" />
              <div className="h-8 w-24 rounded-md bg-foreground/20" />
              <div className="h-8 w-24 rounded-md bg-foreground/20" />
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
