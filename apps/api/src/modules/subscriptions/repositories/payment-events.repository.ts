import { db } from "@workspace/db";
import {
  type NewPaymentEventRow,
  type PaymentEventRow,
  type PaymentEventStatus,
  type PaymentEventType,
  paymentEvents,
} from "@workspace/db/schema";
import type { SQL } from "drizzle-orm";
import { and, desc, eq, sql } from "drizzle-orm";

export interface ListPaymentEventsOptions {
  page?: number;
  pageSize?: number;
  subscriptionId?: string;
  eventType?: PaymentEventType;
  status?: PaymentEventStatus;
}

export interface ListPaymentEventsResult {
  data: PaymentEventRow[];
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
 * Create a new payment event
 */
export async function createPaymentEvent(
  data: NewPaymentEventRow
): Promise<PaymentEventRow> {
  const [event] = await db.insert(paymentEvents).values(data).returning();
  if (!event) {
    throw new Error("Failed to create payment event");
  }
  return event;
}

/**
 * Get a payment event by ID
 */
export async function getPaymentEventById(
  eventId: string
): Promise<PaymentEventRow | null> {
  const [event] = await db
    .select()
    .from(paymentEvents)
    .where(eq(paymentEvents.id, eventId))
    .limit(1);

  return event ?? null;
}

/**
 * Get a payment event by provider event ID (for idempotency)
 */
export async function getPaymentEventByProviderEventId(
  providerEventId: string
): Promise<PaymentEventRow | null> {
  const [event] = await db
    .select()
    .from(paymentEvents)
    .where(eq(paymentEvents.providerEventId, providerEventId))
    .limit(1);

  return event ?? null;
}

/**
 * List payment events with pagination and filtering
 */
export async function listPaymentEvents(
  options: ListPaymentEventsOptions = {}
): Promise<ListPaymentEventsResult> {
  const {
    page = 1,
    pageSize = 50,
    subscriptionId,
    eventType,
    status,
  } = options;

  // Build where conditions
  const conditions: SQL[] = [];

  if (subscriptionId) {
    conditions.push(eq(paymentEvents.subscriptionId, subscriptionId));
  }
  if (eventType) {
    conditions.push(eq(paymentEvents.eventType, eventType));
  }
  if (status) {
    conditions.push(eq(paymentEvents.status, status));
  }

  // Count total
  const countResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(paymentEvents)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  const totalCount = countResult[0]?.count ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);
  const offset = (page - 1) * pageSize;

  // Fetch data
  const data = await db
    .select()
    .from(paymentEvents)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(paymentEvents.createdAt))
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
 * Get latest payment events for a subscription
 */
export function getLatestPaymentEvents(
  subscriptionId: string,
  limit = 10
): Promise<PaymentEventRow[]> {
  return db
    .select()
    .from(paymentEvents)
    .where(eq(paymentEvents.subscriptionId, subscriptionId))
    .orderBy(desc(paymentEvents.createdAt))
    .limit(limit);
}
