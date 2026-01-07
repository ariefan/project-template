import { db } from "@workspace/db";
import {
  type NewSubscriptionRow,
  plans,
  type SubscriptionRow,
  type SubscriptionStatus,
  subscriptions,
} from "@workspace/db/schema";
import { and, desc, eq, lt, type SQL, sql } from "drizzle-orm";

export interface ListSubscriptionsOptions {
  page?: number;
  pageSize?: number;
  status?: SubscriptionStatus;
  planId?: string;
  applicationId?: string;
}

export interface ListSubscriptionsResult {
  data: SubscriptionRow[];
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
 * Create a new subscription
 */
export async function createSubscription(
  data: NewSubscriptionRow
): Promise<SubscriptionRow> {
  const [subscription] = await db
    .insert(subscriptions)
    .values(data)
    .returning();
  if (!subscription) {
    throw new Error("Failed to create subscription");
  }
  return subscription;
}

/**
 * Get a subscription by ID
 */
export async function getSubscriptionById(
  subscriptionId: string
): Promise<SubscriptionRow | null> {
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.id, subscriptionId))
    .limit(1);

  return subscription ?? null;
}

/**
 * Get subscription with plan details
 */
export async function getSubscriptionWithPlan(subscriptionId: string) {
  const [result] = await db
    .select()
    .from(subscriptions)
    .leftJoin(plans, eq(subscriptions.planId, plans.id))
    .where(eq(subscriptions.id, subscriptionId))
    .limit(1);

  if (!result) {
    return null;
  }

  return {
    ...result.subscriptions,
    plan: result.plans,
  };
}

/**
 * Get current subscription for org and app
 */
export async function getCurrentSubscription(
  orgId: string,
  appId: string
): Promise<SubscriptionRow | null> {
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.organizationId, orgId),
        eq(subscriptions.applicationId, appId)
      )
    )
    .limit(1);

  return subscription ?? null;
}

/**
 * Get current subscription with plan details
 */
export async function getCurrentSubscriptionWithPlan(
  orgId: string,
  appId: string
) {
  const [result] = await db
    .select()
    .from(subscriptions)
    .leftJoin(plans, eq(subscriptions.planId, plans.id))
    .where(
      and(
        eq(subscriptions.organizationId, orgId),
        eq(subscriptions.applicationId, appId)
      )
    )
    .limit(1);

  if (!result) {
    return null;
  }

  return {
    ...result.subscriptions,
    plan: result.plans,
  };
}

/**
 * List subscriptions with pagination and filtering
 */
export async function listSubscriptions(
  options: ListSubscriptionsOptions = {}
): Promise<ListSubscriptionsResult> {
  const { page = 1, pageSize = 50, status, planId, applicationId } = options;

  // Build where conditions
  const conditions: SQL[] = [];

  if (status) {
    conditions.push(eq(subscriptions.status, status));
  }
  if (planId) {
    conditions.push(eq(subscriptions.planId, planId));
  }
  if (applicationId) {
    conditions.push(eq(subscriptions.applicationId, applicationId));
  }

  // Count total
  const countResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(subscriptions)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  const totalCount = countResult[0]?.count ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);
  const offset = (page - 1) * pageSize;

  // Fetch data
  const data = await db
    .select()
    .from(subscriptions)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(subscriptions.createdAt))
    .limit(pageSize)
    .offset(offset);

  return {
    data,
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
 * Update a subscription
 */
export async function updateSubscription(
  subscriptionId: string,
  updates: Partial<NewSubscriptionRow>
): Promise<SubscriptionRow | null> {
  const [subscription] = await db
    .update(subscriptions)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(subscriptions.id, subscriptionId))
    .returning();

  return subscription ?? null;
}

/**
 * Find expired trial subscriptions
 */
export function findExpiredTrials(): Promise<SubscriptionRow[]> {
  return db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.status, "trialing"),
        lt(subscriptions.trialEndsAt, new Date())
      )
    );
}

/**
 * Find past due subscriptions
 */
export function findPastDueSubscriptions(): Promise<SubscriptionRow[]> {
  return db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.status, "past_due"));
}

/**
 * Find active subscriptions
 */
export function findActiveSubscriptions(): Promise<SubscriptionRow[]> {
  return db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.status, "active"),
        sql`${subscriptions.providerSubscriptionId} IS NOT NULL`
      )
    );
}
