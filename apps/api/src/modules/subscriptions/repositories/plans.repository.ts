import { db } from "@workspace/db";
import {
  type NewPlanRow,
  type PlanBillingPeriod,
  type PlanRow,
  type PlanVisibility,
  plans,
} from "@workspace/db/schema";
import type { SQL } from "drizzle-orm";
import { and, desc, eq, sql } from "drizzle-orm";

export interface ListPlansOptions {
  page?: number;
  pageSize?: number;
  applicationId?: string;
  visibility?: PlanVisibility;
  isActive?: boolean;
  billingPeriod?: PlanBillingPeriod;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface ListPlansResult {
  data: PlanRow[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

/**
 * Normalize plan data - convert null metadata to undefined for API compatibility
 * The Zod schema expects undefined, not null, for optional fields
 */
function normalizePlan(plan: PlanRow): PlanRow {
  return {
    ...plan,
    // biome expects metadata | null, but API needs metadata | undefined
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    metadata: (plan.metadata ?? undefined) as PlanRow["metadata"],
  };
}

/**
 * Create a new plan
 */
export async function createPlan(data: NewPlanRow): Promise<PlanRow> {
  const [plan] = await db.insert(plans).values(data).returning();
  if (!plan) {
    throw new Error("Failed to create plan");
  }
  return normalizePlan(plan);
}

/**
 * Get a plan by ID
 */
export async function getPlanById(planId: string): Promise<PlanRow | null> {
  const [plan] = await db
    .select()
    .from(plans)
    .where(eq(plans.id, planId))
    .limit(1);

  return plan ? normalizePlan(plan) : null;
}

/**
 * List plans with pagination and filtering
 */
export async function listPlans(
  options: ListPlansOptions = {}
): Promise<ListPlansResult> {
  const {
    page = 1,
    pageSize = 50,
    applicationId,
    visibility,
    isActive,
    billingPeriod,
    sortBy = "sortOrder",
    sortOrder = "asc",
  } = options;

  // Build where conditions
  const conditions: SQL[] = [];

  if (applicationId) {
    conditions.push(eq(plans.applicationId, applicationId));
  }
  if (visibility) {
    conditions.push(eq(plans.visibility, visibility));
  }
  if (isActive !== undefined) {
    conditions.push(eq(plans.isActive, isActive));
  }
  if (billingPeriod) {
    conditions.push(eq(plans.billingPeriod, billingPeriod));
  }

  // Count total
  const countResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(plans)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  const totalCount = countResult[0]?.count ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);
  const offset = (page - 1) * pageSize;

  // Determine sort column
  let sortColumn: unknown = plans.sortOrder;
  if (sortBy === "name") {
    sortColumn = plans.name;
  } else if (sortBy === "priceCents") {
    sortColumn = plans.priceCents;
  }

  // Fetch data
  const orderByValue =
    sortOrder === "desc"
      ? desc(sortColumn as typeof plans.sortOrder)
      : (sortColumn as typeof plans.sortOrder);
  const data = await db
    .select()
    .from(plans)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(orderByValue)
    .limit(pageSize)
    .offset(offset);

  return {
    data: data.map(normalizePlan),
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    },
  };
}

/**
 * Update a plan
 */
export async function updatePlan(
  planId: string,
  updates: Partial<NewPlanRow>
): Promise<PlanRow | null> {
  const [plan] = await db
    .update(plans)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(plans.id, planId))
    .returning();

  return plan ? normalizePlan(plan) : null;
}

/**
 * Delete a plan (soft delete by archiving)
 */
export async function deletePlan(planId: string): Promise<PlanRow | null> {
  const [plan] = await db
    .update(plans)
    .set({ visibility: "archived", updatedAt: new Date() })
    .where(eq(plans.id, planId))
    .returning();

  return plan ? normalizePlan(plan) : null;
}

/**
 * Get public plans for pricing page
 */
export async function getPublicPlans(
  applicationId?: string,
  billingPeriod?: PlanBillingPeriod
): Promise<PlanRow[]> {
  const conditions = [eq(plans.visibility, "public"), eq(plans.isActive, true)];

  if (applicationId) {
    conditions.push(eq(plans.applicationId, applicationId));
  }
  if (billingPeriod) {
    conditions.push(eq(plans.billingPeriod, billingPeriod));
  }

  const planRows = await db
    .select()
    .from(plans)
    .where(and(...conditions))
    .orderBy(plans.sortOrder);

  return planRows.map(normalizePlan);
}
