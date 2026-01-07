import { getDefaultDb } from "@workspace/db";
import { subscriptions } from "@workspace/db/schema";
import { and, eq, lt, sql } from "drizzle-orm";
import * as subscriptionsRepo from "../repositories/subscriptions.repository";

/**
 * Service for handling subscription-related background jobs
 */

/**
 * Check for subscriptions that have reached their period end and need processing
 */
export async function checkExpiringSubscriptions() {
  const db = getDefaultDb();
  const now = new Date();

  // Find active/trialing subscriptions that have expired
  const expiredSubscriptions = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        sql`${subscriptions.status} IN ('active', 'trialing')`,
        lt(subscriptions.currentPeriodEnd, now)
      )
    );

  console.log(
    `Found ${expiredSubscriptions.length} expired subscriptions to process`
  );

  for (const sub of expiredSubscriptions) {
    try {
      if (sub.cancelAtPeriodEnd) {
        // Mark as canceled/expired
        await subscriptionsRepo.updateSubscription(sub.id, {
          status: sub.status === "trialing" ? "expired" : "canceled",
        });
        console.log(`Subscription ${sub.id} expired/canceled at period end`);
      } else {
        // In a real system, this would trigger a renewal/payment
        // For now, we'll just extend the period to simulate active status
        // OR mark as past_due if payment fails (mocked logic)

        // Let's just extend it for now to keep the demo working
        const nextPeriodEnd = new Date(sub.currentPeriodEnd);
        nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + 1);

        await subscriptionsRepo.updateSubscription(sub.id, {
          currentPeriodStart: sub.currentPeriodEnd,
          currentPeriodEnd: nextPeriodEnd,
          status: "active", // Ensure it's active if trial ended
        });
        console.log(`Subscription ${sub.id} renewed (simulated)`);
      }
    } catch (error) {
      console.error(`Failed to process expired subscription ${sub.id}:`, error);
    }
  }
}

/**
 * Monitor trialing subscriptions and send reminders (simulated)
 */
export async function monitorTrials() {
  const db = getDefaultDb();
  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

  // Find subscriptions whose trial ends in exactly 3 days (or soon)
  // This is a simplified check
  const trialSubscriptions = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.status, "trialing"),
        lt(subscriptions.trialEndsAt, threeDaysFromNow)
      )
    );

  console.log(`Found ${trialSubscriptions.length} trials ending soon`);

  // In a real system, you would send emails here
  for (const sub of trialSubscriptions) {
    console.log(
      `Trial ending soon for org ${sub.organizationId} (sub: ${sub.id})`
    );
  }
}

/**
 * Reset usage limits for subscriptions starting a new period
 * (Normally this would be part of the renewal process)
 */
export function resetUsageLimits() {
  // Mock: This would typically clear JSONB metadata or reset counters in a separate usage table
  console.log("Resetting usage limits for new billing periods...");
}

/**
 * Main entry point for the subscription monitor job
 */
export async function runSubscriptionMonitor() {
  console.log("Starting subscription monitor task...");
  await checkExpiringSubscriptions();
  await monitorTrials();
  await resetUsageLimits();
  console.log("Subscription monitor task completed.");
}
