import { generateId } from "../../../lib/response";
import * as plansRepo from "../repositories/plans.repository";

export interface CreatePlanInput {
  applicationId: string;
  name: string;
  slug: string;
  description?: string;
  priceCents: number;
  currency?: string;
  billingPeriod: "monthly" | "yearly";
  trialDays?: number;
  features?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  sortOrder?: number;
  visibility?: "archived" | "private" | "public" | null;
  isActive?: boolean;
  isPopular?: boolean;
}

export interface UpdatePlanInput {
  name?: string;
  slug?: string;
  description?: string;
  priceCents?: number;
  currency?: string;
  billingPeriod?: "monthly" | "yearly";
  trialDays?: number;
  features?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  sortOrder?: number;
  visibility?: "archived" | "private" | "public" | null;
  isActive?: boolean;
  isPopular?: boolean;
}

/**
 * Create a new subscription plan
 */
export async function createPlan(input: CreatePlanInput) {
  const planId = generateId("plan");

  const plan = await plansRepo.createPlan({
    id: planId,
    applicationId: input.applicationId,
    name: input.name,
    slug: input.slug,
    description: input.description,
    priceCents: input.priceCents,
    currency: input.currency || "IDR",
    billingPeriod: input.billingPeriod,
    trialDays: input.trialDays ?? 0,
    features: input.features,
    metadata: input.metadata,
    sortOrder: input.sortOrder ?? 0,
    visibility: input.visibility || "public",
    isActive: input.isActive ?? true,
    isPopular: input.isPopular ?? false,
  });

  return plan;
}

/**
 * Get plan by ID
 */
export async function getPlan(planId: string) {
  const plan = await plansRepo.getPlanById(planId);
  if (!plan) {
    throw new Error("Plan not found");
  }
  return plan;
}

/**
 * List plans with filtering
 */
export function listPlans(options: plansRepo.ListPlansOptions = {}) {
  return plansRepo.listPlans(options);
}

/**
 * Update plan
 */
export async function updatePlan(planId: string, input: UpdatePlanInput) {
  // Check if plan exists
  const existingPlan = await plansRepo.getPlanById(planId);
  if (!existingPlan) {
    throw new Error("Plan not found");
  }

  const plan = await plansRepo.updatePlan(planId, input);
  if (!plan) {
    throw new Error("Failed to update plan");
  }

  return plan;
}

/**
 * Delete plan (soft delete by archiving)
 */
export async function deletePlan(planId: string) {
  // Check if plan exists
  const existingPlan = await plansRepo.getPlanById(planId);
  if (!existingPlan) {
    throw new Error("Plan not found");
  }

  // TODO: Check if plan has active subscriptions
  // For now, just archive it

  const plan = await plansRepo.deletePlan(planId);
  if (!plan) {
    throw new Error("Failed to delete plan");
  }

  return {
    id: plan.id,
    deletedAt: plan.updatedAt,
    canRestore: true,
  };
}

/**
 * Get public plans for pricing page
 */
export function getPublicPlans(
  applicationId?: string,
  billingPeriod?: "monthly" | "yearly"
) {
  return plansRepo.getPublicPlans(applicationId, billingPeriod);
}
