import { db } from "@workspace/db";
import {
  type NewWebhookRow,
  type WebhookRow,
  webhooks,
} from "@workspace/db/schema";
import { and, desc, eq } from "drizzle-orm";

export interface ListWebhooksOptions {
  page?: number;
  pageSize?: number;
  isActive?: boolean;
}

export interface ListWebhooksResult {
  data: WebhookRow[];
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
 * Create a new webhook
 */
export async function create(data: NewWebhookRow): Promise<WebhookRow> {
  const [webhook] = await db.insert(webhooks).values(data).returning();
  if (!webhook) {
    throw new Error("Failed to create webhook");
  }
  return webhook;
}

/**
 * Get webhook by ID
 */
export async function findById(
  orgId: string,
  webhookId: string
): Promise<WebhookRow | null> {
  const [webhook] = await db
    .select()
    .from(webhooks)
    .where(and(eq(webhooks.id, webhookId), eq(webhooks.orgId, orgId)))
    .limit(1);

  return webhook ?? null;
}

/**
 * List webhooks with pagination and filtering
 */
export async function findByOrg(
  orgId: string,
  options: ListWebhooksOptions = {}
): Promise<ListWebhooksResult> {
  const { page = 1, pageSize = 50, isActive } = options;

  // Build where conditions
  const conditions = [eq(webhooks.orgId, orgId)];

  if (isActive !== undefined) {
    conditions.push(eq(webhooks.isActive, isActive));
  }

  const whereClause = and(...conditions);

  // Get total count
  const allWebhooks = await db.select().from(webhooks).where(whereClause);
  const totalCount = allWebhooks.length;

  // Get paginated results
  const offset = (page - 1) * pageSize;
  const data = await db
    .select()
    .from(webhooks)
    .where(whereClause)
    .orderBy(desc(webhooks.createdAt))
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
 * Update a webhook
 */
export async function update(
  orgId: string,
  webhookId: string,
  data: Partial<
    Pick<WebhookRow, "name" | "url" | "events" | "isActive" | "description">
  >
): Promise<WebhookRow | null> {
  const [updated] = await db
    .update(webhooks)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(and(eq(webhooks.id, webhookId), eq(webhooks.orgId, orgId)))
    .returning();

  return updated ?? null;
}

/**
 * Update webhook secret
 */
export async function updateSecret(
  orgId: string,
  webhookId: string,
  secret: string
): Promise<WebhookRow | null> {
  const [updated] = await db
    .update(webhooks)
    .set({
      secret,
      updatedAt: new Date(),
    })
    .where(and(eq(webhooks.id, webhookId), eq(webhooks.orgId, orgId)))
    .returning();

  return updated ?? null;
}

/**
 * Delete a webhook
 */
export async function deleteById(
  orgId: string,
  webhookId: string
): Promise<WebhookRow | null> {
  const [deleted] = await db
    .delete(webhooks)
    .where(and(eq(webhooks.id, webhookId), eq(webhooks.orgId, orgId)))
    .returning();

  return deleted ?? null;
}

/**
 * Find webhooks subscribed to a specific event type
 */
export async function findByEventType(
  orgId: string,
  eventType: string
): Promise<WebhookRow[]> {
  // Get all active webhooks for the org
  const activeWebhooks = await db
    .select()
    .from(webhooks)
    .where(and(eq(webhooks.orgId, orgId), eq(webhooks.isActive, true)));

  // Filter webhooks that are subscribed to this event type
  return activeWebhooks.filter((webhook) =>
    webhook.events.some((event) => event === eventType || event === "*")
  );
}
