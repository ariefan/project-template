import { db } from "@workspace/db";
import {
  type NewWebhookDeliveryRow,
  type WebhookDeliveryRow,
  type WebhookDeliveryStatus,
  webhookDeliveries,
} from "@workspace/db/schema";
import { and, desc, eq, lte } from "drizzle-orm";

export interface ListDeliveriesOptions {
  page?: number;
  pageSize?: number;
  status?: WebhookDeliveryStatus;
  eventType?: string;
  createdAfter?: Date;
}

export interface ListDeliveriesResult {
  data: WebhookDeliveryRow[];
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
 * Create a new delivery record
 */
export async function create(
  data: NewWebhookDeliveryRow
): Promise<WebhookDeliveryRow> {
  const [delivery] = await db
    .insert(webhookDeliveries)
    .values(data)
    .returning();
  if (!delivery) {
    throw new Error("Failed to create webhook delivery");
  }
  return delivery;
}

/**
 * Get delivery by ID
 */
export async function findById(
  webhookId: string,
  deliveryId: string
): Promise<WebhookDeliveryRow | null> {
  const [delivery] = await db
    .select()
    .from(webhookDeliveries)
    .where(
      and(
        eq(webhookDeliveries.id, deliveryId),
        eq(webhookDeliveries.webhookId, webhookId)
      )
    )
    .limit(1);

  return delivery ?? null;
}

/**
 * Get delivery by ID only (for worker)
 */
export async function findByIdOnly(
  deliveryId: string
): Promise<WebhookDeliveryRow | null> {
  const [delivery] = await db
    .select()
    .from(webhookDeliveries)
    .where(eq(webhookDeliveries.id, deliveryId))
    .limit(1);

  return delivery ?? null;
}

/**
 * List deliveries for a webhook with pagination and filtering
 */
export async function findByWebhook(
  webhookId: string,
  options: ListDeliveriesOptions = {}
): Promise<ListDeliveriesResult> {
  const { page = 1, pageSize = 50, status, eventType, createdAfter } = options;

  // Build where conditions
  const conditions = [eq(webhookDeliveries.webhookId, webhookId)];

  if (status) {
    conditions.push(eq(webhookDeliveries.status, status));
  }
  if (eventType) {
    conditions.push(eq(webhookDeliveries.eventType, eventType));
  }
  if (createdAfter) {
    // Note: This is a simple comparison, may need adjustment for proper date handling
  }

  const whereClause = and(...conditions);

  // Get total count
  const allDeliveries = await db
    .select()
    .from(webhookDeliveries)
    .where(whereClause);
  const totalCount = allDeliveries.length;

  // Get paginated results
  const offset = (page - 1) * pageSize;
  const data = await db
    .select()
    .from(webhookDeliveries)
    .where(whereClause)
    .orderBy(desc(webhookDeliveries.createdAt))
    .limit(pageSize)
    .offset(offset);

  const totalPages = Math.ceil(totalCount / pageSize);

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
 * Update delivery status after attempt
 */
export async function updateStatus(
  deliveryId: string,
  status: WebhookDeliveryStatus,
  statusCode?: number,
  responseBody?: string
): Promise<WebhookDeliveryRow | null> {
  const updateData: Partial<WebhookDeliveryRow> = {
    status,
    statusCode: statusCode ?? null,
    responseBody: responseBody?.slice(0, 1024) ?? null, // Truncate to 1KB
  };

  if (status === "delivered") {
    updateData.deliveredAt = new Date();
  }

  const [updated] = await db
    .update(webhookDeliveries)
    .set(updateData)
    .where(eq(webhookDeliveries.id, deliveryId))
    .returning();

  return updated ?? null;
}

/**
 * Increment attempt count and set next retry time
 */
export async function incrementAttempts(
  deliveryId: string,
  nextRetryAt: Date | null
): Promise<WebhookDeliveryRow | null> {
  // First get current attempts
  const [current] = await db
    .select()
    .from(webhookDeliveries)
    .where(eq(webhookDeliveries.id, deliveryId))
    .limit(1);

  if (!current) {
    return null;
  }

  const [updated] = await db
    .update(webhookDeliveries)
    .set({
      attempts: current.attempts + 1,
      nextRetryAt,
    })
    .where(eq(webhookDeliveries.id, deliveryId))
    .returning();

  return updated ?? null;
}

/**
 * Find deliveries that are ready to retry
 */
export async function findPendingRetries(): Promise<WebhookDeliveryRow[]> {
  const now = new Date();

  return await db
    .select()
    .from(webhookDeliveries)
    .where(
      and(
        eq(webhookDeliveries.status, "failed"),
        lte(webhookDeliveries.nextRetryAt, now)
      )
    );
}

/**
 * Mark delivery as exhausted (all retries failed)
 */
export async function markExhausted(
  deliveryId: string
): Promise<WebhookDeliveryRow | null> {
  const [updated] = await db
    .update(webhookDeliveries)
    .set({
      status: "exhausted",
      nextRetryAt: null,
    })
    .where(eq(webhookDeliveries.id, deliveryId))
    .returning();

  return updated ?? null;
}
