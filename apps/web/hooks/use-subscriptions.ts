"use client";

import { useQuery } from "@tanstack/react-query";
import {
  publicPricingListPublicPlansOptions,
  subscriptionsGetCurrentOptions,
} from "@workspace/contracts/query";
import { apiClient } from "@/lib/api-client";
import { useActiveOrganization } from "@/lib/auth";

const DEFAULT_APP_ID = "app_default";

/**
 * Hook to get public subscription plans.
 * Used on the pricing page.
 */
export function usePublicPlans(billingPeriod?: "monthly" | "yearly") {
  return useQuery({
    ...publicPricingListPublicPlansOptions({
      client: apiClient,
      query: {
        applicationId: DEFAULT_APP_ID,
        billingPeriod,
      },
    }),
  });
}

/**
 * Hook to get the current subscription for the active organization.
 */
export function useCurrentSubscription() {
  const { data: orgData } = useActiveOrganization();
  const orgId = orgData?.id;

  return useQuery({
    ...subscriptionsGetCurrentOptions({
      client: apiClient,
      path: { orgId: orgId ?? "" },
      query: { applicationId: DEFAULT_APP_ID },
    }),
    enabled: Boolean(orgId),
  });
}

/**
 * Hook to check if a specific feature is enabled for the active organization.
 */
export function useFeatureAccess(featureKey: string) {
  const { data: response, isLoading } = useCurrentSubscription();
  const subscription =
    response && !("error" in response) ? response.data : null;
  const features =
    (subscription?.plan?.features as Record<string, unknown>) || {};

  return {
    hasAccess: Boolean(features[featureKey]),
    isLoading,
  };
}
